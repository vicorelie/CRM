// Générateur de composant React JSX libre.
// Quand un site de référence est fourni avec analyse vision, on demande à l'IA
// d'écrire DIRECTEMENT le code TSX d'une section, plutôt que de choisir parmi notre catalogue
// figé. L'IA voit le résumé vision (signatureEffects, reproductionHints) et compose un
// `<section>...</section>` Tailwind + framer-motion qui mime la référence à 80%.
//
// Validation stricte avant écriture sur disque : on bloque les imports non autorisés,
// eval/Function, requires, accès filesystem, etc. Si la validation échoue → fallback
// composant standard du catalogue (le caller décide).

import { askAi } from "@/lib/ai";
import * as ts from "typescript";
import type { Brief } from "./schema";
import type { VisualAnalysis } from "@/lib/vision-analyzer";

const ALLOWED_IMPORTS: ReadonlyArray<RegExp> = [
  /^import\s+(?:type\s+)?\{[^}]+\}\s+from\s+["']react["'];?\s*$/m,
  /^import\s+(?:type\s+)?\{[^}]+\}\s+from\s+["']framer-motion["'];?\s*$/m,
  /^import\s+(?:type\s+)?\{[^}]+\}\s+from\s+["']react-router-dom["'];?\s*$/m,
];

