// Génération du plan de site via appel IA.
// Le gros prompt qui pilote la création des pages/sections est ici.

import { askAi } from "@/lib/ai";
import type { DesignRecommendations } from "@/lib/ui-design-skill";
import type { Brief, GenerationPlan } from "./schema";

// Rendu exporté
export { generatePlan };

// ─── customCss prompt — variante REACT + TAILWIND ────────────────────────────
// Le rendu React utilise des composants Tailwind. Aucune classe .wp-* n'existe
// dans le JSX. On dit à l'IA de cibler les sélecteurs Tailwind/HTML réels.
const REACT_CUSTOM_CSS_BLOCK = `═══════════════════════════════════════════════════════
🎨 GÉNÉRATION DU customCss — FRAMEWORK REACT + TAILWIND
═══════════════════════════════════════════════════════
⚠️ Le site cible est généré en REACT + TAILWIND CSS (UTILITY CLASSES). Aucun \`.wp-*\` n'existe dans le DOM. Tu DOIS cibler UNIQUEMENT les sélecteurs ci-dessous, sinon ton CSS sera invisible.

SÉLECTEURS À CIBLER (présents dans le JSX) :

TYPO :
  body, h1, h2, h3, p
  .font-heading        (utilisé sur tous les titres principaux — 27+ occurrences)

COULEURS :
  .bg-primary          (CTA, hero badge — 27+ occurrences)
  .bg-secondary
  .text-primary        (accents — 26+ occurrences)
  .text-secondary
  .bg-white, .bg-gray-50, .bg-gray-100   (cartes, sections alternées)

LAYOUT :
  section              (toutes les sections — 26+ occurrences)
  .container, .max-w-7xl, .max-w-6xl, .max-w-5xl
  button, a[role="button"]   (5+ occurrences)

CARDS / FORMES :
  [class*="rounded-2xl"], [class*="rounded-3xl"], [class*="rounded-xl"]   (16+ occurrences)
  [class*="rounded-full"]   (pills, badges)
  .shadow-sm, .shadow-md, .shadow-lg, .shadow-xl, .shadow-2xl    (8+ occurrences)

GRADIENTS :
  .bg-gradient-to-r, .bg-gradient-to-br
  [class*="from-"], [class*="to-"]

VARIABLES CSS (override dans :root) :
  --color-primary, --color-secondary, --bg, --bg-alt, --bg-card, --text, --muted, --border

═══════════════════════════════════════════════════════
EXEMPLES DE customCss RÉACT-COMPATIBLES SELON LE PROFILE
═══════════════════════════════════════════════════════

▸ "tech-modern" inspiré Stripe/Vercel/Linear (fond clair + gradient hero, typo serrée) :
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
body{font-family:'Inter',-apple-system,sans-serif;background:linear-gradient(180deg,#ffffff 0%,#f6f9fc 100%);color:#0a2540}
.font-heading{font-family:'Inter',sans-serif;font-weight:900;letter-spacing:-.04em;color:#0a2540}
h1{font-size:clamp(3rem,7vw,5.5rem);font-weight:900;letter-spacing:-.05em;line-height:1.02}
h2{font-size:clamp(2rem,4.5vw,3.5rem);font-weight:800;letter-spacing:-.03em;line-height:1.1}
h3{font-weight:700;letter-spacing:-.02em}
section{padding-top:7rem!important;padding-bottom:7rem!important;position:relative}
section:first-of-type{background:linear-gradient(150deg,#a8b1ff 0%,#dde0ff 30%,#ffffff 60%,#f6f9fc 100%)}
.bg-primary{background:linear-gradient(135deg,var(--color-primary),var(--color-secondary))!important;color:#fff}
.text-primary{background:linear-gradient(90deg,var(--color-primary),var(--color-secondary));background-clip:text;-webkit-background-clip:text;color:transparent;font-weight:700}
[class*="rounded-2xl"]{border-radius:1rem!important}
[class*="rounded-3xl"]{border-radius:1.25rem!important}
.shadow-lg,.shadow-xl{box-shadow:0 30px 60px -12px rgba(50,50,93,.15),0 18px 36px -18px rgba(0,0,0,.1)!important}
.shadow-2xl{box-shadow:0 50px 100px -20px rgba(50,50,93,.2),0 30px 60px -30px rgba(0,0,0,.15)!important}
button,a[role="button"]{border-radius:.5rem!important;font-weight:600;letter-spacing:-.01em;transition:all .2s ease}
button:hover{transform:translateY(-1px)}
.bg-white{background:rgba(255,255,255,.7)!important;backdrop-filter:blur(10px);border:1px solid rgba(50,50,93,.06)}

▸ "luxury-elegant" inspiré Hermès/Prada (sombre, serif, doré, espacé) :
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400&display=swap');
body{font-family:'Inter',sans-serif;font-weight:300;background:#0a0a0a;color:#f5f5f0;letter-spacing:.005em}
.font-heading{font-family:'Cormorant Garamond',serif;font-weight:400;letter-spacing:.01em}
h1,h2,h3{font-family:'Cormorant Garamond',serif;font-weight:400!important;color:#f5f5f0}
h1{font-size:clamp(3.5rem,8vw,7rem);line-height:.95}
section{padding-top:9rem!important;padding-bottom:9rem!important;background:#0a0a0a!important}
.bg-white,.bg-gray-50,.bg-gray-100{background:#13110d!important;color:#f5f5f0!important}
.text-primary{color:#d4af37!important;background:none!important;-webkit-text-fill-color:#d4af37!important}
.bg-primary{background:#d4af37!important;color:#0a0a0a!important}
[class*="rounded"]{border-radius:0!important}
button,a[role="button"]{border:1px solid #d4af37;background:transparent;color:#d4af37;text-transform:uppercase;letter-spacing:.25em;font-size:.7rem;padding:1.2rem 2.5rem;border-radius:0!important}
button:hover{background:#d4af37;color:#0a0a0a}
.shadow-sm,.shadow,.shadow-md,.shadow-lg,.shadow-xl,.shadow-2xl{box-shadow:none!important;border:1px solid rgba(212,175,55,.2)!important}

▸ "editorial" inspiré NY Times/Medium (serif, lignes, sans ombres, fond ivoire) :
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,700&family=Inter:wght@300;400;500&display=swap');
body{font-family:'Inter',sans-serif;font-weight:300;background:#fffef9;color:#1a1108;font-size:1.05rem;line-height:1.75}
.font-heading{font-family:'Fraunces',serif;font-weight:500;letter-spacing:-.01em}
h1,h2,h3{font-family:'Fraunces',serif;font-weight:500!important;color:#1a1108}
h1{font-size:clamp(2.8rem,6vw,5rem);line-height:1.02}
section{padding-top:6rem!important;padding-bottom:6rem!important;border-bottom:1px solid rgba(0,0,0,.06)}
.bg-white{background:transparent!important;border-top:1px solid rgba(0,0,0,.08);border-radius:0!important;padding-top:1.5rem!important}
[class*="rounded"]{border-radius:0!important}
button,a[role="button"]{border:1px solid #1a1108;background:transparent;color:#1a1108;border-radius:0!important;text-transform:uppercase;letter-spacing:.2em;font-size:.7rem;padding:1rem 2rem}
button:hover{background:#1a1108;color:#fffef9}
.shadow-sm,.shadow,.shadow-md{box-shadow:none!important;border-bottom:1px solid rgba(0,0,0,.1)!important}
.shadow-lg,.shadow-xl,.shadow-2xl{box-shadow:none!important;border:1px solid rgba(0,0,0,.1)!important}

▸ "bold-vibrant" (couleurs saturées, gradients animés, gros titres) :
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800;900&display=swap');
body{font-family:'Plus Jakarta Sans',sans-serif;background:linear-gradient(180deg,#ffffff 0%,color-mix(in srgb,var(--color-primary) 4%,#ffffff) 100%)}
.font-heading{font-family:'Plus Jakarta Sans',sans-serif;font-weight:900;letter-spacing:-.04em}
h1{font-size:clamp(3rem,8vw,7rem);font-weight:900;letter-spacing:-.05em;line-height:.96}
h2{font-size:clamp(2.5rem,5vw,4rem);font-weight:800;letter-spacing:-.03em}
section{padding-top:7rem!important;padding-bottom:7rem!important}
section:first-of-type{background:linear-gradient(135deg,var(--color-primary),var(--color-secondary),var(--color-primary));background-size:300% 300%;animation:gradient 12s ease infinite;color:#fff}
section:first-of-type h1,section:first-of-type p{color:#fff!important}
@keyframes gradient{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
.bg-primary{background:linear-gradient(135deg,var(--color-primary),var(--color-secondary))!important}
.text-primary{background:linear-gradient(90deg,var(--color-primary),var(--color-secondary));-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:800}
[class*="rounded-2xl"]{border-radius:1.5rem!important}
.shadow-lg,.shadow-xl,.shadow-2xl{box-shadow:0 25px 60px -10px color-mix(in srgb,var(--color-primary) 25%,transparent)!important}
button,a[role="button"]{border-radius:9999px!important;font-weight:700;padding:1rem 2rem!important;transition:transform .25s ease}
button:hover{transform:translateY(-2px) scale(1.02)}

═══════════════════════════════════════════════════════
RÈGLES ABSOLUES :
1. Cible UNIQUEMENT les sélecteurs Tailwind/HTML listés ci-dessus. NE PAS utiliser \`.wp-*\` (n'existe pas en React).
2. Si un site de référence est fourni → reprends ses couleurs/fonts/gradients/border-radius EXACTEMENT, adapte l'exemple ci-dessus à ces valeurs.
3. Le customCss DOIT faire AU MOINS 1500 CARACTÈRES pour vraiment transformer le visuel.
4. Override fortement : @import Google Fonts, body{font-family}, h1/h2{font-size + letter-spacing}, section{padding}, .bg-primary{gradient}, .text-primary{gradient text}, [class*="rounded-2xl"]{border-radius}, button{radius+hover}.
5. Personnalise selon le site de référence : si fond clair gradient → reproduire le gradient sur \`section:first-of-type\`. Si fond sombre → override \`.bg-white\` en sombre.
═══════════════════════════════════════════════════════`;

