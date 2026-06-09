// POST /api/storefront/[siteSlug]/paypal/create
// Crée une commande PayPal (Orders v2, intent CAPTURE) à partir du panier courant.
// Le montant est calculé SERVER-SIDE (pas de tampering possible). Renvoie l'orderID
// que le PayPal JS SDK utilise pour rendre les boutons, puis on capture côté serveur.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createPayPalOrder, paypalCredsForShop, toPayPalAmount } from "@/lib/paypal-shop";

export const runtime = "nodejs";

const inputSchema = z.object({
  sessionId: z.string().trim().min(1).max(128),
});

type Params = { params: Promise<{ siteSlug: string }> };

export async function POST(req: Request, { params }: Params) {
  const { siteSlug } = await params;
  const shop = await prisma.shop.findUnique({ where: { siteSlug } });
  if (!shop) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });

  if (!paypalCredsForShop(shop)) {
    return NextResponse.json(
      { error: "PayPal n'est pas configuré. Le marchand doit renseigner ses identifiants PayPal dans les paramètres." },
      { status: 503 },
    );
  }

  const parsed = inputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalide" }, { status: 400 });
  }

  const cart = await prisma.cart.findFirst({
    where: { shopId: shop.id, sessionId: parsed.data.sessionId, status: "ACTIVE" },
    include: { items: { include: { variant: { include: { product: true } } } } },
  });
  if (!cart || cart.items.length === 0) {
    return NextResponse.json({ error: "Panier vide" }, { status: 400 });
  }

  // Total SERVER-SIDE (jamais depuis le client) : subtotal + livraison − remise.
  const subtotal = cart.items.reduce((s, it) => s + Number(it.unitPrice) * it.quantity, 0);
  const shipping = Number(cart.shipping ?? 0);
  const discount = Number(cart.discount ?? 0);
  const total = Math.max(0, subtotal + shipping - discount);

  try {
    const order = await createPayPalOrder(shop, {
      amount: toPayPalAmount(total, cart.currency),
      currency: cart.currency,
      customId: cart.id, // résolu à la capture, non manipulable par le client
      description: `Commande ${shop.name ?? siteSlug}`.slice(0, 127),
    });
    return NextResponse.json({ orderID: order.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur PayPal";
    console.error("[paypal/create]", msg);
    return NextResponse.json({ error: "Impossible de créer la commande PayPal" }, { status: 502 });
  }
}
