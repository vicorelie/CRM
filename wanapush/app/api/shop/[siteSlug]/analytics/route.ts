// GET /api/shop/[siteSlug]/analytics?range=30 → KPIs + séries temporelles

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
  const days = Math.min(365, Math.max(1, parseInt(url.searchParams.get("range") ?? "30", 10)));
  const since = new Date(Date.now() - days * 86400_000);

  // KPIs
  const [paidAgg, allOrdersCount, customersCount, prevAgg] = await Promise.all([
    prisma.order.aggregate({
      where: { shopId: shop.id, financialStatus: "PAID", createdAt: { gte: since } },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.order.count({ where: { shopId: shop.id, createdAt: { gte: since } } }),
    prisma.customer.count({ where: { shopId: shop.id, createdAt: { gte: since } } }),
    prisma.order.aggregate({
      where: {
        shopId: shop.id,
        financialStatus: "PAID",
        createdAt: { gte: new Date(Date.now() - 2 * days * 86400_000), lt: since },
      },
      _sum: { total: true },
      _count: { _all: true },
    }),
  ]);
  const revenue = Number(paidAgg._sum.total ?? 0);
  const orders = paidAgg._count._all;
  const aov = orders > 0 ? revenue / orders : 0;
  const conversionRate = allOrdersCount > 0 ? (orders / allOrdersCount) * 100 : 0;
  const prevRevenue = Number(prevAgg._sum.total ?? 0);
  const prevOrders = prevAgg._count._all;
  const revenueDelta = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : null;
  const ordersDelta = prevOrders > 0 ? ((orders - prevOrders) / prevOrders) * 100 : null;

  // Série temporelle : commandes par jour
  const rawOrders = await prisma.order.findMany({
    where: { shopId: shop.id, financialStatus: "PAID", createdAt: { gte: since } },
    select: { createdAt: true, total: true },
  });
  const byDay = new Map<string, { revenue: number; orders: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - (days - 1 - i) * 86400_000);
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, { revenue: 0, orders: 0 });
  }
  for (const o of rawOrders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    const cur = byDay.get(key);
    if (cur) {
      cur.revenue += Number(o.total);
      cur.orders += 1;
    }
  }
  const series = Array.from(byDay.entries()).map(([date, v]) => ({ date, ...v }));

  // Top produits par CA
  const items = await prisma.orderItem.findMany({
    where: { order: { shopId: shop.id, financialStatus: "PAID", createdAt: { gte: since } } },
    select: { productTitle: true, variantId: true, quantity: true, totalPrice: true },
  });
  const topMap = new Map<string, { title: string; revenue: number; qty: number }>();
  for (const it of items) {
    const key = it.productTitle;
    const cur = topMap.get(key) ?? { title: it.productTitle, revenue: 0, qty: 0 };
    cur.revenue += Number(it.totalPrice);
    cur.qty += it.quantity;
    topMap.set(key, cur);
  }
  const topProducts = Array.from(topMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Top codes promo
  const topDiscounts = await prisma.discountUsage.groupBy({
    by: ["discountId"],
    where: { createdAt: { gte: since }, discount: { shopId: shop.id } },
    _count: { _all: true },
    _sum: { amount: true },
    orderBy: { _count: { discountId: "desc" } },
    take: 5,
  });
  const discountsInfo = await prisma.discount.findMany({
    where: { id: { in: topDiscounts.map((t) => t.discountId) } },
    select: { id: true, code: true },
  });
  const topDiscountsEnriched = topDiscounts.map((t) => ({
    code: discountsInfo.find((d) => d.id === t.discountId)?.code ?? "?",
    uses: t._count._all,
    saved: Number(t._sum.amount ?? 0),
  }));

  return NextResponse.json({
    range: days,
    kpis: { revenue, orders, aov, conversionRate, customersCount, revenueDelta, ordersDelta },
    series,
    topProducts,
    topDiscounts: topDiscountsEnriched,
  });
}
