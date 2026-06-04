// GET/PATCH/DELETE /api/shop/[siteSlug]/customers/[customerId]

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShopForUser } from "@/lib/shop";
import { z } from "zod";

export const runtime = "nodejs";

type Params = { params: Promise<{ siteSlug: string; customerId: string }> };

async function getCustomerForShop(siteSlug: string, customerId: string, userEmail: string) {
  const shop = await getShopForUser(userEmail, siteSlug);
  if (!shop) return null;
  const customer = await prisma.customer.findFirst({ where: { id: customerId, shopId: shop.id } });
  return customer ? { shop, customer } : null;
}

export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { siteSlug, customerId } = await params;
  const data = await getCustomerForShop(siteSlug, customerId, session.user.email);
  if (!data) return NextResponse.json({ error: "Client introuvable" }, { status: 404 });

  const [addresses, orders, reviews] = await Promise.all([
    prisma.address.findMany({ where: { customerId }, orderBy: { isDefault: "desc" } }),
    prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, orderNumber: true, total: true, currency: true, financialStatus: true, fulfillmentStatus: true, createdAt: true },
    }),
    prisma.review.count({ where: { customerId } }),
  ]);

  return NextResponse.json({
    customer: {
      ...data.customer,
      totalSpent: Number(data.customer.totalSpent),
      createdAt: data.customer.createdAt.toISOString(),
      lastOrderAt: data.customer.lastOrderAt?.toISOString() ?? null,
    },
    addresses,
    orders: orders.map((o) => ({ ...o, total: Number(o.total), createdAt: o.createdAt.toISOString() })),
    reviewsCount: reviews,
    currency: data.shop.currency,
    locale: data.shop.locale,
  });
}

const patchSchema = z.object({
  notes: z.string().max(2000).nullable().optional(),
  blocked: z.boolean().optional(),
  blockedReason: z.string().max(500).nullable().optional(),
  marketingConsent: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { siteSlug, customerId } = await params;
  const data = await getCustomerForShop(siteSlug, customerId, session.user.email);
  if (!data) return NextResponse.json({ error: "Client introuvable" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const update: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.marketingConsent === true && !data.customer.marketingConsent) {
    update.marketingConsentAt = new Date();
  }

  const updated = await prisma.customer.update({ where: { id: customerId }, data: update });
  return NextResponse.json({
    customer: {
      ...updated,
      totalSpent: Number(updated.totalSpent),
      createdAt: updated.createdAt.toISOString(),
      lastOrderAt: updated.lastOrderAt?.toISOString() ?? null,
    },
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { siteSlug, customerId } = await params;
  const data = await getCustomerForShop(siteSlug, customerId, session.user.email);
  if (!data) return NextResponse.json({ error: "Client introuvable" }, { status: 404 });

  await prisma.customer.delete({ where: { id: customerId } });
  return NextResponse.json({ ok: true });
}
