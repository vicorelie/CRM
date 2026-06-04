// Types partagés entre tous les connecteurs CMS.

export type ConnectorTestResult = {
  ok: boolean;
  /** Capacités détectées sur le site */
  capabilities?: {
    canEditPages: boolean;
    canEditPosts: boolean;
    canEditMeta: boolean;
    canUpdateImageAlt: boolean;
    seoPlugin: "wanapush" | "yoast" | "rankmath" | "aioseo" | "none" | "unknown";
    restApiVersion?: string;
  };
  /** Métadonnées utiles pour l'audit (nom du site, nb de pages, etc.) */
  info?: {
    name?: string;
    description?: string;
    homeUrl?: string;
    pagesCount?: number;
  };
  error?: string;
};

export type Page = {
  id: number | string;
  type: "page" | "post";
  title: string;
  slug: string;
  url: string;
  metaDescription: string | null;
};

/** Les "fixes" qu'un connecteur sait appliquer */
export type FixId =
  | "update-title"
  | "update-meta-description"
  | "add-canonical"
  | "add-og-tags"
  | "fix-image-alts"
  | "fix-h1"
  | "add-schema-article"
  | "add-schema-faq"
  | "enrich-content"
  | "rewrite-content"
  | "regenerate-content";

export const FIX_LABELS: Record<FixId, string> = {
  "update-title": "Optimiser le title SEO",
  "update-meta-description": "Ajouter / corriger la meta description",
  "add-canonical": "Ajouter une balise canonical",
  "add-og-tags": "Compléter les Open Graph (partage social)",
  "fix-image-alts": "Ajouter les attributs alt aux images",
  "fix-h1": "Ajouter / corriger le H1",
  "add-schema-article": "Ajouter schema.org Article (AI Overviews)",
  "add-schema-faq": "Ajouter schema.org FAQPage (rich snippets)",
  "enrich-content": "Enrichir le contenu (paragraphes additionnels)",
  "rewrite-content": "Réécrire les paragraphes existants",
  "regenerate-content": "Régénérer la page (nouveau contenu, design préservé)",
};

export type FixPayload = {
  fixId: FixId;
  pageId: number | string;
  /** Données spécifiques au fix (nouveau title, etc.) */
  data: Record<string, unknown>;
};

export type FixResult = {
  ok: boolean;
  message: string;
  /** URL/lien pour vérifier le changement */
  verifyUrl?: string;
};
