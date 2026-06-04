// PATCH  → update méthode
// DELETE → suppression

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShopForUser } from "@/lib/shop";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  type: z.enum(["FLAT", "WEIGHT_BASED", "PRICE_BASED", "FREE", "PICKUP"]).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  carrier: z.string().trim().max(120).nullable().optional(),
  flatRate: z.coerce.number().min(0).nullable().optional(),
  rules: z.unknown().optional(),
  freeAboveAmount: z.coerce.number().min(0).nullable().optional(),
  estimatedDays: z.string().trim().max(40).nullable().optional(),
  enabled: z.boolean().optional(),
  position: z.coerce.number().int().min(0).optional(),
});

type Params = { params: Promise<{ siteSlug: string; zoneId: string; methodId: string }> };

async function owned(userEmail: string, siteSlug: string, methodId: string) {
  const shop = await getShopForUser(userEmail, siteSlug);
  if (!shop) return null;
  const method = await prisma.shippingMethod.findFirst({
    where: { id: methodId, zone: { shopId: shop.id } },
  });
  if (!method) return null;
  return { shop, method };
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { siteSlug, methodId } = await params;
  const o = await owned(session.user.email, siteSlug, methodId);
  if (!o) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalide" },
      { status: 400 },
    );
  }
  const data: Record<string, unknown> = { ...parsed.data };
  const method = await prisma.shippingMethod.update({ where: { id: methodId }, data });
  revalidatePath(`/shop/${siteSlug}/shipping`);
  return NextResponse.json({ method });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { siteSlug, methodId } = await params;
  const o = await owned(session.user.email, siteSlug, methodId);
  if (!o) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  await prisma.shippingMethod.delete({ where: { id: methodId } });
  revalidatePath(`/shop/${siteSlug}/shipping`);
  return NextResponse.json({ ok: true });
}
