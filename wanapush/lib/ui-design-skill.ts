// Wrapper du skill ui-ux-pro-max (https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
// Recherche dans 67 UI styles, 161 palettes de couleurs, 57 font pairings.

import { spawn } from "node:child_process";
import path from "node:path";

const SKILL_PATH = path.join(
  process.cwd(),
  "skills/ui-ux-pro-max-skill/src/ui-ux-pro-max/scripts/search.py",
);

export type SkillDomain =
  | "product"
  | "style"
  | "color"
  | "typography"
  | "landing"
  | "ux"
  | "chart";

async function search(
  query: string,
  domain: SkillDomain,
  maxResults = 1,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "python3",
      [SKILL_PATH, query, "--domain", domain, "-n", String(maxResults)],
      { timeout: 10_000 },
    );
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d));
    proc.stderr.on("data", (d) => (stderr += d));
    proc.on("close", (code) => {
      if (code !== 0) reject(new Error(stderr || `exit code ${code}`));
      else resolve(stdout);
    });
    proc.on("error", reject);
  });
}

/** Extrait une valeur depuis le markdown retourné par search.py */
function extractField(md: string, label: string): string | null {
  const re = new RegExp(`\\*\\*${label}:?\\*\\*\\s*(.+?)(?=\\n|$)`, "i");
  const m = md.match(re);
  return m ? m[1].trim() : null;
}

/** Extrait toutes les occurrences d'un champ */
function extractAllFields(md: string, label: string): string[] {
  const re = new RegExp(`\\*\\*${label}:?\\*\\*\\s*(.+?)(?=\\n|$)`, "gi");
  const out: string[] = [];
  let m;
  while ((m = re.exec(md)) !== null) out.push(m[1].trim());
  return out;
}

export type DesignRecommendations = {
  product: {
    type: string | null;
    primaryStyle: string | null;
    landingPattern: string | null;
    paletteFocus: string | null;
    raw: string;
  };
  style: {
    category: string | null;
    aiPrompt: string | null;
    cssKeywords: string | null;
    designVariables: string | null;
    raw: string;
  };
  color: {
    palette: ColorPalette;
    raw: string;
  };
  typography: {
    name: string | null;
    headingFont: string | null;
    bodyFont: string | null;
    googleFontsUrl: string | null;
    cssImport: string | null;
    raw: string;
  };
};

export type ColorPalette = {
  primary: string;
  onPrimary: string;
  secondary: string;
  onSecondary: string;
  accent: string;
  onAccent: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  notes: string;
};

const FALLBACK_PALETTE: ColorPalette = {
  primary: "#6366f1",
  onPrimary: "#ffffff",
  secondary: "#ec4899",
  onSecondary: "#ffffff",
  accent: "#0ea5e9",
  onAccent: "#ffffff",
  background: "#fafafa",
  foreground: "#0a0a0a",
  card: "#ffffff",
  cardForeground: "#0a0a0a",
  muted: "#f5f5f5",
  mutedForeground: "#525252",
  border: "rgba(0,0,0,.08)",
  notes: "Default palette",
};

/**
 * Récupère des recommandations de design complètes pour un brief.
 * Lance 4 recherches en parallèle dans le skill.
 */
export async function getDesignRecommendations(brief: {
  sector: string;
  audience?: string;
  tone?: string;
  goal?: string;
}): Promise<DesignRecommendations | null> {
  try {
    const queries = {
      product: `${brief.sector} ${brief.audience ?? ""} ${brief.goal ?? ""}`.trim(),
      style: `${brief.tone ?? "modern"} ${brief.sector}`.trim(),
      color: `${brief.sector} ${brief.tone ?? ""}`.trim(),
      typography: `${brief.tone ?? "modern professional"}`.trim(),
    };

    const [productMd, styleMd, colorMd, typoMd] = await Promise.all([
      search(queries.product, "product", 1).catch(() => ""),
      search(queries.style, "style", 1).catch(() => ""),
      search(queries.color, "color", 1).catch(() => ""),
      search(queries.typography, "typography", 1).catch(() => ""),
    ]);

    return {
      product: {
        type: extractField(productMd, "Product Type"),
        primaryStyle: extractField(productMd, "Primary Style Recommendation"),
        landingPattern: extractField(productMd, "Landing Page Pattern"),
        paletteFocus: extractField(productMd, "Color Palette Focus"),
        raw: productMd,
      },
      style: {
        category: extractField(styleMd, "Style Category"),
        aiPrompt: extractField(styleMd, "AI Prompt Keywords"),
        cssKeywords: extractField(styleMd, "CSS/Technical Keywords"),
        designVariables: extractField(styleMd, "Design System Variables"),
        raw: styleMd,
      },
      color: {
        palette: parseColorPalette(colorMd),
        raw: colorMd,
      },
      typography: {
        name: extractField(typoMd, "Font Pairing Name"),
        headingFont: extractField(typoMd, "Heading Font"),
        bodyFont: extractField(typoMd, "Body Font"),
        googleFontsUrl: extractField(typoMd, "Google Fonts URL"),
        cssImport: extractField(typoMd, "CSS Import"),
        raw: typoMd,
      },
    };
  } catch (err) {
    console.error("[ui-design-skill] error", err);
    return null;
  }
}

function parseColorPalette(md: string): ColorPalette {
  const get = (label: string) => extractField(md, label) ?? "";
  const palette: ColorPalette = {
    primary: get("Primary") || FALLBACK_PALETTE.primary,
    onPrimary: get("On Primary") || FALLBACK_PALETTE.onPrimary,
    secondary: get("Secondary") || FALLBACK_PALETTE.secondary,
    onSecondary: get("On Secondary") || FALLBACK_PALETTE.onSecondary,
    accent: get("Accent") || FALLBACK_PALETTE.accent,
    onAccent: get("On Accent") || FALLBACK_PALETTE.onAccent,
    background: get("Background") || FALLBACK_PALETTE.background,
    foreground: get("Foreground") || FALLBACK_PALETTE.foreground,
    card: get("Card") || FALLBACK_PALETTE.card,
    cardForeground: get("Card Foreground") || FALLBACK_PALETTE.cardForeground,
    muted: get("Muted") || FALLBACK_PALETTE.muted,
    mutedForeground: get("Muted Foreground") || FALLBACK_PALETTE.mutedForeground,
    border: get("Border") || FALLBACK_PALETTE.border,
    notes: get("Notes") || "",
  };
  void extractAllFields; // évite warning unused
  return palette;
}
