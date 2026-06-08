// Cron weekly : envoie un récap analytics + anomalies à chaque user actif.
//
// Schedule recommandé : `0 8 * * 1` (lundi 8h UTC = mardi 10h Paris)
// Best practice 2026 : début de semaine, juste après le café du founder.
//
// Auth : `x-cron-secret` ou `?secret=` vs `CRON_SECRET`
// Output JSON : { processed, sent, skipped, failed }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOverview, defaultRange } from "@/lib/analytics/aggregators";
import { detectAnomalies } from "@/lib/analytics/anomalies";
import { sendWeeklyDigest } from "@/lib/analytics/digest";

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
  // Sélectionne les users qui ont au moins UN module actif :
  //  - GeneratedSite (capture leads)
  //  - AdAccount (campagnes ads)
  //  - Shop (e-commerce)
  //  - EmailCampaign envoyée
  // Évite d'envoyer du vide aux comptes inactifs.
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { generatedSites: { some: {} } },
        { adAccounts: { some: { status: "CONNECTED" } } },
        { shops: { some: {} } },
        { emailCampaigns: { some: { status: "SENT" } } },
      ],
    },
    select: { id: true, email: true, name: true },
    take: MAX_USERS_PER_RUN,
  });

  const range = defaultRange(7);
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const errors: Array<{ userId: string; error: string }> = [];

  for (const user of users) {
    try {
      const [overview, anomalies] = await Promise.all([
        getOverview(user.id, range),
        detectAnomalies(user.id),
      ]);
      const result = await sendWeeklyDigest(user.email, user.name ?? "fondateur·rice", overview, anomalies);
      if (result.skipped) skipped++;
      else if (result.ok) sent++;
      else {
        failed++;
        errors.push({ userId: user.id, error: result.error ?? "unknown" });
      }
    } catch (e) {
      failed++;
      errors.push({ userId: user.id, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return { processed: users.length, sent, skipped, failed, errors: errors.slice(0, 10) };
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  return NextResponse.json(await tick());
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  return NextResponse.json(await tick());
}
