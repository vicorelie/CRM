// POST /api/ads/auto-config { campaignId }
//
// Utilise l'IA pour proposer une configuration optimale Meta Ads 2026 :
// - texte (primary_text, headline, description, cta)
// - ciblage (pays, âge min/max, genres)
// - suggestion de ville/zone géographique
// - toggles Advantage+ recommandés
//
// L'IA s'appuie sur les données du builder (produit, audience, objectif, ton) si présentes.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { askAi } from "@/lib/ai";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

const inputSchema = z.object({
  campaignId: z.string().min(1),
});

const CTA_VALUES = [
  "LEARN_MORE",
  "SHOP_NOW",
  "SUBSCRIBE",
  "CONTACT_US",
  "BOOK_TRAVEL",
  "DOWNLOAD",
  "CALL_NOW",
  "APPLY_NOW",
  "GET_QUOTE",
  "GET_OFFER",
  "GET_STARTED",
  "WATCH_MORE",
] as const;

const aiOutputSchema = z.object({
  primaryText: z.string().max(125),
  headline: z.string().max(40),
  description: z.string().max(30),
  cta: z.enum(CTA_VALUES),
  countries: z.array(z.string().length(2)).min(1).max(10),
  ageMin: z.number().int().min(13).max(65),
  ageMax: z.number().int().min(13).max(65),
  genders: z.array(z.union([z.literal(1), z.literal(2)])).max(2),
  suggestedCity: z.string().nullable(),
  rationale: z.string().max(500),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const parsed = inputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalide" },
      { status: 400 },
    );

  const campaign = await prisma.campaign.findFirst({
    where: {
      id: parsed.data.campaignId,
      business: { user: { email: session.user.email } },
    },
    include: { adAccount: { select: { name: true, currency: true } } },
  });
  if (!campaign)
    return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });

  const r = (campaign.results ?? {}) as {
    objective?: string;
    product?: string;
    audience?: string;
    tone?: string;
    variants?: Array<{ copy?: Record<string, string | string[]> }>;
  };

  const ctx = {
    name: campaign.name,
    type: campaign.type,
    objective: r.objective ?? "AWARENESS",
    product: r.product ?? "",
    audience: r.audience ?? "",
    tone: r.tone ?? "DIRECT",
    accountName: campaign.adAccount?.name ?? "",
    currency: campaign.adAccount?.currency ?? "EUR",
  };

  const prompt = `Tu es un expert Meta Ads niveau senior. Tu dois proposer la meilleure configuration possible pour cette campagne Meta Ads 2026.

CONTEXTE :
- Nom campagne : ${ctx.name}
- Plateforme : ${ctx.type}
- Objectif business : ${ctx.objective}
- Produit / service : ${ctx.product || "(non renseigné)"}
- Audience cible (description) : ${ctx.audience || "(non renseigné)"}
- Ton souhaité : ${ctx.tone}
- Compte publicitaire : ${ctx.accountName} (devise : ${ctx.currency})

CONSIGNES :
1. Rédige un texte d'annonce percutant adapté à Meta (Facebook + Instagram) en français :
   - primaryText (HOOK au-dessus de l'image, max 125 caractères, accroche forte qui crée le besoin)
   - headline (sous l'image, max 40 caractères, bénéfice clair)
   - description (max 30 caractères, complément ou preuve)
   - cta : choisis le CTA Meta le plus pertinent parmi : ${CTA_VALUES.join(", ")}

2. Ciblage géographique :
   - countries : liste de codes ISO 2 lettres (max 10). Choisis intelligemment selon l'audience décrite. Par défaut ["FR"] si rien d'évident.
   - suggestedCity : si le produit/audience suggère une zone urbaine spécifique (ex : "déménageur Paris" → "Paris"), propose 1 nom de ville. Sinon null.

3. Démographie :
   - ageMin / ageMax : tranche d'âge optimale selon le produit (logiciel B2B → 25-55, mode jeune → 18-30, etc.)
   - genders : tableau de 1 (hommes) et/ou 2 (femmes). VIDE [] = tous genres (recommandé pour 99% des cas). Spécifie un seul genre seulement si le produit est genré.

4. rationale : explique en 2-3 phrases pourquoi tu as fait ces choix.

RÉPONDS EN JSON STRICT (rien d'autre, pas de markdown, pas de texte avant/après) :
{
  "primaryText": "...",
  "headline": "...",
  "description": "...",
  "cta": "LEARN_MORE",
  "countries": ["FR"],
  "ageMin": 25,
  "ageMax": 55,
  "genders": [],
  "suggestedCity": null,
  "rationale": "..."
}`;

  const ai = await askAi({ prompt, temperature: 0.5, maxTokens: 1200 });
  if (!ai || !ai.text)
    return NextResponse.json(
      { error: "IA indisponible (pas de clé API configurée ?)" },
      { status: 503 },
    );

  // Parser le JSON, robuste aux fences markdown
  let raw = ai.text.trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]+?)```/);
  if (fenced) raw = fenced[1].trim();
  // Sometimes the model wraps the JSON in extra text — try to extract { ... }
  const objMatch = raw.match(/\{[\s\S]+\}/);
  if (objMatch) raw = objMatch[0];

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "L'IA a renvoyé un JSON invalide", debug: raw.slice(0, 300) },
      { status: 502 },
    );
  }

  const validated = aiOutputSchema.safeParse(json);
  if (!validated.success)
    return NextResponse.json(
      {
        error: "Réponse IA invalide",
        issues: validated.error.issues.slice(0, 5),
      },
      { status: 502 },
    );

  return NextResponse.json({ config: validated.data, provider: ai.provider, model: ai.model });
}