// ─── customCss prompt — variante HTML pur (.wp-* classes) ────────────────────
// Conservé pour les renderers qui produisent du HTML avec classes wp-* (renderHtml).
const WP_CUSTOM_CSS_BLOCK = `═══════════════════════════════════════════════════════
🎨 GÉNÉRATION DU customCss — TRÈS IMPORTANT (HTML + classes .wp-*)
═══════════════════════════════════════════════════════
Le champ "customCss" doit être un BLOC CSS COMPLET qui PERSONNALISE FORTEMENT le rendu visuel du site selon le designProfile choisi et les guidelines du skill ui-ux-pro-max ci-dessus.

Tu DOIS override les variables CSS de base et ajouter des règles spécifiques pour que le site ait une identité visuelle unique et adaptée. Le customCss est appliqué APRÈS le CSS de base, donc tes règles ont priorité.

EXEMPLES DE customCss SELON LE PROFILE :

▸ "minimal" :
:root{--radius:4px;--shadow-md:0 1px 3px rgba(0,0,0,.04);--shadow-lg:0 1px 3px rgba(0,0,0,.04)}
.wp-feature{border-radius:0;border:1px solid var(--text);background:transparent}
.wp-feature::before{display:none}
.wp-btn{border-radius:0;font-weight:600;letter-spacing:.05em;text-transform:uppercase}
.wp-hero{background:var(--bg);color:var(--text)}
.wp-hero h1{color:var(--text);text-shadow:none}
h1,h2,h3{font-weight:300;letter-spacing:-.04em}
.wp-section{padding:8rem 0}

▸ "bold-vibrant" :
:root{--radius:24px}
body{background:linear-gradient(180deg,var(--bg) 0%,color-mix(in srgb,var(--primary) 5%,var(--bg)) 100%)}
.wp-hero{background:linear-gradient(135deg,var(--primary),var(--secondary),var(--primary));background-size:200% 200%;animation:gradient 8s ease infinite}
@keyframes gradient{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
.wp-feature{border-radius:24px;background:linear-gradient(135deg,#fff,color-mix(in srgb,var(--primary) 3%,#fff))}
.wp-btn{border-radius:9999px;background:var(--gradient);color:#fff;transform:scale(1);transition:transform .3s}
.wp-btn:hover{transform:scale(1.05)}
h1{font-weight:900;font-size:clamp(3rem,8vw,7rem);letter-spacing:-.04em}

▸ "trust-corporate" :
:root{--radius:8px;--shadow-md:0 4px 12px rgba(0,40,100,.08)}
.wp-hero{background:var(--primary);color:#fff;padding:4rem 0;min-height:50vh}
.wp-hero h1{font-size:clamp(2rem,4vw,3.5rem);font-weight:700}
.wp-feature{border-radius:8px;border-top:3px solid var(--primary);background:#fff;padding:2.5rem 2rem}
.wp-feature::before{display:none}
.wp-btn{border-radius:6px;font-weight:600;padding:.85rem 1.75rem}
.wp-section{padding:5rem 0}
h1,h2,h3{letter-spacing:-.01em;font-weight:700}

▸ "luxury-elegant" :
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500&display=swap');
:root{--radius:0px;--bg:#0a0a0a;--text:#f5f5f0;--border:rgba(255,255,255,.1)}
body{background:#0a0a0a;color:#f5f5f0;font-family:'Inter',sans-serif;font-weight:300}
h1,h2,h3{font-family:'Cormorant Garamond',serif;font-weight:400;letter-spacing:.02em}
.wp-hero{background:#0a0a0a;border-bottom:1px solid #d4af37}
.wp-hero h1{color:#d4af37;font-weight:400}
.wp-btn{border:1px solid #d4af37;background:transparent;color:#d4af37;border-radius:0;text-transform:uppercase;letter-spacing:.2em;padding:1.25rem 3rem}
.wp-btn:hover{background:#d4af37;color:#0a0a0a}
.wp-feature{background:rgba(255,255,255,.02);border:1px solid #d4af37;border-radius:0}

CLASSES wp-* DISPONIBLES : .wp-container, .wp-section, .wp-hero, .wp-hero-split, .wp-hero-inner, .wp-hero-text, .wp-btn, .wp-feature, .wp-stat-card, .wp-step, .wp-cta, .wp-form, .wp-nav, .wp-footer (cf renderer).

VARIABLES CSS de base (override dans :root) :
  --primary, --secondary, --gradient, --bg, --bg-alt, --text, --muted, --border, --shadow-sm, --shadow-md, --shadow-lg, --radius, --radius-pill

CHOIS LE PROFILE QUI COLLE LE MIEUX au secteur + tone du brief. Le customCss DOIT FAIRE AU MOINS 1500 CARACTÈRES.

⚠️ RÈGLES ABSOLUES :
1. Le renderer N'utilise PAS de Tailwind. SEULEMENT des classes wp-*. Ton customCss contrôle 100% du visuel.
2. Si site de référence fourni → REPRENDS EXACTEMENT les couleurs/fonts/radius détectés.
3. Pas deux sites ne doivent se ressembler : varie le profile + ajoute des touches uniques.
═══════════════════════════════════════════════════════`;

