// PATCH  /api/shop/[siteSlug]/categories/[categoryId]  → update
// DELETE /api/shop/[siteSlug]/categories/[categoryId]  → delete (cascade children + product links)

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
  description: z.string().trim().max(2000).nullable().optional(),
  imageUrl: z.url().max(2048).nullable().optional().or(z.literal("")),
  parentId: z.string().trim().max(64).nullable().optional(),
  position: z.coerce.number().int().min(0).optional(),
});

type Params = { params: Promise<{ siteSlug: string; categoryId: string }> };

async function getOwned(userEmail: string, siteSlug: string, categoryId: string) {
  const shop = await getShopForUser(userEmail, siteSlug);
  if (!shop) return null;
  const cat = await prisma.category.findFirst({ where: { id: categoryId, shopId: shop.id } });
  if (!cat) return null;
  return { shop, cat };
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { siteSlug, categoryId } = await params;
  const owned = await getOwned(session.user.email, siteSlug, categoryId);
  if (!owned) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalide" },
      { status: 400 },
    );
  }
  const data: Record<string, unknown> = { ...parsed.data };
  // Empêche d'être son propre parent (boucle)
  if (data.parentId === categoryId) return NextResponse.json({ error: "Parent invalide" }, { status: 400 });

  const cat = await prisma.category.update({ where: { id: categoryId }, data });
  await prisma.auditLog.create({
    data: { shopId: owned.shop.id, action: "category.update", resource: cat.id, details: { fields: Object.keys(data) } },
  });
  revalidatePath(`/shop/${siteSlug}/categories`);
  return NextResponse.json({ category: cat });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { siteSlug, categoryId } = await params;
  const owned = await getOwned(session.user.email, siteSlug, categoryId);
  if (!owned) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await prisma.category.delete({ where: { id: categoryId } });
  await prisma.auditLog.create({
    data: { shopId: owned.shop.id, action: "category.delete", resource: categoryId, details: { name: owned.cat.name } },
  });
  revalidatePath(`/shop/${siteSlug}/categories`);
  return NextResponse.json({ ok: true });
}
