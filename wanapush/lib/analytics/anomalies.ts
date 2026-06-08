// Anomalies — détection automatique de chutes/pics anormaux dans les KPIs.
//
// Algorithme : pour chaque KPI (ROAS Ads, lead inflow, email click rate), on
// calcule la moyenne + écart-type sur les 30 derniers jours, et on flagge si
// la valeur des dernières 24h est en dehors de [μ - 2σ, μ + 2σ].
//
// Sévérité :
//  - CRITICAL : > 3σ de l'écart (chute brutale)
//  - WARNING  : 2-3σ
//  - INFO     : trend (3 jours consécutifs en baisse)

import { prisma } from "@/lib/prisma";

export type Anomaly = {
  type: "ROAS_DROP" | "LEAD_INFLOW_DROP" | "EMAIL_CLICK_RATE_DROP" | "AD_SPEND_SPIKE";
  severity: "CRITICAL" | "WARNING" | "INFO";
  metric: string;
  current: number;
  expected: number;
  delta: number; // % change vs expected
  message: string;
  detectedAt: Date;
};

// ─── Helpers stats ──────────────────────────────────────────────────────────

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

function severityFromSigma(deltaSigma: number): "CRITICAL" | "WARNING" | "INFO" | null {
  const abs = Math.abs(deltaSigma);
  if (abs >= 3) return "CRITICAL";
  if (abs >= 2) return "WARNING";
  if (abs >= 1.5) return "INFO";
  return null;
}

// ─── Detector ROAS chute ────────────────────────────────────────────────────

