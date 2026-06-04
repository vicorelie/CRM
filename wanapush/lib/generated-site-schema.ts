// Schémas Zod pour les champs Json du modèle Prisma `GeneratedSite`.
// Audit 2026-06 (Sprint 3 / item 6) : remplace les casts `as SiteBrief / as SiteMeta`
// par un parse runtime. Le `.passthrough()` est volontaire : on accepte que d'autres
// champs métier soient présents (formulaires de génération, A/B, etc.) — on valide
// uniquement ceux que le code consomme. Les fields sont tous optionnels parce que
// d'anciens enregistrements ne les avaient pas tous.

import { z } from "zod";

export const SiteBriefSchema = z
  .object({
    brandName: z.string().optional(),
    sector: z.string().optional(),
    type: z.string().optional(),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    framework: z.string().optional(),
  })
  .passthrough();

export const SiteMetaSchema = z
  .object({
    framework: z.string().optional(),
    reactFiles: z.record(z.string(), z.string()).optional(),
    designProfile: z.string().optional(),
    siteSlug: z.string().nullish(),
    previewUrl: z.string().nullish(),
  })
  .passthrough();

export type SiteBrief = z.infer<typeof SiteBriefSchema>;
export type SiteMeta = z.infer<typeof SiteMetaSchema>;

// Parse safe : si le Json en BDD est corrompu (ce qui ne devrait pas arriver vu
// qu'on contrôle l'écriture), on renvoie un objet vide plutôt que de crasher la
// route — l'appelant traite déjà tous les champs comme optionnels.
export function parseSiteBrief(value: unknown): SiteBrief {
  const result = SiteBriefSchema.safeParse(value ?? {});
  return result.success ? result.data : {};
}

export function parseSiteMeta(value: unknown): SiteMeta {
  const result = SiteMetaSchema.safeParse(value ?? {});
  return result.success ? result.data : {};
}
