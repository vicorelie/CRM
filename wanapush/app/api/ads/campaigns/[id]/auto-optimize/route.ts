// POST /api/ads/campaigns/:id/auto-optimize
//
// Analyse les métriques d'une campagne et retourne (dryRun=true) ou applique
// (dryRun=false) l'action d'optimisation recommandée (PAUSE / SCALE / REDUCE_BUDGET).
//
// Body : { dryRun?: boolean, thresholds?: Partial<OptimizationThresholds> }
// Response : { suggestion: OptimizationSuggestion }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  analyzeCampaign,
  applyOptimization,
  DEFAULT_THRESHOLDS,
  type OptimizationThresholds,
} from "@/lib/ads/auto-optimizer";

export const runtime = "nodejs";
export const maxDuration = 30;

const ThresholdsSchema = z.object({
  windowDays: z.number().int().min(1).max(90).optional(),
  roasPauseBelow: z.number().positive().optional(),
  roasReduceBelow: z.number().positive().optional(),
  roasScaleAbove: z.number().positive().optional(),
  minSpendToAct: z.number().nonnegative().optional(),
  minConversionsToScale: z.number().int().nonnegative().optional(),
  scaleFactor: z.number().min(1).max(3).optional(),
  reduceFactor: z.number().min(0.1).max(0.99).optional(),
  minDailyBudget: z.number().positive().optional(),
}).strict();

const BodySchema = z.object({
  dryRun: z.boolean().default(true),
  thresholds: ThresholdsSchema.optional(),
}).strict();

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // Vérifier que la campagne appartient au user
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: params.id,
      business: { user: { email: session.user.email } },
    },
    select: { id: true },
  });
  if (!campaign) {
    return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    body = {};
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Paramètres invalides" },
      { status: 400 },
    );
  }

  const { dryRun, thresholds: customThresholds } = parsed.data;
  const thresholds: OptimizationThresholds = {
    ...DEFAULT_THRESHOLDS,
    ...(customThresholds ?? {}),
  };

  const suggestion = await analyzeCampaign(params.id, thresholds);
  if (!suggestion) {
    return NextResponse.json({ error: "Analyse échouée" }, { status: 500 });
  }

  if (!dryRun) {
    const applied = await applyOptimization(suggestion);
    return NextResponse.json({ suggestion: applied });
  }

  return NextResponse.json({ suggestion });
}
