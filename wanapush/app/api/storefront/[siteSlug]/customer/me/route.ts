// GET /api/storefront/[siteSlug]/customer/me
// Retourne les infos du client authentifié (cookie) + ses commandes + adresses.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readCustomerCookie } from "@/lib/customer-auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ siteSlug: string }> };

export async function GET(req: Request, { params }: Params) {
  const { siteSlug } = await params;
  const shop = await prisma.shop.findUnique({ where: { siteSlug } });
  if (!shop) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });

  const token = readCustomerCookie(req);
  if (!token || token.shopId !== shop.id) {
    return NextResponse.json({ customer: null }, { status: 200 });
  }

  const customer = await prisma.customer.findUnique({
    where: { id: token.customerId },
    include: {
      addresses: { orderBy: { createdAt: "desc" } },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          financialStatus: true,
          fulfillmentStatus: true,
          total: true,
          currency: true,
          createdAt: true,
          shippingTracking: true,
          shippingCarrier: true,
          _count: { select: { items: true } },
        },
      },
    },
  });
  if (!customer) return NextResponse.json({ customer: null });

  return NextResponse.json({
    customer: {
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      totalSpent: Number(customer.totalSpent),
      ordersCount: customer.ordersCount,
      addresses: customer.addresses,
      orders: customer.orders,
    },
  });
}
