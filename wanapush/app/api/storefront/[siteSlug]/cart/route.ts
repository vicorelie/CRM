// GET  /api/storefront/[siteSlug]/cart?sessionId=...        → cart actuel
// POST /api/storefront/[siteSlug]/cart                       → add item { variantId, quantity, sessionId }
// PATCH /api/storefront/[siteSlug]/cart                      → update cart (discountCode, shippingMethodId, addresses)

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

const addItemSchema = z.object({
  sessionId: z.string().trim().min(1).max(128),
  variantId: z.string().trim().min(1).max(64),
  quantity: z.coerce.number().int().min(1).max(99).default(1),
});

type Params = { params: Promise<{ siteSlug: string }> };

async function getOrCreateCart(shopId: string, sessionId: string) {
  let cart = await prisma.cart.findFirst({
    where: { shopId, sessionId, status: "ACTIVE" },
    include: {
      items: {
        include: {
          variant: {
            include: {
              image: true,
              product: { include: { images: { take: 1, orderBy: { position: "asc" } } } },
            },
          },
        },
      },
    },
  });
  if (!cart) {
    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    cart = await prisma.cart.create({
      data: { shopId, sessionId, currency: shop?.currency ?? "EUR" },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: { include: { images: { take: 1, orderBy: { position: "asc" } } } },
              },
            },
          },
        },
      },
    });
  }
  return cart;
}

function serializeCart(cart: Prisma.CartGetPayload<{ include: { items: { include: { variant: { include: { image: true; product: { include: { images: true } } } } } } } }>) {
  const items = cart.items.map((it) => ({
    id: it.id,
    variantId: it.variantId,
    productId: it.variant.productId,
    productTitle: it.variant.product.title,
    variantTitle: it.variant.title,
    sku: it.variant.sku,
    quantity: it.quantity,
    unitPrice: Number(it.unitPrice),
    totalPrice: Number(it.unitPrice) * it.quantity,
    // Photo de la variante si configurée, sinon image principale du produit
    image: it.variant.image?.url ?? it.variant.product.images[0]?.url ?? null,
    slug: it.variant.product.slug,
  }));
  const subtotal = items.reduce((sum, it) => sum + it.totalPrice, 0);
  return {
    id: cart.id,
    sessionId: cart.sessionId,
    currency: cart.currency,
    items,
    subtotal,
    shipping: Number(cart.shipping),
    tax: Number(cart.tax),
    discount: Number(cart.discount),
    discountCode: cart.discountCode,
    total: subtotal + Number(cart.shipping) + Number(cart.tax) - Number(cart.discount),
    itemCount: items.reduce((sum, it) => sum + it.quantity, 0),
  };
}

export async function GET(req: Request, { params }: Params) {
  const { siteSlug } = await params;
  const shop = await prisma.shop.findUnique({ where: { siteSlug } });
  if (!shop) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId requis" }, { status: 400 });
  const cart = await getOrCreateCart(shop.id, sessionId);
  return NextResponse.json({ cart: serializeCart(cart) });
}

export async function POST(req: Request, { params }: Params) {
  const { siteSlug } = await params;
  const shop = await prisma.shop.findUnique({ where: { siteSlug } });
  if (!shop) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });

  const parsed = addItemSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalide" },
      { status: 400 },
    );
  }
  const { sessionId, variantId, quantity: qty } = parsed.data;

  // Vérifie que la variante appartient bien au shop
  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, product: { shopId: shop.id, status: "ACTIVE" } },
    include: { product: { select: { allowBackorder: true, title: true } }, stockLevels: true },
  });
  if (!variant) return NextResponse.json({ error: "Variante introuvable" }, { status: 404 });

  const cart = await getOrCreateCart(shop.id, sessionId);

  // Validation du stock (sauf si le produit autorise le backorder)
  const available = variant.stockLevels.reduce((sum, sl) => sum + sl.quantity - sl.reserved, 0);
  const existing = cart.items.find((it) => it.variantId === variantId);
  const currentInCart = existing?.quantity ?? 0;
  const wanted = currentInCart + qty;
  if (!variant.product.allowBackorder && wanted > available) {
    const remaining = Math.max(0, available - currentInCart);
    let error: string;
    if (available === 0) {
      error = `${variant.product.title} est en rupture de stock.`;
    } else if (remaining === 0) {
      error = `Tu as déjà ${currentInCart} ${variant.product.title} dans ton panier — stock maximal atteint (${available} disponible${available > 1 ? "s" : ""}).`;
    } else {
      error = `Plus que ${remaining} disponible${remaining > 1 ? "s" : ""} pour ${variant.product.title} (tu en as déjà ${currentInCart} dans le panier).`;
    }
    return NextResponse.json({ error }, { status: 409 });
  }

  // Si l'item existe déjà → on incrémente
  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + qty },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        variantId: variant.id,
        quantity: qty,
        unitPrice: variant.price,
      },
    });
  }

  // Recalcule + retourne
  const updated = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: {
      items: {
        include: {
          variant: {
            include: {
              image: true,
              product: { include: { images: { take: 1, orderBy: { position: "asc" } } } },
            },
          },
        },
      },
    },
  });

  // Met à jour subtotal/total dénormalisés
  const subtotal = updated!.items.reduce((sum, it) => sum + Number(it.unitPrice) * it.quantity, 0);
  await prisma.cart.update({
    where: { id: cart.id },
    data: { subtotal, total: subtotal + Number(updated!.shipping) + Number(updated!.tax) - Number(updated!.discount) },
  });

  return NextResponse.json({ cart: serializeCart(updated!) });
}
