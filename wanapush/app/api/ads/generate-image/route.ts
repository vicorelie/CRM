// POST /api/ads/generate-image
//
// Génère une image creative pour une publicité Meta via OpenAI (gpt-image-1
// avec fallback DALL-E 3). Stocke l'image localement et retourne une URL
// publique stable utilisable dans PushCampaignInput.imageUrl.
//
// Body :
//   {
//     prompt?: string;        // Si fourni, utilisé directement
//     brief?: {               // Sinon, on construit le prompt depuis le brief
//       productOrService: string;
//       audience?: string;
//       tone?: "professional"|"casual"|"luxury"|"playful";
//       brandColors?: string[];
//       scene?: string;
//     };
//     size?: "square"|"vertical"|"horizontal";
//     style?: "natural"|"vivid";
//   }
//
// Réponse :
//   { ok: true, url: string, prompt: string, revisedPrompt?: string, model: string, size: string }
//   { ok: false, error: string }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  AD_IMAGE_SIZES,
  buildAdImagePrompt,
  generateAdImage,
} from "@/lib/ai/ad-image";

export const runtime = "nodejs";
export const maxDuration = 120;

const briefSchema = z
  .object({
    productOrService: z.string().min(3).max(500),
    audience: z.string().max(500).optional(),
    tone: z.enum(["professional", "casual", "luxury", "playful"]).optional(),
    brandColors: z.array(z.string().max(50)).max(5).optional(),
    scene: z.string().max(500).optional(),
  })
  .strict();

const inputSchema = z
  .object({
    prompt: z.string().min(3).max(1500).optional(),
    brief: briefSchema.optional(),
    size: z.enum(Object.keys(AD_IMAGE_SIZES) as [keyof typeof AD_IMAGE_SIZES, ...Array<keyof typeof AD_IMAGE_SIZES>]).optional(),
    style: z.enum(["natural", "vivid"]).optional(),
  })
  .strict()
  .refine((data) => data.prompt || data.brief, {
    message: "Fournis soit 'prompt' soit 'brief'",
  });

export async function POST(req: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation échouée" },
      { status: 400 },
    );
  }

  // Récupérer l'ID user pour le path de stockage
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  // Construire le prompt final
  const finalPrompt =
    parsed.data.prompt ??
    (parsed.data.brief ? buildAdImagePrompt(parsed.data.brief) : "");
  if (!finalPrompt) {
    return NextResponse.json({ error: "Prompt vide" }, { status: 400 });
  }

  const result = await generateAdImage({
    prompt: finalPrompt,
    size: parsed.data.size,
    style: parsed.data.style,
    userId: user.id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    url: result.url,
    prompt: finalPrompt,
    revisedPrompt: result.revisedPrompt,
    model: result.model,
    size: result.size,
  });
}
