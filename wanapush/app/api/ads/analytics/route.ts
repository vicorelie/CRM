// GET /api/ads/analytics?days=7|30|90
// Agrège les KPIs des campagnes de l'utilisateur sur la période demandée.
// Retourne :
//   - résumé global (spend, roas, impressions, clicks, conversions, ctr, cpc, cpa)
//   - breakdown par plateforme
//   - breakdown par jour (pour sparkline)
//   - détail par campagne (triées par spend desc)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const ALLOWED_DAYS = [7, 30, 90] as const;
type Days = (typeof ALLOWED_DAYS)[number];

function safeDiv(a: number, b: number): number | null {
  return b > 0 ? a / b : null;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = new URL(req.url);
  const rawDays = Number(url.searchParams.get("days") ?? "7");
  const days: Days = ALLOWED_DAYS.includes(rawDays as Days) ? (rawDays as Days) : 7;

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Toutes les métriques de l'utilisateur sur la période
  const rows = await prisma.adMetrics.findMany({
    where: {
      date: { gte: since },
      campaign: {
        business: { user: { email: session.user.email } },
      },
    },
    select: {
      date: true,
      spend: true,
      impressions: true,
      clicks: true,
      conversions: true,
      revenue: true,
      campaign: {
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          dailyBudget: true,
        },
      },
    },
    orderBy: { date: "asc" },
  });

  // ─── Agrégats global ─────────────────────────────────────────────────────────
  let totalSpend = 0;
  let totalRevenue = 0;
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalConversions = 0;

  for (const r of rows) {
    totalSpend += r.spend;
    totalRevenue += r.revenue;
    totalImpressions += r.impressions;
    totalClicks += r.clicks;
    totalConversions += r.conversions;
  }

  const global = {
    spend: totalSpend,
    revenue: totalRevenue,
    roas: safeDiv(totalRevenue, totalSpend),
    impressions: totalImpressions,
    clicks: totalClicks,
    conversions: totalConversions,
    ctr: safeDiv(totalClicks, totalImpressions),
    cpc: safeDiv(totalSpend, totalClicks),
    cpa: safeDiv(totalSpend, totalConversions),
  };

  // ─── Breakdown par plateforme ─────────────────────────────────────────────────
  const byPlatform = new Map<
    string,
    { spend: number; revenue: number; impressions: number; clicks: number; conversions: number }
  >();

  for (const r of rows) {
    const p = r.campaign.type;
    if (!byPlatform.has(p)) byPlatform.set(p, { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 });
    const acc = byPlatform.get(p)!;
    acc.spend += r.spend;
    acc.revenue += r.revenue;
    acc.impressions += r.impressions;
    acc.clicks += r.clicks;
    acc.conversions += r.conversions;
  }

  const platforms = Array.from(byPlatform.entries()).map(([platform, m]) => ({
    platform,
    ...m,
    roas: safeDiv(m.revenue, m.spend),
    ctr: safeDiv(m.clicks, m.impressions),
    spendShare: safeDiv(m.spend, totalSpend),
  })).sort((a, b) => b.spend - a.spend);

  // ─── Breakdown par jour (sparkline) ─────────────────────────────────────────
  const byDay = new Map<string, { spend: number; revenue: number; conversions: number }>();

  for (const r of rows) {
    const key = r.date.toISOString().slice(0, 10);
    if (!byDay.has(key)) byDay.set(key, { spend: 0, revenue: 0, conversions: 0 });
    const acc = byDay.get(key)!;
    acc.spend += r.spend;
    acc.revenue += r.revenue;
    acc.conversions += r.conversions;
  }

  // Remplir les jours manquants avec des zéros
  const daily: Array<{ date: string; spend: number; revenue: number; roas: number | null; conversions: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    const m = byDay.get(key) ?? { spend: 0, revenue: 0, conversions: 0 };
    daily.push({ date: key, spend: m.spend, revenue: m.revenue, roas: safeDiv(m.revenue, m.spend), conversions: m.conversions });
  }

  // ─── Détail par campagne ──────────────────────────────────────────────────────
  const byCampaign = new Map<
    string,
    { name: string; platform: string; status: string; dailyBudget: number | null; spend: number; revenue: number; impressions: number; clicks: number; conversions: number }
  >();

  for (const r of rows) {
    const id = r.campaign.id;
    if (!byCampaign.has(id)) {
      byCampaign.set(id, {
        name: r.campaign.name,
        platform: r.campaign.type,
        status: r.campaign.status,
        dailyBudget: r.campaign.dailyBudget,
        spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0,
      });
    }
    const acc = byCampaign.get(id)!;
    acc.spend += r.spend;
    acc.revenue += r.revenue;
    acc.impressions += r.impressions;
    acc.clicks += r.clicks;
    acc.conversions += r.conversions;
  }

  const campaigns = Array.from(byCampaign.entries())
    .map(([id, c]) => ({
      id,
      ...c,
      roas: safeDiv(c.revenue, c.spend),
      ctr: safeDiv(c.clicks, c.impressions),
      cpc: safeDiv(c.spend, c.clicks),
      cpa: safeDiv(c.spend, c.conversions),
    }))
    .filter((c) => c.spend > 0)
    .sort((a, b) => b.spend - a.spend);

  return NextResponse.json({ days, global, platforms, daily, campaigns });
}