const FORBIDDEN_PATTERNS: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
  { pattern: /\beval\s*\(/, reason: "eval() interdit" },
  { pattern: /\bFunction\s*\(/, reason: "Function() interdit" },
  { pattern: /\brequire\s*\(/, reason: "require() interdit (CJS)" },
  { pattern: /\bimport\s*\(/, reason: "dynamic import() interdit" },
  { pattern: /\bprocess\b/, reason: "process interdit" },
  { pattern: /\bglobalThis\b/, reason: "globalThis interdit" },
  { pattern: /\b__dirname\b|\b__filename\b/, reason: "globals Node interdits" },
  { pattern: /<script\b/i, reason: "<script> interdit" },
  { pattern: /\bdangerouslySetInnerHTML\b/, reason: "dangerouslySetInnerHTML interdit" },
  { pattern: /\bfetch\s*\(\s*["'`]?(https?:|\/\/)/, reason: "fetch externe interdit (à compile time)" },
  { pattern: /\bxhr\b|XMLHttpRequest/, reason: "XHR interdit" },
];

export type GeneratedJsxSection = {
  /** Code TSX complet du composant (default export). */
  code: string;
  /** Nom du composant (PascalCase) — utilisé pour le filename. */
  componentName: string;
  /** Mots-clés Unsplash pour préchargement d'image, si la section a une image. */
  imageKeywords?: string;
};

export type JsxValidationResult =
  | { ok: true; code: string; componentName: string }
  | { ok: false; reason: string };

/**
 * Valide un code TSX généré par l'IA.
 * - Vérifie pattern forbidden
 * - Vérifie que tous les imports sont dans la whitelist
 * - Vérifie qu'il y a un `export default function ...`
 * - Renvoie le code nettoyé (commentaires de blocs ```tsx … ``` strippés).
 */
export function validateGeneratedJsx(rawCode: string): JsxValidationResult {
  // Strip markdown fences si l'IA en a mis
  let code = rawCode
    .trim()
    .replace(/^```(?:tsx|typescript|jsx)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  for (const { pattern, reason } of FORBIDDEN_PATTERNS) {
    if (pattern.test(code)) return { ok: false, reason };
  }

  // Vérifie chaque ligne `import …` est dans la whitelist
  const importLines = code.match(/^import\s+.+$/gm) ?? [];
  for (const line of importLines) {
    const isAllowed = ALLOWED_IMPORTS.some((re) => re.test(line));
    if (!isAllowed) {
      return { ok: false, reason: `import non autorisé: ${line.slice(0, 80)}` };
    }
  }

  // Doit avoir un `export default function Name(...) { ... }`
  const exportMatch = code.match(/export\s+default\s+function\s+([A-Z][A-Za-z0-9_]*)/);
  if (!exportMatch) {
    return { ok: false, reason: "pas de `export default function Name(...)` détecté" };
  }
  const componentName = exportMatch[1];

  // Doit retourner du JSX (au moins un `<` après le return)
  if (!/return\s*\(?\s*</.test(code)) {
    return { ok: false, reason: "le composant ne retourne pas de JSX" };
  }

  // VRAIE validation syntaxique via le compilateur TypeScript.
  // ts.transpileModule retourne les diagnostics — toute erreur de syntaxe TSX
  // (tag non fermé, accolade manquante, JSX malformé) y est rapportée.
  try {
    const result = ts.transpileModule(code, {
      compilerOptions: {
        jsx: ts.JsxEmit.Preserve,
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        allowJs: false,
        esModuleInterop: true,
      },
      reportDiagnostics: true,
    });
    const errors = (result.diagnostics ?? []).filter(
      (d) => d.category === ts.DiagnosticCategory.Error,
    );
    if (errors.length > 0) {
      const first = errors[0];
      const msg = ts.flattenDiagnosticMessageText(first.messageText, "\n");
      const line = first.file && first.start !== undefined
        ? first.file.getLineAndCharacterOfPosition(first.start).line + 1
        : "?";
      return { ok: false, reason: `syntaxe TSX invalide (ligne ${line}): ${msg.slice(0, 200)}` };
    }
  } catch (err) {
    return { ok: false, reason: `transpilation TS échouée: ${err instanceof Error ? err.message : String(err)}` };
  }

  return { ok: true, code, componentName };
}

const SYSTEM_PROMPT = `Tu es un développeur React senior expert en design web. Tu écris du TSX propre, accessible, responsive, avec Tailwind CSS + framer-motion. Tu reproduis fidèlement le style visuel d'un site de référence (vu par une IA vision) tout en intégrant le contenu d'un brief client. Tu ne fais JAMAIS d'imports externes au-delà de la whitelist autorisée.`;

function buildPrompt(args: {
  brief: Brief;
  vision: VisualAnalysis;
  sectionType: "hero" | "features" | "logos" | "stats" | "cta" | "feature_split";
  componentName: string;
  contentHints: string;
}): string {
  const { brief, vision, sectionType, componentName, contentHints } = args;
  return `Tu vas écrire UN composant React TSX qui sera ajouté à un site généré pour la marque "${brief.brandName}".

BRIEF MARQUE :
- Nom : ${brief.brandName}
- Secteur : ${brief.sector}
- Cible : ${brief.audience}
- Objectif : ${brief.goal}
- Ton : ${brief.tone ?? "professionnel"}
- Couleur primaire : ${brief.primaryColor} | Secondaire : ${brief.secondaryColor}

VISION DU SITE DE RÉFÉRENCE (à reproduire à ~80% visuellement) :
- Résumé : ${vision.shortSummary}
- Layout hero observé : ${vision.heroLayout} | Background : ${vision.heroBackground}
- Typo : ${vision.typography}
- Boutons : ${vision.buttonStyle}
- Ombres : ${vision.shadows}
- Dark theme ? ${vision.isDark ? "oui" : "non"}
- Effets visuels SIGNATURES (à reproduire) :
${(vision.signatureEffects ?? []).map((e) => `  • ${e}`).join("\n")}
- Reproduction hints (instructions Tailwind concrètes) :
${(vision.reproductionHints ?? []).map((h) => `  • ${h}`).join("\n")}

SECTION À ÉCRIRE : ${sectionType}
Contenu/données à intégrer dans la section :
${contentHints}

═══════════════════════════════════════════════════════
RÈGLES ABSOLUES (le moindre écart cassera le build) :
═══════════════════════════════════════════════════════

1. Le composant DOIT être un \`export default function ${componentName}() { ... }\` (sans props pour cette première version : on hardcode le contenu dans le JSX).

2. Imports AUTORISÉS (et uniquement ceux-là) :
   - import { useState, useEffect } from "react";
   - import { motion, AnimatePresence } from "framer-motion";
   - import { Link } from "react-router-dom";

3. Imports INTERDITS : tout autre module (lucide-react, heroicons, lodash, etc.). Pour les icônes, écris des SVG inline dans le JSX.

4. Pas de \`process\`, \`require\`, \`eval\`, \`Function\`, \`globalThis\`, \`__dirname\`, \`fetch()\` externe, \`<script>\`, \`dangerouslySetInnerHTML\`.

5. Tailwind utility classes UNIQUEMENT pour le styling. Couleurs : tu peux utiliser \`bg-primary\`, \`text-primary\`, \`bg-secondary\`, \`text-secondary\` (les CSS vars --color-primary / --color-secondary sont injectées). Pour des couleurs spécifiques (mesh, gradient), utilise les couleurs Tailwind ou \`style={{...}}\` inline.

6. Le composant DOIT être responsive (mobile-first), accessible (aria-* sur SVG, alt sur img).

7. Pour les images : tu peux utiliser \`<img src="...">\` avec une URL Unsplash, OU laisser un \`<div>\` placeholder avec gradient. NE PAS générer d'URLs inventées : utilise des SVG inline pour les mockups.

8. La section doit COMMENCER par \`<section ...>\` et FINIR par \`</section>\`.

9. Tu peux utiliser framer-motion pour les animations (\`<motion.div>\`, \`initial\`, \`whileInView\`, etc.).

═══════════════════════════════════════════════════════

Génère UNIQUEMENT le code TSX complet (avec les imports en haut + le \`export default function ${componentName}\` + le retour JSX). Pas de markdown, pas de commentaires explicatifs en dehors du code, pas d'autres textes. Le code doit être prêt à écrire dans un fichier .tsx.`;
}

/**
 * Génère le code TSX d'une section custom inspirée de la vision IA.
 * Renvoie null si :
 *  - l'IA n'a pas répondu
 *  - le code généré échoue à la validation (imports interdits, patterns dangereux)
 */
export async function generateCustomJsxSection(args: {
  brief: Brief;
  vision: VisualAnalysis;
  sectionType: "hero" | "features" | "logos" | "stats" | "cta" | "feature_split";
  componentName: string;
  contentHints: string;
}): Promise<GeneratedJsxSection | null> {
  const prompt = buildPrompt(args);
  const ai = await askAi({
    prompt,
    system: SYSTEM_PROMPT,
    temperature: 0.5,
    maxTokens: 4000,
  });
  if (!ai) {
    console.warn(`[jsx-generator] pas de réponse IA pour ${args.sectionType}`);
    return null;
  }

  const result = validateGeneratedJsx(ai.text);
  if (!result.ok) {
    console.warn(`[jsx-generator] validation échouée pour ${args.sectionType}: ${result.reason}`);
    console.warn(`[jsx-generator] raw start: ${ai.text.slice(0, 200)}`);
    return null;
  }

  console.log(`[jsx-generator] ✓ ${args.sectionType} → ${result.componentName} (${result.code.length} chars)`);
  return {
    code: result.code,
    componentName: result.componentName,
  };
}
