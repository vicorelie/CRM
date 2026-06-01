// Cron : retention CapiEvent — supprime les events anciens pour ne pas saturer la DB.
//
// Politique :
//   - CapiEvent.status = SENT   → supprimés après 90 jours (RGPD : pas de log infini)
//   - CapiEvent.status = FAILED → supprimés après 365 jours (gardés plus longtemps pour debug)
//   - CapiEvent.status = RETRIED → idem FAILED
//
// Aussi : nettoie les rate-limit buckets expirés en mémoire.
//
// À planifier via crontab Linux :
//   0 4 * * * curl -sS -H "x-cron-secret: $CRON_SECRET" https://wanapush.com/api/capi/cron/retention
// (4h du matin tous les jours, hors heures de trafic)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gcExpiredBuckets } from "@/lib/capi/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const SENT_RETENTION_DAYS = 90;
const FAILED_RETENTION_DAYS = 365;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got =
    req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");
  return got === secret;
}

async function runRetention() {
  const now = Date.now();
  const sentCutoff = new Date(now - SENT_RETENTION_DAYS * 86400 * 1000);
  const failedCutoff = new Date(now - FAILED_RETENTION_DAYS * 86400 * 1000);

  const sentDeleted = await prisma.capiEvent.deleteMany({
    where: { status: "SENT", createdAt: { lt: sentCutoff } },
  });

  const failedDeleted = await prisma.capiEvent.deleteMany({
    where: { status: { in: ["FAILED", "RETRIED"] }, createdAt: { lt: failedCutoff } },
  });

  const bucketsGc = gcExpiredBuckets();

  return {
    sentDeleted: sentDeleted.count,
    failedDeleted: failedDeleted.count,
    rateLimitBucketsGc: bucketsGc,
    sentCutoff: sentCutoff.toISOString(),
    failedCutoff: failedCutoff.toISOString(),
    durationMs: Date.now() - now,
  };
}

export async function GET(req: Request): Promise<NextResponse> {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runRetention();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[capi/cron/retention] failed", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erreur inconnue" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  return GET(req);
}
