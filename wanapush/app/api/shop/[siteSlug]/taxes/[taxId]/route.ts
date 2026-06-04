// PATCH  /api/shop/[siteSlug]/taxes/[taxId]
// DELETE /api/shop/[siteSlug]/taxes/[taxId]

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShopForUser } from "@/lib/shop";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  rate: z.coerce.number().min(0).max(100).optional(),
  country: z.string().trim().length(2).optional(),
  region: z.string().trim().max(80).nullable().optional(),
  appliesToShipping: z.boolean().optional(),
  enabled: z.boolean().optional(),
  position: z.coerce.number().int().min(0).optional(),
});

type Params = { params: Promise<{ siteSlug: string; taxId: string }> };

async function owned(userEmail: string, siteSlug: string, taxId: string) {
  const shop = await getShopForUser(userEmail, siteSlug);
  if (!shop) return null;
  const tax = await prisma.taxRate.findFirst({ where: { id: taxId, shopId: shop.id } });
  if (!tax) return null;
  return { shop, tax };
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { siteSlug, taxId } = await params;
  const o = await owned(session.user.email, siteSlug, taxId);
  if (!o) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalide" },
      { status: 400 },
    );
  }
  const data: Record<string, unknown> = { ...parsed.data };
  if (typeof data.country === "string") data.country = data.country.toUpperCase();
  const tax = await prisma.taxRate.update({ where: { id: taxId }, data });
  revalidatePath(`/shop/${siteSlug}/taxes`);
  return NextResponse.json({ tax });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { siteSlug, taxId } = await params;
  const o = await owned(session.user.email, siteSlug, taxId);
  if (!o) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  await prisma.taxRate.delete({ where: { id: taxId } });
  revalidatePath(`/shop/${siteSlug}/taxes`);
  return NextResponse.json({ ok: true });
}
