// GET /api/shop/[siteSlug]/orders → liste des commandes avec filtres

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
  const financial = url.searchParams.get("financial");
  const fulfillment = url.searchParams.get("fulfillment");
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10)));

  const where: Record<string, unknown> = { shopId: shop.id };
  if (q) where.OR = [{ orderNumber: { contains: q } }, { customerEmail: { contains: q } }, { customerName: { contains: q } }];
  if (financial) where.financialStatus = financial;
  if (fulfillment) where.fulfillmentStatus = fulfillment;

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      financialStatus: true,
      fulfillmentStatus: true,
      customerEmail: true,
      customerName: true,
      currency: true,
      total: true,
      createdAt: true,
      _count: { select: { items: true } },
    },
  });
  return NextResponse.json({ orders });
}
