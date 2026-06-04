// PATCH  /api/shop/[siteSlug]/discounts/[discountId] → update
// DELETE /api/shop/[siteSlug]/discounts/[discountId] → suppression

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShopForUser } from "@/lib/shop";

export const runtime = "nodejs";

const patchSchema = z.object({
  description: z.string().trim().max(500).nullable().optional(),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING", "BUY_X_GET_Y"]).optional(),
  value: z.coerce.number().min(0).max(100000).optional(),
  minSubtotal: z.coerce.number().min(0).nullable().optional(),
  minQuantity: z.coerce.number().int().min(0).nullable().optional(),
  firstOrderOnly: z.boolean().optional(),
  oncePerCustomer: z.boolean().optional(),
  usageLimit: z.coerce.number().int().min(0).nullable().optional(),
  startsAt: z.iso.datetime().nullable().optional(),
  endsAt: z.iso.datetime().nullable().optional(),
  enabled: z.boolean().optional(),
});

type Params = { params: Promise<{ siteSlug: string; discountId: string }> };

async function owned(userEmail: string, siteSlug: string, discountId: string) {
  const shop = await getShopForUser(userEmail, siteSlug);
  if (!shop) return null;
  const discount = await prisma.discount.findFirst({ where: { id: discountId, shopId: shop.id } });
  if (!discount) return null;
  return { shop, discount };
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { siteSlug, discountId } = await params;
  const o = await owned(session.user.email, siteSlug, discountId);
  if (!o) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalide" },
      { status: 400 },
    );
  }
  const data: Record<string, unknown> = { ...parsed.data };
  if (typeof data.startsAt === "string") data.startsAt = new Date(data.startsAt);
  if (typeof data.endsAt === "string") data.endsAt = new Date(data.endsAt);
  const discount = await prisma.discount.update({ where: { id: discountId }, data });
  revalidatePath(`/shop/${siteSlug}/discounts`);
  return NextResponse.json({ discount });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { siteSlug, discountId } = await params;
  const o = await owned(session.user.email, siteSlug, discountId);
  if (!o) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  await prisma.discount.delete({ where: { id: discountId } });
  revalidatePath(`/shop/${siteSlug}/discounts`);
  return NextResponse.json({ ok: true });
}
