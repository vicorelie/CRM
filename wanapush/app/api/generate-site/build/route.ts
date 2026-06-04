// API route — Page Builder mode.
// L'utilisateur choisit explicitement son header + ses sections + son footer dans le UI.
// L'IA fait UNIQUEMENT le copywriting (remplir les slots avec du contenu pertinent).
// Pas de décision design : aucune ambiguïté, résultat prévisible.

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

import { askAi } from "@/lib/ai";
import { COMPONENT_REGISTRY, getById, validateComposition } from "@/lib/sections-catalog";
import { renderHtml } from "@/lib/site-gen/render-html";
import { extractAndBuildSite, slugify } from "@/lib/site-extraction";
import { preloadPageImages } from "@/lib/page-images";
import { generateReactProject } from "@/lib/react-template";
import { getStylePreset } from "@/lib/site-gen/style-presets";
import { ensureShopForSite } from "@/lib/shop";

export const runtime = "nodejs";
export const maxDuration = 180;

/**
 * Override CSS pour appliquer le mode de dispatch des couleurs sur le rendu final.
 * - "gradient" : aucun override — les gradients Tailwind natifs (smooth) restent en place
 * - "bicolor"  : remplace tous les gradients par un split 50/50 dur primaire | secondaire
 * - "mono"     : remplace tous les gradients par la couleur primaire seule
 */
/**
 * Alternance de fond entre sections en mode light : #ffffff / #f2f2f2 / #ffffff…
 * Crée un rythme visuel entre blocs sans rajouter de couleur. En mode dark,
 * l'alternance est déjà gérée par le preset designProfile.
 */
function sectionAlternationCss(mode: "light" | "dark"): string {
  if (mode !== "light") return "";
  // Séquence : Hero(1)=#fff, section après header (2)=#fff, puis alternance
  //   3=#f2f2f2, 4=#fff, 5=#f2f2f2, 6=#fff, …
  // → On veut un changement de fond entre 2 sections consécutives à partir de la 3e.
  //
  // Spécificité nécessaire pour battre `.bg-primary { transparent !important }`
  // (qui a (0,1,0)) : on chaîne section.bg-* et on met !important.
  const grayBg = `background-color: #f2f2f2 !important; background-image: none !important;`;
  const whiteBg = `background-color: #ffffff !important; background-image: none !important;`;

  // Liste les classes potentiellement strippées qui doivent recevoir l'alternance
  const classes = [
    "bg-primary", "bg-secondary", "bg-brand-gradient", "bg-white", "bg-gray-50",
    "bg-gray-100", "bg-slate-50", "bg-slate-100",
  ];
  const gradAttr = `[class*="bg-gradient-to-"]`;
  const gradAttrAll = `[class*="bg-gradient-"]`;
  // Exclut les sections "spéciales" sombres (hero sombre type HeroBlob/HeroSlider,
  // sections bg-gray-9xx, bg-black, bg-slate-9xx, bg-zinc-9xx, bg-neutral-9xx)
  // pour ne pas écraser leur fond avec du blanc (sinon le text-white devient invisible).
  const darkExclude = `:not([class*="bg-gray-9"]):not([class*="bg-gray-8"]):not([class*="bg-black"]):not([class*="bg-slate-9"]):not([class*="bg-slate-8"]):not([class*="bg-zinc-9"]):not([class*="bg-neutral-9"])`;

  function buildSelector(suffix: string): string {
    return [
      `main > section${darkExclude}${suffix}`,
      `main > div > section${darkExclude}${suffix}`,
      `body > section${darkExclude}${suffix}`,
      ...classes.map((c) => `main > section.${c}${suffix}`),
      ...classes.map((c) => `main > div > section.${c}${suffix}`),
      `main > section${gradAttr}${suffix}`,
      `main > section${gradAttrAll}${suffix}`,
    ].join(", ");
  }

  return `
/* ─── ALTERNANCE DES FONDS (mode light : #fff / #f2f2f2 / …) ─── */
/* Toutes sections : fond blanc par défaut (priorité plus haute que strip) */
${buildSelector("")} { ${whiteBg} }
/* Sections impaires à partir de la 3e (= 3, 5, 7, …) → gris */
${buildSelector(":nth-of-type(2n+3)")} { ${grayBg} }
`;
}

