// Endpoint de pré-suggestion : à partir d'un prompt utilisateur, l'IA propose
// une composition (header + sections), un thème (couleurs, mode, dégradé) et
// extrait le brief de base (nom, description, tagline).
// Le résultat sert à pré-remplir le builder de /generate. L'utilisateur peut
// tout ajuster avant de cliquer "Générer le site" (qui appelle /build).

import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { askAi } from "@/lib/ai";
import { COMPONENT_REGISTRY, validateComposition, getById } from "@/lib/sections-catalog";

export const runtime = "nodejs";
export const maxDuration = 90;

const inputSchema = z.object({
  prompt: z.string().min(10).max(2000),
  brandName: z.string().max(80).optional(),
  siteType: z.enum(["vitrine", "ecommerce"]).default("vitrine"),
});

const HEADERS = COMPONENT_REGISTRY.filter((c) => c.category === "header");
const SECTIONS = COMPONENT_REGISTRY.filter((c) => c.category === "section");

const SUGGESTION_SYSTEM = `Tu es un architecte web senior. À partir de la description d'un projet, tu choisis :
1. Le brief (nom de marque + description + tagline courte).
2. La composition : UN header (parmi 4 variantes de hero) et 5 à 9 sections (dans l'ordre d'affichage).
3. Le thème visuel (mode clair/sombre, 2 couleurs hex, mode de dégradé).

Règles strictes :
- Tu n'inventes pas d'IDs : tu utilises EXACTEMENT les IDs fournis dans le catalogue.
- Tu adaptes le choix au secteur (photographe → hero_slider + gallery, SaaS → hero_split + features + pricing, restaurant → hero_slider + service_tiles + contact, etc.).
- Tu finis toujours par contact (et souvent cta juste avant).
- Tu choisis des couleurs cohérentes avec le secteur (luxe/minimal → tons sombres ; mariage/lifestyle → tons doux pastels ; tech/SaaS → indigo/violet ; restaurant → terre/ocre, etc.).
- Tu réponds UNIQUEMENT avec du JSON valide, sans markdown, sans explication. Format strict :
{
  "brief": {
    "brandName": "Nom court",
    "description": "1-2 phrases décrivant l'activité (sera affichée sur le site)",
    "tagline": "Slogan court"
  },
  "composition": {
    "header": "hero|hero_split|hero_slider|hero_blob",
    "sections": ["id1", "id2", ...]
  },
  "theme": {
    "mode": "light|dark",
    "primaryColor": "#RRGGBB",
    "secondaryColor": "#RRGGBB",
    "colorMode": "gradient|bicolor|mono"
  },
  "rationale": "1-2 phrases expliquant tes choix"
}`;

function catalogPrompt(prompt: string, brandName?: string, siteType: "vitrine" | "ecommerce" = "vitrine"): string {
  const headersList = HEADERS.map((h) => `- ${h.id}: ${h.label} — ${h.description}`).join("\n");
  // En mode e-commerce, on retire shop_grid et shop_categories du catalogue HOME
  // (ils seront sur la page /boutique dédiée). shop_featured reste pour la home.
  const availableSections = siteType === "ecommerce"
    ? SECTIONS.filter((s) => s.id !== "shop_grid" && s.id !== "shop_categories")
    : SECTIONS.filter((s) => !s.id.startsWith("shop_"));
  const sectionsList = availableSections.map((s) => `- ${s.id}: ${s.label} — ${s.description}`).join("\n");
  const ecomHint = siteType === "ecommerce"
    ? `\n\nIMPORTANT : C'est un site E-COMMERCE. Tu DOIS inclure "shop_featured" (coups de cœur) idéalement en 2ᵉ ou 3ᵉ position. La grille complète des produits sera sur la page /boutique dédiée — ne mets PAS shop_grid ni shop_categories ici.`
    : "";
  return `Description du projet :
"""
${prompt}
${brandName ? `Nom de marque suggéré : ${brandName}` : ""}
"""${ecomHint}

Catalogue des HEADERS disponibles (choisis-en EXACTEMENT 1) :
${headersList}

Catalogue des SECTIONS disponibles (choisis-en 5 à 9, dans l'ordre) :
${sectionsList}

Réponds uniquement en JSON strict, conforme au format demandé.`;
}

