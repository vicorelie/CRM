// Analyse multimodale d'un site de référence.
// On screenshot le premier viewport puis on demande à l'IA (vision) de décrire
// la structure visuelle : layout du hero, couleurs/typo/ornements, sections suivantes.
// Le résultat sert de directive ferme pour la génération JSX.

import { askAi } from "@/lib/ai";
import { captureFirstViewport } from "@/lib/screenshot";

// Tous les champs sont optionnels : l'IA peut ne pas remplir certains champs
// et le schéma Zod en aval les marque optional aussi. Les consommateurs doivent
// gérer les absences (?? "" ou ?? []).
export type VisualAnalysis = {
  shortSummary?: string;
  heroLayout?: string;
  heroBackground?: string;
  heroVisualPosition?: string;
  typography?: string;
  buttonStyle?: string;
  shadows?: string;
  signatureEffects?: string[];
  sectionsBelow?: string[];
  matchedProfile?: string;
  reproductionHints?: string[];
  isDark?: boolean;
};

const PROMPT = `Tu es un designer UI/UX senior. Analyse l'image fournie (premier viewport d'une page web, 1280×800) et décris sa structure visuelle pour qu'un développeur puisse la reproduire AVEC une stack React+Tailwind.

Réponds UNIQUEMENT par un JSON strict (pas de \`\`\`json, juste l'objet) avec EXACTEMENT cette forme :

{
  "shortSummary": "1-2 phrases qui capturent l'identité (ex: 'Stripe-like, hero clair sur gradient pastel indigo/cyan, gros titre noir, mockup produit à droite avec card flottante')",
  "heroLayout": "split | centered | slider | blob | fullscreen-image | banner",
  "heroBackground": "ex: 'gradient #a8b1ff → #ffffff' ou 'noir uni' ou 'image fond avec overlay'",
  "heroVisualPosition": "right | left | center | behind | none",
  "typography": "ex: 'sans-serif géométrique très bold, h1 black 90pt letter-spacing -0.04em, body grey 18pt'",
  "buttonStyle": "ex: 'pill avec gradient violet→bleu, ombre douce' ou 'square outline noir'",
  "shadows": "none | subtle | heavy | glow",
  "signatureEffects": ["liste 2-5 effets visuels signatures, ex: 'gradient mesh pastel', 'card flottante avec checkmark vert', 'code snippet en mockup terminal sombre'"],
  "sectionsBelow": ["liste ordonnée 3-6 sections après le hero, ex: 'logos clients en grille semi-transparente', 'feature avec code à gauche, texte à droite', 'pricing 3 colonnes carrées'"],
  "matchedProfile": "minimal | bold-vibrant | trust-corporate | luxury-elegant | playful-startup | editorial | tech-modern | wellness-soft",
  "reproductionHints": ["5-8 instructions ULTRA CONCRÈTES pour reproduire — ciblées React+Tailwind, ex: 'hero: grid lg:grid-cols-2 gap-12, fond bg-gradient-to-br from-indigo-50 via-white to-cyan-50, h1 text-7xl font-black tracking-tight'"],
  "isDark": false
}

Sois précis et descriptif. Ne JAMAIS hallucination de contenu (n'invente pas de texte du site). Décris UNIQUEMENT ce que tu vois visuellement.`;

/**
 * Capture le screenshot d'un site de référence et fait une analyse vision.
 * Renvoie null si l'une des étapes échoue (les callers font fallback proprement).
 */
export async function analyzeReferenceSite(url: string): Promise<VisualAnalysis | null> {
  console.log(`[vision-analyzer] capture: ${url}`);
  const shot = await captureFirstViewport(url);
  if (!shot) {
    console.warn("[vision-analyzer] screenshot échoué — abandon");
    return null;
  }
  console.log(`[vision-analyzer] screenshot OK (${(shot.bytes / 1024).toFixed(0)} KB), envoi à l'IA vision…`);

  const ai = await askAi({
    prompt: PROMPT,
    imageBase64: shot.base64,
    temperature: 0.2,
    maxTokens: 2000,
    system: "Tu es un designer UI/UX senior expert en reproduction de designs. Tu réponds en JSON strict valide, rien d'autre.",
  });
  if (!ai) {
    console.warn("[vision-analyzer] IA pas de réponse");
    return null;
  }

  const cleaned = ai.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as VisualAnalysis;
    console.log(`[vision-analyzer] analysé → profile=${parsed.matchedProfile}, hero=${parsed.heroLayout}, sections=${parsed.sectionsBelow?.length ?? 0}`);
    return parsed;
  } catch (err) {
    console.error("[vision-analyzer] JSON parse error:", err, cleaned.slice(0, 400));
    return null;
  }
}
