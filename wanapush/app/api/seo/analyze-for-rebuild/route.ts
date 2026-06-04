import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import * as cheerio from "cheerio";
import { askWanapush } from "@/lib/ai";
import { authOptions } from "@/lib/auth";
import { crawl } from "@/lib/seo-audit";

export const runtime = "nodejs";
export const maxDuration = 90;

const inputSchema = z.object({
  url: z.string().url(),
});

export type RebuildAnalysis = {
  sourceUrl: string;
  /** Brief pré-rempli pour le générateur */
  brief: {
    type: "LANDING" | "MULTI_PAGE";
    brandName: string;
    sector: string;
    audience: string;
    goal: string;
    keywords: string;
    tone: string;
    primaryColor: string;
    secondaryColor?: string;
    logoUrl?: string;
    tagline?: string;
  };
  /** Diagnostic et insights */
  insights: {
    summary: string;
    detectedKeywords: string[];
    currentIssues: string[];
    improvements: string[];
    contentSamples: { type: string; text: string }[];
  };
  provider: string;
  model: string;
};

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

  // 1. Crawl la page source
  let audit;
  try {
    audit = await crawl(parsed.data.url);
  } catch (err) {
    return NextResponse.json(
      {
        error: `Impossible d'analyser cette URL : ${err instanceof Error ? err.message : "?"}`,
      },
      { status: 502 },
    );
  }

  // 2. Demande à l'IA d'extraire le brief + insights
  const prompt = `Tu es expert SEO. Analyse ce site web existant et extrais TOUTES les infos nécessaires pour générer une REFONTE optimisée SEO 2026.

URL ANALYSÉE : ${parsed.data.url}

DONNÉES BRUTES DE LA PAGE :
- Title actuel : "${audit.title.value ?? "(vide)"}"
- H1 actuel : "${audit.h1.values[0] ?? "(aucun)"}"
- Meta description : "${audit.metaDescription.value ?? "(aucune)"}"
- Lang : ${audit.lang ?? "(non défini)"}
- Mots-clés détectés dans le contenu : à déduire
- Schema.org existant : ${Object.keys(audit.schemaOrg.byType).join(", ") || "aucun"}

CONTENU TEXTUEL DE LA PAGE :
"""
${audit.bodyText.slice(0, 3500) || audit.firstParagraph || "(contenu trop maigre)"}
"""

TÂCHE : Extrais et déduis les infos suivantes en analysant le contenu RÉEL de la page.

RÈGLES :
- N'invente RIEN qui ne soit pas évoqué dans le contenu
- Si une info n'est pas claire, mets une valeur générique mais cohérente avec le secteur détecté
- Les mots-clés doivent être OPTIMISÉS SEO (volume + intent commercial), pas juste des mots du contenu
- Le ton doit être déduit du style du contenu (formel, fun, technique, etc.)
- La couleur primaire : analyse les éventuelles couleurs CSS détectées sinon propose une qui colle au secteur (#xxxxxx hex)

FORMAT — JSON STRICT (pas de \`\`\`, pas de commentaire) :
{
  "brief": {
    "type": "LANDING ou MULTI_PAGE selon la complexité du contenu existant",
    "brandName": "<nom de marque détecté ou déduit du title>",
    "sector": "<secteur d'activité précis, 5-15 mots>",
    "audience": "<public cible déduit, 10-20 mots>",
    "goal": "<objectif principal probable du site, 10-20 mots>",
    "keywords": "<5-7 mots-clés SEO ciblés et optimisés, séparés par virgule>",
    "tone": "<ton détecté ou recommandé>",
    "primaryColor": "<#xxxxxx hex, couleur principale recommandée>",
    "secondaryColor": "<#xxxxxx hex, couleur d'accent qui complémente la primaire — règle 60-30-10>",
    "tagline": "<slogan court 5-10 mots qui résume le bénéfice principal>"
  },
  "insights": {
    "summary": "<résumé en 2 phrases : QUOI le site propose et POUR QUI>",
    "detectedKeywords": ["<5 mots-clés actuels présents dans le contenu>"],
    "currentIssues": ["<3-5 problèmes SEO/UX identifiés sur la page actuelle>"],
    "improvements": ["<3-5 améliorations concrètes que la refonte va apporter>"]
  }
}

Sois pertinent et spécifique au sujet réel de la page. Pas de copywriting marketing générique.`;

  const ai = await askWanapush(prompt);
  if (!ai) {
    return NextResponse.json(
      { error: "Aucune clé IA configurée" },
      { status: 500 },
    );
  }

  const cleaned = ai.text
    .trim()
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  let analysis: { brief: RebuildAnalysis["brief"]; insights: Omit<RebuildAnalysis["insights"], "contentSamples"> };
  try {
    analysis = JSON.parse(cleaned);
  } catch {
    return NextResponse.json(
      { error: `IA n'a pas retourné du JSON valide : ${cleaned.slice(0, 200)}` },
      { status: 500 },
    );
  }

  // Détection automatique d'un logo via re-fetch HTML (fast scan)
  let detectedLogo: string | undefined;
  try {
    const htmlRes = await fetch(parsed.data.url, {
      headers: { "User-Agent": "WanaPushBot/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (htmlRes.ok) {
      const html = await htmlRes.text();
      const $ = cheerio.load(html);
      // Stratégies de détection (ordre de priorité)
      const candidates = [
        $('meta[property="og:logo"]').attr("content"),
        $('link[rel="icon"][type*="png"]').attr("href"),
        $('header img[alt*="logo" i], header img[src*="logo" i]').first().attr("src"),
        $('nav img').first().attr("src"),
        $('img[alt*="logo" i], img[src*="logo" i]').first().attr("src"),
        $('link[rel="icon"]').attr("href"),
      ].filter(Boolean) as string[];
      if (candidates.length > 0) {
        try {
          detectedLogo = new URL(candidates[0], parsed.data.url).toString();
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* ignore — logo detection est optionnel */
  }
  if (detectedLogo) {
    analysis.brief.logoUrl = detectedLogo;
  }

  // Échantillons de contenu (pour info utilisateur dans l'UI)
  const contentSamples = [
    audit.title.value && { type: "title", text: audit.title.value },
    audit.h1.values[0] && { type: "h1", text: audit.h1.values[0] },
    audit.metaDescription.value && { type: "meta", text: audit.metaDescription.value },
    audit.firstParagraph && { type: "paragraph", text: audit.firstParagraph.slice(0, 200) },
  ].filter(Boolean) as { type: string; text: string }[];

  const result: RebuildAnalysis = {
    sourceUrl: parsed.data.url,
    brief: analysis.brief,
    insights: {
      ...analysis.insights,
      contentSamples,
    },
    provider: ai.provider,
    model: ai.model,
  };

  return NextResponse.json(result);
}
