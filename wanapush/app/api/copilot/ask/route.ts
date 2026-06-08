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

export const runtime = "nodejs";
export const maxDuration = 120;

const BodySchema = z.object({
  question: z.string().min(2).max(2000),
  conversationId: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

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
