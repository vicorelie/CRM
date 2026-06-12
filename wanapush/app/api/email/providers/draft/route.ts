// POST /api/email/providers/draft
// Body : { brief: string }  → { subject, preheader, bodyMarkdown }
// Rédige une campagne via l'IA à partir d'un objectif libre + contexte business.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { draftCampaign } from "@/lib/email-providers/ai-draft";

export const runtime = "nodejs";

const BodySchema = z.object({ brief: z.string().trim().min(3).max(2000) });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalide" }, { status: 400 });
  }

  try {
    const draft = await draftCampaign(user.id, parsed.data.brief);
    return NextResponse.json({ ok: true, draft });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Échec de la rédaction IA." }, { status: 502 });
  }
}
