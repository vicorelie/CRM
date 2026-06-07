// Cron retry des Enhanced Conversions / Conversions API en échec (FAILED).
//
// Cible : FormSubmission + Order avec `{ec,li,tt}Status = "FAILED"` créés
// il y a >24h et <7j. Au-delà, fenêtre d'attribution dépassée côté plateformes
// (Google 90j, LinkedIn 90j, TikTok 7j) — pas la peine de re-tenter.
//
// Sécurité : header `x-cron-secret` ou query param `?secret=` vs `CRON_SECRET`.
// À configurer dans le scheduler (ex: cron Vercel ou systemd timer) :
//   0 */6 * * *   curl -H "x-cron-secret: $S" https://wanapush.com/api/ads/cron/retry-conversions
//
// Output JSON : { processed: N, byType: { ec: {pending, ok, fail}, li: {...}, tt: {...} } }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  triggerLeadConversionForFormSubmission,
  triggerLinkedInLeadForFormSubmission,
  triggerTikTokLeadForFormSubmission,
  triggerSaleConversionForOrder,
  triggerLinkedInSaleForOrder,
  triggerTikTokSaleForOrder,
} from "@/lib/ads/enhanced-conversions-pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");
  return got === secret;
}

const MAX_PER_RUN = 50; // garde-fou : 50 retries par plateforme / type / run

type Counts = { tried: number; ok: number; fail: number };

async function retryFormSubmissions(
  field: "ecStatus" | "liStatus" | "ttStatus",
  trigger: (id: string) => Promise<void>,
  cutoffMin: Date,
  cutoffMax: Date,
): Promise<Counts> {
  const failed = await prisma.formSubmission.findMany({
    where: {
      [field]: "FAILED",
      createdAt: { gte: cutoffMax, lte: cutoffMin },
    },
    select: { id: true },
    take: MAX_PER_RUN,
  });
  const counts: Counts = { tried: failed.length, ok: 0, fail: 0 };
  for (const f of failed) {
    try {
      await trigger(f.id);
      // Le trigger met à jour le status (SENT/FAILED/SKIPPED) — on relit pour compter
      const fresh = await prisma.formSubmission.findUnique({
        where: { id: f.id },
        select: { [field]: true },
      });
      const newStatus = (fresh as Record<string, unknown> | null)?.[field];
      if (newStatus === "SENT") counts.ok++;
      else counts.fail++;
    } catch {
      counts.fail++;
    }
  }
  return counts;
}

async function retryOrders(
  field: "ecStatus" | "liStatus" | "ttStatus",
  trigger: (id: string) => Promise<void>,
  cutoffMin: Date,
  cutoffMax: Date,
): Promise<Counts> {
  const failed = await prisma.order.findMany({
    where: {
      [field]: "FAILED",
      createdAt: { gte: cutoffMax, lte: cutoffMin },
    },
    select: { id: true },
    take: MAX_PER_RUN,
  });
  const counts: Counts = { tried: failed.length, ok: 0, fail: 0 };
  for (const o of failed) {
    try {
      await trigger(o.id);
      const fresh = await prisma.order.findUnique({
        where: { id: o.id },
        select: { [field]: true },
      });
      const newStatus = (fresh as Record<string, unknown> | null)?.[field];
      if (newStatus === "SENT") counts.ok++;
      else counts.fail++;
    } catch {
      counts.fail++;
    }
  }
  return counts;
}

async function tick() {
  // Fenêtres d'attribution maximales par plateforme :
  //  - Google EC + LinkedIn : 90 jours (mais la conversion doit être en <90j → on stop à 7j pour rester safe)
  //  - TikTok ttclid : 7 jours STRICT
  // On rate-limite à >24h post-create pour laisser à la plateforme le temps de
  // récupérer si l'erreur initiale était temporaire (rate-limit, timeout, etc.).
  const now = Date.now();
  const cutoffMin = new Date(now - 24 * 60 * 60 * 1000); // 24h ago (créés AVANT)
  const cutoffMaxEcLi = new Date(now - 7 * 24 * 60 * 60 * 1000); // 7j ago (créés APRÈS)
  const cutoffMaxTt = new Date(now - 6.5 * 24 * 60 * 60 * 1000); // ~6.5j pour TikTok (marge avant expiry 7j)

  // Forms (LEAD)
  const formEc = await retryFormSubmissions("ecStatus", triggerLeadConversionForFormSubmission, cutoffMin, cutoffMaxEcLi);
  const formLi = await retryFormSubmissions("liStatus", triggerLinkedInLeadForFormSubmission, cutoffMin, cutoffMaxEcLi);
  const formTt = await retryFormSubmissions("ttStatus", triggerTikTokLeadForFormSubmission, cutoffMin, cutoffMaxTt);

  // Orders (PURCHASE / CompletePayment)
  const orderEc = await retryOrders("ecStatus", triggerSaleConversionForOrder, cutoffMin, cutoffMaxEcLi);
  const orderLi = await retryOrders("liStatus", triggerLinkedInSaleForOrder, cutoffMin, cutoffMaxEcLi);
  const orderTt = await retryOrders("ttStatus", triggerTikTokSaleForOrder, cutoffMin, cutoffMaxTt);

  return {
    forms: { google: formEc, linkedin: formLi, tiktok: formTt },
    orders: { google: orderEc, linkedin: orderLi, tiktok: orderTt },
  };
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const result = await tick();
  return NextResponse.json(result);
}

// Support GET pour les schedulers qui n'envoient que des GET (Vercel Cron, etc.)
export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const result = await tick();
  return NextResponse.json(result);
}
