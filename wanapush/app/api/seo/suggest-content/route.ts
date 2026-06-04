import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { askWanapush } from "@/lib/ai";
import { authOptions } from "@/lib/auth";
import { crawl } from "@/lib/seo-audit";

export const runtime = "nodejs";
export const maxDuration = 60;

const inputSchema = z.object({
  pageUrl: z.string().url(),
  /** Mot-clé cible (optionnel — sinon déduit du title) */
  targetKeyword: z.string().trim().max(200).optional(),
});

type SuggestedSection = {
  /** Titre H2 court (5-10 mots) */
  title: string;
  /** 1-2 paragraphes de texte (chaque ~ 60-100 mots) */
  paragraphs: string[];
  /** Pourquoi cette section : info pour l'utilisateur lors de la validation */
  rationale: string;
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

  // 1. Audit la page pour récupérer le contexte
  const audit = await crawl(parsed.data.pageUrl);

  const targetKw = parsed.data.targetKeyword || audit.title.value || "ce sujet";

  // 2. Demande à l'IA de proposer 3 sections additionnelles, en utilisant le VRAI contenu de la page
  const prompt = `Tu vas enrichir une page web existante (${audit.wordCount} mots, on vise 300+ pour le SEO).

═══════════════════════════════════════════════════════
CONTENU EXACT DE LA PAGE (texte visible nettoyé) :
═══════════════════════════════════════════════════════
"""
${audit.bodyText || audit.firstParagraph || "(contenu trop maigre pour être extrait)"}
"""
═══════════════════════════════════════════════════════

MÉTADONNÉES :
- URL : ${parsed.data.pageUrl}
- Title : "${audit.title.value ?? "(vide)"}"
- H1 : "${audit.h1.values[0] ?? "(aucun)"}"
- H2 existants : ${audit.h2Count} · H3 existants : ${audit.h3Count}
- Mot-clé cible : "${targetKw}"

TA TÂCHE — RÈGLE CRUCIALE :
Tes 3 sections additionnelles doivent **PROLONGER LE SUJET RÉEL** ci-dessus, pas en introduire un nouveau.

EXEMPLES DE CE QU'IL FAUT FAIRE :
✅ Si la page parle de "tarifs téléphonie mobile" : approfondir les tarifs, comparer formules, expliquer la facturation au temps
✅ Si la page parle de "plombier urgence Paris" : détailler les types d'interventions, zones, délais
✅ Reprendre le VOCABULAIRE EXACT de la page (mêmes noms produits, mêmes termes métier)

EXEMPLES DE CE QU'IL NE FAUT PAS FAIRE :
❌ Générer du blabla marketing flou type "modulent leurs ressources selon leurs besoins spécifiques"
❌ Parler de "services flexibles" si la page traite de plomberie ou de tarifs
❌ Introduire des fonctionnalités/produits/prix qui ne sont pas dans le contenu fourni
❌ Phrases creuses : "dans un environnement en constante évolution", "permettant d'optimiser", "approche proactive"

CHAQUE SECTION DOIT :
- Avoir un H2 court qui REPREND un terme du contenu existant (5-10 mots)
- UN SEUL paragraphe de 100-150 mots qui APPROFONDIT un aspect précis du sujet
- Éviter ABSOLUMENT le copywriting marketing générique
- L'utilisateur pourra ajouter un 2e paragraphe lui-même s'il le souhaite

INTERDICTIONS STRICTES :
- N'invente AUCUN prix, date, statistique, nom de client, témoignage
- N'invente AUCUNE fonctionnalité ou produit qui n'est pas mentionné dans le contenu fourni
- Si tu n'as pas assez d'info pour 3 sections distinctes, fais-en 2 ou 1 plutôt que d'inventer

TYPES DE SECTIONS PERTINENTS (choisis ceux qui collent au sujet réel) :
- Approfondir un point déjà évoqué (ex: page mentionne "fuites" → section "Types de fuites traitées")
- FAQ basée sur les questions implicites de la page
- Cas d'usage concrets liés au sujet exact
- Comparaison/alternative si le contexte s'y prête

FORMAT — JSON STRICT (pas de \`\`\`, pas de commentaire) :
{
  "sections": [
    {
      "title": "<H2 reprenant un terme du contenu existant>",
      "paragraphs": ["<UN SEUL paragraphe de 100-150 mots qui APPROFONDIT le sujet réel>"],
      "rationale": "<1 phrase : quel point précis de la page tu approfondis et pourquoi c'est pertinent>"
    }
  ]
}

Si le contenu fourni est trop maigre/flou pour produire des sections vraiment spécifiques, retourne moins de 3 sections (2 ou 1) plutôt que d'inventer.`;

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

  let suggestions: { sections: SuggestedSection[] };
  try {
    suggestions = JSON.parse(cleaned);
  } catch {
    return NextResponse.json(
      { error: `IA n'a pas retourné du JSON valide : ${cleaned.slice(0, 200)}` },
      { status: 500 },
    );
  }

  if (!Array.isArray(suggestions.sections) || suggestions.sections.length === 0) {
    return NextResponse.json(
      { error: "L'IA n'a généré aucune section utilisable" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    pageUrl: parsed.data.pageUrl,
    currentWordCount: audit.wordCount,
    targetKeyword: targetKw,
    sections: suggestions.sections,
    provider: ai.provider,
    model: ai.model,
  });
}
