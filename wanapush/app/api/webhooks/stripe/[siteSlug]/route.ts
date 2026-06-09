// POST /api/webhooks/stripe/[siteSlug]
// Webhook Stripe : reçoit les événements de paiement et crée/met à jour
// les Orders en BDD. Idempotent via StripeEvent.eventId @unique.
//
// Le marchand configure cette URL dans Stripe Dashboard > Webhooks et copie
// le signing secret dans /shop/[siteSlug]/settings.

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripeForShop, webhookSecretForShop } from "@/lib/stripe-shop";
import { createPaidOrderFromCart } from "@/lib/shop-order";

export const runtime = "nodejs";

type Params = { params: Promise<{ siteSlug: string }> };

export async function POST(req: Request, { params }: Params) {
  const { siteSlug } = await params;
  const shop = await prisma.shop.findUnique({ where: { siteSlug } });
  if (!shop) return NextResponse.json({ error: "Shop introuvable" }, { status: 404 });

  const stripe = stripeForShop(shop);
  const secret = webhookSecretForShop(shop);
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Stripe non configuré pour cette boutique" }, { status: 503 });
  }

  // Vérification de signature avec le secret du webhook
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Signature manquante" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Signature invalide";
    console.error("[webhook] verification failed:", msg);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  // Idempotence : on stocke l'event dès réception. Si déjà processed, on skip.
  const existing = await prisma.stripeEvent.findUnique({ where: { eventId: event.id } });
  if (existing?.processed) {
    return NextResponse.json({ received: true, alreadyProcessed: true });
  }
  if (!existing) {
    await prisma.stripeEvent.create({
      data: {
        shopId: shop.id,
        eventId: event.id,
        eventType: event.type,
        payload: event as never,
      },
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(shop.id, event.data.object as Stripe.Checkout.Session);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentFailed(shop.id, event.data.object as Stripe.PaymentIntent);
        break;
      case "charge.refunded":
        await handleChargeRefunded(shop.id, event.data.object as Stripe.Charge);
        break;
      default:
        // Pas d'action — on stocke pour audit
        break;
    }
    await prisma.stripeEvent.update({
      where: { eventId: event.id },
      data: { processed: true, processedAt: new Date() },
    });
    // Rafraîchit le tableau de bord shop (orders / analytics) après mutation Stripe.
    revalidatePath(`/shop/${siteSlug}/orders`);
    revalidatePath(`/shop/${siteSlug}`);
    return NextResponse.json({ received: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur traitement";
    console.error("[webhook] handler error:", msg);
    await prisma.stripeEvent.update({
      where: { eventId: event.id },
      data: { error: msg },
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(shopId: string, session: Stripe.Checkout.Session) {
  const cartId = session.metadata?.cartId;
  if (!cartId) {
    console.warn("[webhook] checkout sans cartId in metadata");
    return;
  }

  // Adresses (Stripe a renommé shipping_details → collected_information.shipping_details
  // selon la version → on caste pour rester compatible).
  const sessionAny = session as unknown as {
    shipping_details?: { address?: unknown };
    collected_information?: { shipping_details?: { address?: unknown } };
  };
  const shippingAddr = sessionAny.shipping_details?.address
    ?? sessionAny.collected_information?.shipping_details?.address
    ?? null;

  const meta = (session.metadata ?? {}) as Record<string, string>;

  // Toute la création order/customer/stock/discount est désormais atomique et
  // partagée avec PayPal via createPaidOrderFromCart (audit H5).
  const res = await createPaidOrderFromCart({
    shopId,
    cartId,
    provider: "stripe",
    paymentRef: typeof session.payment_intent === "string" ? session.payment_intent : null,
    customerEmail: session.customer_email ?? session.customer_details?.email ?? "",
    customerName: session.customer_details?.name ?? null,
    customerPhone: session.customer_details?.phone ?? null,
    shippingAddress: shippingAddr,
    billingAddress: session.customer_details?.address ?? null,
    shippingMethod: session.shipping_cost?.shipping_rate && typeof session.shipping_cost.shipping_rate !== "string"
      ? session.shipping_cost.shipping_rate.display_name ?? null
      : null,
    amounts: {
      // Montants autoritatifs venant de Stripe (en minor unit → €).
      shippingCost: session.shipping_cost?.amount_total ? session.shipping_cost.amount_total / 100 : undefined,
      taxAmount: session.total_details?.amount_tax ? session.total_details.amount_tax / 100 : 0,
      discountAmount: session.total_details?.amount_discount ? session.total_details.amount_discount / 100 : 0,
      total: session.amount_total != null ? session.amount_total / 100 : undefined,
    },
    clickIds: {
      gclid: meta.gclid, gbraid: meta.gbraid, wbraid: meta.wbraid,
      liFatId: meta.liFatId, ttclid: meta.ttclid,
    },
    discountCode: session.metadata?.discountCode || null,
  });
  if (!res.ok && res.reason === "cart_not_found") {
    console.warn("[webhook] cart introuvable", cartId);
  }
}

async function handlePaymentFailed(shopId: string, pi: Stripe.PaymentIntent) {
  // Trouve l'order par paymentIntentId
  const order = await prisma.order.findFirst({ where: { shopId, paymentIntentId: pi.id } });
  if (!order) return;
  await prisma.order.update({
    where: { id: order.id },
    data: { financialStatus: "FAILED" },
  });
}

async function handleChargeRefunded(shopId: string, charge: Stripe.Charge) {
  const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!piId) return;
  const order = await prisma.order.findFirst({ where: { shopId, paymentIntentId: piId } });
  if (!order) return;
  const refundedAmount = (charge.amount_refunded ?? 0) / 100;
  const isFull = (charge.amount_refunded ?? 0) >= (charge.amount ?? 0);

  await prisma.refund.create({
    data: {
      orderId: order.id,
      amount: refundedAmount,
      reason: "Stripe refund",
    },
  });
  await prisma.order.update({
    where: { id: order.id },
    data: {
      financialStatus: isFull ? "REFUNDED" : "PARTIALLY_REFUNDED",
    },
  });
}