function colorModeCss(mode: "gradient" | "bicolor" | "mono"): string {
  // L'utilisateur veut ZÉRO overlay de couleur PARTOUT.
  // → on strip toutes les surfaces colorées (bg-primary/secondary/brand-gradient/
  //   bg-gradient-to-*) sur N'IMPORTE QUEL élément : sections, divs, cards, liens,
  //   boutons, halos décoratifs, etc.
  // → la couleur primaire ne survit que comme : texte (.text-primary), bordure
  //   (border-primary), check marks et petits dots/icônes inline (SVG/span).
  // → les boutons deviennent OUTLINE (border primary + text primary, fond transparent).
  const stripAll = `
/* ─── ZÉRO OVERLAY DE COULEUR — universel sur tous les éléments ─── */
.bg-primary, .bg-secondary, .bg-brand-gradient,
[class*="bg-gradient-to-"], [class*="bg-gradient-"],
[class*="bg-primary/"], [class*="bg-secondary/"] {
  background-color: transparent !important;
  background-image: none !important;
}
/* Boutons + liens "remplis" → FILLED style (bg primaire plein + texte blanc).
   Garantit toujours un contraste lisible texte/bg, même dans des contextes
   imprévus. Plus risqué de "primary-on-primary invisible". */
button.bg-primary, a.bg-primary, button.bg-secondary, a.bg-secondary,
button.bg-brand-gradient, a.bg-brand-gradient,
button[class*="bg-gradient-to-"], a[class*="bg-gradient-to-"] {
  background-color: var(--color-primary) !important;
  background-image: none !important;
  color: #ffffff !important;
  border: none !important;
}
button.bg-primary *, a.bg-primary *, button.bg-secondary *, a.bg-secondary *,
button.bg-brand-gradient *, a.bg-brand-gradient *,
button[class*="bg-gradient-to-"] *, a[class*="bg-gradient-to-"] * { color: #ffffff !important; }
/* Boutons "outline" natifs (avec class border-*) → garde leur look mais force
   le texte en couleur primaire pour assurer le contraste */
button[class*="border-"]:not(.bg-primary):not(.bg-secondary), a[class*="border-"]:not(.bg-primary):not(.bg-secondary) {
  color: var(--color-primary) !important;
  border-color: var(--color-primary) !important;
}
/* Texte qui supposait un fond coloré strippé → revient à la couleur de base.
   On scope strictement aux sections qui avaient un fond coloré (sinon le hero
   avec image bg perd son texte blanc). */
section.bg-primary .text-white, section.bg-secondary .text-white,
section.bg-brand-gradient .text-white, section[class*="bg-gradient-to-"] .text-white,
div.bg-primary .text-white, div.bg-secondary .text-white,
div.bg-brand-gradient .text-white, div[class*="bg-gradient-to-"] .text-white { color: inherit !important; }
section.bg-primary [class*="text-white/"], section.bg-secondary [class*="text-white/"],
section.bg-brand-gradient [class*="text-white/"], section[class*="bg-gradient-to-"] [class*="text-white/"],
div.bg-primary [class*="text-white/"], div.bg-secondary [class*="text-white/"],
div.bg-brand-gradient [class*="text-white/"], div[class*="bg-gradient-to-"] [class*="text-white/"] { color: var(--muted, #64748b) !important; }
/* Cas particulier : les sections (Cta surtout) qui ont la classe text-white SUR
   le tag <section> lui-même → il faut aussi reset le color, sinon les h2/h3/p
   sans classe explicite héritent du blanc et deviennent invisibles. */
section.bg-primary.text-white, section.bg-secondary.text-white,
section.bg-brand-gradient.text-white, section[class*="bg-gradient-to-"].text-white {
  color: inherit !important;
}
/* Halos / overlays décoratifs absolus → invisibles */
.absolute.bg-primary, .absolute.bg-secondary, .absolute.bg-brand-gradient,
.absolute[class*="bg-gradient-"], .blur-2xl, .blur-3xl,
[class*="from-primary/"], [class*="from-secondary/"], [class*="via-primary/"], [class*="via-secondary/"],
[class*="to-primary/"], [class*="to-secondary/"] {
  background: transparent !important;
  background-image: none !important;
  opacity: 0 !important;
}
`;

  // ─── ACCENTS FINS (appliqué à tous les modes) ─────────────────
  // Les couleurs reviennent en TOUCHES sur :
  //  - les eyebrows (petits labels uppercase tracking)
  //  - les boutons CTA "blancs" qui étaient destinés à ressortir sur fond coloré
  //    (a.bg-white) : on les remplit en primaire pour qu'ils soient le CALL-TO-ACTION
  //    visible de la section.
  //  - les check marks et icônes inline déjà en text-primary (.text-primary survit
  //    naturellement, pas besoin d'override).
  const accents = `
/* ─── ACCENTS DE COULEUR (touches fines) ─── */
/* Icônes / badges / pastilles : petits ronds bg-primary → on garde la couleur
   (le strip universel les avait vidés, donnant SVG blanc invisible sur fond blanc). */
.rounded-full.bg-primary, .rounded-full.bg-secondary,
.rounded-2xl.bg-primary, .rounded-xl.bg-primary,
.rounded-full[class*="bg-gradient-"], .rounded-2xl[class*="bg-gradient-"],
.shrink-0.bg-primary, .shrink-0.bg-secondary {
  background-color: var(--color-primary) !important;
  background-image: none !important;
}
.rounded-full.bg-primary svg, .rounded-full.bg-secondary svg,
.rounded-2xl.bg-primary svg, .rounded-full.bg-primary .text-white,
.rounded-2xl.bg-primary .text-white { color: white !important; }
/* Bg-clip-text (texte gradient, ex: gros chiffres Process) → couleur primaire directe
   (le strip avait retiré le gradient, laissant le texte transparent invisible). */
.bg-clip-text.text-transparent, .text-transparent[class*="bg-gradient-"] {
  background-image: none !important;
  -webkit-text-fill-color: var(--color-primary) !important;
  color: var(--color-primary) !important;
}

/* Eyebrows : PETITS labels uppercase (text-xs ou text-sm + tracking-widest/wider) → couleur primaire.
   On exclut explicitement les titres hero qui peuvent être uppercase + tracking-[arbitraire].
   La règle ne match QUE les vrais eyebrows : text-xs/sm + uppercase + tracking-widest/wider. */
.text-xs.uppercase.tracking-widest,
.text-xs.uppercase.tracking-wider,
.text-sm.uppercase.tracking-widest,
.text-sm.uppercase.tracking-wider,
.text-\\[10px\\].uppercase,
.text-\\[11px\\].uppercase,
section.bg-primary [class*="text-white/5"], section.bg-primary [class*="text-white/6"],
section.bg-brand-gradient [class*="text-white/5"], section.bg-brand-gradient [class*="text-white/6"] {
  color: var(--color-primary) !important;
}
/* CTA buttons "bg-white" → remplis en primaire pour rester l'action visible
   (avant : disparaissaient sur fond blanc après strip) */
a.bg-white, button.bg-white {
  background-color: var(--color-primary) !important;
  color: white !important;
  border: none !important;
}
a.bg-white *, button.bg-white * { color: white !important; }
nav a.bg-white, nav button.bg-white { background-color: transparent !important; color: inherit !important; }
/* Liens texte → couleur primaire pour les distinguer */
a:not(.bg-white):not(.bg-primary):not(.bg-secondary):not([class*="border"]):not(nav *):not(footer *) {
  color: inherit;
}
`;

  if (mode === "mono") {
    return stripAll + accents + `
/* ─── MONO : la couleur secondaire devient la primaire ─── */
:root { --color-secondary: var(--color-primary); }
.text-secondary { color: var(--color-primary) !important; }
`;
  }
  if (mode === "bicolor") {
    return stripAll + accents + `
/* ─── BICOLORE : alterne primaire/secondaire sur les eyebrows ─── */
section:nth-of-type(2n) .uppercase.tracking-widest,
section:nth-of-type(2n) .uppercase.tracking-wider,
section:nth-of-type(2n) [class*="text-white/5"],
section:nth-of-type(2n) [class*="text-white/6"] {
  color: var(--color-secondary) !important;
}
section:nth-of-type(2n) a.bg-white,
section:nth-of-type(2n) button.bg-white {
  background-color: var(--color-secondary) !important;
}
`;
  }
  return stripAll + accents;
}

