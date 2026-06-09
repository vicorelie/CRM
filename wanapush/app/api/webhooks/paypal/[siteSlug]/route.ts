// POST /api/webhooks/paypal/[siteSlug]
// Webhook PayPal : remboursements / litiges. Le happy path (paiement) crée déjà la
// commande à la capture — ce webhook gère les événements ASYNCHRONES post-paiement.
//
// Sécurité : vérif de signature PayPal (RSA-SHA256) via la méthode POSTBACK, qui
// nécessite `Shop.paypalWebhookId` (configuré dans le PayPal Dashboard du marchand).

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { paypalCredsForShop, verifyPayPalWebhook } from "@/lib/paypal-shop";

export const runtime = "nodejs";

type Params = { params: Promise<{ siteSlug: string }> };

export async function POST(req: Request, { params }: Params) {
  const { siteSlug } = await params;
  const shop = await prisma.shop.findUnique({ where: { siteSlug } });
  if (!shop) return NextResponse.json({ error: "Shop introuvable" }, { status: 404 });
  if (!shop.paypalWebhookId || !paypalCredsForShop(shop)) {
    return NextResponse.json({ error: "Webhook PayPal non configuré" }, { status: 503 });
  }

  const raw = await req.text();
  let event: { id?: string; event_type?: string; resource?: Record<string, unknown> };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const h = {
    "paypal-auth-algo": req.headers.get("paypal-auth-algo"),
    "paypal-cert-url": req.headers.get("paypal-cert-url"),
    "paypal-transmission-id": req.headers.get("paypal-transmission-id"),
    "paypal-transmission-sig": req.headers.get("paypal-transmission-sig"),
    "paypal-transmission-time": req.headers.get("paypal-transmission-time"),
  };

  const verified = await verifyPayPalWebhook(shop, h, event);
  if (!verified) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  if (!event.id) {
    return NextResponse.json({ error: "Event sans id" }, { status: 400 });
  }

  // Idempotence forte (miroir StripeEvent) : dédup sur l'id d'event PayPal,
  // persisté → survit à toute la fenêtre de retry PayPal (≈3j). Un retry du même
  // event déjà traité ressort en 200 sans re-déclencher le remboursement.
  const existing = await prisma.payPalEvent.findUnique({ where: { eventId: event.id } });
  if (existing?.processed) {
    return NextResponse.json({ received: true, alreadyProcessed: true });
  }
  if (!existing) {
    await prisma.payPalEvent.create({
      data: {
        shopId: shop.id,
        eventId: event.id,
        eventType: event.event_type ?? "unknown",
        payload: event as never,
      },
    });
  }

  try {
    if (event.event_type === "PAYMENT.CAPTURE.REFUNDED") {
      await handleRefund(shop.id, event.resource ?? {});
      revalidatePath(`/shop/${siteSlug}/orders`);
    }
    await prisma.payPalEvent.update({
      where: { eventId: event.id },
      data: { processed: true, processedAt: new Date() },
    });
    // 2xx obligatoire pour acquitter (sinon PayPal retente).
    return NextResponse.json({ received: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur traitement";
    console.error("[paypal-webhook] handler error:", msg);
    await prisma.payPalEvent.update({ where: { eventId: event.id }, data: { error: msg } });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function handleRefund(shopId: string, resource: Record<string, unknown>) {
  // L'id de capture d'origine = Order.paymentIntentId (stocké à la capture).
  const related = (resource.supplementary_data as { related_ids?: { capture_id?: string } } | undefined)?.related_ids;
  const links = (resource.links as Array<{ rel?: string; href?: string }> | undefined) ?? [];
  const captureId =
    related?.capture_id ?? links.find((l) => l.rel === "up")?.href?.split("/").pop() ?? null;
  if (!captureId) return;

  const order = await prisma.order.findFirst({ where: { shopId, paymentIntentId: captureId } });
  if (!order) return;
  // Dédup léger : si déjà totalement remboursé, on ignore les retries du webhook.
  if (order.financialStatus === "REFUNDED") return;

  const amount = Number((resource.amount as { value?: string } | undefined)?.value ?? 0);
  const isFull = amount >= Number(order.total);

  await prisma.$transaction([
    prisma.refund.create({ data: { orderId: order.id, amount, reason: "PayPal refund" } }),
    prisma.order.update({
      where: { id: order.id },
      data: { financialStatus: isFull ? "REFUNDED" : "PARTIALLY_REFUNDED" },
    }),
  ]);
}
