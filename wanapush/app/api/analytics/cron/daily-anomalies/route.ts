// Cron daily : check anomalies CRITICAL, envoie alerte email immédiate.
//
// Schedule recommandé : `0 9 * * *` (9h UTC = 11h Paris)
// Best practice 2026 : 1 email/jour MAX par user, et SEULEMENT si CRITICAL.
// (Daily WARNING/INFO = email fatigue → on les remontera dans le weekly digest)
//
// Auth : `x-cron-secret` (timing-safe) vs CRON_SECRET.

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { detectAnomalies } from "@/lib/analytics/anomalies";
import { sendCriticalAnomalyAlert } from "@/lib/analytics/digest";
import { sendAnomalyAlertToSlack } from "@/lib/notifications/slack";

export const runtime = "nodejs";
export const maxDuration = 600;

// Auth cron timing-safe (audit H10). Header privilégié ; query-string tolérée en
// fallback (compat crontab) mais elle finit dans les logs → préférer le header.
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");
  if (!got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

const MAX_USERS_PER_RUN = 500;
// Concurrence bornée (audit N+1) : on traite les users par lots concurrents au lieu
// d'un par un, sans saturer la DB (chaque user = plusieurs queries d'agrégation).
const CONCURRENCY = 8;

type User = { id: string; email: string; name: string | null };
type PerUser = {
  totals: { CRITICAL: number; WARNING: number; INFO: number };
  sent: number;
  skipped: number;
  failed: number;
  slackSent: number;
  slackSkipped: number;
  error?: { userId: string; error: string };
};

async function processUser(user: User): Promise<PerUser> {
  const totals = { CRITICAL: 0, WARNING: 0, INFO: 0 };
  try {
    const anomalies = await detectAnomalies(user.id);
    for (const a of anomalies) totals[a.severity]++;

    let sent = 0;
    let skipped = 0;
    let failed = 0;
    let error: PerUser["error"];
    const result = await sendCriticalAnomalyAlert(user.email, user.name ?? "fondateur·rice", anomalies);
    if (result.skipped) skipped = 1;
    else if (result.ok) sent = 1;
    else {
      failed = 1;
      error = { userId: user.id, error: result.error ?? "unknown" };
    }

    let slackSent = 0;
    let slackSkipped = 0;
    try {
      const slackResult = await sendAnomalyAlertToSlack(user.id, anomalies);
      if (slackResult.skipped) slackSkipped = 1;
      else slackSent = slackResult.sent;
    } catch (e) {
      console.warn(`[daily-anomalies] Slack send failed for ${user.id}: ${e instanceof Error ? e.message : e}`);
    }

    return { totals, sent, skipped, failed, slackSent, slackSkipped, error };
  } catch (e) {
    return {
      totals,
      sent: 0,
      skipped: 0,
      failed: 1,
      slackSent: 0,
      slackSkipped: 0,
      error: { userId: user.id, error: e instanceof Error ? e.message : String(e) },
    };
  }
}

async function tick() {
  // Restreint aux users avec assez de data pour avoir des anomalies (≥7j Ads
  // ou leads). Sinon les détecteurs retournent toujours null.
  const users: User[] = await prisma.user.findMany({
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
  let slackSent = 0;
  let slackSkipped = 0;
  const totals = { CRITICAL: 0, WARNING: 0, INFO: 0 };
  const errors: Array<{ userId: string; error: string }> = [];

  // Lots concurrents bornés.
  for (let i = 0; i < users.length; i += CONCURRENCY) {
    const batch = users.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(processUser));
    for (const r of results) {
      sent += r.sent;
      skipped += r.skipped;
      failed += r.failed;
      slackSent += r.slackSent;
      slackSkipped += r.slackSkipped;
      totals.CRITICAL += r.totals.CRITICAL;
      totals.WARNING += r.totals.WARNING;
      totals.INFO += r.totals.INFO;
      if (r.error) errors.push(r.error);
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
