// Product Feed Sync — sync produits Shop Prisma vers Meta Catalog + Google Merchant.
//
// Pourquoi c'est critique en 2026 :
//  - Meta Advantage+ Catalog Ads (DPA) = format e-commerce avec le meilleur ROAS
//    (2-5× retargeting standard sur catalogues 50+ SKUs)
//  - Google Content API for Shopping est SUNSET le 18 août 2026 → migration
//    obligatoire vers Merchant API v1 (v1beta shutdown 2026-02-28)
//
// Architecture :
//  - 1 service unifié `syncProductCrossPlatform(productId)` qui fan-out aux 2
//  - Auto-résolution via AdAccount.meta.metaCatalog + AdAccount.meta.googleMerchant
//  - Best-effort par plateforme : un échec sur Meta n'impacte pas Google
//  - Le `retailer_id`/`offerId` = ProductVariant.id (cuid) — pas besoin de cache d'IDs externes
//
// Docs :
//  - Meta : https://developers.facebook.com/docs/marketing-api/catalog-batch
//  - Google : https://developers.google.com/merchant/api/reference/rest/products_v1/accounts.productInputs
//
// Configuration AdAccount.meta requise :
//  Meta : { metaCatalog: { id: "1234567890", businessId: "...optional..." } }
//  Google : { googleMerchant: { accountId: "1234567", dataSourceId: "9876543" } }

import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

const GRAPH = "https://graph.facebook.com/v25.0";
const MERCHANT_API = "https://merchantapi.googleapis.com/products/v1";

// ─── Types publics ───────────────────────────────────────────────────────────

export type SyncOperation = "CREATE" | "UPDATE" | "DELETE";

export type ProductSyncResult = {
  platform: "META" | "GOOGLE_MERCHANT";
  ok: boolean;
  synced: number;
  error?: string;
  /** Pour debug : nb d'items échoués (Meta batch peut accepter une partie) */
  failed?: number;
};

export type CrossPlatformSyncResult = {
  productId: string;
  meta?: ProductSyncResult;
  google?: ProductSyncResult;
};

// ─── Helpers de transformation Prisma → format externe ───────────────────────

type ShopProductForSync = {
  id: string;
  shopId: string;
  slug: string;
  title: string;
  description: string | null;
  vendor: string | null;
  status: string;
  shop: {
    siteSlug: string;
    name: string;
    currency: string;
    locale: string;
  };
  images: Array<{ url: string; alt: string | null }>;
  variants: Array<{
    id: string;
    sku: string | null;
    title: string;
    price: { toString: () => string }; // Prisma Decimal
    compareAt: { toString: () => string } | null;
    weight: { toString: () => string } | null;
    image: { url: string } | null;
  }>;
};

/** Convertit un produit Prisma vers le format `data` d'un item Meta Catalog.
 *  La variante par défaut (1ère) est utilisée pour les champs prix/SKU si elle existe.
 *  Pour les produits avec multi-variantes, idéalement 1 item Meta par variante. */
function productToMetaItemData(
  product: ShopProductForSync,
  variant: ShopProductForSync["variants"][0],
): Record<string, unknown> {
  const baseUrl = `https://wanapush.com/preview/${product.shop.siteSlug}/products/${product.slug}`;
  const imageUrl = variant.image?.url ?? product.images[0]?.url ?? "";
  const price = `${Number(variant.price).toFixed(2)} ${product.shop.currency}`;

  const data: Record<string, unknown> = {
    title: product.title.slice(0, 200),
    description: (product.description ?? product.title).slice(0, 9999),
    // ProductStatus enum : DRAFT | ACTIVE | ARCHIVED
    availability: product.status === "ACTIVE" ? "in stock" : "out of stock",
    condition: "new",
    price,
    link: baseUrl,
    image_link: imageUrl,
    brand: product.vendor ?? product.shop.name,
  };
  if (variant.compareAt && Number(variant.compareAt) > Number(variant.price)) {
    data.sale_price = price;
    data.price = `${Number(variant.compareAt).toFixed(2)} ${product.shop.currency}`;
  }
  if (variant.sku) data.gtin = variant.sku;
  return data;
}

