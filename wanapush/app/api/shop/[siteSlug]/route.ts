// GET   /api/shop/[siteSlug]  → détail + stats agrégées
// PATCH /api/shop/[siteSlug]  → update settings (nom, devise, paiement, shipping...)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShopForUser } from "@/lib/shop";
import { encrypt } from "@/lib/crypto";

export const runtime = "nodejs";

const patchSchema = z.object({
  // Identité boutique
  name: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  currency: z.string().trim().length(3).optional(),
  locale: z.string().trim().max(10).optional(),
  timezone: z.string().trim().max(64).optional(),
  weightUnit: z.string().trim().max(8).optional(),
  // Contact
  email: z.email().trim().toLowerCase().max(255).optional(),
  phone: z.string().trim().max(40).optional(),
  legalName: z.string().trim().max(200).optional(),
  legalAddress: z.string().trim().max(500).optional(),
  vatNumber: z.string().trim().max(40).optional(),
  logoUrl: z.url().max(2048).optional().or(z.literal("")),
  // Stripe (non-sensible)
  stripeAccountId: z.string().trim().max(64).optional(),
  stripePublishableKey: z.string().trim().max(255).optional(),
  stripeMode: z.enum(["test", "live"]).optional(),
  // Stripe (sensible — chiffré)
  stripeSecretKey: z.string().max(255).optional(),
  stripeWebhookSecret: z.string().max(255).optional(),
  // PayPal
  paypalClientId: z.string().trim().max(255).optional(),
  paypalMode: z.enum(["test", "live"]).optional(),
  paypalSecret: z.string().max(255).optional(),
  // Settings
  taxesIncluded: z.boolean().optional(),
  requireShipping: z.boolean().optional(),
  allowGuestCheckout: z.boolean().optional(),
  orderNumberFormat: z.string().trim().max(64).optional(),
  fromEmail: z.email().trim().toLowerCase().max(255).optional(),
  fromName: z.string().trim().max(120).optional(),
  // Setup
  setupCompleted: z.boolean().optional(),
  setupStep: z.coerce.number().int().min(0).max(20).optional(),
});

type Params = { params: Promise<{ siteSlug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { siteSlug } = await params;
  const shop = await getShopForUser(session.user.email, siteSlug);
  if (!shop) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });

  // Stats agrégées
  const [productsCount, ordersCount, customersCount, recentOrders] = await Promise.all([
    prisma.product.count({ where: { shopId: shop.id } }),
    prisma.order.count({ where: { shopId: shop.id } }),
    prisma.customer.count({ where: { shopId: shop.id } }),
    prisma.order.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        customerEmail: true,
        total: true,
        currency: true,
        status: true,
        financialStatus: true,
        createdAt: true,
      },
    }),
  ]);

  // Ne JAMAIS retourner les clés chiffrées en clair
  // (sauf indication "est défini" pour l'UI)
  return NextResponse.json({
    shop: {
      ...shop,
      stripeSecretKey: undefined,
      stripeWebhookSecret: undefined,
      paypalSecret: undefined,
      hasStripeKeys: !!shop.stripeSecretKey,
      hasPaypalKeys: !!shop.paypalSecret,
    },
    stats: {
      productsCount,
      ordersCount,
      customersCount,
    },
    recentOrders,
  });
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { siteSlug } = await params;
  const shop = await getShopForUser(session.user.email, siteSlug);
  if (!shop) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalide" },
      { status: 400 },
    );
  }

  // Construit data avec uniquement les champs présents (Zod garantit le typage)
  const data: Record<string, unknown> = { ...parsed.data };

  // Champs sensibles : on chiffre AVANT de stocker
  if (typeof data.stripeSecretKey === "string" && data.stripeSecretKey.length > 0) {
    data.stripeSecretKey = encrypt(data.stripeSecretKey);
  } else {
    delete data.stripeSecretKey;
  }
  if (typeof data.stripeWebhookSecret === "string" && data.stripeWebhookSecret.length > 0) {
    data.stripeWebhookSecret = encrypt(data.stripeWebhookSecret);
  } else {
    delete data.stripeWebhookSecret;
  }
  if (typeof data.paypalSecret === "string" && data.paypalSecret.length > 0) {
    data.paypalSecret = encrypt(data.paypalSecret);
  } else {
    delete data.paypalSecret;
  }

  const [updated] = await prisma.$transaction([
    prisma.shop.update({
      where: { id: shop.id },
      data,
    }),
    prisma.auditLog.create({
      data: {
        shopId: shop.id,
        action: "shop.update",
        details: { changedFields: Object.keys(data) },
      },
    }),
  ]);

  revalidatePath(`/shop/${siteSlug}`);
  return NextResponse.json({
    shop: {
      ...updated,
      stripeSecretKey: undefined,
      stripeWebhookSecret: undefined,
      paypalSecret: undefined,
      hasStripeKeys: !!updated.stripeSecretKey,
      hasPaypalKeys: !!updated.paypalSecret,
    },
  });
}
