// POST /api/gbp/reviews/[id]/reply
//
// Réponse à un avis Google. 2 modes :
//  - { comment: "..." } : reply manuel (texte fourni)
//  - { generate: true } : reply généré par IA Claude (ton configurable)
//
// Body : {
//   comment?: string  -- texte manuel
//   generate?: boolean  -- true → IA
//   tone?: "professional" | "warm" | "apologetic"  -- ton IA (défaut "professional")
//   businessName?: string  -- nom à mettre en signature (sinon location.title)
// }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { askAi } from "@/lib/ai";
import { getValidAccessToken, replyToReview } from "@/lib/gbp";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  comment: z.string().max(4000).optional(),
  generate: z.boolean().optional(),
  tone: z.enum(["professional", "warm", "apologetic"]).optional(),
  businessName: z.string().max(255).optional(),
});

type Params = { params: Promise<{ id: string }> };

const TONE_INSTR: Record<string, string> = {
  professional: "Ton professionnel et courtois, formule polie, signature de l'enseigne.",
  warm: "Ton chaleureux et personnel, montrer de la gratitude sincère, utilisation du prénom du reviewer.",
  apologetic: "Ton respectueux et empathique, reconnaître le problème, proposer une solution concrète, ne pas être défensif.",
};

async function generateReply(review: {
  reviewerName: string | null;
  starRating: number;
  comment: string | null;
}, businessName: string, tone: string): Promise<{ reply: string; confidence: number }> {
  const isNegative = review.starRating <= 3;
  const toneInstr = TONE_INSTR[tone] ?? TONE_INSTR.professional;
  const prompt = `Tu rédiges la réponse du gérant d'un commerce à un avis Google laissé par "${review.reviewerName ?? "un client"}" (${review.starRating}★).

Avis du client :
"${review.comment ?? "(pas de commentaire)"}"

Consignes :
- ${toneInstr}
- Maximum 400 caractères (les avis longs nuisent à la lisibilité Google)
- Pas de promesses commerciales (réductions, dédommagements) sauf si évident
- Pas d'emoji (réponses Google = ton formel)
- Termine par le nom de l'enseigne : "${businessName}"
${isNegative ? "- Reconnaître le problème, ne pas le minimiser. Proposer un contact direct si pertinent." : ""}
${!isNegative ? "- Remercier sincèrement, idéalement mentionner un détail spécifique de l'avis." : ""}

Réponds UNIQUEMENT avec le texte de la réponse, sans préambule ni guillemets.`;

  const ai = await askAi({ prompt, system: "Tu es un assistant qui aide à rédiger des réponses professionnelles aux avis Google Business Profile." });
  if (!ai?.text) throw new Error("L'IA n'a pas pu générer de réponse");
  const cleaned = ai.text.trim().slice(0, 4000);
  // Confidence basique : 0.9 si IA a généré, ajuste à 0.6 si très court
  const confidence = cleaned.length < 50 ? 0.5 : 0.9;
  return { reply: cleaned, confidence };
}

export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

  const { id } = await params;
  let body: unknown;
  try { body = await req.json(); } catch { body = {}; }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const data = parsed.data;

  // Charge review + ownership
  const review = await prisma.gbpReview.findFirst({
    where: { id, location: { account: { userId: user.id } } },
    select: {
      id: true, googleReviewId: true, reviewerName: true, starRating: true, comment: true,
      location: { select: { id: true, title: true, googleLocationId: true, account: { select: { id: true, googleAccountId: true } } } },
    },
  });
  if (!review) return NextResponse.json({ error: "Avis introuvable ou non autorisé" }, { status: 404 });

  // Résolution du texte de la réponse
  let replyText = data.comment?.trim();
  let aiConfidence: number | null = null;
  if (!replyText && data.generate) {
    try {
      const gen = await generateReply(
        review,
        data.businessName ?? review.location.title,
        data.tone ?? "professional",
      );
      replyText = gen.reply;
      aiConfidence = gen.confidence;
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Génération IA échouée" }, { status: 500 });
    }
  }
  if (!replyText) {
    return NextResponse.json({ error: "comment ou generate=true requis" }, { status: 400 });
  }

  try {
    const accessToken = await getValidAccessToken(review.location.account.id);
    // googleReviewId au format "accounts/{a}/locations/{l}/reviews/{r}" → on extrait le {r} final
    const reviewIdShort = review.googleReviewId.split("/").pop()!;
    await replyToReview(
      accessToken,
      review.location.account.googleAccountId,
      review.location.googleLocationId,
      reviewIdShort,
      replyText,
    );
    await prisma.gbpReview.update({
      where: { id: review.id },
      data: {
        replyText,
        replyUpdateTime: new Date(),
        replyStatus: data.generate ? "AUTO_REPLIED" : "MANUAL_REPLIED",
        replyAiConfidence: aiConfidence,
      },
    });
    return NextResponse.json({ ok: true, replyText, source: data.generate ? "ai" : "manual" });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
