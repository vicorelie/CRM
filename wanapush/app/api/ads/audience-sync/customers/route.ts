// POST /api/ads/audience-sync/customers
// Sync tous les Customers d'un Shop comme Custom Audience cross-platform
// (Meta + LinkedIn + TikTok). Crée/met à jour les 3 audiences en parallèle.
//
// Body : { shopId: string, lookalike?: { ratio?: number, countryCode?: string } }
// Response : { syncId, results: [...], lookalike?: PlatformSyncResult }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  syncShopCustomersToAudiences,
  createMetaLookalikeFromSeed,
} from "@/lib/ads/audience-sync";

export const runtime = "nodejs";
export const maxDuration = 120;

const BodySchema = z.object({
  shopId: z.string().min(1),
  lookalike: z
    .object({
      ratio: z.number().min(0.01).max(0.2).optional(),
      countryCode: z.string().length(2).optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // Vérif ownership Shop
  const shop = await prisma.shop.findFirst({
    where: { id: parsed.data.shopId, user: { email: session.user.email } },
    select: { id: true },
  });
  if (!shop) return NextResponse.json({ error: "Shop non autorisé" }, { status: 404 });

  try {
    const sync = await syncShopCustomersToAudiences(shop.id);
    let lookalike = undefined;
    if (parsed.data.lookalike && sync.syncId) {
      lookalike = await createMetaLookalikeFromSeed(
        sync.syncId,
        parsed.data.lookalike.countryCode ?? "FR",
        parsed.data.lookalike.ratio ?? 0.01,
      );
    }
    return NextResponse.json({ syncId: sync.syncId, results: sync.results, lookalike });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
