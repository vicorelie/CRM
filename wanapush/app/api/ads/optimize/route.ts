import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { askWanapush } from "@/lib/ai";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const inputSchema = z.object({
  platform: z.enum(["META_ADS", "GOOGLE_ADS", "TIKTOK_ADS", "LINKEDIN_ADS"]),
  objective: z.string().trim().min(2).max(80),
  spend: z.coerce.number().nonnegative(),
  revenue: z.coerce.number().nonnegative().optional(),
  conversions: z.coerce.number().int().nonnegative().optional(),
  impressions: z.coerce.number().int().nonnegative().optional(),
  clicks: z.coerce.number().int().nonnegative().optional(),
  audience: z.string().trim().max(500).optional(),
  currentCopy: z.string().trim().max(2000).optional(),
  targetRoas: z.coerce.number().positive().optional(),
});

type Input = z.infer<typeof inputSchema>;

const PLATFORM_LABEL: Record<Input["platform"], string> = {
  META_ADS: "Meta Ads (Facebook & Instagram)",
  GOOGLE_ADS: "Google Ads (Search / Performance Max)",
  TIKTOK_ADS: "TikTok Ads",
  LINKEDIN_ADS: "LinkedIn Ads",
};

function computeMetrics(i: Input) {
  const ctr = i.impressions && i.clicks ? (i.clicks / i.impressions) * 100 : null;
  const cpc = i.clicks && i.spend ? i.spend / i.clicks : null;
  const cpa = i.conversions && i.spend ? i.spend / i.conversions : null;
  const roas = i.revenue && i.spend ? i.revenue / i.spend : null;
  return { ctr, cpc, cpa, roas };
}

function buildPrompt(i: Input): string {
  const m = computeMetrics(i);
  const fmt = (n: number | null, suffix = "") =>
    n === null || Number.isNaN(n) ? "n/a" : `${n.toFixed(2)}${suffix}`;

  return `Tu audites une campagne ${PLATFORM_LABEL[i.platform]} et proposes un plan d'optimisation ROAS concret et actionnable.

DONNÉES DE LA CAMPAGNE
- Objectif : ${i.objective}
- Dépense : ${i.spend} €
- Revenus générés : ${i.revenue ?? "n/a"} €
- Conversions : ${i.conversions ?? "n/a"}
- Impressions : ${i.impressions ?? "n/a"}
- Clics : ${i.clicks ?? "n/a"}
- ROAS cible : ${i.targetRoas ?? "non fixé"}
- Audience : ${i.audience ?? "non précisée"}
- Copy actuelle : ${i.currentCopy ?? "non fournie"}

MÉTRIQUES CALCULÉES
- CTR : ${fmt(m.ctr, " %")}
- CPC : ${fmt(m.cpc, " €")}
- CPA : ${fmt(m.cpa, " €")}
- ROAS actuel : ${fmt(m.roas, "x")}

MISSION
Identifie les 3 leviers d'optimisation les plus impactants pour cette campagne. Pour chaque levier, donne :
- title : titre court (max 60 caractères)
- diagnostic : ce qui ne va pas / ce qui peut être amélioré (2 phrases)
- action : étape concrète à exécuter (impératif, < 200 caractères)
- expected_impact : impact estimé sur le ROAS (Faible / Moyen / Fort / Critique)
- effort : effort de mise en œuvre (Faible / Moyen / Élevé)

FORMAT DE RÉPONSE
Réponds UNIQUEMENT avec ce JSON brut (pas de markdown, pas de \`\`\`) :
{
  "summary": "verdict global en 1-2 phrases",
  "health_score": 0-100,
  "levers": [
    {"title": "...", "diagnostic": "...", "action": "...", "expected_impact": "...", "effort": "..."},
    ...
  ],
  "next_test": "1 test A/B prioritaire à lancer cette semaine (1 phrase)"
}`;
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

  let payload: {
    summary?: string;
    health_score?: number;
    levers?: unknown;
    next_test?: string;
  };
  try {
    payload = JSON.parse(cleanText);
  } catch {
    return NextResponse.json(
      { error: `IA n'a pas retourné du JSON valide : ${cleanText.slice(0, 300)}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    platform: parsed.data.platform,
    metrics: computeMetrics(parsed.data),
    audit: payload,
    provider: ai.provider,
    model: ai.model,
  });
}
