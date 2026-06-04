import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { askAi } from "@/lib/ai";
import { detectSector } from "@/lib/site-gen/sector-detector";
import { pickComposition } from "@/lib/site-gen/compositions";

// Mappe un H2 du site de référence vers un type de section.
// Utilise des keywords français + anglais pour reconnaître le rôle.
function mapHeadingToSection(heading: string, sector?: string): string {
  const h = heading.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const isTech = sector === "tech_saas" || sector === "agence_creative";
  if (/(stat|chiffre|annee|client|kpi|million|milliard|pour cent|%|trillion)/i.test(h)) return "stats";
  if (/(trusted by|ils nous font confiance|utilise par|powered by|nos clients|enterprise customers)/i.test(h)) return "logos_bar";
  if (/(processus|methode|etape|how it works|comment ca|step|notre approche)/i.test(h)) return "process";
  if (/(prix|tarif|plan|pricing|formule|offre standard|abonnement)/i.test(h)) return "pricing";
  if (/(question|faq|aide|foire aux)/i.test(h)) return "faq";
  if (/(temoignage|avis client|testimonial|review)/i.test(h)) return "testimonials";
  if (/(galerie|portfolio|gallery|realisation|projet)/i.test(h)) return "gallery";
  if (/(qui sommes|a propos|about|histoire|equipe|notre vision|mission)/i.test(h)) return "about";
  if (/(contact|nous ecrire|nous joindre|get in touch)/i.test(h)) return "contact";
  if (/(prestation|service|offre|expertise|nos|features|fonctionnalite|atout|avantage|solution|business model|pilier|infrastructure|integration|api|developer|paiement)/i.test(h)) {
    return isTech ? "feature_split" : "service_tiles";
  }
  if (/(commencer|essayer|inscription|cta|appel|join|start|demarrer|nouveaute|nouvelle)/i.test(h)) return "cta";
  return isTech ? "feature_split" : "features";
}
import { authOptions } from "@/lib/auth";
import { scanPageDesign, type PageDesign } from "@/lib/design-scanner";
import { crawl } from "@/lib/seo-audit";
import { analyzeReferenceSite, type VisualAnalysis } from "@/lib/vision-analyzer";

export const runtime = "nodejs";
export const maxDuration = 90;

const inputSchema = z.object({
  /** Description libre de ce que l'utilisateur veut */
  prompt: z.string().trim().min(20).max(5000),
  /** URL d'un site de référence pour le design (palette + fonts) */
  referenceUrl: z.string().url().optional(),
  /** Type souhaité (override) */
  type: z.enum(["LANDING", "MULTI_PAGE"]).optional(),
  /** Framework de sortie (override) */
  framework: z.enum(["html", "react"]).optional(),
  /** Contexte de refonte — si présent, on reprend les textes/contenu du site source */
  rebuildContext: z
    .object({
      sourceUrl: z.string().url().or(z.literal("")),
      summary: z.string().max(2000).optional(),
      currentIssues: z.array(z.string()).optional(),
      improvements: z.array(z.string()).optional(),
      originalContent: z.string().max(5000).optional(),
      /** Images extraites du site source (jusqu'à 30) pour réemploi éventuel */
      sourceImages: z.array(z.object({ url: z.string(), alt: z.string() })).optional(),
    })
    .optional(),
});

