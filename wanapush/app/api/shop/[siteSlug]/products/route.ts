// GET  /api/shop/[siteSlug]/products  → liste paginée + filtres (q, status, category)
// POST /api/shop/[siteSlug]/products  → crée un produit (avec variants/options/images)

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShopForUser, uniqueProductSlug, syncOptionsWithCatalog } from "@/lib/shop";

export const runtime = "nodejs";

type Params = { params: Promise<{ siteSlug: string }> };

export async function GET(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { siteSlug } = await params;
  const shop = await getShopForUser(session.user.email, siteSlug);
  if (!shop) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const status = url.searchParams.get("status"); // DRAFT | ACTIVE | ARCHIVED
  const categoryId = url.searchParams.get("category") ?? undefined;
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10)));
  const cursor = url.searchParams.get("cursor") ?? undefined;

  const where: Record<string, unknown> = { shopId: shop.id };
  if (q) where.title = { contains: q };
  if (status === "DRAFT" || status === "ACTIVE" || status === "ARCHIVED") {
    where.status = status;
  }
  if (categoryId) {
    where.categories = { some: { categoryId } };
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: [{ position: "asc" }, { updatedAt: "desc" }],
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      images: { orderBy: { position: "asc" }, take: 1 },
      variants: {
        select: { id: true, price: true, sku: true },
        orderBy: { position: "asc" },
      },
      _count: { select: { variants: true } },
    },
  });

  let nextCursor: string | null = null;
  if (products.length > limit) {
    const last = products.pop();
    nextCursor = last?.id ?? null;
  }

  return NextResponse.json({ products, nextCursor });
}

type VariantInput = {
  optionValues?: Array<{ optionName: string; value: string }>;
  sku?: string | null;
  barcode?: string | null;
  price: number;
  compareAt?: number | null;
  cost?: number | null;
  weight?: number | null;
  requiresShipping?: boolean;
  stock?: number; // quantité par défaut sur le default location
  imageIndex?: number | null; // index dans body.images
};

