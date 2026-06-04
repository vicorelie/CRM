// GET /api/shop/[siteSlug]/customers → liste des clients avec stats agrégées

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
  const q = (url.searchParams.get("q") ?? "").trim();
  const blocked = url.searchParams.get("blocked");
  const marketing = url.searchParams.get("marketing");
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") ?? "100", 10)));

  const where: Record<string, unknown> = { shopId: shop.id };
  if (q) where.OR = [
    { email: { contains: q } },
    { firstName: { contains: q } },
    { lastName: { contains: q } },
    { phone: { contains: q } },
  ];
  if (blocked === "1") where.blocked = true;
  if (marketing === "1") where.marketingConsent = true;

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      marketingConsent: true,
      totalSpent: true,
      ordersCount: true,
      lastOrderAt: true,
      blocked: true,
      blockedReason: true,
      notes: true,
      createdAt: true,
    },
  });

  const totalSpentAgg = await prisma.customer.aggregate({
    where: { shopId: shop.id },
    _sum: { totalSpent: true, ordersCount: true },
    _count: { _all: true },
  });

  return NextResponse.json({
    customers: customers.map((c) => ({
      ...c,
      totalSpent: Number(c.totalSpent),
      createdAt: c.createdAt.toISOString(),
      lastOrderAt: c.lastOrderAt?.toISOString() ?? null,
    })),
    stats: {
      total: totalSpentAgg._count._all,
      totalSpent: Number(totalSpentAgg._sum.totalSpent ?? 0),
      totalOrders: totalSpentAgg._sum.ordersCount ?? 0,
    },
    currency: shop.currency,
    locale: shop.locale,
  });
}
