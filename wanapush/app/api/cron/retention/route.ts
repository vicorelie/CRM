// Cron de rétention GLOBAL — purge les tables à croissance non bornée (audit DB H2).
// Complète le cron CAPI (app/api/capi/cron/retention) qui gère CapiEvent.
//
// Best practice RGPD 2026 : data minimization + durées de conservation JUSTIFIÉES
// et documentées (https://www.trackingplan.com/blog/data-retention-policy-examples).
// Chaque durée ci-dessous est choisie selon l'utilité analytique vs la minimisation.
//
// À planifier (4h, hors trafic) :
//   0 4 * * * curl -sS -H "x-cron-secret: $CRON_SECRET" https://wanapush.com/api/cron/retention

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

// Auth cron à temps constant (audit H10). Header uniquement (pas de query-string → logs).
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = req.headers.get("x-cron-secret") ?? "";
  const a = Buffer.from(got);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

const DAY = 86_400_000;
function cutoff(days: number): Date {
  return new Date(Date.now() - days * DAY);
}

async function runRetention() {
  // Durées justifiées (jours) :
  //  - PostAnalytics : métriques sociales recency-focused (charts ~90j), append/fetch.
  //  - AdMetrics / GbpInsight : KPI journaliers utiles en YoY → 400j (13 mois).
  //  - EmailSend : historique d'engagement, minimisation PII → 365j.
  //  - Stripe/PayPalEvent : idempotence = quelques jours ; gardés 180j pour audit/réconciliation.
  //  - AuditLog : traçabilité conformité → 365j.
  //  - CopilotMessage : data conversationnelle du founder → NON purgé ici (suppression user-driven).
  const [postAnalytics, adMetrics, gbpInsight, emailSend, stripeEvent, paypalEvent, auditLog] =
    await Promise.all([
      prisma.postAnalytics.deleteMany({ where: { fetchedAt: { lt: cutoff(90) } } }),
      prisma.adMetrics.deleteMany({ where: { date: { lt: cutoff(400) } } }),
      prisma.gbpInsight.deleteMany({ where: { date: { lt: cutoff(400) } } }),
      prisma.emailSend.deleteMany({ where: { sentAt: { lt: cutoff(365) } } }),
      prisma.stripeEvent.deleteMany({ where: { createdAt: { lt: cutoff(180) } } }),
      prisma.payPalEvent.deleteMany({ where: { createdAt: { lt: cutoff(180) } } }),
      prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff(365) } } }),
    ]);

  return {
    deleted: {
      postAnalytics: postAnalytics.count,
      adMetrics: adMetrics.count,
      gbpInsight: gbpInsight.count,
      emailSend: emailSend.count,
      stripeEvent: stripeEvent.count,
      paypalEvent: paypalEvent.count,
      auditLog: auditLog.count,
    },
  };
}

export async function GET(req: Request): Promise<NextResponse> {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await runRetention()) });
}

export async function POST(req: Request): Promise<NextResponse> {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await runRetention()) });
}
