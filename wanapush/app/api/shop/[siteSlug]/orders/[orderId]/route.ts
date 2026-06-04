// GET /api/shop/[siteSlug]/orders/[orderId] → détail commande

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShopForUser } from "@/lib/shop";

export const runtime = "nodejs";

type Params = { params: Promise<{ siteSlug: string; orderId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { siteSlug, orderId } = await params;
  const shop = await getShopForUser(session.user.email, siteSlug);
  if (!shop) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });

  const order = await prisma.order.findFirst({
    where: { id: orderId, shopId: shop.id },
    include: {
      items: true,
      refunds: true,
      fulfillments: true,
      customer: true,
    },
  });
  if (!order) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ order });
}
