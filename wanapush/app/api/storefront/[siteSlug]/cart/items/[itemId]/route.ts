// PATCH /api/storefront/[siteSlug]/cart/items/[itemId]  → modifie qty
// DELETE /api/storefront/[siteSlug]/cart/items/[itemId]  → retire l'item

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const patchSchema = z.object({
  sessionId: z.string().trim().min(1).max(128),
  quantity: z.coerce.number().int().min(0).max(99),
});

type Params = { params: Promise<{ siteSlug: string; itemId: string }> };

async function ownership(siteSlug: string, itemId: string, sessionId: string) {
  const shop = await prisma.shop.findUnique({ where: { siteSlug } });
  if (!shop) return null;
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cart: { shopId: shop.id, sessionId } },
    include: {
      cart: true,
      variant: {
        include: {
          product: { select: { allowBackorder: true, title: true } },
          stockLevels: true,
        },
      },
    },
  });
  return item ? { shop, item } : null;
}

export async function PATCH(req: Request, { params }: Params) {
  const { siteSlug, itemId } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalide" },
      { status: 400 },
    );
  }
  const { sessionId, quantity } = parsed.data;
  const owned = await ownership(siteSlug, itemId, sessionId);
  if (!owned) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
  } else {
    const variant = owned.item.variant;
    const available = variant.stockLevels.reduce((sum, sl) => sum + sl.quantity - sl.reserved, 0);
    if (!variant.product.allowBackorder && quantity > available) {
      return NextResponse.json(
        {
          error: available > 0
            ? `Stock limité : ${available} disponible(s) pour ${variant.product.title}.`
            : `${variant.product.title} est en rupture de stock.`,
        },
        { status: 409 },
      );
    }
    await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: Params) {
  const { siteSlug, itemId } = await params;
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId requis" }, { status: 400 });
  const owned = await ownership(siteSlug, itemId, sessionId);
  if (!owned) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  await prisma.cartItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
}
