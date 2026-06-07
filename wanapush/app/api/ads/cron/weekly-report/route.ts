// Cron : rapport hebdomadaire publicité (lundi 8h UTC).
// Agrège les KPIs des 7 derniers jours de toutes les campagnes actives
// et envoie un email par user ayant eu au moins 1 campagne avec dépense.
//
// Protégé par CRON_SECRET (header x-cron-secret ou ?secret=).
// Peut aussi être déclenché manuellement en POST avec un paramètre ?weekOffset=N
// (N semaines en arrière, pour test ou rattrapage).

import { NextResponse } from "next/server";
import { buildWeeklyReports, sendWeeklyReport } from "@/lib/ads/weekly-report-email";

export const runtime = "nodejs";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");
  return got === secret;
}

async function tick(weekOffset = 0) {
  // Période : du lundi [weekOffset+1] semaines passées au lundi [weekOffset] semaines passées
  const now = new Date();
  // Trouve le lundi 00:00 UTC de la semaine courante
  const dayOfWeek = now.getUTCDay(); // 0=dim, 1=lun
  const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysToLastMonday));

  const weekEnd = new Date(thisMonday.getTime() - weekOffset * 7 * 24 * 60 * 60 * 1000);
  const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

  console.log(`[cron/weekly-report] Période : ${weekStart.toISOString()} → ${weekEnd.toISOString()}`);

  const reports = await buildWeeklyReports(weekStart, weekEnd);
  const results = await Promise.all(reports.map(sendWeeklyReport));
  const sent = results.filter(Boolean).length;

  return {
    processedAt: new Date().toISOString(),
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    reportsBuilt: reports.length,
    emailsSent: sent,
    noData: reports.filter((r) => r.campaigns.length === 0).length,
  };
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const weekOffset = Number(new URL(req.url).searchParams.get("weekOffset") ?? "0");
  return NextResponse.json(await tick(weekOffset));
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({})) as { weekOffset?: number };
  return NextResponse.json(await tick(body.weekOffset ?? 0));
}