function summarizeReferenceDesign(design: PageDesign, url: string): string {
  return `URL : ${url}
Framework détecté : ${design.detectedFramework}
Background : ${design.backgroundColor ?? "—"} (${design.isDark ? "thème sombre" : "thème clair"})
Couleurs dominantes : ${design.dominantColors.slice(0, 6).join(", ") || "—"}
Familles de fonts : ${design.fontFamilies.slice(0, 4).join(" | ") || "—"}
Google Fonts : ${design.googleFontsUrls.slice(0, 2).join(" | ") || "—"}
Border-radius dominant : ${design.borderRadius ?? "—"}
Logo détecté : ${design.logoUrl ?? "—"}`;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

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

  // 1. Si site de référence : scan du design (palette + fonts + couleurs + radius)
  //    + analyse visuelle multimodale (screenshot + IA vision) en parallèle
  let referenceDesign: PageDesign | null = null;
  let visualAnalysis: VisualAnalysis | null = null;
  let referenceContext = "";
  let referenceTitle = "";
  let referenceFirstParagraph = "";
  if (parsed.data.referenceUrl) {
    try {
      const [design, audit, vision] = await Promise.all([
        scanPageDesign(parsed.data.referenceUrl),
        crawl(parsed.data.referenceUrl).catch(() => null),
        analyzeReferenceSite(parsed.data.referenceUrl).catch((err) => {
          console.error("[from-prompt] vision analysis failed:", err);
          return null;
        }),
      ]);
      referenceDesign = design;
      visualAnalysis = vision;
      referenceTitle = audit?.title.value ?? "";
      referenceFirstParagraph = audit?.firstParagraph?.slice(0, 200) ?? "";
      referenceContext = `

═══════════════════════════════════════════════════════
🎨 SITE DE RÉFÉRENCE — REPRODUIS-LE À 80% (design + structure)
═══════════════════════════════════════════════════════
${summarizeReferenceDesign(design, parsed.data.referenceUrl)}
${referenceTitle ? `Title actuel : "${referenceTitle}"` : ""}
${referenceFirstParagraph ? `Premier paragraphe : "${referenceFirstParagraph}"` : ""}

📐 STRUCTURE DÉTECTÉE :
- ${design.sectionCount} sections principales
- Titres H2 dans l'ordre (= sections du site) :
${design.sectionHeadings.map((h, i) => `  ${i + 1}. "${h}"`).join("\n")}

⚠️ DIRECTIVES STRICTES :
- IMITE le design : palette, fonts, ambiance (dark/light), border-radius, style des boutons
- REPRODUIS la même séquence de sections que le site de référence
- Mappe chaque H2 détecté ci-dessus à un type de section parmi : hero, features, service_tiles, highlights, circles, services_grid, features_phone, stats, process, process_vertical, about, about_cards, gallery, video, promo_split, actions_grid, testimonials, pricing, cta, faq, contact, logos_bar, feature_split
- Si site dark → designProfile dark obligatoire (tech-modern, luxury-elegant)
- Si site editorial/serif → designProfile editorial ou minimal
- N'ajoute PAS de sections supplémentaires qui n'existent pas dans le site de référence
- Le but est que le nouveau site RESSEMBLE à 80% au site de référence (avec contenu adapté au brief utilisateur)
═══════════════════════════════════════════════════════
${vision ? `
👁️ ANALYSE VISUELLE PAR IA (screenshot du site analysé par vision)
═══════════════════════════════════════════════════════
Résumé : ${vision.shortSummary}
- Layout hero : ${vision.heroLayout} (visuel ${vision.heroVisualPosition})
- Background hero : ${vision.heroBackground}
- Typo : ${vision.typography}
- Boutons : ${vision.buttonStyle}
- Ombres : ${vision.shadows}
- Dark theme : ${vision.isDark ? "OUI" : "non"}
- Profile recommandé : ${vision.matchedProfile}
- Effets signatures : ${(vision.signatureEffects ?? []).join(" | ")}
- Sections vues après hero : ${(vision.sectionsBelow ?? []).join(" → ")}

🎯 INSTRUCTIONS DE REPRODUCTION (à appliquer DANS le customCss + choix de sections) :
${(vision.reproductionHints ?? []).map((h, i) => `  ${i + 1}. ${h}`).join("\n")}
═══════════════════════════════════════════════════════
` : ""}`;
    } catch (err) {
      console.warn("[from-prompt] reference fetch failed", err);
    }
  }

  // Bloc optionnel : contenu scrappé du site à refondre (à reprendre comme base de texte)
  let rebuildContentBlock = "";
  if (parsed.data.rebuildContext?.originalContent) {
    const content = parsed.data.rebuildContext.originalContent.slice(0, 4000);
    rebuildContentBlock = `

═══════════════════════════════════════════════════════
🔄 SITE EXISTANT À REFONDRE — REPRENDS LES TEXTES
═══════════════════════════════════════════════════════
URL source : ${parsed.data.rebuildContext.sourceUrl}
Contenu original du site (à reprendre et améliorer) :
"""
${content}
"""

DIRECTIVES :
- Identifie l'activité, le nom de marque, les services, les arguments à partir de ce contenu
- Reprends les phrases-clés et les informations factuelles (ex: zones d'intervention, horaires, expertises)
- Améliore le copywriting (SEO, ton, structure) mais GARDE l'identité et les vraies infos du site
═══════════════════════════════════════════════════════
`;
  }

  // 2. IA extrait le brief structuré depuis le texte libre
  const extractionPrompt = `Tu es expert SEO + designer. À partir de la description libre de l'utilisateur, extrais un brief STRUCTURÉ pour générer un site web.

DESCRIPTION DE L'UTILISATEUR (à analyser) :
"""
${parsed.data.prompt}
"""${referenceContext}${rebuildContentBlock}

EXTRAIS LES INFOS — règles strictes :
- Si l'utilisateur a explicitement mentionné une info (marque, couleur, ton…), UTILISE EXACTEMENT cette info
- Si non mentionnée, DÉDUIS une valeur cohérente avec le contexte
- Pour les couleurs : si l'utilisateur dit "bleu" → trouve un bon hex bleu (#1E40AF, #2563EB, etc.) cohérent avec le secteur
- Si site de référence fourni : ${
    referenceDesign && referenceDesign.dominantColors.length > 0
      ? `réutilise EXACTEMENT les couleurs détectées (${referenceDesign.dominantColors.slice(0, 4).join(", ")}) sauf si l'utilisateur a explicitement demandé d'autres couleurs`
      : "palette/fonts inspirées de cette référence"
  }
- N'invente AUCUN fait spécifique (prix, nombre clients, témoignages) qui n'est pas dans la description
- skillKeywordsEn : EN ANGLAIS uniquement, 3-5 mots-clés business qui décrivent le secteur (ex: "plumber emergency", "fitness coach", "law firm", "restaurant", "saas dashboard"). Sert à interroger un skill design en anglais — pas de mots français.

RETOURNE UN JSON STRICT (pas de \`\`\`, pas de commentaire) :
{
  "type": "${parsed.data.type ?? "LANDING ou MULTI_PAGE selon ce qui est demandé"}",
  "brandName": "<nom de l'entreprise>",
  "sector": "<secteur d'activité 5-15 mots>",
  "audience": "<public cible 10-20 mots>",
  "goal": "<objectif principal 10-20 mots>",
  "keywords": "<5-7 mots-clés SEO ciblés séparés par virgule>",
  "skillKeywordsEn": "<3-5 mots-clés business EN ANGLAIS>",
  "tone": "<ton souhaité>",
  "primaryColor": "<#xxxxxx hex>",
  "secondaryColor": "<#xxxxxx hex qui complémente la primary>",
  "tagline": "<slogan court 5-12 mots>",
  "logoUrl": "<si l'utilisateur fournit une URL de logo, sinon null>",
  "framework": "${parsed.data.framework ?? "html ou react selon ce qui est demandé"}",
  "specificInstructions": "<résumé EXHAUSTIF des contraintes/demandes SPÉCIFIQUES de l'utilisateur à respecter ABSOLUMENT lors de la génération>"${referenceDesign ? `,
  "referenceSections": ["<type1>", "<type2>", "..."]
  // ⚠️ SI site de référence fourni : liste les types de sections détectées dans l'ORDRE EXACT du site de référence.
  // Mappe les H2 détectés ci-dessus aux types : hero, features, service_tiles, highlights, circles, services_grid, features_phone, stats, process, process_vertical, about, about_cards, gallery, video, promo_split, actions_grid, testimonials, pricing, cta, faq, contact.
  // Commence TOUJOURS par "hero" (même si pas détecté explicitement). Termine par "contact" si formulaire détecté.
  // Cible : ${referenceDesign.sectionCount} sections (proche du site de référence).
  ,"referenceDesignProfile": "<un de : minimal | bold-vibrant | trust-corporate | luxury-elegant | playful-startup | editorial | tech-modern | wellness-soft — basé sur l'ambiance détectée du site de référence>"
  ,"referenceHeroType": "<un de : hero | hero_split | hero_slider | hero_blob — selon le hero du site de référence>"` : ""}
}`;

  const ai = await askAi({
    prompt: extractionPrompt,
    temperature: 0.3,
    maxTokens: 4000,
  });
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

  let extracted: Record<string, unknown>;
  try {
    extracted = JSON.parse(cleaned);
  } catch {
    return NextResponse.json(
      { error: `IA n'a pas retourné un JSON valide : ${cleaned.slice(0, 200)}` },
      { status: 500 },
    );
  }

  // 2bis. Détection du secteur + choix de composition pré-décidée
  // (au lieu de laisser l'IA méta-décider — elle suit mal ce genre d'instructions)
  const sector = detectSector(parsed.data.prompt);
  const composition = pickComposition(sector);
  console.log(`[from-prompt] secteur détecté: ${sector} → composition: ${composition.heroType} + ${composition.designProfile} + [${composition.sections.join(", ")}]`);

  // 3. Forward vers /api/generate-site avec le brief construit + design de référence
  // Fallback robuste : si l'IA n'extrait pas un champ requis (sector/audience/goal/keywords),
  // on tombe sur des valeurs déduites du prompt utilisateur pour passer la validation Zod min(2).
  const promptSnippet = parsed.data.prompt.trim().slice(0, 200);
  const nonEmpty = (v: unknown, fallback: string): string => {
    if (typeof v === "string" && v.trim().length >= 2) return v.trim();
    return fallback;
  };
  // Normalise une couleur en #RRGGBB. Accepte #fff, #ffffff, #ffffffff (alpha), noms CSS courants.
  // Fallback si non parseable.
  const NAMED_COLORS: Record<string, string> = {
    red: "#ef4444", blue: "#3b82f6", green: "#22c55e", yellow: "#eab308",
    orange: "#f97316", purple: "#a855f7", pink: "#ec4899", black: "#000000",
    white: "#ffffff", gray: "#6b7280", grey: "#6b7280", navy: "#1e3a8a",
    gold: "#d4a017", silver: "#9ca3af",
  };
  const validHex = (v: unknown, fallback: string): string => {
    if (typeof v !== "string") return fallback;
    const s = v.trim().toLowerCase();
    // #RRGGBB
    if (/^#[0-9a-f]{6}$/.test(s)) return s;
    // #RGB → expand
    if (/^#[0-9a-f]{3}$/.test(s)) return "#" + s.slice(1).split("").map((c) => c + c).join("");
    // #RRGGBBAA → strip alpha
    if (/^#[0-9a-f]{8}$/.test(s)) return s.slice(0, 7);
    // sans # → préfixe
    if (/^[0-9a-f]{6}$/.test(s)) return "#" + s;
    // nom CSS
    if (s in NAMED_COLORS) return NAMED_COLORS[s];
    return fallback;
  };
  const briefForGeneration = {
    type: extracted.type ?? parsed.data.type ?? "LANDING",
    brandName: nonEmpty(extracted.brandName, "Mon Entreprise"),
    sector: nonEmpty(extracted.sector, promptSnippet || "Activité commerciale"),
    audience: nonEmpty(extracted.audience, "Particuliers et professionnels"),
    goal: nonEmpty(extracted.goal, "Générer des contacts qualifiés"),
    keywords: nonEmpty(extracted.keywords, "services, expertise, contact"),
    skillKeywordsEn:
      typeof extracted.skillKeywordsEn === "string" && extracted.skillKeywordsEn.trim()
        ? extracted.skillKeywordsEn
        : undefined,
    tone: extracted.tone ?? "professionnel",
    // Couleurs : priorité absolue aux couleurs du site de référence si fourni,
    // sinon couleur extraite par l'IA, sinon couleurs par défaut du secteur
    primaryColor: validHex(
      referenceDesign?.dominantColors?.[0] ?? extracted.primaryColor,
      composition.defaultColors.primary,
    ),
    secondaryColor: validHex(
      referenceDesign?.dominantColors?.[1] ?? extracted.secondaryColor,
      composition.defaultColors.secondary,
    ),
    tagline: extracted.tagline ?? undefined,
    // ⚠️ Ne JAMAIS utiliser le logo du site de référence — c'est une autre marque !
    // L'utilisateur doit fournir son propre logo, sinon pas de logo (juste le nom de marque).
    logoUrl:
      extracted.logoUrl && typeof extracted.logoUrl === "string" && extracted.logoUrl.trim()
        ? extracted.logoUrl
        : undefined,
    framework: extracted.framework ?? parsed.data.framework ?? "html",
    referenceDesign: referenceDesign
      ? {
          url: parsed.data.referenceUrl,
          backgroundColor: referenceDesign.backgroundColor,
          isDark: referenceDesign.isDark,
          dominantColors: referenceDesign.dominantColors.slice(0, 8),
          fontFamilies: referenceDesign.fontFamilies.slice(0, 4),
          googleFontsUrls: referenceDesign.googleFontsUrls.slice(0, 3),
          borderRadius: referenceDesign.borderRadius,
          detectedFramework: referenceDesign.detectedFramework,
          visualAnalysis: visualAnalysis ?? undefined,
        }
      : undefined,
    // rebuildContext = priorité au contexte de refonte fourni par le client
    // (URL site existant scrappé), sinon fallback sur les instructions spécifiques extraites.
    // Tronque toutes les chaînes pour respecter les contraintes max du briefSchema.
    rebuildContext: parsed.data.rebuildContext
      ? {
          sourceUrl: parsed.data.rebuildContext.sourceUrl,
          summary: (parsed.data.rebuildContext.summary
            ?? (extracted.specificInstructions ? String(extracted.specificInstructions) : undefined))?.slice(0, 2000),
          improvements: parsed.data.rebuildContext.improvements ?? [],
          currentIssues: parsed.data.rebuildContext.currentIssues ?? [],
          originalContent: (parsed.data.rebuildContext.originalContent ?? parsed.data.prompt).slice(0, 5000),
        }
      : extracted.specificInstructions
        ? {
            sourceUrl: parsed.data.referenceUrl ?? "",
            summary: String(extracted.specificInstructions).slice(0, 2000),
            improvements: [],
            currentIssues: [],
            originalContent: parsed.data.prompt.slice(0, 5000),
          }
        : undefined,
    // Composition : si site de référence avec H2 scrappables, on construit la composition
    // CÔTÉ CODE depuis les H2 réels (mapping heuristique fiable, sans hallucination IA).
    composition: (() => {
      const VALID_HEROES = ["hero", "hero_split", "hero_slider", "hero_blob"] as const;
      const VALID_PROFILES = ["minimal", "bold-vibrant", "trust-corporate", "luxury-elegant", "playful-startup", "editorial", "tech-modern", "wellness-soft"] as const;
      const refHero = typeof extracted.referenceHeroType === "string"
        && (VALID_HEROES as readonly string[]).includes(extracted.referenceHeroType)
        ? (extracted.referenceHeroType as typeof VALID_HEROES[number])
        : null;
      const refProfile = typeof extracted.referenceDesignProfile === "string"
        ? extracted.referenceDesignProfile
        : null;

      // 🔝 PRIORITÉ MAX : vision IA. Différencie vraiment 2 sites de référence distincts.
      if (visualAnalysis) {
        const visionProfile = (VALID_PROFILES as readonly string[]).includes(visualAnalysis.matchedProfile ?? "")
          ? (visualAnalysis.matchedProfile as string)
          : null;
        const heroLayout = (visualAnalysis.heroLayout ?? "").toLowerCase();
        const heroType =
          heroLayout.includes("split") ? "hero_split" :
          heroLayout.includes("slider") || heroLayout.includes("carousel") ? "hero_slider" :
          heroLayout.includes("blob") ? "hero_blob" :
          heroLayout.includes("banner") ? "hero_split" :
          heroLayout.includes("fullscreen") ? "hero_split" :
          "hero";

        const sectionsBelow = (visualAnalysis.sectionsBelow ?? []).slice(0, 6);
        const mappedFromVision = sectionsBelow.map((s) => mapHeadingToSection(s, sector));
        const seen = new Set<string>();
        const dedup = mappedFromVision.filter((s) => {
          if (seen.has(s)) return false;
          seen.add(s);
          return true;
        });
        // Si la vision a vu des sections concrètes → utilise-les. Sinon fallback H2 scrape.
        if (dedup.length >= 2) {
          const finalSections = [heroType, ...dedup];
          if (!finalSections.includes("contact")) finalSections.push("contact");
          const finalProfile = visionProfile ?? refProfile ?? composition.designProfile;
          console.log(`[from-prompt] 👁️ OVERRIDE depuis ANALYSE VISION → ${heroType} + ${finalProfile} + [${finalSections.join(", ")}]`);
          console.log(`[from-prompt]   sections vision: ${sectionsBelow.map((s) => `"${s.slice(0, 40)}"`).join(" | ")}`);
          return {
            sector: sector + " (vision)",
            heroType,
            designProfile: finalProfile,
            sections: finalSections,
          };
        }
      }

      const headings = referenceDesign?.sectionHeadings ?? [];
      // Si on a au moins 3 H2 réels → construction code-side fiable
      if (headings.length >= 3) {
        const heroType = refHero ?? "hero";
        const mapped = headings.slice(0, 8).map((h) => mapHeadingToSection(h, sector));
        // Dédoublonne tout en gardant l'ordre
        const seen = new Set<string>();
        const dedup = mapped.filter((s) => {
          if (seen.has(s)) return false;
          seen.add(s);
          return true;
        });
        const finalSections = [heroType, ...dedup];
        if (!finalSections.includes("contact")) finalSections.push("contact");
        console.log(`[from-prompt] ✓ OVERRIDE code-side depuis ${headings.length} H2 du site réf → ${heroType} + ${refProfile} + [${finalSections.join(", ")}]`);
        console.log(`[from-prompt]   H2 source: ${headings.map((h) => `"${h.slice(0, 40)}"`).join(" | ")}`);
        return {
          sector: sector + " (référence)",
          heroType,
          designProfile: refProfile ?? composition.designProfile,
          sections: finalSections,
        };
      }

      // Pas de H2 scrappables → composition pré-décidée du secteur
      // (mais designProfile + couleurs du site de référence restent appliqués)
      if (referenceDesign) {
        console.log(`[from-prompt] ⚠ Site de référence inscrappable (${headings.length} H2). Fallback composition secteur. Couleurs/profile du réf appliqués.`);
      }
      return {
        sector,
        heroType: composition.heroType,
        designProfile: refProfile ?? composition.designProfile,
        sections: composition.sections,
      };
    })(),
  };

  return NextResponse.json({
    brief: briefForGeneration,
    extracted,
    provider: ai.provider,
    model: ai.model,
    sector,
    composition: briefForGeneration.composition,
  });
}
