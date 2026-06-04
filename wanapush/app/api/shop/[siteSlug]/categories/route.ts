// GET  /api/shop/[siteSlug]/categories  → arbre des catégories
// POST /api/shop/[siteSlug]/categories  → crée une catégorie

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShopForUser, slugify } from "@/lib/shop";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  parentId: z.string().trim().max(64).nullable().optional(),
  description: z.string().trim().max(2000).optional(),
  imageUrl: z.url().max(2048).optional().or(z.literal("")),
  slug: z.string().trim().max(120).optional(),
});

type Params = { params: Promise<{ siteSlug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { siteSlug } = await params;
  const shop = await getShopForUser(session.user.email, siteSlug);
  if (!shop) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });

  const categories = await prisma.category.findMany({
    where: { shopId: shop.id },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { products: true, children: true } },
    },
  });
  return NextResponse.json({ categories });
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

  // Slug unique
  let baseSlug = slugify(input.slug ?? input.name);
  let slug = baseSlug;
  let n = 1;
  while (await prisma.category.findFirst({ where: { shopId: shop.id, slug } })) {
    n++; slug = `${baseSlug}-${n}`;
  }

  const cat = await prisma.category.create({
    data: {
      shopId: shop.id,
      slug,
      name: input.name,
      description: input.description ?? null,
      imageUrl: input.imageUrl || null,
      parentId: input.parentId ?? null,
    },
  });

  await prisma.auditLog.create({
    data: { shopId: shop.id, action: "category.create", resource: cat.id, details: { name: cat.name } },
  });

  revalidatePath(`/shop/${siteSlug}/categories`);
  return NextResponse.json({ category: cat });
}
