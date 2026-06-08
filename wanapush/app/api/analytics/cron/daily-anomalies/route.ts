// Cron daily : check anomalies CRITICAL, envoie alerte email immédiate.
//
// Schedule recommandé : `0 9 * * *` (9h UTC = 11h Paris)
// Best practice 2026 : 1 email/jour MAX par user, et SEULEMENT si CRITICAL.
// (Daily WARNING/INFO = email fatigue → on les remontera dans le weekly digest)
//
// Auth : `x-cron-secret` ou `?secret=` vs `CRON_SECRET`

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { detectAnomalies } from "@/lib/analytics/anomalies";
import { sendCriticalAnomalyAlert } from "@/lib/analytics/digest";
import { sendAnomalyAlertToSlack } from "@/lib/notifications/slack";

export const runtime = "nodejs";
export const maxDuration = 600;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");
  return got === secret;
}

const MAX_USERS_PER_RUN = 500;

async function tick() {
  // Restreint aux users avec assez de data pour avoir des anomalies (≥7j Ads
  // ou leads). Sinon les détecteurs retournent toujours null.
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { adAccounts: { some: { status: "CONNECTED" } } },
        { generatedSites: { some: {} } },
      ],
    },
    select: { id: true, email: true, name: true },
    take: MAX_USERS_PER_RUN,
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const totals = { CRITICAL: 0, WARNING: 0, INFO: 0 };
  const errors: Array<{ userId: string; error: string }> = [];

  let slackSent = 0;
  let slackSkipped = 0;
  for (const user of users) {
    try {
      const anomalies = await detectAnomalies(user.id);
      for (const a of anomalies) totals[a.severity]++;

      // Email alert
      const result = await sendCriticalAnomalyAlert(user.email, user.name ?? "fondateur·rice", anomalies);
      if (result.skipped) skipped++;
      else if (result.ok) sent++;
      else {
        failed++;
        errors.push({ userId: user.id, error: result.error ?? "unknown" });
      }

      // Slack alert (best-effort, en parallèle de l'email)
      try {
        const slackResult = await sendAnomalyAlertToSlack(user.id, anomalies);
        if (slackResult.skipped) slackSkipped++;
        else slackSent += slackResult.sent;
      } catch (e) {
        console.warn(`[daily-anomalies] Slack send failed for ${user.id}: ${e instanceof Error ? e.message : e}`);
      }
    } catch (e) {
      failed++;
      errors.push({ userId: user.id, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return { processed: users.length, sent, skipped, failed, slackSent, slackSkipped, totalsBySeverity: totals, errors: errors.slice(0, 10) };
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  return NextResponse.json(await tick());
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  return NextResponse.json(await tick());
}
