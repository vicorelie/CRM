// GET /api/storefront/[siteSlug]/products
// Endpoint PUBLIC (sans auth) consommé par le site généré.
// Ne retourne que les produits ACTIFS avec leur variante de moindre prix.
// Filtres : ?category=slug&featured=1&limit=N&offset=N&q=...

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Params = { params: Promise<{ siteSlug: string }> };

export async function GET(req: Request, { params }: Params) {
  const { siteSlug } = await params;
  if (!/^[a-z0-9-]+$/i.test(siteSlug)) {
    return NextResponse.json({ error: "siteSlug invalide" }, { status: 400 });
  }
  const shop = await prisma.shop.findUnique({ where: { siteSlug } });
  if (!shop) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });

  const url = new URL(req.url);
  const categorySlug = url.searchParams.get("category");
  const featured = url.searchParams.get("featured") === "1";
  const q = (url.searchParams.get("q") ?? "").trim();
  const limit = Math.min(48, Math.max(1, parseInt(url.searchParams.get("limit") ?? "12", 10)));
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10));

  const where: Record<string, unknown> = {
    shopId: shop.id,
    status: "ACTIVE",
  };
  if (featured) where.featured = true;
  if (q) where.title = { contains: q };
  if (categorySlug) {
    where.categories = { some: { category: { slug: categorySlug } } };
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: [{ featured: "desc" }, { position: "asc" }, { publishedAt: "desc" }],
    take: limit,
    skip: offset,
    include: {
      images: { orderBy: { position: "asc" }, take: 1 },
      variants: {
        select: { id: true, price: true, compareAt: true, sku: true },
        orderBy: { price: "asc" },
      },
      categories: { include: { category: { select: { slug: true, name: true } } } },
      options: {
        select: {
          name: true,
          values: { select: { value: true, color: true }, orderBy: { position: "asc" } },
        },
        orderBy: { position: "asc" },
      },
    },
  });

  const total = await prisma.product.count({ where });

  return NextResponse.json(
    {
      shop: {
        siteSlug: shop.siteSlug,
        name: shop.name,
        currency: shop.currency,
        locale: shop.locale,
        taxesIncluded: shop.taxesIncluded,
      },
      products: products.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        featured: p.featured,
        image: p.images[0]?.url ?? null,
        imageAlt: p.images[0]?.alt ?? p.title,
        minPrice: p.variants[0]?.price ?? null,
        maxPrice: p.variants[p.variants.length - 1]?.price ?? null,
        compareAt: p.variants[0]?.compareAt ?? null,
        variantCount: p.variants.length,
        firstVariantId: p.variants[0]?.id ?? null,
        categories: p.categories.map((c) => ({ slug: c.category.slug, name: c.category.name })),
        options: p.options.map((o) => ({
          name: o.name,
          values: o.values.map((v) => ({ value: v.value, color: v.color })),
        })),
      })),
      total,
    },
    {
      // Cache 60s côté nginx/CDN, revalidate background
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    },
  );
}
