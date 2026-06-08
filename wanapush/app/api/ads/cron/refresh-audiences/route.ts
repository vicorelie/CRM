// Cron weekly : refresh des Custom Audiences AudienceSync existantes.
//
// Consensus best practice 2026 :
//  - Customers/Leads : refresh hebdomadaire (semaine active)
//  - Lookalikes : refresh bi-mensuel (12-15j typique)
//  - Exclusion buyers 30j : refresh hebdo aussi (rotation)
//
// Sécurité : header `x-cron-secret` ou query param `?secret=` vs `CRON_SECRET`.
// À schedule : `0 3 * * 1` (lundi 3h UTC) pour ne pas saturer en heure de pointe.
//
// Output : { total, byStatus: { synced, failed, skipped }, results: [...] }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  syncShopCustomersToAudiences,
  syncSiteLeadsToAudiences,
  createMetaLookalikeFromSeed,
} from "@/lib/ads/audience-sync";

export const runtime = "nodejs";
export const maxDuration = 600;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");
  return got === secret;
}

const MAX_SYNCS_PER_RUN = 100;

async function tick() {
  // 1. Refresh SYNCED audiences plus de 6j (rotation hebdo)
  // 2. Re-tente les FAILED de moins de 30j
  const cutoffStale = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
  const cutoffOld = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const staleSyncs = await prisma.audienceSync.findMany({
    where: {
      OR: [
        { status: "SYNCED", lastSyncedAt: { lt: cutoffStale } },
        { status: "FAILED", updatedAt: { gt: cutoffOld } },
      ],
      // Skip les LLA — elles dépendent du seed, refresh seulement le seed
      source: { in: ["CUSTOMERS", "LEADS"] },
    },
    select: { id: true, source: true, shopId: true, siteSlug: true, userId: true },
    take: MAX_SYNCS_PER_RUN,
  });

  // Dedup : 1 seul refresh par shopId/siteSlug (le fan-out sync les 3 plateformes)
  const dedup = new Map<string, typeof staleSyncs[0]>();
  for (const s of staleSyncs) {
    const key = s.source === "CUSTOMERS" ? `shop:${s.shopId}` : `site:${s.siteSlug}`;
    if (!dedup.has(key)) dedup.set(key, s);
  }

  const counts = { synced: 0, failed: 0, skipped: 0 };
  const results: Array<Record<string, unknown>> = [];

  for (const sync of Array.from(dedup.values())) {
    try {
      if (sync.source === "CUSTOMERS" && sync.shopId) {
        const r = await syncShopCustomersToAudiences(sync.shopId);
        const ok = r.results.some((res) => res.ok);
        if (ok) counts.synced++; else counts.failed++;
        results.push({ source: "CUSTOMERS", shopId: sync.shopId, results: r.results });
      } else if (sync.source === "LEADS" && sync.siteSlug) {
        const r = await syncSiteLeadsToAudiences(sync.siteSlug, sync.userId);
        const ok = r.results.some((res) => res.ok);
        if (ok) counts.synced++; else counts.failed++;
        results.push({ source: "LEADS", siteSlug: sync.siteSlug, results: r.results });
      } else {
        counts.skipped++;
      }
    } catch (e) {
      counts.failed++;
      results.push({
        source: sync.source,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // 3. Refresh LLA Meta : si seed re-sync OK et LLA plus de 12j
  const cutoffLla = new Date(Date.now() - 12 * 24 * 60 * 60 * 1000);
  const staleLlas = await prisma.audienceSync.findMany({
    where: {
      source: "LOOKALIKE",
      platform: "META_ADS",
      OR: [
        { status: "SYNCED", lastSyncedAt: { lt: cutoffLla } },
        { status: "FAILED", updatedAt: { gt: cutoffOld } },
      ],
    },
    select: { id: true, seedSyncId: true, countryCode: true, lookalikeRatio: true },
    take: 50,
  });
  for (const lla of staleLlas) {
    if (!lla.seedSyncId) continue;
    try {
      const r = await createMetaLookalikeFromSeed(
        lla.seedSyncId,
        lla.countryCode ?? "FR",
        lla.lookalikeRatio ?? 0.01,
      );
      if (r.ok) counts.synced++; else counts.failed++;
      results.push({ source: "LOOKALIKE", llaId: lla.id, result: r });
    } catch {
      counts.failed++;
    }
  }

  return { total: dedup.size + staleLlas.length, counts, results: results.slice(0, 50) };
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  return NextResponse.json(await tick());
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  return NextResponse.json(await tick());
}
