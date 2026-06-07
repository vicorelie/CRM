// Cron : optimisation continue des campagnes pub (daily, après le cron sync).
// Analyse toutes les campagnes actives éligibles et applique PAUSE / SCALE / REDUCE_BUDGET.
// Envoie un email digest par user dès qu'au moins 1 action a été appliquée (via Resend).
//
// Garde-fous :
//   - Seules les campagnes dont updatedAt > MIN_DAYS_BETWEEN_ACTIONS sont traitées
//     (évite les boucles scale/reduce quotidiennes)
//   - Plafond de 100 campagnes par tick
//   - Protégé par CRON_SECRET (header x-cron-secret ou ?secret=)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeCampaign, applyOptimization, DEFAULT_THRESHOLDS } from "@/lib/ads/auto-optimizer";
import { sendOptimizerDigest } from "@/lib/ads/optimizer-email";
import type { OptimizationAction } from "@/lib/ads/auto-optimizer";
import type { OptimizerEmailRow } from "@/lib/ads/optimizer-email";
import type { AdPlatform } from "@/lib/ads/types";

export const runtime = "nodejs";
export const maxDuration = 600;

const MIN_DAYS_BETWEEN_ACTIONS = 3;
const MAX_CAMPAIGNS_PER_TICK = 100;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");
  return got === secret;
}

type SummaryRow = {
  userId: string;
  campaignId: string;
  campaignName: string;
  platform: string;
  action: OptimizationAction;
  applied: boolean;
  roas: number | null;
  spend: number;
  currentBudget: number | null;
  newBudget: number | null;
  error?: string;
};

async function tick() {
  const cutoff = new Date(Date.now() - MIN_DAYS_BETWEEN_ACTIONS * 24 * 60 * 60 * 1000);

  const candidates = await prisma.campaign.findMany({
    where: {
      status: { in: ["ACTIVE", "PAUSED"] },
      externalId: { not: null },
      updatedAt: { lt: cutoff },
    },
    select: {
      id: true,
      business: { select: { userId: true } },
    },
    take: MAX_CAMPAIGNS_PER_TICK,
    orderBy: { updatedAt: "asc" },
  });

  const summary: SummaryRow[] = [];

  for (const { id, business } of candidates) {
    const suggestion = await analyzeCampaign(id, DEFAULT_THRESHOLDS);
    if (!suggestion) continue;

    const baseRow: Omit<SummaryRow, "applied" | "error"> = {
      userId: business.userId,
      campaignId: id,
      campaignName: suggestion.campaignName,
      platform: suggestion.platform,
      action: suggestion.action,
      roas: suggestion.metrics.roas,
      spend: suggestion.metrics.spend,
      currentBudget: suggestion.currentDailyBudget,
      newBudget: suggestion.newDailyBudget,
    };

    if (suggestion.action === "WATCH" || suggestion.action === "INSUFFICIENT_DATA") {
      summary.push({ ...baseRow, applied: false });
      continue;
    }

    const result = await applyOptimization(suggestion);
    summary.push({ ...baseRow, applied: result.applied, error: result.appliedError });

    console.log(
      `[cron/optimize] ${result.applied ? "✅" : "❌"} ${suggestion.action} — ${suggestion.campaignName} (${id}) [${suggestion.platform}]`,
      result.appliedError ?? `ROAS=${suggestion.metrics.roas?.toFixed(2) ?? "n/a"} spend=${suggestion.metrics.spend.toFixed(2)}€`,
    );
  }

  // ─── Email digest par user ─────────────────────────────────────────────────
  // On regroupe les actions appliquées par userId et on envoie un seul email par user.
  const byUser = new Map<string, OptimizerEmailRow[]>();
  for (const row of summary) {
    if (!row.applied) continue;
    const arr = byUser.get(row.userId) ?? [];
    arr.push({
      campaignId: row.campaignId,
      campaignName: row.campaignName,
      platform: row.platform as AdPlatform,
      action: row.action,
      roas: row.roas,
      spend: row.spend,
      currentBudget: row.currentBudget,
      newBudget: row.newBudget,
    });
    byUser.set(row.userId, arr);
  }

  const emailsSent: string[] = [];
  for (const [userId, emailRows] of Array.from(byUser)) {
    const sent = await sendOptimizerDigest(userId, emailRows);
    if (sent) emailsSent.push(userId);
  }

  // ─── Résumé ────────────────────────────────────────────────────────────────
  const applied = summary.filter((s) => s.applied).length;
  const watchOrInsufficient = summary.filter(
    (s) => s.action === "WATCH" || s.action === "INSUFFICIENT_DATA",
  ).length;
  const failed = summary.filter((s) => !s.applied && s.error).length;

  return {
    processedAt: new Date().toISOString(),
    total: summary.length,
    applied,
    watchOrInsufficient,
    failed,
    emailsSent: emailsSent.length,
    details: summary,
  };
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await tick());
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await tick());
}
