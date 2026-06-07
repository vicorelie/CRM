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
import { sendOrderConfirmation } from "@/lib/shop-email";

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

  // Charge le panier complet
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: {
          variant: {
            include: { product: { include: { images: { take: 1, orderBy: { position: "asc" } } } } },
          },
        },
      },
    },
  });
  if (!cart) {
    console.warn("[webhook] cart introuvable", cartId);
    return;
  }
  if (cart.status === "COMPLETED") {
    // Idempotence (déjà traité par un retry du même webhook)
    return;
  }

  // Génère le numéro de commande séquentiel
  const shop = await prisma.shop.update({
    where: { id: shopId },
    data: { orderNumberSeq: { increment: 1 } },
  });
  const orderNumber = `#${shop.orderNumberSeq}`;

  // Crée l'Order avec snapshots
  const customerEmail = session.customer_email ?? session.customer_details?.email ?? "";
  const customerName = session.customer_details?.name ?? null;
  const customerPhone = session.customer_details?.phone ?? null;
  // Note : Stripe a renommé shipping_details → collected_information.shipping_details
  // dans certaines versions. On caste pour rester compatible.
  const sessionAny = session as unknown as { shipping_details?: { address?: unknown }; collected_information?: { shipping_details?: { address?: unknown } } };
  const shippingAddr = sessionAny.shipping_details?.address
    ?? sessionAny.collected_information?.shipping_details?.address
    ?? null;
  const billingAddr = session.customer_details?.address ?? null;

  const subtotal = cart.items.reduce((s, it) => s + Number(it.unitPrice) * it.quantity, 0);
  const shippingCost = session.shipping_cost?.amount_total
    ? session.shipping_cost.amount_total / 100
    : Number(cart.shipping ?? 0);
  const taxAmount = session.total_details?.amount_tax ? session.total_details.amount_tax / 100 : 0;
  const discountAmount = session.total_details?.amount_discount
    ? session.total_details.amount_discount / 100
    : 0;
  const total = (session.amount_total ?? 0) / 100;

  // Upsert / Find existing customer
  let customerId: string | null = null;
  if (customerEmail) {
    const [first = "", ...rest] = (customerName ?? "").split(" ");
    const lastName = rest.join(" ");
    const customer = await prisma.customer.upsert({
      where: { shopId_email: { shopId, email: customerEmail } },
      create: {
        shopId,
        email: customerEmail,
        firstName: first || null,
        lastName: lastName || null,
        phone: customerPhone,
        totalSpent: total,
        ordersCount: 1,
        lastOrderAt: new Date(),
      },
      update: {
        firstName: first || undefined,
        lastName: lastName || undefined,
        phone: customerPhone ?? undefined,
        totalSpent: { increment: total },
        ordersCount: { increment: 1 },
        lastOrderAt: new Date(),
      },
    });
    customerId = customer.id;
  }

  // Click identifiers Google + liFatId LinkedIn + ttclid TikTok propagés depuis
  // le checkout via session.metadata → stockés sur l'Order pour upload des 3
  // Conversions APIs server-side (Google Data Manager + LinkedIn + TikTok Events).
  const sessionMeta = (session.metadata ?? {}) as Record<string, string>;
  const gclid = sessionMeta.gclid?.slice(0, 255) || null;
  const gbraid = sessionMeta.gbraid?.slice(0, 255) || null;
  const wbraid = sessionMeta.wbraid?.slice(0, 255) || null;
  const liFatId = sessionMeta.liFatId?.slice(0, 255) || null;
  const ttclid = sessionMeta.ttclid?.slice(0, 255) || null;

  const order = await prisma.order.create({
    data: {
      shopId,
      customerId,
      orderNumber,
      status: "CONFIRMED",
      financialStatus: "PAID",
      fulfillmentStatus: "UNFULFILLED",
      customerEmail,
      customerName,
      customerPhone,
      shippingAddressJson: shippingAddr as never,
      billingAddressJson: billingAddr as never,
      currency: cart.currency,
      subtotal,
      shippingCost,
      taxAmount,
      discountAmount,
      total,
      paymentMethod: "stripe",
      paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
      paidAt: new Date(),
      shippingMethod: session.shipping_cost?.shipping_rate
        ? typeof session.shipping_cost.shipping_rate === "string"
          ? null
          : session.shipping_cost.shipping_rate.display_name ?? null
        : null,
      gclid,
      gbraid,
      wbraid,
      liFatId,
      ttclid,
      ecStatus: gclid || gbraid || wbraid ? "PENDING" : null,
      liStatus: liFatId || customerEmail ? "PENDING" : null,
      ttStatus: ttclid || customerEmail ? "PENDING" : null,
      items: {
        create: cart.items.map((it) => ({
          variantId: it.variantId,
          productTitle: it.variant.product.title,
          variantTitle: it.variant.title !== "Default" ? it.variant.title : null,
          sku: it.variant.sku,
          imageUrl: it.variant.product.images[0]?.url ?? null,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          totalPrice: Number(it.unitPrice) * it.quantity,
          weight: it.variant.weight,
        })),
      },
    },
  });

  // Fire-and-forget : upload conversions vers Google (Data Manager API) +
  // LinkedIn (Conversions API) en parallèle. Pas bloquant pour le webhook.
  if (gclid || gbraid || wbraid || customerEmail) {
    const { triggerSaleConversionForOrder } = await import("@/lib/ads/enhanced-conversions-pipeline");
    void triggerSaleConversionForOrder(order.id).catch((e) => {
      console.warn(`[stripe-webhook] Google EC trigger failed for order ${order.id}: ${e instanceof Error ? e.message : e}`);
    });
  }
  if (liFatId || customerEmail) {
    const { triggerLinkedInSaleForOrder } = await import("@/lib/ads/enhanced-conversions-pipeline");
    void triggerLinkedInSaleForOrder(order.id).catch((e) => {
      console.warn(`[stripe-webhook] LinkedIn CAPI trigger failed for order ${order.id}: ${e instanceof Error ? e.message : e}`);
    });
  }
  if (ttclid || customerEmail) {
    const { triggerTikTokSaleForOrder } = await import("@/lib/ads/enhanced-conversions-pipeline");
    void triggerTikTokSaleForOrder(order.id).catch((e) => {
      console.warn(`[stripe-webhook] TikTok Events trigger failed for order ${order.id}: ${e instanceof Error ? e.message : e}`);
    });
  }

  // Marque le panier COMPLETED + vide pour repartir d'un panier vide
  await prisma.cart.update({
    where: { id: cart.id },
    data: { status: "COMPLETED" },
  });

  // Décrémente le stock (par variante, dans le default location)
  const defaultLoc = await prisma.stockLocation.findFirst({ where: { shopId, isDefault: true } });
  if (defaultLoc) {
    for (const it of cart.items) {
      await prisma.stockLevel.updateMany({
        where: { variantId: it.variantId, locationId: defaultLoc.id },
        data: { quantity: { decrement: it.quantity } },
      });
    }
  }

  // Incrémente DiscountUsage si un code promo a été utilisé
  const discountCode = session.metadata?.discountCode;
  if (discountCode) {
    const d = await prisma.discount.findFirst({
      where: { shopId, code: discountCode },
    });
    if (d) {
      await prisma.discount.update({
        where: { id: d.id },
        data: { usageCount: { increment: 1 } },
      });
      await prisma.discountUsage.create({
        data: {
          discountId: d.id,
          customerId,
          orderId: order.id,
          amount: order.discountAmount,
        },
      });
      // Met à jour aussi l'order avec le code
      await prisma.order.update({
        where: { id: order.id },
        data: { discountCode },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      shopId,
      action: "order.create",
      resource: order.id,
      details: { orderNumber, total, customerEmail },
    },
  });

  // Email de confirmation au client (non-bloquant)
  const orderFull = await prisma.order.findUnique({
    where: { id: order.id },
    include: { items: true },
  });
  if (orderFull) {
    const shopFull = await prisma.shop.findUnique({ where: { id: shopId } });
    if (shopFull) {
      sendOrderConfirmation(shopFull, orderFull).catch((e) =>
        console.error("[webhook] order confirmation email failed:", e),
      );
    }
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
