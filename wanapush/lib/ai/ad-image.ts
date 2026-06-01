// Génération d'images creative pour les publicités Meta Ads via OpenAI.
//
// Stratégie 2026 :
//   - Modèle par défaut : `gpt-image-1` (mieux que DALL-E 3 sur le rendu pub :
//     compositions plus pro, texte rendu correct si court, sujets humains plus réalistes)
//   - Fallback `dall-e-3` si gpt-image-1 indisponible ou erreur
//   - Formats Meta : 1080x1080 (feed carré) ou 1080x1920 (stories/reels)
//
// L'image générée est téléchargée localement dans /public/uploads/<userId>/
// car l'URL retournée par OpenAI expire en ~1h. L'URL publique stable est
// retournée pour être utilisée comme `imageUrl` dans PushCampaignInput.

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { openai } from "@/lib/openai";

/**
 * Formats Meta supportés. Meta accepte techniquement plus, mais ces 2-3 ratios
 * couvrent 99% des placements (Feed, Stories, Reels).
 */
export const AD_IMAGE_SIZES = {
  /** Feed carré — placement Feed Facebook/Instagram principal */
  square: "1024x1024",
  /** Stories / Reels — vertical 9:16 */
  vertical: "1024x1536",
  /** Bannière horizontale — placement Audience Network */
  horizontal: "1536x1024",
} as const;

export type AdImageSizeKey = keyof typeof AD_IMAGE_SIZES;

export type GenerateAdImageInput = {
  /** Prompt en français ou anglais — décrit la scène (sujet, style, ambiance, lumière) */
  prompt: string;
  /** Format de l'image — défaut "square" (Feed carré) */
  size?: AdImageSizeKey;
  /** Style général — "natural" (photo réaliste, recommandé 2026 pour ads pros) ou "vivid" (couleurs saturées) */
  style?: "natural" | "vivid";
  /** ID utilisateur WanaPush (pour le path de stockage local) */
  userId: string;
};

export type GenerateAdImageResult = {
  ok: true;
  /** URL publique stable de l'image (servie depuis /public/uploads) */
  url: string;
  /** Prompt révisé par OpenAI (parfois enrichi) */
  revisedPrompt?: string;
  /** Modèle effectivement utilisé (utile pour debug) */
  model: string;
  /** Taille de l'image générée (passée en input) */
  size: string;
} | {
  ok: false;
  error: string;
};

/**
 * Modèles à essayer dans l'ordre. Si OPENAI_IMAGE_MODEL est défini dans l'env,
 * il est essayé en premier (override).
 */
function modelCandidates(): string[] {
  const envModel = process.env.OPENAI_IMAGE_MODEL;
  const list = ["gpt-image-1", "dall-e-3"];
  if (envModel && !list.includes(envModel)) list.unshift(envModel);
  if (envModel && list.includes(envModel)) {
    // Mettre l'env model en premier
    return [envModel, ...list.filter((m) => m !== envModel)];
  }
  return list;
}

/**
 * Génère une image creative pour une publicité Meta et la stocke localement.
 *
 * @returns URL publique stable + métadonnées, ou erreur
 */
