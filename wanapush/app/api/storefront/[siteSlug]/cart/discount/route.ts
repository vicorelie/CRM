// POST   /api/storefront/[siteSlug]/cart/discount → applique un code
// DELETE /api/storefront/[siteSlug]/cart/discount?sessionId=... → retire

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const applySchema = z.object({
  sessionId: z.string().trim().min(1).max(128),
  code: z.string().trim().min(1).max(64),
});

type Params = { params: Promise<{ siteSlug: string }> };

async function computeAndApply(cartId: string, code: string | null) {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: { items: true },
  });
  if (!cart) return null;
  const subtotal = cart.items.reduce((s, it) => s + Number(it.unitPrice) * it.quantity, 0);
  let discount = 0;
  if (code) {
    const d = await prisma.discount.findFirst({
      where: { shopId: cart.shopId, code: code.toUpperCase(), enabled: true },
    });
    if (!d) return { error: "Code invalide" };
    const now = Date.now();
    if (d.startsAt && d.startsAt.getTime() > now) return { error: "Code pas encore actif" };
    if (d.endsAt && d.endsAt.getTime() < now) return { error: "Code expiré" };
    if (d.usageLimit && d.usageCount >= d.usageLimit) return { error: "Code épuisé" };
    if (d.minSubtotal && subtotal < Number(d.minSubtotal)) {
      return { error: `Minimum ${Number(d.minSubtotal)} ${cart.currency} requis pour ce code` };
    }
    if (d.type === "PERCENTAGE") {
      discount = Math.round(subtotal * (Number(d.value) / 100) * 100) / 100;
    } else if (d.type === "FIXED_AMOUNT") {
      discount = Math.min(subtotal, Number(d.value));
    } else if (d.type === "FREE_SHIPPING") {
      // La remise s'applique aux frais de port, pas au subtotal. Le checkout
      // appliquera shippingCost=0. On stocke discount=0 ici, le shipping sera
      // mis à 0 au moment du checkout via la metadata.
      discount = 0;
    }
  }
  const total = subtotal + Number(cart.shipping) + Number(cart.tax) - discount;
  return prisma.cart.update({
    where: { id: cartId },
    data: {
      subtotal,
      discount,
      total,
      discountCode: code,
    },
  });
}

export async function POST(req: Request, { params }: Params) {
  const { siteSlug } = await params;
  const shop = await prisma.shop.findUnique({ where: { siteSlug } });
  if (!shop) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });

  const parsed = applySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalide" },
      { status: 400 },
    );
  }
  const { sessionId, code } = parsed.data;

  const cart = await prisma.cart.findFirst({ where: { shopId: shop.id, sessionId, status: "ACTIVE" } });
  if (!cart) return NextResponse.json({ error: "Panier introuvable" }, { status: 404 });

  const result = await computeAndApply(cart.id, code);
  if (!result) return NextResponse.json({ error: "Panier introuvable" }, { status: 404 });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({
    cart: {
      discountCode: result.discountCode,
      subtotal: Number(result.subtotal),
      discount: Number(result.discount),
      total: Number(result.total),
    },
  });
}

export async function DELETE(req: Request, { params }: Params) {
  const { siteSlug } = await params;
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId requis" }, { status: 400 });
  const shop = await prisma.shop.findUnique({ where: { siteSlug } });
  if (!shop) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
  const cart = await prisma.cart.findFirst({ where: { shopId: shop.id, sessionId, status: "ACTIVE" } });
  if (!cart) return NextResponse.json({ error: "Panier introuvable" }, { status: 404 });
  await computeAndApply(cart.id, null);
  return NextResponse.json({ ok: true });
}
