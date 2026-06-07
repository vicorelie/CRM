// POST /api/ads/audiences/auto-setup
//
// Auto-crée une Meta Custom Audience WEBSITE_TRAFFIC (30 jours, PageView)
// pour chaque SitePixel actif de l'utilisateur qui n'a pas encore d'audience.
//
// Logique :
//   1. Trouve tous les SitePixel enabled du user
//   2. Pour chaque pixel, vérifie si une AdAudience WEBSITE_TRAFFIC existe déjà
//      avec le même pixelId dans config.pixelId
//   3. Si non, appelle createMetaAudience → persiste en DB
//   4. Retourne le résumé { created, skipped, errors }
//
// Idempotent : un deuxième appel ne recrée pas les audiences déjà existantes.

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createMetaAudience } from "@/lib/ads/meta-audiences";

export const runtime = "nodejs";
export const maxDuration = 120;

type AutoSetupRow = {
  siteSlug: string;
  brandName: string;
  pixelId: string;
  adAccountId: string; // externalId de l'AdAccount (act_XXX)
  status: "created" | "skipped" | "error";
  audienceId?: string;
  audienceName?: string;
  error?: string;
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const user = await prisma.user.findUniqueOrThrow({
    where: { email: session.user.email },
    select: { id: true },
  });

  // Paramètre optionnel : forcer une fenêtre de rétention (défaut 30j)
  const body = await req.json().catch(() => ({})) as { retentionDays?: number };
  const retentionDays = Math.min(180, Math.max(1, Number(body.retentionDays ?? 30)));

  // 1. Tous les SitePixels actifs avec leur site + adAccount
  const sitePixels = await prisma.sitePixel.findMany({
    where: {
      enabled: true,
      adAccount: { userId: user.id, platform: "META_ADS" },
    },
    select: {
      pixelId: true,
      pixelName: true,
      adAccount: { select: { externalId: true } },
      generatedSite: { select: { meta: true } },
    },
  });

  if (sitePixels.length === 0) {
    return NextResponse.json({
      message: "Aucun pixel Meta actif trouvé. Configure d'abord un Pixel dans tes sites générés.",
      created: 0, skipped: 0, errors: 0, rows: [],
    });
  }

  const rows: AutoSetupRow[] = [];

  for (const sp of sitePixels) {
    const adAccountId = sp.adAccount.externalId;
    // Extraire siteSlug et brandName depuis le JSON meta du GeneratedSite
    const siteMeta = sp.generatedSite.meta as Record<string, unknown> | null;
    const siteSlug = (siteMeta?.siteSlug as string) ?? "inconnu";
    const brandName = (siteMeta?.brandName as string) ?? siteSlug;

    // 2. Vérifier si une audience WEBSITE_TRAFFIC existe déjà pour ce pixelId
    const existing = await prisma.adAudience.findFirst({
      where: {
        userId: user.id,
        platform: "META_ADS",
        type: "WEBSITE_TRAFFIC",
        config: { path: "$.pixelId", equals: sp.pixelId },
      },
      select: { id: true, name: true },
    });

    if (existing) {
      rows.push({
        siteSlug, brandName, pixelId: sp.pixelId, adAccountId,
        status: "skipped",
        audienceId: existing.id,
        audienceName: existing.name,
      });
      continue;
    }

    // 3. Créer l'audience
    const audienceName = `${brandName} — Visiteurs ${retentionDays}j`;
    const description = `Retargeting automatique — site ${siteSlug} — pixel ${sp.pixelId}`;

    try {
      const result = await createMetaAudience(user.id, {
        type: "WEBSITE_TRAFFIC",
        adAccountId,
        name: audienceName,
        description,
        config: {
          pixelId: sp.pixelId,
          retentionDays,
          rules: [{ event: "PageView" }],
        },
      });

      rows.push({
        siteSlug, brandName, pixelId: sp.pixelId, adAccountId,
        status: "created",
        audienceId: result.audienceId,
        audienceName,
      });
    } catch (e) {
      rows.push({
        siteSlug, brandName, pixelId: sp.pixelId, adAccountId,
        status: "error",
        error: e instanceof Error ? e.message : String(e),
      });
      console.error(`[auto-setup] Erreur pixel ${sp.pixelId}:`, e instanceof Error ? e.message : e);
    }
  }

  const created = rows.filter((r) => r.status === "created").length;
  const skipped = rows.filter((r) => r.status === "skipped").length;
  const errors = rows.filter((r) => r.status === "error").length;

  if (created > 0) revalidatePath("/ads");

  return NextResponse.json({ created, skipped, errors, rows }, { status: created > 0 ? 201 : 200 });
}