export async function generateAdImage(input: GenerateAdImageInput): Promise<GenerateAdImageResult> {
  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, error: "OPENAI_API_KEY non définie" };
  }

  const size = AD_IMAGE_SIZES[input.size ?? "square"];
  const style = input.style ?? "natural"; // "natural" = meilleur pour les pubs pros en 2026

  // Try chaque modèle dans l'ordre jusqu'à succès
  let lastError = "";
  let imageUrl = "";
  let revisedPrompt: string | undefined;
  let usedModel = "";

  for (const model of modelCandidates()) {
    try {
      // gpt-image-1 supporte `quality` mais pas `style`, DALL-E 3 supporte les deux
      const params: Record<string, unknown> = {
        model,
        prompt: input.prompt,
        n: 1,
        size,
      };
      if (model === "dall-e-3") {
        params.style = style;
        params.quality = "standard";
      }
      // gpt-image-1 utilise "quality" mais avec valeurs différentes ("low"/"medium"/"high"/"auto")
      if (model.startsWith("gpt-image")) {
        params.quality = "high";
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = await openai.images.generate(params as any);
      const item = r.data?.[0];
      // gpt-image-1 retourne b64_json par défaut, DALL-E 3 retourne url
      if (item?.url) {
        imageUrl = item.url;
      } else if (item?.b64_json) {
        // Inline base64 — on l'écrit direct sans télécharger via HTTP
        imageUrl = `data:image/png;base64,${item.b64_json}`;
      } else {
        throw new Error(`Pas d'image retournée par ${model}`);
      }
      revisedPrompt = item.revised_prompt;
      usedModel = model;
      break;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      console.warn(`[generateAdImage] modèle ${model} a échoué:`, lastError);
      continue;
    }
  }

  if (!imageUrl) {
    return { ok: false, error: lastError || "Tous les modèles ont échoué" };
  }

  // Télécharge et stocke localement
  let buf: Buffer;
  if (imageUrl.startsWith("data:image/")) {
    const base64 = imageUrl.split(",", 2)[1] ?? "";
    buf = Buffer.from(base64, "base64");
  } else {
    try {
      const r = await fetch(imageUrl);
      if (!r.ok) return { ok: false, error: `Téléchargement OpenAI échoué (HTTP ${r.status})` };
      buf = Buffer.from(await r.arrayBuffer());
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Téléchargement échoué" };
    }
  }

  const slug = randomBytes(12).toString("hex");
  const filename = `${Date.now()}-ad-${slug}.png`;
  const subdir = path.join("public", "uploads", "ads", input.userId);
  const fullDir = path.join(process.cwd(), subdir);
  try {
    await mkdir(fullDir, { recursive: true });
    await writeFile(path.join(fullDir, filename), buf);
  } catch (e) {
    return { ok: false, error: `Échec écriture disque: ${e instanceof Error ? e.message : "?"}` };
  }

  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "";
  const url = `${baseUrl}/uploads/ads/${input.userId}/${filename}`;

  return { ok: true, url, revisedPrompt, model: usedModel, size };
}

/**
 * Construit un prompt optimisé pour une pub Meta à partir d'un brief produit.
 *
 * Best practices 2026 pour les visuels ads :
 *   - Sujet humain quand possible (relevance +30%)
 *   - Lumière naturelle (look UGC > studio)
 *   - Pas de texte dans l'image (Meta a viré la règle du 20%, mais les visuels
 *     sans texte performent toujours mieux car plus authentiques)
 *   - Composition centre/règle des tiers
 *   - Couleurs cohérentes avec la marque
 */
export function buildAdImagePrompt(brief: {
  productOrService: string;
  audience?: string;
  tone?: "professional" | "casual" | "luxury" | "playful";
  brandColors?: string[];
  scene?: string;
}): string {
  const toneAdjectives: Record<string, string> = {
    professional: "professionnel, sobre, premium",
    casual: "décontracté, authentique, UGC",
    luxury: "luxueux, élégant, raffiné",
    playful: "ludique, coloré, énergique",
  };
  const tone = toneAdjectives[brief.tone ?? "casual"] ?? toneAdjectives.casual;

  const sceneHint = brief.scene
    ? brief.scene
    : "scène lifestyle authentique, lumière naturelle douce, composition rule of thirds, profondeur de champ légère";

  const colorsHint = brief.brandColors?.length
    ? `palette de couleurs dominantes ${brief.brandColors.join(", ")}, `
    : "";

  const audienceHint = brief.audience
    ? ` Cible visuelle : ${brief.audience}.`
    : "";

  return [
    `Photo publicitaire ${tone} pour : ${brief.productOrService}.`,
    audienceHint,
    `${sceneHint}, ${colorsHint}style photo éditoriale, ratio 1:1.`,
    "Pas de texte ni de logo dans l'image.",
    "Haute qualité, rendu réaliste, ambiance positive.",
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}
