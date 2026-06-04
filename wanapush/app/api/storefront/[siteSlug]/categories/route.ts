// GET /api/storefront/[siteSlug]/categories
// Endpoint public : retourne les catégories racines de la boutique.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Params = { params: Promise<{ siteSlug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { siteSlug } = await params;
  const shop = await prisma.shop.findUnique({ where: { siteSlug } });
  if (!shop) return NextResponse.json({ categories: [] });

  const categories = await prisma.category.findMany({
    where: { shopId: shop.id, parentId: null },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      imageUrl: true,
      _count: { select: { products: true } },
    },
  });
  return NextResponse.json(
    { categories },
    { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } },
  );
}
