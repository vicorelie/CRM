// GET    /api/shop/[siteSlug]/products/[productId]  → détail complet
// PATCH  /api/shop/[siteSlug]/products/[productId]  → update produit + variantes + images
// DELETE /api/shop/[siteSlug]/products/[productId]  → suppression

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShopForUser, syncOptionsWithCatalog } from "@/lib/shop";

export const runtime = "nodejs";

type Params = { params: Promise<{ siteSlug: string; productId: string }> };

async function getProduct(userEmail: string, siteSlug: string, productId: string) {
  const shop = await getShopForUser(userEmail, siteSlug);
  if (!shop) return { error: "Boutique introuvable", status: 404 as const };
  const product = await prisma.product.findFirst({
    where: { id: productId, shopId: shop.id },
    include: {
      images: { orderBy: { position: "asc" } },
      options: {
        include: { values: { orderBy: { position: "asc" } } },
        orderBy: { position: "asc" },
      },
      variants: {
        include: {
          optionValues: { include: { optionValue: true } },
          stockLevels: { include: { location: true } },
          image: true,
        },
        orderBy: { position: "asc" },
      },
      categories: { include: { category: true } },
      tags: true,
    },
  });
  if (!product) return { error: "Produit introuvable", status: 404 as const };
  return { shop, product };
}

export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { siteSlug, productId } = await params;
  const res = await getProduct(session.user.email, siteSlug, productId);
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json({ product: res.product });
}

type ProductPatchBody = {
  title?: string;
  description?: string;
  excerpt?: string;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  productType?: "PHYSICAL" | "DIGITAL" | "SERVICE";
  vendor?: string;
  featured?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  // Replace images/variants/options/etc. atomically
  images?: Array<{ url: string; alt?: string }>;
  options?: Array<{ name: string; values: Array<string | { value: string; color?: string | null; imageUrl?: string | null }> }>;
  variants?: Array<{
    optionValues?: Array<{ optionName: string; value: string }>;
    sku?: string | null;
    barcode?: string | null;
    price: number;
    compareAt?: number | null;
    cost?: number | null;
    weight?: number | null;
    requiresShipping?: boolean;
    stock?: number;
    imageIndex?: number | null;
  }>;
  categoryIds?: string[];
  tags?: string[];
};

