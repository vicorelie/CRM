// POST /api/storefront/[siteSlug]/paypal/capture
// Capture une commande PayPal approuvée par l'acheteur, puis crée la commande en
// BDD via le helper atomique partagé (le même que Stripe). Le panier est résolu
// depuis le `custom_id` posé au create (server-trusted), pas depuis le client.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { capturePayPalOrder, paypalCredsForShop } from "@/lib/paypal-shop";
import { createPaidOrderFromCart } from "@/lib/shop-order";

export const runtime = "nodejs";

const inputSchema = z.object({
  orderID: z.string().trim().min(1).max(128),
  // Click identifiers captés côté storefront (attribution) — propagés à l'Order.
  gclid: z.string().trim().max(255).optional(),
  gbraid: z.string().trim().max(255).optional(),
  wbraid: z.string().trim().max(255).optional(),
  liFatId: z.string().trim().max(255).optional(),
  ttclid: z.string().trim().max(255).optional(),
});

type Params = { params: Promise<{ siteSlug: string }> };

export async function POST(req: Request, { params }: Params) {
  const { siteSlug } = await params;
  const shop = await prisma.shop.findUnique({ where: { siteSlug } });
  if (!shop) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
  if (!paypalCredsForShop(shop)) {
    return NextResponse.json({ error: "PayPal non configuré" }, { status: 503 });
  }

  const parsed = inputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalide" }, { status: 400 });
  }
  const body = parsed.data;

  let capture;
  try {
    capture = await capturePayPalOrder(shop, body.orderID);
  } catch (e) {
    console.error("[paypal/capture]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Capture PayPal échouée" }, { status: 502 });
  }

  if (capture.status !== "COMPLETED") {
    return NextResponse.json({ error: `Paiement non finalisé (${capture.status})` }, { status: 402 });
  }
  const cartId = capture.customId;
  if (!cartId) {
    console.error("[paypal/capture] custom_id (cartId) manquant sur la capture", capture.id);
    return NextResponse.json({ error: "Commande introuvable" }, { status: 500 });
  }

  // Adresse de livraison PayPal (shipping.name + shipping.address)
  const shippingAddr = (capture.shipping as { address?: unknown } | null)?.address ?? null;

  const res = await createPaidOrderFromCart({
    shopId: shop.id,
    cartId,
    provider: "paypal",
    paymentRef: capture.captureId ?? null,
    customerEmail: capture.payerEmail ?? "",
    customerName: capture.payerName ?? null,
    shippingAddress: shippingAddr,
    amounts: { total: capture.amount != null ? Number(capture.amount) : undefined },
    clickIds: {
      gclid: body.gclid, gbraid: body.gbraid, wbraid: body.wbraid,
      liFatId: body.liFatId, ttclid: body.ttclid,
    },
  });

  if (!res.ok) {
    // already_completed = la commande existe déjà (double capture / retry) → succès idempotent.
    if (res.reason === "already_completed") {
      return NextResponse.json({ ok: true, alreadyProcessed: true });
    }
    return NextResponse.json({ error: "Création de la commande impossible" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, orderNumber: res.orderNumber });
}
