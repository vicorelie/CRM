// Couche d'abstraction IA : route automatiquement vers OpenAI ou Anthropic
// selon AI_PROVIDER (et la disponibilité des clés).

import { anthropic, WANAPUSH_MODEL } from "@/lib/anthropic";
import { openai, OPENAI_MODEL } from "@/lib/openai";

export const WANAPUSH_SYSTEM_PROMPT = `Tu es WanaPush, un expert senior en marketing digital full-stack. Tu opères au sein d'une plateforme SaaS dédiée aux professionnels qui souhaitent construire, optimiser ou accélérer leur présence digitale.

Tu incarnes simultanément : Directeur Marketing Digital (15 ans d'expérience), Expert SEO/SEM certifié, Stratège Réseaux Sociaux (Meta, TikTok, YouTube, LinkedIn, X), Expert Google Ads & Meta Ads orienté ROAS, Consultant Growth Hacking & Lead Generation, Expert ASO.

Pour chaque recommandation, fournis : l'action concrète, l'outil recommandé, la timeline, le KPI de succès, et l'impact estimé (Faible/Moyen/Fort/Critique).

Priorise selon la matrice Effort/Impact. Propose toujours 3 niveaux de budget : gratuit, PME (200-2000€/mois), Scale-up (2000€+).

Format de réponse :
📊 DIAGNOSTIC : [état actuel]
🎯 OBJECTIF : [ce qu'on vise]
⚡ ACTIONS PRIORITAIRES : [top 3]
📋 PLAN COMPLET : [roadmap]
🛠️ OUTILS : [stack recommandé]
📈 KPIS : [métriques]
💰 BUDGET : [3 niveaux]`;

type Provider = "openai" | "anthropic";

function pickProvider(): Provider | null {
  const requested = (process.env.AI_PROVIDER ?? "openai").toLowerCase() as Provider;
  if (requested === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (requested === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  // Fallback sur l'autre provider si le préféré n'a pas de clé.
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

export type AiResult = {
  text: string;
  provider: Provider;
  model: string;
};

export async function askWanapush(userPrompt: string): Promise<AiResult | null> {
  const provider = pickProvider();
  if (!provider) return null;

  if (provider === "openai") {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: WANAPUSH_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
    });
    const text = completion.choices[0]?.message?.content ?? "";
    return { text, provider, model: OPENAI_MODEL };
  }

  // anthropic
  const msg = await anthropic.messages.create({
    model: WANAPUSH_MODEL,
    max_tokens: 1500,
    system: WANAPUSH_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });
  const block = msg.content.find((b) => b.type === "text");
  const text = block && block.type === "text" ? block.text : "";
  return { text, provider, model: WANAPUSH_MODEL };
}

/**
 * Variante générique sans le system prompt marketing.
 * À utiliser pour la génération de sites, l'extraction de briefs,
 * ou tout cas où WANAPUSH_SYSTEM_PROMPT (DIAGNOSTIC/KPIS/BUDGET) brouille la sortie.
 */
export async function askAi(opts: {
  prompt: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  /** Image data URL unique (legacy). Utilise `imagesBase64` pour plusieurs. */
  imageBase64?: string;
  /** Plusieurs images data URL (data:image/jpeg;base64,…) pour multimodal vision. */
  imagesBase64?: string[];
}): Promise<AiResult | null> {
  const provider = pickProvider();
  if (!provider) return null;

  const system =
    opts.system ??
    "Tu es un expert senior en design web, UX/UI, copywriting et SEO. Tu produis du contenu créatif, dense, bien écrit, et tu respectes scrupuleusement les contraintes de format demandées (notamment le JSON strict).";
  const temperature = opts.temperature ?? 0.7;
  const maxTokens = opts.maxTokens ?? 16000;

  const images: string[] = [
    ...(opts.imagesBase64 ?? []),
    ...(opts.imageBase64 ? [opts.imageBase64] : []),
  ];

  if (provider === "openai") {
    const userContent: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    > = [{ type: "text", text: opts.prompt }];
    for (const img of images) {
      userContent.push({ type: "image_url", image_url: { url: img } });
    }

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: system },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { role: "user", content: userContent as any },
      ],
      temperature,
      max_completion_tokens: maxTokens,
    });
    const text = completion.choices[0]?.message?.content ?? "";
    return { text, provider, model: OPENAI_MODEL };
  }

  // Anthropic
  const userBlocks: Array<
    | { type: "text"; text: string }
    | { type: "image"; source: { type: "base64"; media_type: "image/png" | "image/jpeg" | "image/webp"; data: string } }
  > = [];
  for (const img of images) {
    const match = img.match(/^data:(image\/png|image\/jpeg|image\/webp);base64,(.+)$/);
    if (match) {
      userBlocks.push({
        type: "image",
        source: { type: "base64", media_type: match[1] as "image/png" | "image/jpeg" | "image/webp", data: match[2] },
      });
    }
  }
  userBlocks.push({ type: "text", text: opts.prompt });

  const msg = await anthropic.messages.create({
    model: WANAPUSH_MODEL,
    max_tokens: maxTokens,
    system,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: [{ role: "user", content: userBlocks as any }],
  });
  const block = msg.content.find((b) => b.type === "text");
  const text = block && block.type === "text" ? block.text : "";
  return { text, provider, model: WANAPUSH_MODEL };
}