/** Convertit un produit Prisma vers le format Google Merchant `productAttributes`. */
function productToMerchantInput(
  product: ShopProductForSync,
  variant: ShopProductForSync["variants"][0],
): Record<string, unknown> {
  const baseUrl = `https://wanapush.com/preview/${product.shop.siteSlug}/products/${product.slug}`;
  const imageUrl = variant.image?.url ?? product.images[0]?.url ?? "";
  // Locale "fr-FR" → contentLanguage "fr", feedLabel "FR" (Merchant API convention)
  const [lang, country] = product.shop.locale.split("-");

  const attributes: Record<string, unknown> = {
    title: product.title.slice(0, 150),
    description: (product.description ?? product.title).slice(0, 5000),
    link: baseUrl,
    imageLink: imageUrl,
    availability: product.status === "ACTIVE" ? "in_stock" : "out_of_stock",
    condition: "new",
    brand: product.vendor ?? product.shop.name,
    price: {
      amountMicros: String(Math.round(Number(variant.price) * 1_000_000)),
      currencyCode: product.shop.currency,
    },
  };
  if (variant.compareAt && Number(variant.compareAt) > Number(variant.price)) {
    attributes.salePrice = attributes.price;
    attributes.price = {
      amountMicros: String(Math.round(Number(variant.compareAt) * 1_000_000)),
      currencyCode: product.shop.currency,
    };
  }
  if (variant.sku) attributes.gtin = variant.sku;

  return {
    name: `accounts/{account}/productInputs/online~${lang}~${country ?? "FR"}~${variant.id}`,
    channel: "ONLINE",
    offerId: variant.id,
    contentLanguage: lang,
    feedLabel: country?.toUpperCase() ?? "FR",
    productAttributes: attributes,
  };
}

// ─── Meta Catalog Batch API ─────────────────────────────────────────────────

/** POST /{catalog_id}/items_batch — sync inline produits vers Meta Catalog.
 *  Pattern préféré au product_feeds CSV (temps réel, pas de scheduling). */
export async function syncToMetaCatalog(
  accessToken: string,
  catalogId: string,
  operations: Array<{ method: SyncOperation; retailerId: string; data?: Record<string, unknown> }>,
): Promise<ProductSyncResult> {
  if (operations.length === 0) return { platform: "META", ok: true, synced: 0 };
  // Meta items_batch : max 5000 requests par batch
  if (operations.length > 5000) {
    throw new Error(`Meta items_batch max 5000 (reçu ${operations.length}). Batche côté caller.`);
  }

  const requests = operations.map((op) => {
    const req: Record<string, unknown> = {
      method: op.method,
      retailer_id: op.retailerId,
    };
    if (op.method !== "DELETE" && op.data) req.data = op.data;
    return req;
  });

  const r = await fetch(`${GRAPH}/${catalogId}/items_batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: accessToken,
      item_type: "PRODUCT_ITEM",
      requests,
      allow_upsert: true, // CREATE/UPDATE indifférent — Meta gère
    }),
  });
  const text = await r.text();
  if (!r.ok) {
    return {
      platform: "META",
      ok: false,
      synced: 0,
      error: text.slice(0, 500),
    };
  }
  // Réponse : { handles: ["..."], validation_status: [...] }
  // Pour notre usage : tous les requests acceptés tant que 200
  return { platform: "META", ok: true, synced: operations.length };
}

// ─── Google Merchant API v1 ─────────────────────────────────────────────────

/** POST /accounts/{accountId}/productInputs:insert — un produit à la fois.
 *  Pas de batch natif côté Merchant API v1 → on appelle en série (rate limit
 *  élevé pour les supplemental data sources). */
export async function syncToGoogleMerchant(
  accessToken: string,
  accountId: string,
  dataSourceId: string,
  products: Array<{ productInput: Record<string, unknown>; operation: SyncOperation }>,
): Promise<ProductSyncResult> {
  if (products.length === 0) return { platform: "GOOGLE_MERCHANT", ok: true, synced: 0 };

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const { productInput, operation } of products) {
    try {
      if (operation === "DELETE") {
        // DELETE : accounts/{accountId}/productInputs/{name}
        const productName = (productInput as { name?: string }).name;
        if (!productName) {
          failed++;
          continue;
        }
        const r = await fetch(`${MERCHANT_API}/${productName.replace("{account}", accountId)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (r.ok || r.status === 404) synced++;
        else {
          failed++;
          errors.push(`DELETE ${r.status}`);
        }
      } else {
        // INSERT/UPDATE : Merchant API gère upsert via dataSource supplemental
        const cleaned = { ...productInput };
        delete cleaned.name; // Le name est calculé côté Google, on l'envoie pas en insert
        const url = `${MERCHANT_API}/accounts/${accountId}/productInputs:insert?dataSource=accounts/${accountId}/dataSources/${dataSourceId}`;
        const r = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(cleaned),
        });
        if (r.ok) synced++;
        else {
          failed++;
          const errText = await r.text();
          errors.push(`${r.status}: ${errText.slice(0, 150)}`);
        }
      }
    } catch (e) {
      failed++;
      errors.push(e instanceof Error ? e.message.slice(0, 100) : String(e).slice(0, 100));
    }
  }

  return {
    platform: "GOOGLE_MERCHANT",
    ok: failed === 0,
    synced,
    failed: failed > 0 ? failed : undefined,
    error: errors.length > 0 ? errors.slice(0, 3).join(" | ") : undefined,
  };
}

// ─── Orchestrator cross-platform ────────────────────────────────────────────

/** Sync UN produit (toutes ses variantes) vers les plateformes configurées.
 *  Auto-résolution des AdAccounts Meta + Google connectés du Shop owner.
 *  Best-effort par plateforme : retourne le statut séparé pour chaque. */
