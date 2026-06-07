// POST /api/shop/[siteSlug]/products/sync-feeds
//
// Bulk sync de tous les produits PUBLISHED d'un Shop vers les feeds externes
// (Meta Catalog + Google Merchant API). À utiliser :
//  - Une fois après configuration initiale du catalog Meta + Google Merchant
//  - Pour reconciliation périodique (cron mensuel par ex)
//  - Après bulk import produits
//
// Sync incrémental sur create/update individuel : appeler directement
// `syncProductCrossPlatform(productId)` depuis le endpoint produit CRUD.
//
// Body : { operation?: "CREATE" | "UPDATE" | "DELETE" } (défaut UPDATE — Meta/Google upsert)
// Response : { total, results: [{ productId, meta?, google? }] }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncAllShopProducts } from "@/lib/ads/product-feed-sync";

export const runtime = "nodejs";
export const maxDuration = 300;

const BodySchema = z.object({
  operation: z.enum(["CREATE", "UPDATE", "DELETE"]).optional(),
});

type Params = { params: Promise<{ siteSlug: string }> };

export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { siteSlug } = await params;
  const shop = await prisma.shop.findFirst({
    where: { siteSlug, user: { email: session.user.email } },
    select: { id: true },
  });
  if (!shop) {
    return NextResponse.json({ error: "Shop introuvable ou non autorisé" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = BodySchema.safeParse(body);
  const operation = parsed.success ? parsed.data.operation ?? "UPDATE" : "UPDATE";

  try {
    const result = await syncAllShopProducts(shop.id, operation);
    // Compute summary par plateforme
    const summary = {
      meta: { ok: 0, fail: 0 },
      google: { ok: 0, fail: 0 },
    };
    for (const r of result.results) {
      if (r.meta?.ok) summary.meta.ok++;
      else if (r.meta) summary.meta.fail++;
      if (r.google?.ok) summary.google.ok++;
      else if (r.google) summary.google.fail++;
    }
    return NextResponse.json({
      total: result.total,
      summary,
      results: result.results.slice(0, 50), // troncate pour réponse < 100k
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
