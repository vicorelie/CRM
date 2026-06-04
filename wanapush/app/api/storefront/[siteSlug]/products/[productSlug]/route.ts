// GET /api/storefront/[siteSlug]/products/[productSlug]
// Détail public d'un produit (toutes variantes + images + options).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Params = { params: Promise<{ siteSlug: string; productSlug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { siteSlug, productSlug } = await params;
  const shop = await prisma.shop.findUnique({ where: { siteSlug } });
  if (!shop) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });

  const product = await prisma.product.findFirst({
    where: { shopId: shop.id, slug: productSlug, status: "ACTIVE" },
    include: {
      images: { orderBy: { position: "asc" } },
      options: {
        include: { values: { orderBy: { position: "asc" } } },
        orderBy: { position: "asc" },
      },
      variants: {
        include: {
          optionValues: { include: { optionValue: { include: { option: true } } } },
          stockLevels: { select: { quantity: true, reserved: true } },
          image: true,
        },
        orderBy: { position: "asc" },
      },
      categories: { include: { category: { select: { slug: true, name: true } } } },
      tags: true,
    },
  });
  if (!product) return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });

  // Calcule la dispo par variante (total stock - reserved)
  const variants = product.variants.map((v) => {
    const totalQty = v.stockLevels.reduce((sum, sl) => sum + sl.quantity - sl.reserved, 0);
    const optionsMap: Record<string, string> = {};
    for (const ov of v.optionValues) {
      optionsMap[ov.optionValue.option.name] = ov.optionValue.value;
    }
    return {
      id: v.id,
      title: v.title,
      sku: v.sku,
      price: Number(v.price),
      compareAt: v.compareAt == null ? null : Number(v.compareAt),
      requiresShipping: v.requiresShipping,
      weight: v.weight,
      imageId: v.imageId,
      imageUrl: v.image?.url ?? null,
      available: totalQty,
      inStock: product.allowBackorder || totalQty > 0,
      options: optionsMap,
      optionValues: v.optionValues.map((ov) => ({
        optionName: ov.optionValue.option.name,
        value: ov.optionValue.value,
      })),
    };
  });

  return NextResponse.json(
    {
      shop: {
        siteSlug: shop.siteSlug,
        name: shop.name,
        currency: shop.currency,
        locale: shop.locale,
        taxesIncluded: shop.taxesIncluded,
      },
      product: {
        id: product.id,
        slug: product.slug,
        title: product.title,
        description: product.description,
        excerpt: product.excerpt,
        productType: product.productType,
        vendor: product.vendor,
        featured: product.featured,
        metaTitle: product.metaTitle,
        metaDescription: product.metaDescription,
        images: product.images.map((i) => ({ url: i.url, alt: i.alt ?? product.title })),
        options: product.options.map((o) => ({
          id: o.id,
          name: o.name,
          values: o.values.map((v) => ({ id: v.id, value: v.value, color: v.color, imageUrl: v.imageUrl })),
        })),
        variants,
        categories: product.categories.map((c) => ({ slug: c.category.slug, name: c.category.name })),
        tags: product.tags.map((t) => t.tag),
      },
    },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