export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { siteSlug } = await params;
  const shop = await getShopForUser(session.user.email, siteSlug);
  if (!shop) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });

  let body: {
    title: string;
    description?: string;
    excerpt?: string;
    slug?: string;
    status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
    productType?: "PHYSICAL" | "DIGITAL" | "SERVICE";
    vendor?: string;
    featured?: boolean;
    metaTitle?: string;
    metaDescription?: string;
    images?: Array<{ url: string; alt?: string }>;
    options?: Array<{ name: string; values: Array<string | { value: string; color?: string | null; imageUrl?: string | null }> }>;
    variants?: VariantInput[];
    categoryIds?: string[];
    tags?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  if (!body.title || body.title.trim().length === 0) {
    return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  }

  const slug = await uniqueProductSlug(shop.id, body.slug ?? body.title);

  // Canonicalise les noms d'options contre le catalogue ShopOption (source unique)
  // et upsert le catalogue. "Couleur" devient "Couleurs" si ce dernier existe déjà.
  const { options: canonicalOptions, renames: optionRenames } =
    await syncOptionsWithCatalog(shop.id, body.options ?? []);
  // Propage les renames aux variantes pour qu'elles continuent de matcher.
  if (optionRenames.size > 0 && body.variants) {
    for (const v of body.variants) {
      for (const ov of v.optionValues ?? []) {
        const renamed = optionRenames.get(ov.optionName);
        if (renamed) ov.optionName = renamed;
      }
    }
  }

  // Construction des options + valeurs (accepte string ou objet {value, color, imageUrl})
  function normalizeValue(v: string | { value: string; color?: string | null; imageUrl?: string | null }): { value: string; color: string | null; imageUrl: string | null } {
    if (typeof v === "string") return { value: v, color: null, imageUrl: null };
    return { value: v.value, color: v.color ?? null, imageUrl: v.imageUrl ?? null };
  }
  const optionsCreate = canonicalOptions.map((opt, i) => ({
    name: opt.name,
    position: i,
    values: {
      create: opt.values.map((v, j) => {
        const n = normalizeValue(v);
        return { value: n.value, color: n.color, imageUrl: n.imageUrl, position: j };
      }),
    },
  }));

  // Si aucune option : on crée une variante "Default" unique
  const variantsToCreate: VariantInput[] =
    body.variants && body.variants.length > 0
      ? body.variants
      : [
          {
            optionValues: [],
            price: 0,
            stock: 0,
          },
        ];

  // Atomique : product + variantes + stock + audit en un seul $transaction.
  // Sans ça, un crash entre la création du product et celle des variantes
  // laissait un produit fantôme sans variantes (panier impossible).
  const product = await prisma.$transaction(
    async (tx) => {
      const created = await tx.product.create({
        data: {
          shopId: shop.id,
          slug,
          title: body.title.trim(),
          description: body.description ?? null,
          excerpt: body.excerpt ?? null,
          status: body.status ?? "DRAFT",
          productType: body.productType ?? "PHYSICAL",
          vendor: body.vendor ?? null,
          featured: body.featured ?? false,
          metaTitle: body.metaTitle ?? null,
          metaDescription: body.metaDescription ?? null,
          publishedAt: body.status === "ACTIVE" ? new Date() : null,
          images: {
            create: (body.images ?? []).map((img, i) => ({
              url: img.url,
              alt: img.alt ?? null,
              position: i,
            })),
          },
          options: { create: optionsCreate },
          tags: {
            create: (body.tags ?? []).map((tag) => ({ tag: tag.toLowerCase() })),
          },
          categories: body.categoryIds
            ? { create: body.categoryIds.map((categoryId) => ({ categoryId })) }
            : undefined,
        },
        include: {
          options: { include: { values: true } },
          images: true,
        },
      });

      // Cherché une seule fois avant la boucle (au lieu de 1 fois par variante).
      let defaultLoc = await tx.stockLocation.findFirst({
        where: { shopId: shop.id, isDefault: true },
        select: { id: true },
      });

      // Crée les variantes APRÈS (besoin des optionValueIds générés)
      for (let i = 0; i < variantsToCreate.length; i++) {
        const v = variantsToCreate[i];
        const ovIds: string[] = [];
        if (v.optionValues) {
          for (const ov of v.optionValues) {
            const opt = created.options.find((o) => o.name === ov.optionName);
            const val = opt?.values.find((vv) => vv.value === ov.value);
            if (val) ovIds.push(val.id);
          }
        }
        const variantTitle =
          v.optionValues && v.optionValues.length > 0
            ? v.optionValues.map((ov) => ov.value).join(" / ")
            : "Default";

        // Résout imageIndex (de body.images) → ProductImage.id (par position)
        let imageId: string | null = null;
        if (typeof v.imageIndex === "number" && v.imageIndex >= 0) {
          const img = created.images.find((im) => im.position === v.imageIndex);
          if (img) imageId = img.id;
        }

        const variant = await tx.productVariant.create({
          data: {
            productId: created.id,
            title: variantTitle,
            sku: v.sku ?? null,
            barcode: v.barcode ?? null,
            price: v.price,
            compareAt: v.compareAt ?? null,
            cost: v.cost ?? null,
            weight: v.weight ?? null,
            requiresShipping: v.requiresShipping ?? true,
            imageId,
            position: i,
            optionValues: {
              create: ovIds.map((optionValueId) => ({ optionValueId })),
            },
          },
        });

        if (typeof v.stock === "number") {
          if (!defaultLoc) {
            defaultLoc = await tx.stockLocation.create({
              data: { shopId: shop.id, name: "Stock principal", isDefault: true },
              select: { id: true },
            });
          }
          await tx.stockLevel.create({
            data: {
              variantId: variant.id,
              locationId: defaultLoc.id,
              quantity: v.stock,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: { shopId: shop.id, action: "product.create", resource: created.id, details: { title: created.title } },
      });

      return created;
    },
    { timeout: 30_000 },
  );

  revalidatePath(`/shop/${siteSlug}/products`);
  return NextResponse.json({ product });
}