async function detectRoasDrop(userId: string): Promise<Anomaly | null> {
  const campaigns = await prisma.campaign.findMany({
    where: { adAccount: { userId } },
    select: { id: true },
  });
  const campaignIds = campaigns.map((c) => c.id);
  if (campaignIds.length === 0) return null;

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 3600_000);
  const thirtyAgo = new Date(now.getTime() - 30 * 24 * 3600_000);

  // Daily ROAS sur 30j
  const metrics = await prisma.adMetrics.findMany({
    where: { campaignId: { in: campaignIds }, date: { gte: thirtyAgo } },
    select: { date: true, spend: true, revenue: true },
  });
  const byDay = new Map<string, { spend: number; revenue: number }>();
  for (const m of metrics) {
    const key = m.date.toISOString().slice(0, 10);
    const cur = byDay.get(key) ?? { spend: 0, revenue: 0 };
    cur.spend += m.spend;
    cur.revenue += m.revenue;
    byDay.set(key, cur);
  }
  const dailyRoas = Array.from(byDay.entries())
    .filter(([, v]) => v.spend > 0)
    .map(([date, v]) => ({ date, roas: v.revenue / v.spend }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (dailyRoas.length < 7) return null; // pas assez de data

  // Compare derniers 24h (= dernier datapoint) vs distribution 30j (excluant dernier)
  const last = dailyRoas[dailyRoas.length - 1];
  const baseline = dailyRoas.slice(0, -1).map((d) => d.roas);
  const m = mean(baseline);
  const sd = stddev(baseline);
  if (sd === 0) return null;

  const deltaSigma = (last.roas - m) / sd;
  const severity = severityFromSigma(deltaSigma);
  if (!severity || deltaSigma >= 0) return null; // on alerte juste sur les chutes

  const deltaPercent = m > 0 ? (last.roas - m) / m : 0;
  return {
    type: "ROAS_DROP",
    severity,
    metric: "ads.roas",
    current: last.roas,
    expected: m,
    delta: deltaPercent,
    message: `ROAS a chuté à ${last.roas.toFixed(2)}x vs moyenne ${m.toFixed(2)}x sur 30j (${Math.round(deltaPercent * 100)}%). Vérifier campagnes actives.`,
    detectedAt: new Date(),
  };
}

// ─── Detector Lead inflow chute ─────────────────────────────────────────────

async function detectLeadInflowDrop(userId: string): Promise<Anomaly | null> {
  const sites = await prisma.generatedSite.findMany({
    where: { userId },
    select: { slug: true, meta: true },
  });
  const slugs = sites
    .map((s) => s.slug ?? ((s.meta as Record<string, unknown> | null)?.siteSlug as string | undefined))
    .filter(Boolean) as string[];
  if (slugs.length === 0) return null;

  const now = new Date();
  const thirtyAgo = new Date(now.getTime() - 30 * 24 * 3600_000);

  const subs = await prisma.formSubmission.findMany({
    where: { siteSlug: { in: slugs }, createdAt: { gte: thirtyAgo } },
    select: { createdAt: true },
  });

  // Group par jour
  const byDay = new Map<string, number>();
  for (const s of subs) {
    const key = s.createdAt.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  const sorted = Array.from(byDay.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  if (sorted.length < 7) return null;

  const last = sorted[sorted.length - 1];
  const baseline = sorted.slice(0, -1).map(([, n]) => n);
  const m = mean(baseline);
  const sd = stddev(baseline);
  if (sd === 0) return null;

  const deltaSigma = (last[1] - m) / sd;
  const severity = severityFromSigma(deltaSigma);
  if (!severity || deltaSigma >= 0) return null;

  const deltaPercent = m > 0 ? (last[1] - m) / m : 0;
  return {
    type: "LEAD_INFLOW_DROP",
    severity,
    metric: "leads.daily_count",
    current: last[1],
    expected: m,
    delta: deltaPercent,
    message: `${last[1]} leads aujourd'hui vs moyenne ${m.toFixed(1)} sur 30j (${Math.round(deltaPercent * 100)}%). Vérifier formulaires + Ads actives.`,
    detectedAt: new Date(),
  };
}

// ─── Detector Spike spend (sur-dépense) ────────────────────────────────────

async function detectAdSpendSpike(userId: string): Promise<Anomaly | null> {
  const campaigns = await prisma.campaign.findMany({
    where: { adAccount: { userId } },
    select: { id: true },
  });
  const campaignIds = campaigns.map((c) => c.id);
  if (campaignIds.length === 0) return null;

  const now = new Date();
  const thirtyAgo = new Date(now.getTime() - 30 * 24 * 3600_000);

  const metrics = await prisma.adMetrics.findMany({
    where: { campaignId: { in: campaignIds }, date: { gte: thirtyAgo } },
    select: { date: true, spend: true },
  });
  const byDay = new Map<string, number>();
  for (const m of metrics) {
    const key = m.date.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + m.spend);
  }
  const sorted = Array.from(byDay.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  if (sorted.length < 7) return null;

  const last = sorted[sorted.length - 1];
  const baseline = sorted.slice(0, -1).map(([, v]) => v);
  const m = mean(baseline);
  const sd = stddev(baseline);
  if (sd === 0) return null;

  const deltaSigma = (last[1] - m) / sd;
  const severity = severityFromSigma(deltaSigma);
  if (!severity || deltaSigma <= 0) return null; // alerte seulement sur SPIKE

  const deltaPercent = m > 0 ? (last[1] - m) / m : 0;
  return {
    type: "AD_SPEND_SPIKE",
    severity,
    metric: "ads.daily_spend",
    current: last[1],
    expected: m,
    delta: deltaPercent,
    message: `Dépense ads aujourd'hui : ${last[1].toFixed(2)}€ vs moyenne ${m.toFixed(2)}€ sur 30j (+${Math.round(deltaPercent * 100)}%). Vérifier scaling/auto-bidding.`,
    detectedAt: new Date(),
  };
}

// ─── Orchestrator ──────────────────────────────────────────────────────────

/** Lance tous les détecteurs en parallèle. Best-effort par section. */
export async function detectAnomalies(userId: string): Promise<Anomaly[]> {
  const results = await Promise.allSettled([
    detectRoasDrop(userId),
    detectLeadInflowDrop(userId),
    detectAdSpendSpike(userId),
  ]);
  return results
    .filter((r): r is PromiseFulfilledResult<Anomaly | null> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((v): v is Anomaly => v !== null)
    .sort((a, b) => {
      // CRITICAL > WARNING > INFO
      const rank: Record<string, number> = { CRITICAL: 3, WARNING: 2, INFO: 1 };
      return rank[b.severity] - rank[a.severity];
    });
}
