// Schéma et types pour la génération de sites IA.
// Centralisé ici pour éviter le module monolithique route.ts.

import { z } from "zod";

export const briefSchema = z.object({
  type: z.enum(["LANDING", "MULTI_PAGE"]),
  /** Nom de la marque/entreprise */
  brandName: z.string().trim().min(1).max(100),
  /** Secteur d'activité (ex: "Plombier dépannage", "Coach sportif") */
  sector: z.string().trim().min(2).max(200),
  /** Public cible (ex: "Particuliers en Île-de-France") */
  audience: z.string().trim().min(2).max(300),
  /** Objectif principal (ex: "Générer des appels", "Vendre l'abonnement") */
  goal: z.string().trim().min(2).max(300),
  /** Mots-clés SEO cibles (3-5 séparés par virgule) */
  keywords: z.string().trim().min(2).max(300),
  /** Langue */
  lang: z.string().default("fr-FR"),
  /** Ton (ex: "professionnel et rassurant", "fun et direct") */
  tone: z.string().trim().max(200).optional().default("professionnel"),
  /** Couleur primaire (hex) */
  primaryColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional().default("#6366f1"),
  /** Couleur secondaire/accent (hex) */
  secondaryColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional().default("#ec4899"),
  /** URL d'un logo (optionnel) */
  logoUrl: z.string().url().optional().or(z.literal("")).optional(),
  /** Slogan/tagline court (optionnel) */
  tagline: z.string().trim().max(200).optional(),
  /** Framework cible : HTML statique ou React (Vite+TS+Tailwind buildable) */
  framework: z.enum(["html", "react"]).optional().default("html"),
  /** Mots-clés business EN ANGLAIS pour skill ui-ux-pro-max */
  skillKeywordsEn: z.string().trim().max(200).optional(),
  /** Design extrait d'un site de référence (couleurs, fonts, ambiance) */
  referenceDesign: z
    .object({
      url: z.string().optional(),
      backgroundColor: z.string().nullable().optional(),
      isDark: z.boolean().optional(),
      dominantColors: z.array(z.string()).optional(),
      fontFamilies: z.array(z.string()).optional(),
      googleFontsUrls: z.array(z.string()).optional(),
      borderRadius: z.string().nullable().optional(),
      detectedFramework: z.string().optional(),
      /** Analyse visuelle multimodale du screenshot (lib/vision-analyzer). */
      visualAnalysis: z
        .object({
          shortSummary: z.string().optional(),
          heroLayout: z.string().optional(),
          heroBackground: z.string().optional(),
          heroVisualPosition: z.string().optional(),
          typography: z.string().optional(),
          buttonStyle: z.string().optional(),
          shadows: z.string().optional(),
          signatureEffects: z.array(z.string()).optional(),
          sectionsBelow: z.array(z.string()).optional(),
          matchedProfile: z.string().optional(),
          reproductionHints: z.array(z.string()).optional(),
          isDark: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
  /** Contexte de refonte : si présent, l'IA s'inspire du contenu original */
  rebuildContext: z
    .object({
      sourceUrl: z.string().url().or(z.literal("")),
      summary: z.string().max(2000).optional(),
      currentIssues: z.array(z.string()).optional(),
      improvements: z.array(z.string()).optional(),
      originalContent: z.string().max(5000).optional(),
    })
    .optional(),
  /** Composition pré-décidée en code (secteur → hero type, sections, designProfile).
      L'IA reçoit cette composition comme SKELETON À REMPLIR au lieu de la choisir. */
  composition: z
    .object({
      sector: z.string(),
      heroType: z.enum(["hero", "hero_split", "hero_slider", "hero_blob"]),
      designProfile: z.string(),
      sections: z.array(z.string()),
    })
    .optional(),
});

export type Brief = z.infer<typeof briefSchema>;

export type GeneratedPage = {
  path: string;        // ex: "index.html", "contact.html"
  title: string;
  metaDescription: string;
  h1: string;
  /** Sections de contenu */
  sections: {
    type: string;
    data: Record<string, unknown>;
  }[];
  schemaJsonld: object[];
  navLabel: string;
};

export type GenerationPlan = {
  pages: GeneratedPage[];
  organizationSchema: object;
  globalKeyword: string;
  styleGuide: {
    primary: string;
    secondary?: string;
    font: string;
    tone: string;
    googleFontsCssImport?: string;
    headingFont?: string;
    bodyFont?: string;
    customCss?: string;
    designProfile?: string;
  };
};