async function generatePlan(
  brief: Brief,
  designRecs: DesignRecommendations | null,
): Promise<GenerationPlan | null> {
  const isLanding = brief.type === "LANDING";
  const pageCount = isLanding ? 1 : 4;

  // Contexte de refonte (optionnel) — l'IA s'inspire du contenu original
  const rebuildBlock = brief.rebuildContext
    ? `

═══════════════════════════════════════════════════════
🔄 MODE REFONTE — site source : ${brief.rebuildContext.sourceUrl}
═══════════════════════════════════════════════════════
RÉSUMÉ DU SITE ORIGINAL :
${brief.rebuildContext.summary ?? "(non fourni)"}

PROBLÈMES IDENTIFIÉS À CORRIGER :
${(brief.rebuildContext.currentIssues ?? []).map((i) => `- ${i}`).join("\n") || "(non fournis)"}

AMÉLIORATIONS À APPORTER :
${(brief.rebuildContext.improvements ?? []).map((i) => `- ${i}`).join("\n") || "(non fournies)"}

CONTENU ORIGINAL (extrait, à RESPECTER dans la nouvelle version — mêmes services, mêmes spécificités, mêmes chiffres) :
"""
${brief.rebuildContext.originalContent?.slice(0, 3500) ?? "(non fourni)"}
"""

DIRECTIVE SPÉCIALE REFONTE :
- REPRENDS les services, fonctionnalités, chiffres réels du contenu original
- N'INVENTE AUCUN nouveau produit, prix, fonctionnalité qui n'existe pas dans l'original
- AMÉLIORE la structure, la clarté, le SEO, sans dénaturer le sens
- Le visiteur du nouveau site doit reconnaître l'entreprise originale
═══════════════════════════════════════════════════════
`
    : "";

  // Recommandations design issues du skill ui-ux-pro-max (67 styles, 161 palettes, 57 typo)
  const designBlock = designRecs
    ? `

═══════════════════════════════════════════════════════
🎨 RECOMMANDATIONS DESIGN PRO (skill ui-ux-pro-max)
═══════════════════════════════════════════════════════
PRODUIT DÉTECTÉ : ${designRecs.product.type ?? "(N/A)"}
- Style recommandé : ${designRecs.product.primaryStyle ?? "(N/A)"}
- Pattern landing : ${designRecs.product.landingPattern ?? "(N/A)"}
- Focus couleur : ${designRecs.product.paletteFocus ?? "(N/A)"}

STYLE UI :
- Catégorie : ${designRecs.style.category ?? "(N/A)"}
- Mots-clés CSS : ${designRecs.style.cssKeywords ?? "(N/A)"}
- Variables design : ${designRecs.style.designVariables ?? "(N/A)"}

PALETTE COULEUR (${designRecs.color.palette.notes}) :
- Primary : ${designRecs.color.palette.primary} (texte ${designRecs.color.palette.onPrimary})
- Secondary : ${designRecs.color.palette.secondary}
- Accent : ${designRecs.color.palette.accent}
- Background : ${designRecs.color.palette.background}
- Foreground : ${designRecs.color.palette.foreground}

TYPOGRAPHY (${designRecs.typography.name}) :
- Heading font : ${designRecs.typography.headingFont ?? "Inter"}
- Body font : ${designRecs.typography.bodyFont ?? "Inter"}

DIRECTIVE : Respecte ces recommandations design pro pour générer un site visuellement cohérent et adapté au secteur.
═══════════════════════════════════════════════════════
`
    : "";

  // Design détecté sur un site de référence — l'IA doit IMITER ce design
  const refDesign = brief.referenceDesign;
  const referenceBlock =
    refDesign && (refDesign.dominantColors?.length || refDesign.fontFamilies?.length)
      ? `

═══════════════════════════════════════════════════════
🪞 SITE DE RÉFÉRENCE — IMITE CE DESIGN VISUELLEMENT
═══════════════════════════════════════════════════════
URL : ${refDesign.url ?? "(non fournie)"}
Ambiance : ${refDesign.isDark ? "🌑 SOMBRE (dark theme)" : "☀️ CLAIR (light theme)"}
Background : ${refDesign.backgroundColor ?? "—"}
Couleurs dominantes (à RÉUTILISER, pas à inventer) :
${(refDesign.dominantColors ?? []).map((c) => `  - ${c}`).join("\n")}
Familles de fonts détectées : ${(refDesign.fontFamilies ?? []).join(" | ") || "—"}
Google Fonts à réutiliser : ${(refDesign.googleFontsUrls ?? []).join("\n  ") || "—"}
Border-radius dominant : ${refDesign.borderRadius ?? "—"}

DIRECTIVES NON NÉGOCIABLES — PRIORITÉ ABSOLUE :
- Quand un site de référence est fourni, il PRIME sur la matrice secteur. Tu DOIS imiter son style.
- Le customCss DOIT utiliser les couleurs ci-dessus, pas des couleurs génériques (pas de #6366f1/#ec4899 par défaut)
- Si dark theme détecté → designProfile OBLIGATOIRE = 'tech-modern' ou 'luxury-elegant'
- Si light theme + couleurs neutres + serif → designProfile = 'editorial' ou 'minimal'
- Si light theme + couleurs vives → designProfile = 'bold-vibrant' ou 'playful-startup'
- Si fonts Google détectées → @import les MÊMES dans customCss
- Le border-radius des boutons/cards DOIT correspondre à celui détecté (square / rounded / pill)
- L'ambiance générale (luxe / tech / éditorial / vibrant) doit MATCHER ce qui est suggéré
- Choix de variantes de hero selon ambiance détectée :
  • sombre/épuré/luxe → hero_blob ou hero_split
  • carousel visuel → hero_slider
  • lifestyle/mode → hero_blob
  • urgence/services → hero classique
═══════════════════════════════════════════════════════
${refDesign.visualAnalysis ? `

═══════════════════════════════════════════════════════
👁️ ANALYSE VISUELLE PAR VISION IA — SOURCE DE VÉRITÉ ABSOLUE
═══════════════════════════════════════════════════════
Le site de référence a été screenshoté puis analysé par une IA vision.
Cette analyse PRIME sur toutes les autres règles (matrice secteur, défauts).

Résumé visuel : ${refDesign.visualAnalysis.shortSummary ?? "(N/A)"}

LAYOUT HERO :
- Type : ${refDesign.visualAnalysis.heroLayout ?? "(N/A)"} (→ choisis hero_split si "split", hero si "centered", hero_slider si "slider", hero_blob si "blob")
- Visuel principal : ${refDesign.visualAnalysis.heroVisualPosition ?? "(N/A)"}
- Background : ${refDesign.visualAnalysis.heroBackground ?? "(N/A)"}

TYPO observée : ${refDesign.visualAnalysis.typography ?? "(N/A)"}
BOUTONS observés : ${refDesign.visualAnalysis.buttonStyle ?? "(N/A)"}
OMBRES : ${refDesign.visualAnalysis.shadows ?? "(N/A)"}
DARK THEME ? ${refDesign.visualAnalysis.isDark ? "OUI" : "non"}
PROFILE RECOMMANDÉ par l'IA vision : ${refDesign.visualAnalysis.matchedProfile ?? "(N/A)"} ← UTILISE celui-ci comme styleGuide.designProfile

EFFETS VISUELS SIGNATURES (à reproduire dans le customCss !) :
${(refDesign.visualAnalysis.signatureEffects ?? []).map((e) => `  • ${e}`).join("\n") || "  (aucun)"}

SECTIONS APRÈS LE HERO (vues sur le screenshot, dans l'ordre) :
${(refDesign.visualAnalysis.sectionsBelow ?? []).map((s, i) => `  ${i + 1}. ${s}`).join("\n") || "  (non détectées)"}

🎯 INSTRUCTIONS DE REPRODUCTION ULTRA CONCRÈTES (à appliquer dans le customCss + JSON sections) :
${(refDesign.visualAnalysis.reproductionHints ?? []).map((h, i) => `  ${i + 1}. ${h}`).join("\n") || "  (aucune)"}

⚠️ RÈGLE D'OR : ton customCss DOIT reproduire les effets signatures ci-dessus avec les sélecteurs Tailwind/React. Ton choix de sections DOIT correspondre aux sections observées sur le screenshot.
═══════════════════════════════════════════════════════
` : ""}`
      : "";

  // 🎯 BLOC COMPOSITION — directive ferme pré-décidée en code (sector-detector + compositions.ts)
  // L'IA reçoit ici la structure EXACTE à produire au lieu de "choisir parmi"
  const compositionBlock = brief.composition
    ? `

═══════════════════════════════════════════════════════
🎯 COMPOSITION IMPOSÉE — RESPECTE EXACTEMENT (NON NÉGOCIABLE)
═══════════════════════════════════════════════════════
Secteur détecté : ${brief.composition.sector}

🔒 TU DOIS PRODUIRE EXACTEMENT CETTE COMPOSITION :

styleGuide.designProfile = "${brief.composition.designProfile}"
  → NE CHOISIS PAS autre chose. Pas de fallback à "bold-vibrant".

Type de hero = "${brief.composition.heroType}"
  → La PREMIÈRE section du landing DOIT avoir "type": "${brief.composition.heroType}".
  → Si "hero_split" : pas de stats, juste image gauche + texte droite.
  → Si "hero_slider" : array "slides" avec 2-3 entrées (pas de stats).
  → Si "hero_blob" : ajouter "eyebrow" (UPPERCASE 3-6 mots), pas de stats.
  → Si "hero" : peut avoir des stats.

Ordre EXACT des sections du landing (${brief.composition.sections.length} sections, dans CET ORDRE, ne pas en ajouter ni en retirer) :
${brief.composition.sections.map((s, i) => `  ${i + 1}. type: "${s}"`).join("\n")}

⚠️ TU NE PEUX PAS :
- Changer l'ordre
- Sauter une section
- Ajouter une section qui n'est pas dans la liste
- Remplacer un type (ex: "features" au lieu de "service_tiles")
- Changer le designProfile
- Changer le type de hero

✅ TU DOIS :
- Générer le CONTENU (titres, descriptions, items, etc.) pour chaque section listée
- Suivre le bon format de "data" pour chaque type (cf schéma plus bas)
- Pour les pages multi-pages secondaires (services/a-propos/contact) : tu peux varier, mais l'index.html DOIT suivre la composition ci-dessus.
═══════════════════════════════════════════════════════
`
    : "";

  const prompt = `Tu es expert SEO et copywriter. Génère un ${isLanding ? "landing page" : "site web multi-pages"} complet pour le brief suivant.${compositionBlock}${designBlock}${referenceBlock}${rebuildBlock}

BRIEF :
- Marque : ${brief.brandName}
- Secteur : ${brief.sector}
- Cible : ${brief.audience}
- Objectif : ${brief.goal}
- Mots-clés : ${brief.keywords}
- Langue : ${brief.lang}
- Ton : ${brief.tone}

Génère ${isLanding ? "1 page (index.html)" : `${pageCount} pages : index.html, services.html, a-propos.html, contact.html`}.

Pour chaque page, le contenu doit être :
- ENTIÈREMENT en ${brief.lang === "fr-FR" ? "français" : brief.lang}
- Optimisé SEO Google 2026 (E-E-A-T, helpful content, AI Overviews)
- Title 50-60 chars
- Meta description 140-160 chars avec CTA implicite
- H1 30-70 chars différent du title
- Au moins 400 mots de contenu réel et utile (pas de blabla)
- Schema.org JSON-LD pertinent (Organization sur toutes les pages, + Article/Service/LocalBusiness selon contexte)

Retourne UNIQUEMENT du JSON STRICT (pas de \`\`\`, pas de commentaire) avec ce schéma EXACT :

{
  "globalKeyword": "<mot-clé principal du site>",
  "organizationSchema": {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "${brief.brandName}",
    "description": "<description de l'entreprise>",
    "url": "https://exemple.com"
  },
  "styleGuide": {
    "primary": "${brief.primaryColor}",
    "secondary": "${brief.secondaryColor}",
    "font": "system-ui, sans-serif",
    "tone": "${brief.tone}",
    "designProfile": "<⚠️ DOIT suivre la matrice secteur → profile (cf plus bas). Pas de défaut 'bold-vibrant' systématique. Options : 'minimal' | 'bold-vibrant' | 'trust-corporate' | 'luxury-elegant' | 'playful-startup' | 'editorial' | 'tech-modern' | 'wellness-soft'. Ex : artisan urgence → trust-corporate ; agence → editorial ; tech/SaaS → tech-modern ; santé/bien-être → wellness-soft ; restaurant/hôtel → luxury-elegant>",
    "customCss": "<bloc CSS qui PERSONNALISE le rendu selon le designProfile choisi. Voir détails plus bas.>"
  },
  "pages": [
    {
      "path": "index.html",
      "navLabel": "Accueil",
      "title": "...",
      "metaDescription": "...",
      "h1": "...",
      "sections": [
        {
          "// CHOIX HERO": "⚠️ Tu DOIS choisir le hero selon la MATRICE SECTEUR (cf plus bas) — PAS automatiquement 'hero' classique. Variantes : hero | hero_split | hero_slider | hero_blob. La structure JSON ci-dessous montre 'hero' à titre d'EXEMPLE, mais selon le secteur tu remplaces par hero_split / hero_slider / hero_blob.",
          "type": "hero",
          "data": {
            "title": "<headline 6-12 mots PUNCHY qui résume le bénéfice>",
            "subtitle": "<2-3 phrases (40-60 mots) qui expliquent QUOI tu fais, POUR QUI, et POURQUOI c'est différent>",
            "ctaText": "<verbe d'action 2-4 mots>",
            "ctaHref": "#contact",
            "ctaSecondaryText": "<2e CTA optionnel>",
            "imageKeywords": "<3-5 mots-clés Unsplash en anglais qui illustrent le secteur>",
            "stats": [
              { "value": "<chiffre RÉALISTE crédible pour ce business + unité — ex pour photographe : '500+ shootings', '10 ans', '4.9/5 avis'. NE JAMAIS écrire des stats meta sur le site lui-même comme '3 pages' ou '4 champs' — ce sont des stats BUSINESS visibles par les clients>", "label": "<2-4 mots descriptifs>" },
              { "value": "...", "label": "..." },
              { "value": "...", "label": "..." }
            ]
          }
        },
        {
          "// ALTERNATIVE": "type: 'hero_split' — layout 50/50 inspiré Stripe/Vercel/Linear : texte+badge+2 CTAs à GAUCHE, mockup/image à DROITE, fond clair gradient (le customCss peut override). À UTILISER POUR : SaaS, B2B, tech, fintech, dev tools, sites de référence comme Stripe.",
          "type": "hero_split",
          "data": {
            "title": "<titre 4-9 mots, capitalisation normale, percutant, orienté bénéfice produit (ex 'Le paiement pensé pour les freelances')>",
            "subtitle": "<phrase descriptive 18-28 mots qui explique le produit et l'audience (ex 'Encaisse en 28 devises, intègre l'API en 3 lignes, garde une vue claire sur tes revenus')>",
            "badge": "<optionnel — eyebrow court UPPERCASE 2-4 mots ex 'NOUVEAU', 'API 2025', 'BETA OUVERTE'>",
            "ctaText": "<CTA primaire 2-3 mots, capitalisation normale ex 'Essai gratuit', 'Commencer'>",
            "ctaHref": "#contact",
            "ctaSecondaryText": "<CTA secondaire optionnel ex 'Voir la doc', 'Comment ça marche'>",
            "ctaSecondaryHref": "#features",
            "imageKeywords": "<3-5 mots-clés Unsplash anglais pour mockup/scene produit. Si SaaS pur sans visuel pertinent, ne fournis PAS imageKeywords → fallback mockup SVG intégré>"
          }
        },
        {
          "// NOUVEAU": "type: 'logos_bar' — bandeau 'ils nous font confiance' inspiré Stripe. À PLACER JUSTE APRÈS le hero. Idéal pour SaaS/B2B/agence. Noms en typo épurée semi-transparente, pas de logos image (toujours fragiles).",
          "type": "logos_bar",
          "data": {
            "title": "<optionnel — eyebrow ex 'Ils nous font confiance', 'Utilisé par 50K+ entreprises'>",
            "logos": [
              { "name": "<nom court d'entreprise plausible et générique, ex 'Northwind', 'Acme', 'Pixelfox', 'BlueRock'>" },
              { "name": "..." }
            ]
          }
        },
        {
          "// NOUVEAU": "type: 'feature_split' — feature en bloc large, texte + mockup côte à côte ALTERNÉ. Style Stripe/Vercel. Remplace 'features' classique quand le brief est tech/SaaS/produit. Tu peux mettre 2-3 blocks max. Si codeSnippet fourni, on affiche un mock terminal sombre au lieu de l'image.",
          "type": "feature_split",
          "data": {
            "blocks": [
              {
                "eyebrow": "<eyebrow court UPPERCASE 2-3 mots ex 'INTÉGRATION', 'CONFORMITÉ', 'API'>",
                "title": "<titre 4-7 mots orienté bénéfice ex 'Intègre l'API en 3 lignes'>",
                "description": "<paragraphe 25-40 mots qui détaille la valeur>",
                "bullets": ["<bénéfice court 4-8 mots>", "...", "..."],
                "imageKeywords": "<3-5 mots Unsplash pour visuel produit, OU laisse vide si codeSnippet>",
                "codeSnippet": "<optionnel — extrait de code 3-6 lignes (JS/TS/Python/Bash), affiché en mock terminal sombre>"
              },
              { "eyebrow": "...", "title": "...", "description": "...", "bullets": ["..."], "imageKeywords": "..." }
            ]
          }
        },
        {
          "// ALTERNATIVE": "type: 'hero_slider' — carousel 2-3 slides pour secteurs visuels (créatifs, hôtellerie, restaurant, photographie)",
          "type": "hero_slider",
          "data": {
            "autoplay": true,
            "slides": [
              { "title": "<titre UPPERCASE 2-4 mots>", "subtitle": "<phrase italique 10-20 mots>", "ctaText": "<CTA UPPERCASE>", "ctaHref": "#contact", "imageKeywords": "<3-5 mots image>" },
              { "title": "...", "subtitle": "...", "ctaText": "...", "ctaHref": "#services", "imageKeywords": "..." }
            ]
          }
        },
        {
          "// ALTERNATIVE": "type: 'hero_blob' — hero éditorial chic avec forme circulaire beige décorative à gauche + image de fond + titre UPPERCASE puissant + bouton outline pilule. Idéal pour : agences créatives, mode, lifestyle, éditorial, communication.",
          "type": "hero_blob",
          "data": {
            "eyebrow": "<petite phrase UPPERCASE FR 3-6 mots ex 'UN STYLE INTEMPOREL', 'NOTRE EXPERTISE DEPUIS 2010'>",
            "title": "<titre UPPERCASE 4-8 mots punchy ex 'DES MURS QUI TRANSFORMENT VOTRE INTÉRIEUR'>",
            "ctaText": "<CTA UPPERCASE 2-3 mots ex 'DÉCOUVRIR', 'NOUS CONTACTER'>",
            "ctaHref": "#contact",
            "imageKeywords": "<3-5 mots-clés image atmosphérique>"
          }
        },
        {
          "type": "features",
          "data": {
            "title": "<H2 8-15 mots>",
            "subtitle": "<sous-titre 1 phrase 15-25 mots>",
            "items": [
              { "title": "<3-5 mots>", "imageKeywords": "<2-3 mots anglais décrivant visuellement le service — ex: 'interior painting wall', 'moving boxes truck', 'yoga studio mat'>", "desc": "<paragraphe 50-80 mots qui décrit le bénéfice ET un exemple concret>" }
            ]
          }
        },
        {
          "type": "stats",
          "data": {
            "title": "<H2 chiffres impressionnants — ex 'En chiffres', 'Notre impact'>",
            "items": [
              { "value": "<chiffre RÉALISTE BUSINESS — ex pour photographe : '500+ shootings', '10 ans d'expérience', '4.9/5 avis Google', '98% clients satisfaits'. PAS de meta-stats du site comme '3 pages' / '4 champs' / '2 cibles'. Doit être un fait crédible et VENDEUR, visible par un client>", "label": "<sublabel 5-10 mots>" }
            ]
          }
        },
        {
          "type": "process",
          "data": {
            "title": "<H2 'Comment ça marche' ou similaire>",
            "subtitle": "<phrase d'intro 15-25 mots>",
            "steps": [
              { "number": "01", "title": "<3-6 mots>", "desc": "<paragraphe 40-60 mots avec étape concrète>" }
            ]
          }
        },
        {
          "type": "about",
          "data": {
            "title": "<H2 narratif>",
            "paragraphs": [
              "<paragraphe 80-120 mots — histoire, mission>",
              "<paragraphe 80-120 mots — valeurs, promesse client>",
              "<paragraphe 60-100 mots — engagement, vision>"
            ],
            "imageKeywords": "<keywords Unsplash anglais>"
          }
        },
        {
          "type": "gallery",
          "data": {
            "title": "<H2>",
            "// imageKeywords": "EXACTEMENT 7 entrées pour un layout harmonieux (1 grande 2×2 + 6 petites). Chaque entrée = 2-3 mots-clés anglais visuels DIFFÉRENTS pour avoir de la variété.",
            "imageKeywords": ["<kw1>", "<kw2>", "<kw3>", "<kw4>", "<kw5>", "<kw6>", "<kw7>"]
          }
        },
        {
          "type": "cta",
          "data": {
            "title": "<H2 court et direct 5-8 mots>",
            "subtitle": "<1-2 phrases 25-40 mots qui créent l'urgence>",
            "buttonText": "<verbe d'action>",
            "buttonHref": "#contact",
            "secondaryText": "<rassurance 5-10 mots, ex 'Sans engagement'>"
          }
        },
        {
          "type": "highlights",
          "data": {
            "title": "<H2 'Pourquoi nous choisir' ou argument fort 5-10 mots>",
            "subtitle": "<phrase 10-20 mots optionnelle>",
            "items": [
              { "title": "<3-6 mots — argument clé>", "imageKeywords": "<2-3 mots anglais visuels>", "desc": "<40-70 mots — bénéfice concret avec exemple>" }
            ]
          }
        },
        {
          "type": "service_tiles",
          "data": {
            "title": "<H2 8-15 mots>",
            "subtitle": "<sous-titre 1 phrase 10-20 mots optionnel>",
            "items": [
              { "title": "<2-4 MOTS COURTS — nom prestation>", "imageKeywords": "<2-3 mots anglais visuels>", "desc": "<30-50 mots — description courte du service>", "ctaText": "En savoir plus", "ctaHref": "#contact" }
            ]
          }
        },
        {
          "type": "circles",
          "data": {
            "title": "<H2 8-15 mots optionnel>",
            "subtitle": "<sous-titre optionnel>",
            "items": [
              { "category": "<1-2 mots catégorie EN FRANÇAIS ex 'Créatif', 'SEO'>", "title": "<2-3 mots nom service>", "imageKeywords": "<2-3 mots anglais visuels>", "desc": "<20-40 mots courte description>", "ctaText": "Lire plus", "ctaHref": "#contact" }
            ]
          }
        },
        {
          "type": "services_grid",
          "data": {
            "title": "<H2 2-4 mots UPPERCASE — header noir ex 'RÉSEAUX SOCIAUX', 'NOS PRESTATIONS' (le DERNIER mot est mis en gras)>",
            "subtitle": "<phrase d'intro optionnelle>",
            "items": [
              { "category": "<1-2 mots catégorie FR UPPERCASE ex 'COMMUNITY', 'SOCIAL', 'INFLUENCEURS'>", "title": "<2-3 mots nom service UPPERCASE FR>", "imageKeywords": "<2-3 mots anglais visuels>", "desc": "<60-100 mots description du service>" }
            ]
          }
        },
        {
          "type": "features_phone",
          "data": {
            "title": "<H2 2-4 mots ex 'NOS POINTS FORTS' (le DERNIER mot est mis en gras)>",
            "subtitle": "<phrase d'intro optionnelle>",
            "imageKeywords": "<2-3 mots anglais d'écran app/produit ex 'phone interface', 'mobile dashboard'>",
            "items": [
              { "title": "<1-2 mots UPPERCASE FR>", "desc": "<phrase 15-25 mots FR>" }
            ]
          }
        },
        {
          "type": "process_vertical",
          "data": {
            "title": "<H2 5-10 mots optionnel>",
            "subtitle": "<phrase d'intro optionnelle>",
            "steps": [
              { "number": "1", "title": "<3-5 mots UPPERCASE FR>", "desc": "<paragraphe 30-60 mots>" }
            ]
          }
        },
        {
          "type": "actions_grid",
          "data": {
            "title": "<H2 2-4 mots dont le DERNIER mot sera en bold ex 'Nos Actions', 'Nos Engagements'>",
            "imageKeywords": "<2-3 mots anglais image de fond pro/business>",
            "items": [
              { "title": "<2-3 mots UPPERCASE FR>", "desc": "<paragraphe 30-60 mots>" }
            ]
          }
        },
        {
          "type": "about_cards",
          "data": {
            "title": "<H2 3-6 mots — le DERNIER mot sera mis en couleur primaire ex 'Qui sommes nous ?', 'Notre Vision'>",
            "imageKeywords": "<2-3 mots anglais image people/teamwork>",
            "paragraphs": [
              "<paragraphe 30-60 mots>",
              "<paragraphe 40-70 mots>"
            ],
            "cards": [
              { "title": "<1-2 mots ex 'Vision'>", "desc": "<phrase 25-45 mots qui décrit cet aspect>" },
              { "title": "<1-2 mots ex 'Objectif'>", "desc": "<phrase 25-45 mots>" }
            ]
          }
        },
        {
          "type": "video",
          "data": {
            "title": "<H2 5-10 mots ex 'Découvrez notre approche en vidéo'>",
            "subtitle": "<phrase 10-20 mots optionnelle>",
            "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "posterKeywords": "<2-3 mots anglais — fond ambiance ex 'ocean dark', 'studio modern'>"
          }
        },
        {
          "type": "promo_split",
          "data": {
            "title": "<H2 UPPERCASE 3-6 MOTS EN FRANÇAIS ex 'VOTRE PROJET PREND VIE', 'L'EXCELLENCE À PORTÉE'>",
            "description": "<paragraphe 30-50 mots>",
            "highlight": "<phrase italique mise en avant 15-25 mots>",
            "extraDescription": "<paragraphe additionnel 20-40 mots optionnel>",
            "imageKeywords": "<2-3 mots anglais visuels forts>",
            "buttons": [
              { "text": "<verbe action court UPPERCASE>", "href": "#contact" },
              { "text": "<2ème option UPPERCASE>", "href": "#services" }
            ]
          }
        },
        {
          "type": "faq",
          "data": {
            "title": "Questions fréquentes",
            "subtitle": "<phrase 10-15 mots qui invite à explorer>",
            "items": [
              { "q": "<question complète 6-12 mots>", "a": "<réponse 40-80 mots avec détails concrets>" }
            ]
          }
        },
        {
          "type": "contact",
          "data": {
            "title": "<H2 chaleureux et engageant 2-5 mots EN FRANÇAIS ex 'Parlons de votre projet', 'Échangeons ensemble', 'Restons en contact'>",
            "subtitle": "<phrase 20-40 mots EN FRANÇAIS qui décrit pourquoi prendre contact>",
            "email": "contact@${brief.brandName.toLowerCase().replace(/\\s+/g,"")}.com",
            "phone": "<numéro réaliste FR ex '06 12 34 56 78' ou vide si pas pertinent>",
            "address": "<adresse réaliste FR ex '12 rue de la République, 69001 Lyon' ou vide>",
            "hours": "<horaires FR ex 'Lun-Ven 9h-18h\\nSam 9h-12h' avec \\n pour saut de ligne, ou vide>",
            "trustItems": [
              { "title": "<3-5 mots FR — atout 1>", "desc": "<phrase courte FR 10-15 mots>" },
              { "title": "<3-5 mots FR — atout 2>", "desc": "<phrase courte FR 10-15 mots>" },
              { "title": "<3-5 mots FR — atout 3>", "desc": "<phrase courte FR 10-15 mots>" }
            ],
            "showForm": true,
            "formTitle": "<titre du formulaire EN FRANÇAIS ex 'Envoyez-nous un message', 'Écrivez-nous'>",
            "formSubmitText": "<verbe d'action FR court ex 'Envoyer', 'Envoyer ma demande'>",
            "formFields": [
              { "name": "name", "label": "<placeholder FR ex 'Nom complet'>", "type": "text", "required": true },
              { "name": "email", "label": "<placeholder FR ex 'Adresse e-mail'>", "type": "email", "required": true },
              { "name": "phone", "label": "<placeholder FR ex 'Numéro de téléphone'>", "type": "tel", "required": false },
              { "name": "message", "label": "<placeholder FR ex 'Votre message'>", "type": "textarea", "required": true }
            ]
          }
        }
      ],
      "schemaJsonld": [<liste objects schema.org au-delà de Organization>]
    }${isLanding ? "" : ",\n    <même structure pour services.html, a-propos.html, contact.html avec sections appropriées>"}
  ]
}

⚠️ EXIGENCES DE CONTENU :
- Section "features" : **exactement 6 items** (ni plus ni moins), chacune un paragraphe 50-80 mots
- Section "service_tiles" : **3-4 items** (cartes hautes visuelles)
- Section "highlights" : **3 items** alternés image/texte (jamais plus)
- Section "circles" : **3-4 items** ronds (selon composition)
- Section "process" : **exactement 3 étapes** (numérotées 01/02/03), chacune 40-60 mots
- Section "stats" : **4 chiffres** impressionnants ou rassurants
- Section "about" : **3 paragraphes** de 80-120 mots chacun
- Section "faq" : **6 questions** maximum, réponses 40-80 mots
- Hero subtitle : **40-60 mots** (pas une ligne)
- Total contenu textuel : **>1200 mots** sur landing
- Toutes les sections marquées "imageKeywords" doivent être remplies en ANGLAIS avec **2-3 mots maximum** (ex: "painter interior", "wedding flowers", "fitness gym"). Trop de mots = image rouge par défaut.

🧩 SECTIONS — RÈGLE ABSOLUE DE DIVERSIFICATION
═══════════════════════════════════════════════════════
⛔ INTERDICTION FORMELLE de toujours produire la même séquence (Hero → Features → CTA → Contact).
Chaque site doit avoir une **identité visuelle unique** : variante de hero différente, layout de services différent, ordre de sections différent, design profile différent.

📋 MATRICE OBLIGATOIRE — SECTEUR → COMPOSITION
Tu DOIS choisir UNE composition selon le secteur du brief. Si plusieurs matchent, varie d'une génération à l'autre.

▸ ARTISAN/SERVICE URGENCE (plombier, serrurier, électricien, dépannage)
  - hero type = "hero" (classique, image fond + CTA appel)
  - designProfile = "trust-corporate" ou "bold-vibrant"
  - sections (5-6) : hero → stats (interventions/24h/zones) → process (étapes urgence) → highlights (3 atouts) → faq → contact
  - couleurs : bleu marine + rouge/orange urgent

▸ CRÉATIF/PHOTOGRAPHE/ARTISTE
  - hero type = "hero_slider" (carousel portfolio 2-3 slides)
  - designProfile = "editorial" ou "minimal"
  - sections (5-7) : hero_slider → gallery → about → service_tiles (4 prestations) → cta → contact
  - couleurs : neutres + 1 accent fort

▸ AGENCE/CONSEIL/MARKETING/COMMUNICATION
  - hero type = "hero_blob" (forme circulaire chic + titre UPPERCASE)
  - designProfile = "editorial" ou "luxury-elegant"
  - sections (6-7) : hero_blob → highlights → circles (3-4 expertises) → process → testimonials → cta → contact
  - couleurs : sombres + accent doré ou pastel

▸ TECH/SAAS/DIGITAL (style Stripe/Vercel/Linear)
  - hero type = "hero_split" (texte+badge+2 CTAs gauche, mockup droite)
  - designProfile = "tech-modern"
  - sections (5-7) : hero_split → logos_bar → feature_split (2-3 blocs avec bullets + mockup ou code) → stats → cta → contact
  - couleurs : fond clair gradient pastel (indigo/cyan) + accent primary + texte gris foncé. (Le customCss preset peut basculer en dark.)

▸ RESTAURANT/HÔTEL/BOUTIQUE
  - hero type = "hero_slider" (carousel ambiance)
  - designProfile = "luxury-elegant" ou "editorial"
  - sections (5-6) : hero_slider → service_tiles (offres) → gallery → about → cta → contact
  - couleurs : terreuses, dorées, ambiance

▸ SANTÉ/BIEN-ÊTRE/YOGA/FITNESS/COACH
  - hero type = "hero_blob" ou "hero" avec image douce
  - designProfile = "wellness-soft" ou "minimal"
  - sections (5-7) : hero_blob → service_tiles (3-4 offres visuelles) → highlights → process (méthode) → about → faq → contact
  - couleurs : pastels, terreuses, vert/beige

▸ E-COMMERCE/MODE/LIFESTYLE
  - hero type = "hero_blob" ou "hero_slider"
  - designProfile = "editorial" ou "playful-startup"
  - sections (5-6) : hero → promo_split (mise en avant produit) → services_grid → gallery → cta → contact

⚠️ RÈGLES STRICTES :
1. **Tu DOIS choisir une seule variante de hero** parmi : hero | hero_split | hero_slider | hero_blob. Pas plusieurs.
2. **Pour les "services/offres" tu DOIS choisir UN seul** parmi : features | service_tiles | highlights | circles | services_grid | features_phone. PAS toujours "features" — varie selon le secteur (cf matrice).
3. **L'ordre des sections compte** : ne mets pas toujours hero → features → contact. Suis l'ordre suggéré par la matrice.
4. **Le designProfile DOIT suivre la matrice** — pas de "bold-vibrant" par défaut sur tout.
5. **Maximum 7 sections** sur landing.

📐 SECTIONS DISPONIBLES (utilisables selon matrice ci-dessus) :
- hero / hero_split / hero_slider / hero_blob (1 seule, OBLIGATOIRE)
- logos_bar (bandeau noms d'entreprises sous le hero, style Stripe — réservé tech/SaaS/B2B/agence)
- features (8+ bénéfices grid) | service_tiles (3-4 offres cartes hautes photo) | highlights (2-3 alternance photo/texte) | circles (3-4 ronds + catégorie) | services_grid (3 cards image+titre+desc) | features_phone (mockup central + features autour)
- feature_split (2-3 blocs texte+mockup côte à côte alternés, style Stripe — pour tech/SaaS/produit)
- stats / process / about / gallery / video / promo_split / testimonials / pricing / cta / faq / contact

Pour multi-pages : index = composition selon matrice. Pages secondaires (services, a-propos, contact) commencent par un hero court (sera rendu en bandeau compact, pas pleine page).

⚠️ NE PAS générer de témoignages clients ni de prix/tarifs spécifiques (l'IA ne connaît pas ces faits).

${brief.framework === "react" ? REACT_CUSTOM_CSS_BLOCK : WP_CUSTOM_CSS_BLOCK}

Génère UNIQUEMENT le JSON, rien d'autre.`;

  const ai = await askAi({
    prompt,
    system:
      "Tu es un duo de pros : un designer UI/UX senior + un copywriter SEO senior. Tu produis du contenu créatif, dense, parfaitement structuré, qui respecte SCRUPULEUSEMENT les contraintes de format JSON demandées. Tu n'utilises JAMAIS de format DIAGNOSTIC/KPIS/BUDGET — tu génères directement le contenu du site.",
    temperature: 0.75,
    maxTokens: 16000,
  });
  if (!ai) return null;

  const cleaned = ai.text
    .trim()
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  // L'IA aime mettre des commentaires JS-style dans le JSON (`// comment` ou `/* ... */`).
  // C'est invalide JSON → on les strip avant de parser. On évite cependant de toucher au
  // contenu DES STRINGS (où les `//` peuvent légitimement apparaître, ex URL).
  function stripJsComments(s: string): string {
    let out = "";
    let inString = false;
    let escape = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (escape) { out += c; escape = false; continue; }
      if (c === "\\" && inString) { out += c; escape = true; continue; }
      if (c === '"') { inString = !inString; out += c; continue; }
      if (!inString) {
        // // line comment
        if (c === "/" && s[i + 1] === "/") {
          while (i < s.length && s[i] !== "\n") i++;
          out += "\n";
          continue;
        }
        // /* block comment */
        if (c === "/" && s[i + 1] === "*") {
          i += 2;
          while (i < s.length && !(s[i] === "*" && s[i + 1] === "/")) i++;
          i += 1; // skip the trailing /
          continue;
        }
      }
      out += c;
    }
    return out;
  }

  function tryParse(s: string): GenerationPlan | null {
    try { return JSON.parse(s) as GenerationPlan; } catch { return null; }
  }

  // 1ʳᵉ tentative : parse direct
  let parsed = tryParse(cleaned);
  if (parsed) return parsed;

  // 2ᵉ tentative : strip commentaires JS
  const noComments = stripJsComments(cleaned);
  parsed = tryParse(noComments);
  if (parsed) return parsed;

  // 3ᵉ tentative : enlève les trailing commas (les IA en mettent souvent)
  const noTrailingCommas = noComments.replace(/,(\s*[}\]])/g, "$1");
  parsed = tryParse(noTrailingCommas);
  if (parsed) {
    console.warn("[generate-site] AI JSON repaired (trailing commas stripped)");
    return parsed;
  }

  // Échec total — log autour de la position d'erreur
  try { JSON.parse(noTrailingCommas); } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const m = msg.match(/position (\d+)/);
    const pos = m ? Number(m[1]) : 0;
    const window = noTrailingCommas.slice(Math.max(0, pos - 200), pos + 200);
    console.error(`[generate-site] AI JSON parse error: ${msg}`);
    console.error(`[generate-site] Context (±200 chars autour de pos ${pos}):\n---\n${window}\n---`);
  }
  return null;
}

