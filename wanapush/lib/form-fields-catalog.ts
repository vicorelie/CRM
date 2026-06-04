// Catalogue des champs de formulaire insérables dans un <form> existant.
// Distinct de elements-catalog (éléments génériques) et sections-catalog
// (sections complètes). Cible : seulement les contrôles de saisie utilisateur.

export type FormFieldMeta = {
  id: string;
  label: string;
  description: string;
  category: "text" | "selection" | "advanced";
};

export const FORM_FIELD_REGISTRY: FormFieldMeta[] = [
  // ═══════ TEXTE ═══════
  {
    id: "text",
    category: "text",
    label: "Champ texte",
    description: "Saisie libre sur une ligne.",
  },
  {
    id: "email",
    category: "text",
    label: "Email",
    description: "Validation automatique format email.",
  },
  {
    id: "tel",
    category: "text",
    label: "Téléphone",
    description: "Numéro de téléphone (clavier num sur mobile).",
  },
  {
    id: "number",
    category: "text",
    label: "Nombre",
    description: "Valeur numérique (+/- pour ajuster).",
  },
  {
    id: "url",
    category: "text",
    label: "URL",
    description: "Lien web validé.",
  },
  {
    id: "textarea",
    category: "text",
    label: "Zone de texte",
    description: "Message ou texte long sur plusieurs lignes.",
  },

  // ═══════ SÉLECTION ═══════
  {
    id: "select",
    category: "selection",
    label: "Liste déroulante",
    description: "Choix unique parmi plusieurs options.",
  },
  {
    id: "checkbox",
    category: "selection",
    label: "Case à cocher",
    description: "Acceptation, opt-in, condition unique.",
  },
  {
    id: "radio",
    category: "selection",
    label: "Boutons radio",
    description: "Choix exclusif parmi 2-3 options.",
  },

  // ═══════ AVANCÉ ═══════
  {
    id: "date",
    category: "advanced",
    label: "Date",
    description: "Calendrier de sélection.",
  },
  {
    id: "file",
    category: "advanced",
    label: "Fichier",
    description: "Upload de fichier (PDF, image, etc.).",
  },
];

export const FORM_FIELD_CATEGORIES: Array<{ id: FormFieldMeta["category"]; label: string }> = [
  { id: "text", label: "Texte" },
  { id: "selection", label: "Sélection" },
  { id: "advanced", label: "Avancé" },
];
