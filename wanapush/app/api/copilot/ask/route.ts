// POST /api/copilot/ask
// Body : { question: string, conversationId?: string }
// Response : { conversationId, reply, toolCalls, inputTokens, outputTokens, iterations }
//
// Le copilot exploite tous les modules WanaPush via tool use Claude.
// Si pas de conversationId fourni → crée une nouvelle conversation.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { askCopilot } from "@/lib/copilot";
import { checkAndIncrement } from "@/lib/capi/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

const BodySchema = z.object({
  question: z.string().min(2).max(2000),
  conversationId: z.string().min(1).optional(),
});

// Garde-fou coût IA (audit H8) : sans plafond, un user peut enchaîner les tours
// (chacun = jusqu'à 5 appels Claude avec historique rejoué) → DoS facture Anthropic.
const REQS_PER_MIN = 20;
const DAILY_TOKEN_BUDGET = Number(process.env.COPILOT_DAILY_TOKEN_BUDGET ?? 2_000_000);

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

  // Rate limit par user (sliding window, réutilise l'infra CAPI).
  const rl = checkAndIncrement(`copilot:${user.id}`, user.id, {
    windowMs: 60_000,
    maxPerSlug: REQS_PER_MIN,
    maxPerSlugIp: REQS_PER_MIN,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trop de requêtes, réessaie dans un instant." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  // Budget tokens/jour par user (somme des CopilotMessage des 24 dernières heures).
  const since = new Date(Date.now() - 86_400_000);
  const used = await prisma.copilotMessage.aggregate({
    where: { conversation: { userId: user.id }, createdAt: { gte: since } },
    _sum: { inputTokens: true, outputTokens: true },
  });
  const tokensToday = (used._sum.inputTokens ?? 0) + (used._sum.outputTokens ?? 0);
  if (tokensToday >= DAILY_TOKEN_BUDGET) {
    return NextResponse.json(
      { error: "Budget IA quotidien atteint. Réessaie demain ou contacte le support." },
      { status: 429 },
    );
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const answer = await askCopilot(user.id, parsed.data.question, parsed.data.conversationId);
    return NextResponse.json(answer);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
