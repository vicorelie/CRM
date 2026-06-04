// GET  /api/storefront/[siteSlug]/products/[productSlug]/reviews → reviews APPROVED
// POST /api/storefront/[siteSlug]/products/[productSlug]/reviews → soumet (PENDING)

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { readCustomerCookie } from "@/lib/customer-auth";

export const runtime = "nodejs";

const submitSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(200).optional(),
  body: z.string().trim().max(5000).optional(),
  authorName: z.string().trim().max(120).optional(),
  authorEmail: z.string().trim().toLowerCase().email().max(255).optional(),
});

type Params = { params: Promise<{ siteSlug: string; productSlug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { siteSlug, productSlug } = await params;
  const shop = await prisma.shop.findUnique({ where: { siteSlug } });
  if (!shop) return NextResponse.json({ reviews: [], stats: null });
  const product = await prisma.product.findFirst({ where: { shopId: shop.id, slug: productSlug } });
  if (!product) return NextResponse.json({ reviews: [], stats: null });

  const reviews = await prisma.review.findMany({
    where: { productId: product.id, status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true, rating: true, title: true, body: true,
      authorName: true, verifiedPurchase: true,
      reply: true, repliedAt: true,
      createdAt: true,
    },
  });

  const agg = await prisma.review.aggregate({
    where: { productId: product.id, status: "APPROVED" },
    _avg: { rating: true },
    _count: { _all: true },
  });

  return NextResponse.json({
    reviews,
    stats: {
      average: agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : null,
      count: agg._count._all,
    },
  });
}

export async function POST(req: Request, { params }: Params) {
  const { siteSlug, productSlug } = await params;
  const shop = await prisma.shop.findUnique({ where: { siteSlug } });
  if (!shop) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
  const product = await prisma.product.findFirst({ where: { shopId: shop.id, slug: productSlug } });
  if (!product) return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });

  const parsed = submitSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalide" },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // Si client connecté → on lie + check "verifiedPurchase"
  const token = readCustomerCookie(req);
  let customerId: string | null = null;
  let verifiedPurchase = false;
  if (token && token.shopId === shop.id) {
    customerId = token.customerId;
    const order = await prisma.order.findFirst({
      where: {
        shopId: shop.id,
        customerId,
        financialStatus: "PAID",
        items: { some: { variant: { productId: product.id } } },
      },
    });
    verifiedPurchase = !!order;
  }

  const review = await prisma.review.create({
    data: {
      shopId: shop.id,
      productId: product.id,
      customerId,
      rating: input.rating,
      title: input.title ?? null,
      body: input.body ?? null,
      authorName: input.authorName ?? null,
      authorEmail: input.authorEmail ?? null,
      verifiedPurchase,
      status: "PENDING",
    },
  });

  revalidatePath(`/shop/${siteSlug}/reviews`);
  return NextResponse.json({ ok: true, reviewId: review.id });
}