export async function PATCH(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { siteSlug, productId } = await params;
  const res = await getProduct(session.user.email, siteSlug, productId);
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.status });
  const { shop, product } = res;

  let body: ProductPatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  // Champs simples
  const scalarUpdate: Record<string, unknown> = {};
  const simple: (keyof ProductPatchBody)[] = [
    "title", "description", "excerpt", "status", "productType",
    "vendor", "featured", "metaTitle", "metaDescription",
  ];
  for (const k of simple) {
    if (k in body) scalarUpdate[k] = (body as Record<string, unknown>)[k];
  }
  if (body.status === "ACTIVE" && !product.publishedAt) {
    scalarUpdate.publishedAt = new Date();
  }

  // syncOptionsWithCatalog touche la table catalogue ShopOption (writes
  // séparées non liées au produit) — gardé hors $transaction pour ne pas
  // tenir un verrou sur ces lignes pendant tout le replace variants/stocks.
  const sync = (body.options || body.variants)
    ? (body.options
        ? await syncOptionsWithCatalog(shop.id, body.options)
        : { options: [], renames: new Map<string, string>() })
    : null;
  if (sync && sync.renames.size > 0 && body.variants) {
    for (const v of body.variants) {
      for (const ov of v.optionValues ?? []) {
        const renamed = sync.renames.get(ov.optionName);
        if (renamed) ov.optionName = renamed;
      }
    }
  }

  // Atomique : tout le replace du produit (images + options + variants +
  // stock + tags + categories + audit) dans un seul $transaction. Évite
  // qu'un crash mi-parcours laisse le produit avec des options sans valeurs
  // ou des variantes orphelines.
  await prisma.$transaction(
    async (tx) => {
      await tx.product.update({ where: { id: product.id }, data: scalarUpdate });

      // Images : on remplace tout si fourni (ordre = ordre dans le tableau)
      if (body.images) {
        await tx.productImage.deleteMany({ where: { productId: product.id } });
        for (let i = 0; i < body.images.length; i++) {
          const img = body.images[i];
          await tx.productImage.create({
            data: { productId: product.id, url: img.url, alt: img.alt ?? null, position: i },
          });
        }
      }

      // Options + variants : remplace tout si options fourni (ATTENTION : casse les
      // données stock historiques). En Phase 1 on accepte ce comportement, en
      // Phase 2 on fera du diff intelligent.
      if (sync) {
        // Delete variants first (cascade leur option values + stock levels)
        await tx.productVariant.deleteMany({ where: { productId: product.id } });
        if (body.options) {
          // Cascade supprime les values aussi
          await tx.productOption.deleteMany({ where: { productId: product.id } });
          for (let i = 0; i < sync.options.length; i++) {
            const opt = sync.options[i];
            await tx.productOption.create({
              data: {
                productId: product.id,
                name: opt.name,
                position: i,
                values: {
                  create: opt.values.map((v, j) => {
                    const n = typeof v === "string"
                      ? { value: v, color: null as string | null, imageUrl: null as string | null }
                      : { value: v.value, color: v.color ?? null, imageUrl: v.imageUrl ?? null };
                    return { value: n.value, color: n.color, imageUrl: n.imageUrl, position: j };
                  }),
                },
              },
            });
          }
        }

        // Récup options à jour pour mapper les variants
        const currentOptions = await tx.productOption.findMany({
          where: { productId: product.id },
          include: { values: true },
        });

        // Récupère les images courantes pour résoudre imageIndex → imageId
        const currentImages = await tx.productImage.findMany({
          where: { productId: product.id },
          orderBy: { position: "asc" },
          select: { id: true, position: true },
        });

        // Cherché une seule fois avant la boucle.
        let defaultLoc = await tx.stockLocation.findFirst({
          where: { shopId: shop.id, isDefault: true },
          select: { id: true },
        });

        const variantsToCreate =
          body.variants && body.variants.length > 0
            ? body.variants
            : [{ optionValues: [], price: 0, stock: 0 }];

        for (let i = 0; i < variantsToCreate.length; i++) {
          const v = variantsToCreate[i];
          const ovIds: string[] = [];
          if (v.optionValues) {
            for (const ov of v.optionValues) {
              const opt = currentOptions.find((o) => o.name === ov.optionName);
              const val = opt?.values.find((vv) => vv.value === ov.value);
              if (val) ovIds.push(val.id);
            }
          }
          const variantTitle =
            v.optionValues && v.optionValues.length > 0
              ? v.optionValues.map((ov) => ov.value).join(" / ")
              : "Default";

          let imageId: string | null = null;
          if (typeof v.imageIndex === "number" && v.imageIndex >= 0) {
            const img = currentImages.find((im) => im.position === v.imageIndex);
            if (img) imageId = img.id;
          }

          const variant = await tx.productVariant.create({
            data: {
              productId: product.id,
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
              optionValues: { create: ovIds.map((optionValueId) => ({ optionValueId })) },
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
              data: { variantId: variant.id, locationId: defaultLoc.id, quantity: v.stock },
            });
          }
        }
      }

      // Tags : remplace
      if (body.tags) {
        await tx.productTag.deleteMany({ where: { productId: product.id } });
        for (const tag of body.tags) {
          await tx.productTag.create({ data: { productId: product.id, tag: tag.toLowerCase() } });
        }
      }

      // Categories : remplace
      if (body.categoryIds) {
        await tx.productCategory.deleteMany({ where: { productId: product.id } });
        for (const categoryId of body.categoryIds) {
          await tx.productCategory.create({ data: { productId: product.id, categoryId } });
        }
      }

      await tx.auditLog.create({
        data: {
          shopId: shop.id,
          action: "product.update",
          resource: product.id,
          details: { changedFields: Object.keys(body) },
        },
      });
    },
    { timeout: 30_000 },
  );

  // Refetch complet
  const updated = await prisma.product.findUnique({
    where: { id: product.id },
    include: {
      images: { orderBy: { position: "asc" } },
      options: { include: { values: true }, orderBy: { position: "asc" } },
      variants: {
        include: {
          optionValues: { include: { optionValue: true } },
          stockLevels: { include: { location: true } },
        },
        orderBy: { position: "asc" },
      },
      categories: { include: { category: true } },
      tags: true,
    },
  });
  revalidatePath(`/shop/${siteSlug}/products`);
  revalidatePath(`/shop/${siteSlug}/products/${productId}`);
  return NextResponse.json({ product: updated });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { siteSlug, productId } = await params;
  const res = await getProduct(session.user.email, siteSlug, productId);
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.status });
  const { shop, product } = res;

  await prisma.$transaction([
    prisma.product.delete({ where: { id: product.id } }),
    prisma.auditLog.create({
      data: { shopId: shop.id, action: "product.delete", resource: product.id, details: { title: product.title } },
    }),
  ]);
  revalidatePath(`/shop/${siteSlug}/products`);
  return NextResponse.json({ ok: true });
}
