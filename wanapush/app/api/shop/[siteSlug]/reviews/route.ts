// GET /api/shop/[siteSlug]/reviews → liste avec filtres (status, productId)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShopForUser } from "@/lib/shop";

export const runtime = "nodejs";

type Params = { params: Promise<{ siteSlug: string }> };

export async function GET(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { siteSlug } = await params;
  const shop = await getShopForUser(session.user.email, siteSlug);
  if (!shop) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const where: Record<string, unknown> = { shopId: shop.id };
  if (status === "PENDING" || status === "APPROVED" || status === "REJECTED") {
    where.status = status;
  }

  const reviews = await prisma.review.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      product: { select: { id: true, title: true, slug: true } },
      customer: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });

  const counts = await prisma.review.groupBy({
    by: ["status"],
    where: { shopId: shop.id },
    _count: { _all: true },
  });
  const countsByStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));

  return NextResponse.json({ reviews, counts: countsByStatus });
}
