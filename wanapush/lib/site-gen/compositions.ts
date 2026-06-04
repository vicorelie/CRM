// Compositions pré-définies par secteur.
// Pour chaque secteur on a 2-3 compositions distinctes pour de la VRAIE variabilité.
// L'IA reçoit ensuite une composition déjà décidée à REMPLIR, pas à choisir.

import type { Sector } from "./sector-detector";

export type Composition = {
  /** Type de hero à utiliser (variante imposée) */
  heroType: "hero" | "hero_split" | "hero_slider" | "hero_blob";
  /** Design profile imposé */
  designProfile:
    | "minimal" | "bold-vibrant" | "trust-corporate" | "luxury-elegant"
    | "playful-startup" | "editorial" | "tech-modern" | "wellness-soft";
  /** Ordre exact des sections du landing — type de section + variante éventuelle */
  sections: string[];
  /** Couleurs suggérées si l'utilisateur n'a rien précisé (hex valides) */
  defaultColors: { primary: string; secondary: string };
};

/**
 * Toutes les compositions disponibles par secteur.
 * Chaque secteur a 2-3 variantes pour pouvoir alterner entre générations.
 */
const COMPOSITIONS: Record<Sector, Composition[]> = {
  artisan_urgence: [
    {
      heroType: "hero",
      designProfile: "trust-corporate",
      sections: ["hero", "stats", "process", "highlights", "faq", "contact"],
      defaultColors: { primary: "#1e3a8a", secondary: "#f97316" }, // bleu marine + orange urgent
    },
    {
      heroType: "hero",
      designProfile: "bold-vibrant",
      sections: ["hero", "service_tiles", "stats", "process", "faq", "cta", "contact"],
      defaultColors: { primary: "#dc2626", secondary: "#1e293b" }, // rouge urgent + ardoise
    },
  ],
  creatif_visuel: [
    {
      heroType: "hero_slider",
      designProfile: "editorial",
      sections: ["hero_slider", "gallery", "about", "service_tiles", "cta", "contact"],
      defaultColors: { primary: "#1c1917", secondary: "#d4a017" }, // noir + or
    },
    {
      heroType: "hero_blob",
      designProfile: "minimal",
      sections: ["hero_blob", "service_tiles", "gallery", "about", "cta", "contact"],
      defaultColors: { primary: "#0f172a", secondary: "#f59e0b" }, // ardoise + ambre
    },
    {
      heroType: "hero_split",
      designProfile: "editorial",
      sections: ["hero_split", "promo_split", "gallery", "highlights", "contact"],
      defaultColors: { primary: "#18181b", secondary: "#a78bfa" },
    },
  ],
  agence_creative: [
    {
      heroType: "hero_blob",
      designProfile: "editorial",
      sections: ["hero_blob", "actions_grid", "circles", "process", "promo_split", "cta", "contact"],
      defaultColors: { primary: "#1c1917", secondary: "#d4a017" },
    },
    {
      heroType: "hero_split",
      designProfile: "luxury-elegant",
      sections: ["hero_split", "service_tiles", "about_cards", "highlights", "cta", "contact"],
      defaultColors: { primary: "#0c0a09", secondary: "#c8a96b" },
    },
    {
      heroType: "hero",
      designProfile: "trust-corporate",
      sections: ["hero", "actions_grid", "about_cards", "features_phone", "services_grid", "cta", "contact"],
      defaultColors: { primary: "#1e40af", secondary: "#1e3a8a" },
    },
  ],
  tech_saas: [
    {
      heroType: "hero_split",
      designProfile: "tech-modern",
      sections: ["hero_split", "logos_bar", "feature_split", "stats", "cta", "contact"],
      defaultColors: { primary: "#635bff", secondary: "#0a2540" }, // stripe-ish violet + dark navy
    },
    {
      heroType: "hero_split",
      designProfile: "tech-modern",
      sections: ["hero_split", "logos_bar", "feature_split", "circles", "cta", "contact"],
      defaultColors: { primary: "#3b82f6", secondary: "#a855f7" }, // bleu + violet
    },
    {
      heroType: "hero",
      designProfile: "tech-modern",
      sections: ["hero", "logos_bar", "feature_split", "stats", "faq", "cta", "contact"],
      defaultColors: { primary: "#06b6d4", secondary: "#8b5cf6" }, // cyan + violet
    },
  ],
  restaurant_hotel: [
    {
      heroType: "hero_slider",
      designProfile: "luxury-elegant",
      sections: ["hero_slider", "service_tiles", "gallery", "about", "cta", "contact"],
      defaultColors: { primary: "#78350f", secondary: "#d4a017" }, // brun + or
    },
    {
      heroType: "hero",
      designProfile: "editorial",
      sections: ["hero", "promo_split", "service_tiles", "gallery", "contact"],
      defaultColors: { primary: "#1c1917", secondary: "#c8a96b" },
    },
  ],
  sante_bienetre: [
    {
      heroType: "hero_blob",
      designProfile: "wellness-soft",
      sections: ["hero_blob", "service_tiles", "highlights", "process", "about", "faq", "contact"],
      defaultColors: { primary: "#5b8c5a", secondary: "#d4a574" }, // vert sauge + terre cuite
    },
    {
      heroType: "hero",
      designProfile: "minimal",
      sections: ["hero", "circles", "highlights", "about", "contact"],
      defaultColors: { primary: "#7c6a5e", secondary: "#a8b89a" }, // taupe + vert pâle
    },
  ],
  ecommerce: [
    {
      heroType: "hero_blob",
      designProfile: "playful-startup",
      sections: ["hero_blob", "promo_split", "services_grid", "gallery", "cta", "contact"],
      defaultColors: { primary: "#7c3aed", secondary: "#f43f5e" }, // violet + rose vif
    },
    {
      heroType: "hero_slider",
      designProfile: "editorial",
      sections: ["hero_slider", "service_tiles", "gallery", "highlights", "contact"],
      defaultColors: { primary: "#0f172a", secondary: "#f59e0b" },
    },
  ],
  service_pro: [
    {
      heroType: "hero",
      designProfile: "trust-corporate",
      sections: ["hero", "highlights", "process", "stats", "faq", "cta", "contact"],
      defaultColors: { primary: "#1e3a8a", secondary: "#64748b" }, // bleu corporate + gris
    },
    {
      heroType: "hero_split",
      designProfile: "minimal",
      sections: ["hero_split", "service_tiles", "about", "process", "faq", "contact"],
      defaultColors: { primary: "#0f172a", secondary: "#475569" },
    },
  ],
  generic: [
    {
      heroType: "hero",
      designProfile: "bold-vibrant",
      sections: ["hero", "features", "highlights", "process", "faq", "cta", "contact"],
      defaultColors: { primary: "#6366f1", secondary: "#ec4899" },
    },
    {
      heroType: "hero_blob",
      designProfile: "editorial",
      sections: ["hero_blob", "service_tiles", "highlights", "about", "cta", "contact"],
      defaultColors: { primary: "#0f172a", secondary: "#a78bfa" },
    },
  ],
};

/**
 * Pioche une composition pour un secteur donné.
 * Si plusieurs compositions disponibles, sélectionne aléatoirement pour varier d'une génération à l'autre.
 */
export function pickComposition(sector: Sector): Composition {
  const options = COMPOSITIONS[sector] ?? COMPOSITIONS.generic;
  return options[Math.floor(Math.random() * options.length)];
}
