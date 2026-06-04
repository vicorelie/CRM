// Catalogue des éléments individuels insérables via le picker WYSIWYG.
// Pendant que sections-catalog.ts gère les blocs complets (sections), celui-ci
// gère les briques de base : titre, paragraphe, image, bouton, etc.
//
// Source de vérité unique : ajouter ici → apparait dans le picker du site-editor
// avec sa miniature (ElementThumb.tsx) et son HTML (element-insert-templates.ts).

export type ElementMeta = {
  /** Identifiant interne, utilisé pour le routing thumb + template. */
  id: string;
  /** Nom affiché à l'utilisateur. */
  label: string;
  /** Description courte (1 ligne) — pour l'aide à la sélection. */
  description: string;
  /** Catégorie pour grouper visuellement dans le picker. */
  category: "text" | "media" | "interactive" | "layout";
};

export const ELEMENT_REGISTRY: ElementMeta[] = [
  // ═══════ TEXTE ═══════
  {
    id: "h2",
    category: "text",
    label: "Titre H2",
    description: "Gros titre de section.",
  },
  {
    id: "h3",
    category: "text",
    label: "Sous-titre H3",
    description: "Titre intermédiaire.",
  },
  {
    id: "paragraph",
    category: "text",
    label: "Paragraphe",
    description: "Bloc de texte courant.",
  },
  {
    id: "lead",
    category: "text",
    label: "Texte d'introduction",
    description: "Paragraphe plus grand pour intro de section.",
  },
  {
    id: "bullets",
    category: "text",
    label: "Liste à puces",
    description: "Liste de points clés (3 éléments par défaut).",
  },
  {
    id: "quote",
    category: "text",
    label: "Citation",
    description: "Bloc de citation avec barre verticale.",
  },

  // ═══════ MEDIA ═══════
  {
    id: "image",
    category: "media",
    label: "Image",
    description: "Image pleine largeur, remplaçable.",
  },
  {
    id: "image_caption",
    category: "media",
    label: "Image + légende",
    description: "Image avec une légende centrée en dessous.",
  },
  {
    id: "video",
    category: "media",
    label: "Vidéo (poster)",
    description: "Bloc vidéo avec poster cliquable.",
  },

  // ═══════ INTERACTIF ═══════
  {
    id: "button",
    category: "interactive",
    label: "Bouton",
    description: "CTA cliquable plein.",
  },
  {
    id: "button_outline",
    category: "interactive",
    label: "Bouton outline",
    description: "CTA cliquable avec bordure.",
  },
  {
    id: "buttons_pair",
    category: "interactive",
    label: "Double CTA",
    description: "Deux boutons côte à côte (plein + outline).",
  },

  // ═══════ LAYOUT ═══════
  {
    id: "divider",
    category: "layout",
    label: "Séparateur",
    description: "Trait horizontal fin.",
  },
  {
    id: "spacer",
    category: "layout",
    label: "Espacement",
    description: "Bloc vide pour aérer.",
  },
  {
    id: "two_columns",
    category: "layout",
    label: "2 colonnes texte",
    description: "Deux blocs de texte côte à côte.",
  },
];

export const ELEMENT_CATEGORIES: Array<{ id: ElementMeta["category"]; label: string }> = [
  { id: "text", label: "Texte" },
  { id: "media", label: "Média" },
  { id: "interactive", label: "Interactif" },
  { id: "layout", label: "Mise en page" },
];