const inputSchema = z.object({
  brief: z.object({
    brandName: z.string().min(2).max(80),
    description: z.string().min(20).max(5000),
    tagline: z.string().max(200).optional(),
    logoUrl: z.string().url().optional().or(z.literal("")),
  }),
  composition: z.object({
    header: z.string(), // id d'un composant catégorie "header"
    sections: z.array(z.string()).min(1), // ids des sections dans l'ordre
    footer: z.string().optional(), // pour l'instant 1 seul footer, mais on prépare le terrain
  }),
  theme: z.object({
    mode: z.enum(["light", "dark"]).default("light"),
    primaryColor: z.string().regex(/^#[0-9a-f]{6}$/i),
    secondaryColor: z.string().regex(/^#[0-9a-f]{6}$/i),
    /** Dispatch des couleurs : "gradient" (transition smooth), "bicolor" (split 50/50 dur), "mono" (primaire seule) */
    colorMode: z.enum(["gradient", "bicolor", "mono"]).default("gradient"),
  }),
  framework: z.enum(["html", "react"]).default("react"),
  /** Type de site : vitrine (par défaut) ou ecommerce (ajoute page /boutique + auto-crée Shop). */
  siteType: z.enum(["vitrine", "ecommerce"]).default("vitrine"),
  /** Photos uploadées par l'utilisateur (URLs locales) — pour Phase 2. */
  photos: z.array(z.string()).optional(),
  /** Overrides utilisateur : les champs remplis ici prennent priorité sur ce que
   *  l'IA va générer. Les champs vides/manquants sont remplis par l'IA. */
  overrides: z.object({
    header: z.record(z.string(), z.unknown()).optional(),
    sections: z.array(z.record(z.string(), z.unknown())).optional(),
  }).optional(),
});

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
    const issue = parsed.error.issues[0];
    const path = issue?.path?.join(".") || "(root)";
    return NextResponse.json(
      { error: `${issue?.message || "Données invalides"} (champ: ${path})` },
      { status: 400 },
    );
  }

  const { brief, composition, theme, framework, overrides, siteType } = parsed.data;

  // Valide la composition (header obligatoire, sections existantes)
  const validation = validateComposition(composition);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  // ─── 1. Construit un prompt IA NARROW : remplir CHAQUE slot choisi ───────
  const headerMeta = getById(composition.header)!;
  const sectionMetas = composition.sections.map((id) => getById(id)!).filter(Boolean);
  const allComponents = [headerMeta, ...sectionMetas];

  const slotsDescription = allComponents
    .map((c, i) => `${i + 1}. type="${c.id}" (${c.label}) — schéma data: ${c.dataShape}`)
    .join("\n");

  const designProfileFromMode = theme.mode === "dark" ? "tech-modern" : "minimal";

  const prompt = `Tu es un copywriter SEO senior. Tu vas remplir le contenu d'un site web composé selon une liste FIGÉE de composants choisis par l'utilisateur. Tu ne décides PAS de la composition. Tu remplis UNIQUEMENT le contenu de chaque slot.

BRIEF :
- Marque : ${brief.brandName}
${brief.tagline ? `- Slogan : ${brief.tagline}\n` : ""}- Description complète fournie par l'utilisateur :
"""
${brief.description}
"""
- Mode visuel : ${theme.mode === "dark" ? "sombre (dark)" : "clair (light)"}
- Couleur primaire : ${theme.primaryColor}
- Couleur secondaire : ${theme.secondaryColor}

COMPOSITION CHOISIE PAR L'UTILISATEUR (ORDRE STRICT À RESPECTER) :
${slotsDescription}

═══════════════════════════════════════════════════════
RÈGLES :
═══════════════════════════════════════════════════════
1. Tu produis du contenu EN FRANÇAIS, percutant, SEO-friendly, adapté à la description fournie.
2. Pour CHAQUE composant, tu remplis SON data selon SON schéma. Tu ne change PAS le type ni l'ordre.
3. Pour les ${"`imageKeywords`"} : utilise 3-5 mots-clés EN ANGLAIS qui décrivent l'image idéale Unsplash (ex: "modern office workspace", "plant care closeup").
4. NE PAS inventer de témoignages clients, de prix, de chiffres business spécifiques que l'utilisateur n'a pas fournis. Si tu n'as pas l'info, écris une promesse qualitative plutôt qu'un chiffre inventé.
5. Pas d'emojis dans le texte. Tu utilises du français propre.
6. ${theme.mode === "dark" ? "Adapte le ton pour un thème sombre (plus tech/audacieux)." : "Adapte le ton pour un thème clair (épuré, lisible)."}

═══════════════════════════════════════════════════════
CONTRAINTES DE LONGUEUR (CRITIQUES pour l'harmonie visuelle) :
═══════════════════════════════════════════════════════
- **title de hero** : 5-9 mots MAX, ~60 caractères MAX. Pas une phrase complète, un titre marketing percutant. Surtout pas de virgule ni de ", " interne. Ex : "Photographe de mariage en PACA", "Le paiement pensé pour les freelances". MAUVAIS : "Photographe de mariage en PACA au style documentaire, naturel et sensible".
- **subtitle de hero** : 15-25 mots, ~140 caractères MAX. Une phrase fluide.
- **title de section** (stats, cta, features, etc.) : 4-8 mots, ~50 caractères MAX.
- **subtitle de section** : 10-20 mots, ~120 caractères MAX.
- **description d'item / feature** : 15-25 mots, ~130 caractères MAX.
- **stats.items.value** : OBLIGATOIREMENT 1-6 caractères + lisible (ex "12+", "97%", "4.9/5", "2018", "PACA", "Naturel"). JAMAIS un chiffre isolé "0" ou "1" qui n'a aucun sens.
- **stats.items.label** : 2-5 mots descriptifs (ex "années d'expérience", "satisfaction client").
- **logos.name** : 1-3 mots, comme un nom de marque court (ex "Maison Blanc", "Atelier Sud", "Studio Nord"). Si l'utilisateur a choisi la section logos_bar, tu DOIS fournir AU MINIMUM 4 noms plausibles (partenaires, lieux, catégories thématiques — adapte au secteur). NE JAMAIS retourner moins de 4 ; mieux vaut des noms génériques crédibles que pas de section.

Si tu n'as pas matière à remplir une section honnêtement (ex : pas de stats crédibles), tu peux laisser items: [] et le serveur retirera la section automatiquement.

═══════════════════════════════════════════════════════
FORMAT DE SORTIE — JSON STRICT, RIEN D'AUTRE :
═══════════════════════════════════════════════════════
{
  "globalKeyword": "<mot-clé SEO principal du site, 2-4 mots>",
  "title": "<title SEO ~60 chars>",
  "metaDescription": "<meta description SEO ~155 chars>",
  "h1": "<H1 principal de la page, court et percutant>",
  "sections": [
    { "type": "${allComponents[0].id}", "data": { /* selon schéma */ } },
${allComponents.slice(1).map((c) => `    { "type": "${c.id}", "data": { /* selon schéma */ } }`).join(",\n")}
  ]
}

Tu DOIS générer EXACTEMENT ${allComponents.length} sections, dans CET ordre, avec CES types. Pas d'ajout, pas de retrait, pas de réorganisation.

Génère UNIQUEMENT le JSON.`;

  const ai = await askAi({
    prompt,
    system: "Tu es un copywriter SEO + UX writer senior. Tu produis du contenu dense, juste, adapté au brief. Tu réponds en JSON strict, jamais autre chose.",
    temperature: 0.7,
    maxTokens: 12000,
  });
  if (!ai) {
    return NextResponse.json({ error: "L'IA n'a pas répondu. Réessaie." }, { status: 502 });
  }

  let aiContent: {
    globalKeyword?: string;
    title?: string;
    metaDescription?: string;
    h1?: string;
    sections?: Array<{ type: string; data: Record<string, unknown> }>;
  };
  {
    const cleaned = ai.text.trim().replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    // Strip les commentaires JS (// … et /* … */) en respectant les strings JSON
    const stripJsComments = (s: string): string => {
      let out = "";
      let inString = false;
      let escape = false;
      for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (escape) { out += c; escape = false; continue; }
        if (c === "\\" && inString) { out += c; escape = true; continue; }
        if (c === '"') { inString = !inString; out += c; continue; }
        if (!inString) {
          if (c === "/" && s[i + 1] === "/") { while (i < s.length && s[i] !== "\n") i++; out += "\n"; continue; }
          if (c === "/" && s[i + 1] === "*") { i += 2; while (i < s.length && !(s[i] === "*" && s[i + 1] === "/")) i++; i += 1; continue; }
        }
        out += c;
      }
      return out;
    };
    const tryParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };

    let parsed = tryParse(cleaned);
    if (!parsed) {
      const noComments = stripJsComments(cleaned);
      parsed = tryParse(noComments);
      if (!parsed) {
        // Retire les trailing commas (e.g. `, }` ou `, ]`)
        const noTrailing = noComments.replace(/,(\s*[}\]])/g, "$1");
        parsed = tryParse(noTrailing);
        if (parsed) console.warn("[generate-site/build] AI JSON repaired (trailing commas)");
        else {
          // Log précis autour de la position d'erreur
          try { JSON.parse(noTrailing); } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            const m = msg.match(/position (\d+)/);
            const pos = m ? Number(m[1]) : 0;
            console.error(`[generate-site/build] AI JSON parse error: ${msg}`);
            console.error(`[generate-site/build] Context (±200 chars autour de pos ${pos}):\n---\n${noTrailing.slice(Math.max(0, pos - 200), pos + 200)}\n---`);
          }
          return NextResponse.json({ error: "L'IA a renvoyé un JSON invalide. Réessaie." }, { status: 502 });
        }
      }
    }
    aiContent = parsed;
  }

  if (!Array.isArray(aiContent.sections) || aiContent.sections.length === 0) {
    return NextResponse.json({ error: "L'IA n'a pas généré de sections valides." }, { status: 502 });
  }

  // ─── 2. Construit le plan dans le format attendu par le renderer ─────────
  // Normalise les data : l'IA confond souvent les noms de champs avec ce qu'elle
  // imagine logique (ex: `stats: [...]` au lieu de `items`). On remappe.
  function normalizeSectionData(type: string, data: Record<string, unknown>): Record<string, unknown> {
    const d = { ...data };
    switch (type) {
      case "stats":
        // Le renderer lit d.items, l'IA met parfois d.stats
        if (!Array.isArray(d.items) && Array.isArray(d.stats)) d.items = d.stats;
        // L'IA met parfois du TEXTE en value ("France", "Pro", "Serein") au lieu
        // d'un chiffre. Le composant AnimatedValue ne sait animer que les chiffres
        // → on substitue par des nombres estimés "plausibles" basés sur l'index.
        // Le user pourra ajuster ensuite via l'éditeur.
        if (Array.isArray(d.items)) {
          const FALLBACK_NUMBERS = ["98%", "+250", "12", "4.9/5", "+1000", "24/7"];
          d.items = (d.items as Array<Record<string, unknown>>).map((it, idx) => {
            if (!it || typeof it !== "object") return it;
            const next: Record<string, unknown> = { ...it };
            const raw = typeof next.value === "string" ? next.value : String(next.value ?? "");
            // Doit contenir au moins un chiffre pour être animable
            if (!/\d/.test(raw)) {
              next.value = FALLBACK_NUMBERS[idx % FALLBACK_NUMBERS.length];
            }
            return next;
          });
        }
        break;
      case "cta":
        // Le renderer attend buttonText/buttonHref/secondaryText
        if (!d.buttonText && d.ctaText) d.buttonText = d.ctaText;
        if (!d.buttonHref && d.ctaHref) d.buttonHref = d.ctaHref;
        if (!d.secondaryText && (d.reassurance || d.ctaSecondaryText)) {
          d.secondaryText = d.reassurance ?? d.ctaSecondaryText;
        }
        break;
      case "contact":
        // formFields doit être un tableau d'objets {name, label, type, required}
        // L'IA renvoie parfois des chaînes ("Prénoms", "Email") → on convertit
        if (Array.isArray(d.formFields)) {
          d.formFields = d.formFields.map((f, i) => {
            if (typeof f === "string") {
              const lower = f.toLowerCase();
              const type =
                lower.includes("mail") ? "email" :
                lower.includes("tel") || lower.includes("phone") ? "tel" :
                lower.includes("message") || lower.includes("histoire") || lower.includes("description") ? "textarea" :
                "text";
              const name = lower.replace(/[^a-z0-9]/g, "_").slice(0, 24) || `field_${i}`;
              return { name, label: f, type, required: i < 2 };
            }
            return f;
          });
        }
        // trustItems doit être un tableau d'objets {title, desc}
        // L'IA renvoie parfois des chaînes → on convertit en {title: str, desc: ""}
        if (Array.isArray(d.trustItems)) {
          d.trustItems = d.trustItems.map((t) => {
            if (typeof t === "string") return { title: t, desc: "" };
            if (t && typeof t === "object") {
              const obj = t as Record<string, unknown>;
              if (!obj.desc && obj.description) obj.desc = obj.description;
              return obj;
            }
            return t;
          });
        }
        break;
      case "circles":
      case "service_tiles":
      case "highlights":
      case "services_grid":
      case "features_phone":
      case "actions_grid":
      case "features":
        // Renderers lisent d.items
        if (!Array.isArray(d.items)) {
          for (const altKey of ["categories", "tiles", "cards", "blocks", "list"]) {
            if (Array.isArray(d[altKey])) {
              d.items = d[altKey];
              break;
            }
          }
        }
        // Les Item types des composants attendent `desc` (court) ET `title`.
        // L'IA met souvent `description` au lieu de `desc`, et pour circles elle met
        // `label` au lieu de `title`. On normalise et on garantit l'existence des
        // champs requis (avec fallbacks pour éviter les erreurs TS strict).
        if (Array.isArray(d.items)) {
          d.items = (d.items as Array<Record<string, unknown>>).map((it, idx) => {
            if (!it || typeof it !== "object") return it;
            const next: Record<string, unknown> = { ...it };
            // description → desc
            if (!next.desc && next.description) next.desc = next.description;
            // label → title (circles, actions_grid)
            if (!next.title && next.label) next.title = next.label;
            // Garanties d'existence pour TypeScript strict
            if (typeof next.title !== "string") next.title = String(next.title ?? `Item ${idx + 1}`);
            if (typeof next.desc !== "string") next.desc = String(next.desc ?? "");
            return next;
          });
        }
        break;
      case "gallery": {
        // L'IA fournit parfois moins de 9 mots-clés ; on pad avec des keywords
        // génériques basés sur le secteur pour toujours avoir 9 photos.
        const kws = Array.isArray(d.imageKeywords) ? (d.imageKeywords as string[]).filter((k) => typeof k === "string" && k.trim()) : [];
        if (kws.length < 9) {
          const sector = (brief?.brandName || "").toLowerCase();
          const generic = [
            sector + " professional",
            sector + " team",
            sector + " details",
            "modern office workspace",
            "happy clients meeting",
            "natural light interior",
            "minimalist business",
            "professional handshake",
            "creative workspace",
          ];
          // Complète avec generic en évitant les doublons exacts
          for (const g of generic) {
            if (kws.length >= 9) break;
            if (!kws.includes(g)) kws.push(g);
          }
          // Cas extrême : encore < 9 → on duplique le premier mot
          while (kws.length < 9) kws.push(kws[0] || "professional");
        }
        d.imageKeywords = kws.slice(0, 9);
        break;
      }
      case "about_cards":
        // Renderer attend d.cards : [{title, desc}, ...] ; l'IA met souvent
        // description au lieu de desc, ou pousse les cards dans items.
        if (!Array.isArray(d.cards) && Array.isArray(d.items)) d.cards = d.items;
        if (Array.isArray(d.cards)) {
          d.cards = (d.cards as Array<Record<string, unknown>>).map((c, idx) => {
            if (!c || typeof c !== "object") return c;
            const next: Record<string, unknown> = { ...c };
            if (!next.desc && next.description) next.desc = next.description;
            if (typeof next.title !== "string") next.title = String(next.title ?? `Carte ${idx + 1}`);
            if (typeof next.desc !== "string") next.desc = String(next.desc ?? "");
            return next;
          });
        }
        break;
      case "process":
      case "process_vertical":
        if (!Array.isArray(d.steps) && Array.isArray(d.items)) d.steps = d.items;
        // Auto-numérote les steps (01, 02, …) et copie description → desc
        if (Array.isArray(d.steps)) {
          d.steps = (d.steps as Array<Record<string, unknown>>).map((step, idx) => {
            if (!step || typeof step !== "object") return step;
            const next: Record<string, unknown> = { ...step };
            if (!next.number && !next.num) next.number = String(idx + 1).padStart(2, "0");
            if (!next.desc && next.description) next.desc = next.description;
            return next;
          });
        }
        // Fallback imageKeywords si manquant : déduit du contexte du brief
        // (sera utilisé par preloadPageImages pour fetch Unsplash).
        if (!d.imageKeywords && brief?.brandName) {
          d.imageKeywords = "professional workspace team meeting";
        }
        break;
      case "hero_slider":
        if (!Array.isArray(d.slides) && Array.isArray(d.items)) d.slides = d.items;
        break;
      case "feature_split":
        if (!Array.isArray(d.blocks) && Array.isArray(d.items)) d.blocks = d.items;
        break;
      case "testimonials":
        // L'IA renvoie souvent {quote, author, role} → on remappe vers {name, role, text}
        if (Array.isArray(d.items)) {
          d.items = (d.items as Array<Record<string, unknown>>).map((it) => {
            if (!it || typeof it !== "object") return it;
            const next: Record<string, unknown> = { ...it };
            if (!next.name && next.author) next.name = next.author;
            if (!next.text && next.quote) next.text = next.quote;
            if (!next.text && next.testimonial) next.text = next.testimonial;
            if (typeof next.name !== "string") next.name = String(next.name ?? "Client");
            if (typeof next.role !== "string") next.role = String(next.role ?? "");
            if (typeof next.text !== "string") next.text = String(next.text ?? "");
            return next;
          });
        }
        break;
    }
    return d;
  }

  // ─── Harmonise : trim les textes trop longs + filtre les valeurs absurdes ───
  // Garantit que le rendu visuel reste cohérent même si l'IA renvoie du contenu
  // mal calibré (titre 15 mots, stats "0", logos vides, etc.).
  function trimWords(s: unknown, maxWords: number, maxChars: number): string {
    if (typeof s !== "string") return "";
    let t = s.trim();
    if (t.length <= maxChars && t.split(/\s+/).length <= maxWords) return t;
    // Coupe au premier point ou virgule s'il est dans la zone acceptable
    const splitMatch = t.match(/^([^,.]+[,.])/);
    if (splitMatch && splitMatch[1].length <= maxChars && splitMatch[1].split(/\s+/).length <= maxWords) {
      t = splitMatch[1].replace(/[,.]$/, "");
    }
    // Coupe à maxWords mots
    const words = t.split(/\s+/);
    if (words.length > maxWords) t = words.slice(0, maxWords).join(" ");
    // Coupe à maxChars chars
    if (t.length > maxChars) t = t.slice(0, maxChars).replace(/[\s,;:]+\S*$/, "");
    return t.replace(/[\s,.;:]+$/, "");
  }

  function isValidStatValue(v: unknown): boolean {
    if (typeof v !== "string") return false;
    const s = v.trim();
    if (s.length === 0 || s.length > 8) return false;
    // Rejette les chiffres isolés sans unité (ex "0", "1", "2") qui sont des placeholders
    if (/^\d{1,2}$/.test(s)) return false;
    return true;
  }

  // Fallback de plans tarifaires quand l'IA n'en fournit pas (souvent prudente
  // sur les prix). Le user peut ensuite tout ajuster via le builder ou l'éditeur.
  function buildFallbackPricingPlans(brandName?: string): Array<Record<string, unknown>> {
    const brand = brandName || "Standard";
    return [
      {
        name: "Essentiel",
        price: "À partir de 49€",
        period: "mois",
        features: [
          "Accompagnement de base",
          "Réponse sous 48h",
          "1 prestation incluse",
          "Devis personnalisé",
        ],
        ctaText: "Choisir",
        ctaHref: "#contact",
      },
      {
        name: brand + " Pro",
        price: "À partir de 149€",
        period: "mois",
        featured: true,
        features: [
          "Tout l'Essentiel",
          "Suivi dédié",
          "3 prestations incluses",
          "Support prioritaire",
          "Bilan mensuel",
        ],
        ctaText: "Démarrer",
        ctaHref: "#contact",
      },
      {
        name: "Sur mesure",
        price: "Sur devis",
        period: "",
        features: [
          "Étude personnalisée",
          "Volume illimité",
          "Interlocuteur dédié",
          "SLA garanti",
        ],
        ctaText: "Nous contacter",
        ctaHref: "#contact",
      },
    ];
  }

  function harmonizeSection(
    type: string,
    data: Record<string, unknown>,
  ): { type: string; data: Record<string, unknown> } | null {
    const d = { ...data };

    // Trim titles + subtitles partout
    const isHero = ["hero", "hero_split", "hero_slider", "hero_blob"].includes(type);
    if (typeof d.title === "string") {
      d.title = trimWords(d.title, isHero ? 9 : 8, isHero ? 70 : 60);
    }
    if (typeof d.subtitle === "string") {
      d.subtitle = trimWords(d.subtitle, 28, 180);
    }

    // Stats : filtre les valeurs absurdes
    if (type === "stats" && Array.isArray(d.items)) {
      const filtered = (d.items as Array<Record<string, unknown>>).filter((it) =>
        it && typeof it === "object" && isValidStatValue(it.value),
      );
      if (filtered.length === 0) return null; // section vide → on retire
      d.items = filtered;
    }

    // Logos bar : retire seulement si VRAIMENT vide (< 2 logos). Avant on filtrait
    // à < 3 mais l'IA n'en remplissait parfois que 1-2 → section invisible.
    if (type === "logos_bar" && Array.isArray(d.logos)) {
      const validLogos = (d.logos as Array<Record<string, unknown>>).filter((l) =>
        l && typeof l === "object" && typeof l.name === "string" && l.name.trim().length >= 2 && l.name.trim().length <= 30,
      );
      if (validLogos.length < 2) return null;
      d.logos = validLogos;
    }

    // Sections multi-items qui doivent avoir au moins 2 items
    const minItemsByType: Record<string, number> = {
      features: 3, service_tiles: 2, circles: 3, highlights: 2,
      services_grid: 2, features_phone: 3, /* affichera 6 mais on accepte 3+ et pad côté composant */ feature_split: 2,
      process: 2, process_vertical: 2, gallery: 9, testimonials: 2,
      pricing: 2, faq: 2, actions_grid: 2, about_cards: 2,
    };
    const minItems = minItemsByType[type];
    if (minItems !== undefined) {
      const arrKey = type === "feature_split" ? "blocks"
        : type === "process" || type === "process_vertical" ? "steps"
        : type === "gallery" ? "imageKeywords"
        : type === "hero_slider" ? "slides"
        : type === "pricing" ? "plans"
        : type === "about_cards" ? "cards"
        : "items";
      const arr = d[arrKey];
      // Pricing : si IA n'a pas généré de plans (souvent prudent sur les prix),
      // on fournit des plans estimatifs que le user pourra ajuster ensuite.
      if (type === "pricing" && (!Array.isArray(arr) || arr.length < minItems)) {
        d.plans = buildFallbackPricingPlans(brief?.brandName);
      } else if (!Array.isArray(arr) || arr.length < minItems) {
        return null;
      }
    }

    return { type, data: d };
  }

  // Merge des overrides utilisateur : pour chaque champ, le user gagne sur l'IA
  // sauf si user a laissé vide/undefined. Pour les arrays (items/blocks/logos) :
  // user non-vide remplace AI ; user vide => AI.
  function mergeOverride(
    aiData: Record<string, unknown>,
    userData: Record<string, unknown> | undefined,
  ): Record<string, unknown> {
    if (!userData || Object.keys(userData).length === 0) return aiData;
    const merged: Record<string, unknown> = { ...aiData };
    for (const [key, val] of Object.entries(userData)) {
      if (val === undefined || val === null) continue;
      if (typeof val === "string" && val.trim() === "") continue;
      if (Array.isArray(val) && val.length === 0) continue;
      // Pour les couleurs spécifiques à la section (primaryColor/secondaryColor)
      // → on les laisse passer pour usage downstream
      merged[key] = val;
    }
    return merged;
  }

  const rawSections = aiContent.sections.map((s, i) => {
    const type = s.type ?? allComponents[i]?.id;
    const aiNormalized = normalizeSectionData(type, s.data ?? {});
    // i=0 = header dans l'output IA → on prend overrides.header
    // i>=1 = sections → on prend overrides.sections[i-1]
    const userOverride = (i === 0
      ? overrides?.header
      : overrides?.sections?.[i - 1]) as Record<string, unknown> | undefined;
    return {
      type,
      data: mergeOverride(aiNormalized, userOverride),
    };
  });
  // Applique harmonize + filtre les sections vides
  const sections = rawSections
    .map((s) => harmonizeSection(s.type, s.data))
    .filter((s): s is { type: string; data: Record<string, unknown> } => s !== null);
  // Si toutes les sections ont sauté, on remet au moins le hero
  if (sections.length === 0 && rawSections.length > 0) {
    sections.push(rawSections[0]);
  }
  console.log(`[generate-site/build] harmonize : ${rawSections.length} sections → ${sections.length} après filtrage (retirées si vides/insuffisantes)`);

  // Pages : home + (si ecommerce) page /boutique dédiée
  const pages: Array<{
    path: string;
    title: string;
    metaDescription: string;
    h1: string;
    navLabel: string;
    sections: typeof sections;
    schemaJsonld: never[];
  }> = [
    {
      path: "index.html",
      title: aiContent.title ?? brief.brandName,
      metaDescription: aiContent.metaDescription ?? "",
      h1: aiContent.h1 ?? brief.brandName,
      navLabel: "Accueil",
      sections,
      schemaJsonld: [],
    },
  ];
  if (siteType === "ecommerce") {
    const shopTitle = `Boutique · ${brief.brandName}`;
    pages.push({
      path: "boutique.html",
      title: shopTitle,
      metaDescription: `Tous nos produits en ligne — ${brief.brandName}`,
      h1: "Notre boutique",
      navLabel: "Boutique",
      sections: [
        {
          type: "shop_browse",
          data: {
            title: "Tous nos produits",
            subtitle: "Filtre par catégorie et par prix pour trouver ce qui te plaît.",
          },
        },
      ],
      schemaJsonld: [],
    });
  }

  const plan = {
    pages,
    organizationSchema: {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: brief.brandName,
    },
    globalKeyword: aiContent.globalKeyword ?? brief.brandName,
    styleGuide: {
      primary: theme.primaryColor,
      secondary: theme.secondaryColor,
      font: "Inter",
      tone: "professionnel",
      designProfile: designProfileFromMode,
      customCss:
        getStylePreset(designProfileFromMode) +
        colorModeCss(theme.colorMode) +
        sectionAlternationCss(theme.mode),
      headingFont: undefined,
      bodyFont: undefined,
    },
  };

  // ─── 3. Image preload (Unsplash en parallèle, basé sur les imageKeywords IA) ─
  const imageMap = await preloadPageImages(plan.pages);

  // En mode React, on ne rend PAS le HTML (le preview vient du build Vite).
  // En mode HTML, on appelle renderHtml mais avec un brief enrichi des champs requis.
  const renderedPages = plan.pages.map((p) => {
    let html = "";
    if (framework === "html") {
      try {
        html = renderHtml(p, plan, {
          brandName: brief.brandName,
          tagline: brief.tagline,
          logoUrl: brief.logoUrl,
          primaryColor: theme.primaryColor,
          secondaryColor: theme.secondaryColor,
          lang: "fr",
          sector: brief.brandName,
          audience: "",
          goal: "",
          keywords: "",
          tone: "professionnel",
          type: "LANDING",
          framework,
        } as never, plan.pages, imageMap);
      } catch (err) {
        console.error("[generate-site/build] renderHtml failed (non-fatal en mode React):", err);
      }
    }
    return {
      path: p.path,
      title: p.title,
      metaDescription: p.metaDescription,
      h1: p.h1,
      navLabel: p.navLabel,
      html,
    };
  });

  // ─── 4. React build (si framework=react) ─────────────────────────────────
  const siteSlug = slugify(brief.brandName);
  let previewUrl: string | null = null;
  let reactFiles: Record<string, string> | null = null;

  if (framework === "react") {
    const filesMap = await generateReactProject(
      plan.pages,
      {
        brandName: brief.brandName,
        logoUrl: brief.logoUrl || undefined,
        tagline: brief.tagline,
        primaryColor: theme.primaryColor,
        secondaryColor: theme.secondaryColor,
        lang: "fr",
        headingFont: undefined,
        bodyFont: undefined,
        designProfile: designProfileFromMode,
        customCss: plan.styleGuide.customCss,
      },
      plan.organizationSchema,
      siteSlug,
    );
    reactFiles = Object.fromEntries(filesMap);
    previewUrl = `https://wanapush.com/preview/${siteSlug}/`;

    const buildResult = await extractAndBuildSite(siteSlug, reactFiles, { waitForBuild: true });
    if (!buildResult.ok) {
      console.error(`[generate-site/build] build failed: ${buildResult.error}`);
    }
  }

  // ─── 5. Save en DB ────────────────────────────────────────────────────────
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: session.user.email },
    select: { id: true },
  });

  const generated = await prisma.generatedSite.create({
    data: {
      userId: user.id,
      brief: { ...brief, theme, composition, siteType } as never,
      pages: renderedPages as never,
      meta: {
        pageCount: renderedPages.length,
        globalKeyword: plan.globalKeyword,
        framework,
        siteSlug: framework === "react" ? siteSlug : null,
        previewUrl,
        reactFiles: reactFiles as never,
        builderMode: true,
        siteType,
      } as never,
    },
  });

  // ─── 6. Auto-création du Shop si site e-commerce ──────────────────────────
  let shopCreated = false;
  if (siteType === "ecommerce" && framework === "react") {
    try {
      await ensureShopForSite(session.user.email, siteSlug, brief.brandName);
      shopCreated = true;
    } catch (e) {
      console.error("[generate-site/build] ensureShopForSite failed:", e);
    }
  }

  revalidatePath("/generated-sites");
  return NextResponse.json({
    id: generated.id,
    framework,
    siteSlug: framework === "react" ? siteSlug : null,
    previewUrl,
    composition,
    pageCount: renderedPages.length,
    globalKeyword: plan.globalKeyword,
    siteType,
    shopCreated,
  });
}

// GET liste les composants disponibles — utile pour le UI
export async function GET() {
  return NextResponse.json({ registry: COMPONENT_REGISTRY });
}