export async function syncProductCrossPlatform(
  productId: string,
  operation: SyncOperation = "UPDATE",
): Promise<CrossPlatformSyncResult> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      shopId: true,
      slug: true,
      title: true,
      description: true,
      vendor: true,
      status: true,
      shop: {
        select: {
          siteSlug: true,
          name: true,
          currency: true,
          locale: true,
          userId: true,
        },
      },
      images: { select: { url: true, alt: true }, take: 5, orderBy: { position: "asc" } },
      variants: {
        select: {
          id: true,
          sku: true,
          title: true,
          price: true,
          compareAt: true,
          weight: true,
          image: { select: { url: true } },
        },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!product) {
    return { productId, meta: { platform: "META", ok: false, synced: 0, error: "Product not found" } };
  }

  const result: CrossPlatformSyncResult = { productId };
  const shopForSync: ShopProductForSync = product as unknown as ShopProductForSync;
  const userId = product.shop.userId;

  // ─── Meta ────────────────────────────────────────────────────────────────
  try {
    const metaAccount = await prisma.adAccount.findFirst({
      where: { userId, platform: "META_ADS", status: "CONNECTED" },
      select: { accessToken: true, meta: true },
    });
    const metaCfg = (metaAccount?.meta as Record<string, unknown> | null)?.metaCatalog as
      | { id?: string }
      | undefined;
    if (metaAccount && metaCfg?.id) {
      const ops = product.variants.map((v) => ({
        method: operation,
        retailerId: v.id,
        data: operation === "DELETE" ? undefined : productToMetaItemData(shopForSync, v as ShopProductForSync["variants"][0]),
      }));
      result.meta = await syncToMetaCatalog(decrypt(metaAccount.accessToken), metaCfg.id, ops);
    } else {
      result.meta = {
        platform: "META",
        ok: false,
        synced: 0,
        error: "AdAccount Meta non connecté ou AdAccount.meta.metaCatalog.id manquant",
      };
    }
  } catch (e) {
    result.meta = { platform: "META", ok: false, synced: 0, error: e instanceof Error ? e.message : String(e) };
  }

  // ─── Google Merchant ────────────────────────────────────────────────────
  try {
    const googleAccount = await prisma.adAccount.findFirst({
      where: { userId, platform: "GOOGLE_ADS", status: "CONNECTED" },
      select: { accessToken: true, refreshToken: true, tokenExpiresAt: true, meta: true },
    });
    const googleCfg = (googleAccount?.meta as Record<string, unknown> | null)?.googleMerchant as
      | { accountId?: string; dataSourceId?: string }
      | undefined;
    if (googleAccount && googleCfg?.accountId && googleCfg.dataSourceId) {
      // Refresh token Google si expiré
      let accessToken = decrypt(googleAccount.accessToken);
      const expSoon = googleAccount.tokenExpiresAt && googleAccount.tokenExpiresAt < new Date(Date.now() + 60_000);
      if (expSoon && googleAccount.refreshToken) {
        const id = process.env.GOOGLE_ADS_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? "";
        const secret = process.env.GOOGLE_ADS_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "";
        if (id && secret) {
          const r = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              refresh_token: decrypt(googleAccount.refreshToken),
              client_id: id,
              client_secret: secret,
              grant_type: "refresh_token",
            }).toString(),
          });
          const j = (await r.json()) as { access_token?: string };
          if (j.access_token) accessToken = j.access_token;
        }
      }
      const items = product.variants.map((v) => ({
        productInput: productToMerchantInput(shopForSync, v as ShopProductForSync["variants"][0]),
        operation,
      }));
      result.google = await syncToGoogleMerchant(
        accessToken,
        googleCfg.accountId,
        googleCfg.dataSourceId,
        items,
      );
    } else {
      result.google = {
        platform: "GOOGLE_MERCHANT",
        ok: false,
        synced: 0,
        error: "AdAccount Google non connecté ou AdAccount.meta.googleMerchant.{accountId,dataSourceId} manquant",
      };
    }
  } catch (e) {
    result.google = {
      platform: "GOOGLE_MERCHANT",
      ok: false,
      synced: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  return result;
}

/** Sync TOUS les produits PUBLISHED d'un Shop. Pour bulk sync initial / reconciliation.
 *  Fan-out parallèle limité (5 produits à la fois) pour ne pas saturer les APIs. */
export async function syncAllShopProducts(
  shopId: string,
  operation: SyncOperation = "UPDATE",
): Promise<{ total: number; results: CrossPlatformSyncResult[] }> {
  const products = await prisma.product.findMany({
    where: { shopId, status: "ACTIVE" },
    select: { id: true },
  });

  const results: CrossPlatformSyncResult[] = [];
  for (let i = 0; i < products.length; i += 5) {
    const batch = products.slice(i, i + 5);
    const r = await Promise.all(batch.map((p) => syncProductCrossPlatform(p.id, operation)));
    results.push(...r);
  }
  return { total: products.length, results };
}
