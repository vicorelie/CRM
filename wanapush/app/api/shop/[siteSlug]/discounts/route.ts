// GET  /api/shop/[siteSlug]/discounts → liste
// POST /api/shop/[siteSlug]/discounts → crée

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShopForUser } from "@/lib/shop";

export const runtime = "nodejs";

const createSchema = z.object({
  code: z.string().trim().min(1).max(64),
  description: z.string().trim().max(500).optional(),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING", "BUY_X_GET_Y"]),
  value: z.coerce.number().min(0).max(100000),
  minSubtotal: z.coerce.number().min(0).optional(),
  minQuantity: z.coerce.number().int().min(0).optional(),
  firstOrderOnly: z.boolean().optional(),
  oncePerCustomer: z.boolean().optional(),
  usageLimit: z.coerce.number().int().min(0).optional(),
  startsAt: z.iso.datetime().optional(),
  endsAt: z.iso.datetime().optional(),
  enabled: z.boolean().optional(),
});

type Params = { params: Promise<{ siteSlug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { siteSlug } = await params;
  const shop = await getShopForUser(session.user.email, siteSlug);
  if (!shop) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });

  const discounts = await prisma.discount.findMany({
    where: { shopId: shop.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ discounts });
}

export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { siteSlug } = await params;
  const shop = await getShopForUser(session.user.email, siteSlug);
  if (!shop) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalide" },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // Code uppercase + unique (par shop)
  const code = input.code.toUpperCase();
  const exist = await prisma.discount.findFirst({ where: { shopId: shop.id, code } });
  if (exist) return NextResponse.json({ error: "Code déjà utilisé" }, { status: 409 });

  const discount = await prisma.$transaction(async (tx) => {
    const created = await tx.discount.create({
      data: {
        shopId: shop.id,
        code,
        description: input.description ?? null,
        type: input.type,
        value: input.value,
        minSubtotal: input.minSubtotal ?? null,
        minQuantity: input.minQuantity ?? null,
        firstOrderOnly: input.firstOrderOnly ?? false,
        oncePerCustomer: input.oncePerCustomer ?? false,
        usageLimit: input.usageLimit ?? null,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        enabled: input.enabled !== false,
      },
    });
    await tx.auditLog.create({
      data: { shopId: shop.id, action: "discount.create", resource: created.id, details: { code } },
    });
    return created;
  });

  revalidatePath(`/shop/${siteSlug}/discounts`);
  return NextResponse.json({ discount });
}