function tryParseJson(text: string): unknown | null {
  // 1. tentative directe
  try { return JSON.parse(text); } catch {}
  // 2. extrait le 1er bloc { ... } (au cas où l'IA aurait ajouté du préfixe)
  const m = text.match(/\{[\s\S]*\}/);
  if (m) {
    try { return JSON.parse(m[0]); } catch {}
  }
  // 3. nettoie les fences markdown ```json ... ```
  const cleaned = text.replace(/```(?:json)?\s*([\s\S]*?)```/g, "$1").trim();
  try { return JSON.parse(cleaned); } catch {}
  return null;
}

const suggestionSchema = z.object({
  brief: z.object({
    brandName: z.string().min(1).max(80),
    description: z.string().min(10).max(500),
    tagline: z.string().max(120).optional(),
  }),
  composition: z.object({
    header: z.string(),
    sections: z.array(z.string()).min(3).max(12),
  }),
  theme: z.object({
    mode: z.enum(["light", "dark"]),
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    colorMode: z.enum(["gradient", "bicolor", "mono"]),
  }),
  rationale: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const parsed = inputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalide" },
      { status: 400 },
    );
  }

  let aiRes;
  try {
    aiRes = await askAi({
      prompt: catalogPrompt(parsed.data.prompt, parsed.data.brandName, parsed.data.siteType),
      system: SUGGESTION_SYSTEM,
      temperature: 0.4,
      maxTokens: 1200,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Détecte les erreurs de quota OpenAI pour un message clair
    const isQuota = /quota|insufficient_quota|rate.?limit|billing/i.test(msg);
    return NextResponse.json(
      {
        error: isQuota
          ? "Crédits OpenAI épuisés. Ajoute du crédit sur platform.openai.com ou bascule AI_PROVIDER=anthropic dans .env.local."
          : `Erreur IA : ${msg}`,
      },
      { status: 502 },
    );
  }
  if (!aiRes?.text) {
    return NextResponse.json({ error: "Pas de réponse IA" }, { status: 502 });
  }

  const raw = tryParseJson(aiRes.text);
  if (!raw) {
    return NextResponse.json(
      { error: "JSON invalide de l'IA", raw: aiRes.text.slice(0, 400) },
      { status: 502 },
    );
  }

  const validated = suggestionSchema.safeParse(raw);
  if (!validated.success) {
    return NextResponse.json(
      { error: validated.error.issues[0]?.message ?? "Schéma invalide", raw },
      { status: 502 },
    );
  }

  // Filtre les IDs inconnus (sécurise contre les hallucinations de l'IA)
  const headerMeta = getById(validated.data.composition.header);
  const header = headerMeta?.category === "header" ? validated.data.composition.header : "hero_split";
  const sections = validated.data.composition.sections.filter((id) => {
    const m = getById(id);
    return m?.category === "section";
  });
  // En mode e-commerce : retire shop_grid / shop_categories de la home (ils iront sur /boutique)
  // et garantit shop_featured en 2ᵉ position si l'IA l'a oublié.
  if (parsed.data.siteType === "ecommerce") {
    const cleaned = sections.filter((id) => id !== "shop_grid" && id !== "shop_categories");
    if (!cleaned.includes("shop_featured")) cleaned.splice(1, 0, "shop_featured");
    sections.length = 0;
    sections.push(...cleaned);
  } else {
    // Vitrine : aucune section shop sur la home
    const cleaned = sections.filter((id) => !id.startsWith("shop_"));
    sections.length = 0;
    sections.push(...cleaned);
  }
  // Garantit la présence de contact en dernier
  if (!sections.includes("contact")) sections.push("contact");

  const composition = { header, sections };
  const v = validateComposition(composition);
  if (!v.ok) {
    return NextResponse.json({ error: v.reason }, { status: 502 });
  }

  return NextResponse.json({
    brief: validated.data.brief,
    composition,
    theme: validated.data.theme,
    siteType: parsed.data.siteType,
    rationale: validated.data.rationale ?? null,
    provider: aiRes.provider,
    model: aiRes.model,
  });
}
