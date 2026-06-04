import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShopForUser } from "@/lib/shop";
import { ProductEditor, type ProductInitial } from "../ProductEditor";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ siteSlug: string; productId: string }>;
}) {
  const { siteSlug, productId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const shop = await getShopForUser(session.user.email, siteSlug);
  if (!shop) notFound();

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
          optionValues: { include: { optionValue: { include: { option: true } } } },
          stockLevels: true,
        },
        orderBy: { position: "asc" },
      },
      tags: true,
      categories: true,
    },
  });
  if (!product) notFound();

  const initial: Partial<ProductInitial> = {
    id: product.id,
    title: product.title,
    description: product.description ?? "",
    excerpt: product.excerpt ?? "",
    status: product.status,
    productType: product.productType,
    vendor: product.vendor ?? "",
    featured: product.featured,
    metaTitle: product.metaTitle ?? "",
    metaDescription: product.metaDescription ?? "",
    images: product.images.map((i) => ({ url: i.url, alt: i.alt ?? "" })),
    options: product.options.map((o) => ({
      name: o.name,
      values: o.values.map((v) => v.value),
      valueMeta: Object.fromEntries(o.values.map((v) => [v.value, { color: v.color ?? null, imageUrl: v.imageUrl ?? null }])),
    })),
    variants: product.variants.map((v) => {
      // Resolve imageId → imageIndex via product.images position
      let imageIndex: number | null = null;
      if (v.imageId) {
        const idx = product.images.findIndex((im) => im.id === v.imageId);
        if (idx >= 0) imageIndex = idx;
      }
      return {
        key: v.optionValues.map((ov) => ov.optionValue.value).join(" / ") || "default",
        optionValues: v.optionValues.map((ov) => ({
          optionName: ov.optionValue.option.name,
          value: ov.optionValue.value,
        })),
        sku: v.sku ?? "",
        barcode: v.barcode ?? "",
        price: Number(v.price),
        compareAt: v.compareAt == null ? null : Number(v.compareAt),
        cost: v.cost == null ? null : Number(v.cost),
        weight: v.weight == null ? null : Number(v.weight),
        requiresShipping: v.requiresShipping,
        stock: v.stockLevels.reduce((sum, sl) => sum + sl.quantity, 0),
        imageIndex,
      };
    }),
    tags: product.tags.map((t) => t.tag),
    categoryIds: product.categories.map((c) => c.categoryId),
  };

  return <ProductEditor siteSlug={siteSlug} initial={initial} productId={productId} currency={shop.currency} />;
}
