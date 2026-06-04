import * as cheerio from "cheerio";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { askWanapush } from "@/lib/ai";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 90;

const inputSchema = z.object({
  pageUrl: z.string().url(),
  targetKeyword: z.string().trim().max(200).optional(),
});

type ExistingBlock = {
  /** Index unique pour matching côté client */
  id: number;
  /** "p" | "h2" | "h3" — type d'élément */
  type: "p" | "h2" | "h3";
  /** Texte exact actuel (utilisé pour le find&replace) */
  original: string;
  /** Suggestion IA améliorée (vide si pas de proposition) */
  suggested: string;
  /** Pourquoi on suggère ce changement */
  reason: string;
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

  // 1. Crawl la page
  let html: string;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15_000);
    const res = await fetch(parsed.data.pageUrl, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; WanaPushBot/1.0)" },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) {
      return NextResponse.json(
        { error: `Page inaccessible : HTTP ${res.status}` },
        { status: 502 },
      );
    }
    html = await res.text();
  } catch (err) {
    return NextResponse.json(
      { error: `Fetch échoué : ${err instanceof Error ? err.message : "?"}` },
      { status: 502 },
    );
  }

  // 2. Extrait les blocs textuels du contenu principal
  const $ = cheerio.load(html);
  $("script, style, noscript, nav, header, footer, aside").remove();

  const root = $("main").first().length
    ? $("main").first()
    : $("article").first().length
      ? $("article").first()
      : $("body");

  const blocks: { type: "p" | "h2" | "h3"; text: string }[] = [];
  root.find("h2, h3, p").each((_, el) => {
    const tag = el.tagName.toLowerCase() as "p" | "h2" | "h3";
    const text = $(el).text().trim();
    // Garde uniquement les blocs avec du contenu textuel substantiel
    if (
      text.length >= (tag === "p" ? 30 : 5) &&
      text.length <= 800 &&
      // Évite les doublons exacts
      !blocks.some((b) => b.text === text)
    ) {
      blocks.push({ type: tag, text });
    }
  });

  // Limite à 12 blocs max pour éviter les prompts énormes
  const sample = blocks.slice(0, 12);
  if (sample.length === 0) {
    return NextResponse.json(
      { error: "Aucun bloc textuel suffisamment riche trouvé sur la page" },
      { status: 404 },
    );
  }

  const targetKw = parsed.data.targetKeyword || "(non spécifié)";

  // 3. Demande à l'IA d'améliorer chaque bloc
  const prompt = `Tu vas réécrire les textes EXISTANTS d'une page web pour les rendre plus performants en SEO et UX, SANS changer leur sens, SANS inventer de faits.

URL : ${parsed.data.pageUrl}
Mot-clé cible : ${targetKw}

CONTENUS À AMÉLIORER (${sample.length} blocs) :
${sample
  .map(
    (b, i) => `[${i}] (${b.type}) "${b.text}"`,
  )
  .join("\n")}

RÈGLES STRICTES :
- Améliore CHAQUE bloc en gardant le MÊME SENS
- N'invente AUCUN fait, prix, fonctionnalité, témoignage qui ne soit pas dans le texte original
- Préserve le ton et le vocabulaire de la marque
- Pour les H2/H3 : rends-les plus accrocheurs (questions, bénéfices) et inclus le mot-clé naturellement si possible
- Pour les P : enrichis-les (ajoute 30-50% de mots avec exemples concrets, précisions, contexte) tout en restant fidèle au sens
- Si un bloc est déjà très bien et n'a pas besoin d'amélioration, mets "" dans "suggested" et explique pourquoi dans "reason"
- Si tu as un doute sur le sens du texte original (jargon métier inconnu), mets "" dans "suggested" plutôt que d'inventer

FORMAT — JSON STRICT (pas de \`\`\`, pas de commentaire) :
{
  "rewrites": [
    {
      "id": 0,
      "type": "p",
      "original": "<copie EXACTE du texte original>",
      "suggested": "<version améliorée OU vide si déjà OK>",
      "reason": "<1 phrase : ce qui a été amélioré et pourquoi>"
    }
  ]
}

Tu DOIS produire ${sample.length} entrées dans "rewrites" (une par bloc, dans le même ordre).`;

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

  let result: { rewrites: ExistingBlock[] };
  try {
    const parsedAi = JSON.parse(cleaned);
    // Re-mappe avec original = texte exact extrait (au cas où l'IA a légèrement modifié)
    result = {
      rewrites: (parsedAi.rewrites ?? []).map(
        (r: { id?: number; type?: string; suggested?: string; reason?: string }, i: number) => {
          const idx = typeof r.id === "number" ? r.id : i;
          const source = sample[idx] ?? sample[i];
          return {
            id: idx,
            type: (r.type as "p" | "h2" | "h3") ?? source?.type ?? "p",
            original: source?.text ?? "",
            suggested: typeof r.suggested === "string" ? r.suggested.trim() : "",
            reason: typeof r.reason === "string" ? r.reason : "",
          };
        },
      ),
    };
  } catch {
    return NextResponse.json(
      { error: `IA n'a pas retourné du JSON valide : ${cleaned.slice(0, 200)}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    pageUrl: parsed.data.pageUrl,
    targetKeyword: targetKw,
    blocksFound: blocks.length,
    rewrites: result.rewrites,
    provider: ai.provider,
    model: ai.model,
  });
}
