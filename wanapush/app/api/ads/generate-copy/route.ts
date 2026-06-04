import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { askWanapush } from "@/lib/ai";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const platformEnum = z.enum(["META_ADS", "GOOGLE_ADS", "TIKTOK_ADS", "LINKEDIN_ADS"]);
const objectiveEnum = z.enum([
  "AWARENESS",
  "TRAFFIC",
  "LEADS",
  "CONVERSIONS",
  "APP_INSTALLS",
  "ENGAGEMENT",
]);

const inputSchema = z.object({
  platform: platformEnum,
  objective: objectiveEnum,
  product: z.string().trim().min(3, "Décris ton produit / service").max(800),
  audience: z.string().trim().min(3, "Décris ton audience cible").max(500),
  tone: z
    .enum(["DIRECT", "PREMIUM", "FRIENDLY", "URGENT", "STORYTELLING"])
    .default("DIRECT"),
  lang: z.enum(["fr", "en"]).default("fr"),
  variants: z.coerce.number().int().min(1).max(5).default(3),
});

type Input = z.infer<typeof inputSchema>;

const PLATFORM_SPECS: Record<
  z.infer<typeof platformEnum>,
  { name: string; constraints: string; schema: string }
> = {
  META_ADS: {
    name: "Meta Ads (Facebook & Instagram)",
    constraints:
      "primary_text ≤ 125 caractères (idéalement 90), headline ≤ 40 caractères, description ≤ 30 caractères, cta = libellé bouton (max 20 caractères, ex: « Acheter », « En savoir plus »).",
    schema:
      '{"primary_text": "...", "headline": "...", "description": "...", "cta": "..."}',
  },
  GOOGLE_ADS: {
    name: "Google Ads (Search Responsive)",
    constraints:
      "3 headlines distincts ≤ 30 caractères chacun, 2 descriptions ≤ 90 caractères chacune, 1 display_path ≤ 15 caractères. Inclure mot-clé principal dans au moins 2 headlines. Pas de double espace, pas de ponctuation excessive.",
    schema:
      '{"headlines": ["...","...","..."], "descriptions": ["...","..."], "display_path": "..."}',
  },
  TIKTOK_ADS: {
    name: "TikTok Ads (In-Feed)",
    constraints:
      "text ≤ 100 caractères, ton naturel, conversationnel, pas trop corporate. hook = 1ère phrase qui doit accrocher en < 1s. cta = libellé bouton (max 20 caractères).",
    schema: '{"hook": "...", "text": "...", "cta": "..."}',
  },
  LINKEDIN_ADS: {
    name: "LinkedIn Ads (Sponsored Content)",
    constraints:
      "intro_text ≤ 150 caractères (sweet spot, max techn. 600), headline ≤ 70 caractères, description ≤ 100 caractères. Ton professionnel, axé valeur business / ROI. cta = libellé bouton.",
    schema:
      '{"intro_text": "...", "headline": "...", "description": "...", "cta": "..."}',
  },
};

const OBJECTIVE_LABEL: Record<z.infer<typeof objectiveEnum>, string> = {
  AWARENESS: "notoriété (faire connaître la marque)",
  TRAFFIC: "trafic vers le site / landing page",
  LEADS: "génération de leads (formulaire, démo)",
  CONVERSIONS: "conversions / ventes directes",
  APP_INSTALLS: "installations d'application",
  ENGAGEMENT: "engagement (likes, partages, commentaires)",
};

const TONE_LABEL: Record<Input["tone"], string> = {
  DIRECT: "direct, clair, orienté bénéfice",
  PREMIUM: "premium, élégant, raffiné",
  FRIENDLY: "amical, accessible, chaleureux",
  URGENT: "urgent, pousse à l'action immédiate",
  STORYTELLING: "storytelling, narratif, émotionnel",
};

function buildPrompt(input: Input): string {
  const spec = PLATFORM_SPECS[input.platform];
  const lang = input.lang === "fr" ? "français" : "anglais";

  return `Tu génères des copies publicitaires pour ${spec.name}.

CONTEXTE
- Produit / service : ${input.product}
- Audience cible : ${input.audience}
- Objectif de campagne : ${OBJECTIVE_LABEL[input.objective]}
- Ton souhaité : ${TONE_LABEL[input.tone]}
- Langue : ${lang}

CONTRAINTES PLATEFORME
${spec.constraints}

MISSION
Génère ${input.variants} variantes A/B distinctes (angles différents : bénéfice, problème/solution, social proof, urgence, curiosité). Chaque variante doit être 100% utilisable telle quelle, respecter strictement les limites de caractères, et ne contenir AUCUNE explication.

FORMAT DE RÉPONSE
Réponds UNIQUEMENT avec ce JSON brut (pas de markdown, pas de \`\`\`) :
{"variants": [
  {"angle": "court label de l'angle", "copy": ${spec.schema}},
  ...
]}`;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 },
    );
  }

  const ai = await askWanapush(buildPrompt(parsed.data));
  if (!ai) {
    return NextResponse.json(
      { error: "Aucune clé IA configurée (OPENAI_API_KEY ou ANTHROPIC_API_KEY)" },
      { status: 500 },
    );
  }

  const cleanText = ai.text
    .trim()
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  let payload: { variants?: unknown };
  try {
    payload = JSON.parse(cleanText);
  } catch {
    return NextResponse.json(
      { error: `IA n'a pas retourné du JSON valide : ${cleanText.slice(0, 300)}` },
      { status: 500 },
    );
  }

  if (!Array.isArray(payload.variants) || payload.variants.length === 0) {
    return NextResponse.json(
      { error: "L'IA n'a pas retourné de variantes exploitables" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    platform: parsed.data.platform,
    objective: parsed.data.objective,
    variants: payload.variants,
    provider: ai.provider,
    model: ai.model,
  });
}
