// Génère une caption optimisée par plateforme(s) à partir d'un brief.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { askWanapush } from "@/lib/ai";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const inputSchema = z.object({
  brief: z.string().min(3).max(2000),
  platforms: z.array(z.enum(["FACEBOOK", "INSTAGRAM", "LINKEDIN", "YOUTUBE", "TIKTOK"])).min(1),
  tone: z.enum(["pro", "fun", "punchy", "neutral"]).optional().default("punchy"),
  lang: z.string().optional().default("fr"),
});

const RULES: Record<string, string> = {
  INSTAGRAM: "max 2200 caractères, 5-15 hashtags ciblés, 1er emoji = hook visuel, CTA en fin",
  FACEBOOK: "ton conversationnel, 1-3 emojis max, CTA clair, peu de hashtags",
  LINKEDIN: "ton expert, valeur ajoutée, accroche en ligne 1 (avant le 'voir plus'), 0-3 hashtags",
  TIKTOK: "max 300 caractères, hook ultra-punchy, 3-5 hashtags trend",
  YOUTUBE: "titre 70 chars max + description riche, mots-clés en début, chapitres si pertinent",
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalide" }, { status: 400 });
  }

  const prompt = `Tu écris des captions ${parsed.data.tone} en ${parsed.data.lang} pour des posts réseaux sociaux.

Brief utilisateur :
${parsed.data.brief}

Pour chaque plateforme suivante, génère une caption respectant ses contraintes spécifiques :
${parsed.data.platforms.map((p) => `- ${p} : ${RULES[p]}`).join("\n")}

Réponds UNIQUEMENT en JSON valide, format strict :
{ "captions": [ { "platform": "INSTAGRAM", "text": "..." }, ... ] }`;

  const result = await askWanapush(prompt);
  if (!result) return NextResponse.json({ error: "IA indisponible (clé manquante)" }, { status: 503 });

  // Extrait le bloc JSON
  const m = result.text.match(/\{[\s\S]*"captions"[\s\S]*\}/);
  if (!m) return NextResponse.json({ raw: result.text, captions: [] });
  try {
    const parsedJson = JSON.parse(m[0]);
    return NextResponse.json(parsedJson);
  } catch {
    return NextResponse.json({ raw: result.text, captions: [] });
  }
}
