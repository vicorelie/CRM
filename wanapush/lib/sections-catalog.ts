// Registre centralisé des composants disponibles pour le page builder.
// Chaque entrée décrit un composant du catalogue : son id, son label utilisateur,
// sa catégorie, le schéma de données qu'il accepte (pour que l'IA puisse le remplir),
// et un thumbnail (à venir Phase 2).

export type ComponentCategory = "header" | "section" | "footer" | "nav";

export type ComponentMeta = {
  /** Identifiant interne (correspond au `section.type` côté renderer). */
  id: string;
  /** Catégorie (header/section/footer/nav). */
  category: ComponentCategory;
  /** Nom affiché à l'utilisateur. */
  label: string;
  /** Description courte (1 ligne) — pour l'aide à la sélection. */
  description: string;
  /** Image keywords-friendly ? (l'utilisateur peut uploader une photo qui ira dedans) */
  acceptsPhoto: boolean;
  /** Schéma JSON des données à fournir au composant (pour l'IA). */
  dataShape: string;
  /** Si true, ce composant a besoin d'au moins 2+ items (galerie, features, slider). */
  multiItem: boolean;
  /** Path du thumbnail (Phase 2 — `/wanapush/section-thumbs/{id}.png`). */
  thumb?: string;
};

export const COMPONENT_REGISTRY: ComponentMeta[] = [
  // ═══════ HEADERS (variantes de hero) ═══════
  {
    id: "hero",
    category: "header",
    label: "Hero classique",
    description: "Grand titre centré + sous-titre + 1-2 CTAs + image de fond ou stats. Standard, polyvalent.",
    acceptsPhoto: true,
    multiItem: false,
    dataShape: `{ title, subtitle, ctaText, ctaHref, ctaSecondaryText?, imageKeywords, stats?: [{value, label}] }`,
  },
  {
    id: "hero_split",
    category: "header",
    label: "Hero split 50/50",
    description: "Texte+CTAs à gauche, image/mockup à droite. Style SaaS moderne.",
    acceptsPhoto: true,
    multiItem: false,
    dataShape: `{ title, subtitle, badge?, ctaText, ctaHref, ctaSecondaryText?, ctaSecondaryHref?, imageKeywords }`,
  },
  {
    id: "hero_slider",
    category: "header",
    label: "Hero carousel",
    description: "Carrousel 2-3 slides plein écran avec image de fond, titre, CTA. Idéal restaurant/hôtel/portfolio.",
    acceptsPhoto: true,
    multiItem: true,
    dataShape: `{ autoplay: true, slides: [{title, subtitle, ctaText, ctaHref, imageKeywords}, ...] }`,
  },
  {
    id: "hero_blob",
    category: "header",
    label: "Hero éditorial blob",
    description: "Hero chic avec forme décorative + grand titre UPPERCASE + bouton outline. Mode/lifestyle/agence créative.",
    acceptsPhoto: true,
    multiItem: false,
    dataShape: `{ eyebrow, title, ctaText, ctaHref, imageKeywords }`,
  },

  // ═══════ SECTIONS (corps de page) ═══════
  {
    id: "features",
    category: "section",
    label: "Features grille (3, 6 ou 9 bénéfices)",
    description: "Grille 3 colonnes de cartes bénéfices avec image + titre + description courte. Affiche 3, 6 ou 9 items (multiple de 3 pour rester harmonieux).",
    acceptsPhoto: false,
    multiItem: true,
    dataShape: `{ title, subtitle?, items: [{title, description}, ...] }`,
  },
  {
    id: "service_tiles",
    category: "section",
    label: "Services en cartes hautes (3-4)",
    description: "3-4 offres en grandes cartes avec photo en haut, titre, description et CTA.",
    acceptsPhoto: true,
    multiItem: true,
    dataShape: `{ title, subtitle?, items: [{title, description, imageKeywords, ctaText, ctaHref}, ...] }`,
  },
  {
    id: "highlights",
    category: "section",
    label: "Highlights (alternance photo/texte)",
    description: "2-3 blocs alternés image/texte plein largeur. Style éditorial.",
    acceptsPhoto: true,
    multiItem: true,
    dataShape: `{ items: [{title, description, imageKeywords}, ...] }`,
  },
  {
    id: "circles",
    category: "section",
    label: "Catégories en ronds (3-4)",
    description: "3-4 ronds avec photo + nom de catégorie en dessous. Style minimaliste e-commerce.",
    acceptsPhoto: true,
    multiItem: true,
    dataShape: `{ title, items: [{label, imageKeywords}, ...] }`,
  },
  {
    id: "services_grid",
    category: "section",
    label: "Services grille (3 colonnes)",
    description: "3 cards horizontales avec image + titre + description.",
    acceptsPhoto: true,
    multiItem: true,
    dataShape: `{ title, subtitle?, items: [{title, description, imageKeywords}, ...] }`,
  },
  {
    id: "features_phone",
    category: "section",
    label: "Features autour d'un mockup mobile",
    description: "Mockup smartphone central avec 4-6 features autour. Idéal apps mobiles.",
    acceptsPhoto: true,
    multiItem: true,
    dataShape: `{ title, subtitle?, imageKeywords, items: [{title, description}, ...] }`,
  },
  {
    id: "feature_split",
    category: "section",
    label: "Features texte+mockup côte à côte alterné",
    description: "2-3 blocs larges avec texte d'un côté et mockup/code/image de l'autre, alterné. Style Stripe/Linear.",
    acceptsPhoto: true,
    multiItem: true,
    dataShape: `{ blocks: [{eyebrow?, title, description, bullets?[], imageKeywords?, codeSnippet?}, ...] }`,
  },
  {
    id: "stats",
    category: "section",
    label: "Statistiques chiffrées",
    description: "4 chiffres clés avec label. Pour rassurer (X clients, Y années, Z projets).",
    acceptsPhoto: false,
    multiItem: true,
    dataShape: `{ title?, items: [{value, label}, ...] }`,
  },
  {
    id: "process",
    category: "section",
    label: "Process avec photo + étapes",
    description: "Photo sticky à gauche + étapes numérotées (01-05) à droite. Style méthode/onboarding moderne.",
    acceptsPhoto: true,
    multiItem: true,
    dataShape: `{ title, subtitle?, imageKeywords, steps: [{title, desc}, ...] }`,
  },
  {
    id: "about",
    category: "section",
    label: "À propos (texte + photo)",
    description: "Bloc 'qui sommes-nous' avec photo et paragraphes.",
    acceptsPhoto: true,
    multiItem: false,
    dataShape: `{ title, paragraphs: string[], imageKeywords }`,
  },
  {
    id: "about_cards",
    category: "section",
    label: "À propos avec mini-cards (3-4 valeurs)",
    description: "Bloc à propos + 3-4 petites cartes valeurs/expertises en dessous.",
    acceptsPhoto: true,
    multiItem: true,
    dataShape: `{ title, paragraphs: string[], imageKeywords, cards: [{title, description}, ...] }`,
  },
  {
    id: "gallery",
    category: "section",
    label: "Galerie photos",
    description: "Grille 3×3 de 9 photos. Pour portfolio/restaurant/voyage.",
    acceptsPhoto: true,
    multiItem: true,
    dataShape: `{ title, imageKeywords: string[9] }`,
  },
  {
    id: "video",
    category: "section",
    label: "Vidéo embed",
    description: "Bloc vidéo YouTube/Vimeo embed avec poster d'aperçu.",
    acceptsPhoto: true,
    multiItem: false,
    dataShape: `{ title, subtitle?, videoUrl, posterKeywords }`,
  },
  {
    id: "promo_split",
    category: "section",
    label: "Promo split avec image",
    description: "Bloc promotion : photo grande à gauche + texte+highlight+CTA à droite.",
    acceptsPhoto: true,
    multiItem: false,
    dataShape: `{ title, description, highlight, extraDescription?, buttons: [{text, href}, ...], imageKeywords }`,
  },
  {
    id: "logos_bar",
    category: "section",
    label: "Bandeau logos clients",
    description: "Bandeau noms de clients/marques en typo épurée. Style 'ils nous font confiance'.",
    acceptsPhoto: false,
    multiItem: true,
    dataShape: `{ title?, logos: [{name}, ...] }`,
  },
  {
    id: "testimonials",
    category: "section",
    label: "Témoignages clients",
    description: "3 avis clients en carrousel ou grille. ⚠️ Génération limitée (IA n'invente pas de faux clients).",
    acceptsPhoto: false,
    multiItem: true,
    dataShape: `{ title, items: [{quote, author, role}, ...] }`,
  },
  {
    id: "pricing",
    category: "section",
    label: "Grille de tarifs",
    description: "2-3 plans tarifaires côte à côte avec features. ⚠️ Prix à fournir.",
    acceptsPhoto: false,
    multiItem: true,
    dataShape: `{ title, plans: [{name, price, features, ctaText, ctaHref}, ...] }`,
  },
  {
    id: "faq",
    category: "section",
    label: "FAQ accordéon",
    description: "Liste de questions/réponses dépliables.",
    acceptsPhoto: false,
    multiItem: true,
    dataShape: `{ title, items: [{q, a}, ...] }`,
  },
  {
    id: "cta",
    category: "section",
    label: "Call-to-action final",
    description: "Grand bandeau CTA en fin de page : titre + sous-titre + bouton + texte secondaire.",
    acceptsPhoto: false,
    multiItem: false,
    dataShape: `{ title, subtitle?, buttonText, buttonHref, secondaryText? }`,
  },
  {
    id: "contact",
    category: "section",
    label: "Bloc contact + formulaire",
    description: "Coordonnées (email/tel/adresse) + formulaire de contact. À mettre en bas systématiquement.",
    acceptsPhoto: false,
    multiItem: false,
    dataShape: `{ title, subtitle?, email, phone?, address?, hours?, trustItems?, showForm, formTitle, formSubmitText, formFields }`,
  },

  // ═══════ SHOP / E-COMMERCE ═══════
  {
    id: "shop_grid",
    category: "section",
    label: "Boutique · Grille de produits",
    description: "Grille des produits ACTIFS de ta boutique (3 ou 4 colonnes, jusqu'à 12). Live depuis l'API.",
    acceptsPhoto: false,
    multiItem: true,
    dataShape: `{ title?, subtitle?, limit?, columns?, category? }`,
  },
  {
    id: "shop_featured",
    category: "section",
    label: "Boutique · Coups de cœur",
    description: "Affiche uniquement les produits marqués 'featured' (jusqu'à 6 en avant).",
    acceptsPhoto: false,
    multiItem: true,
    dataShape: `{ title?, subtitle?, limit? }`,
  },
  {
    id: "shop_categories",
    category: "section",
    label: "Boutique · Catégories en grille",
    description: "Vignettes de toutes les catégories de la boutique. Clic = filtre par catégorie.",
    acceptsPhoto: true,
    multiItem: true,
    dataShape: `{ title?, subtitle? }`,
  },
  {
    id: "shop_browse",
    category: "section",
    label: "Boutique · Navigation complète",
    description: "Page boutique avec filtres latéraux (catégories, prix), tri et grille produits. Idéal pour /boutique.",
    acceptsPhoto: false,
    multiItem: true,
    dataShape: `{ title?, subtitle? }`,
  },
];

// ═══════ HELPERS ═══════

export function getByCategory(cat: ComponentCategory): ComponentMeta[] {
  return COMPONENT_REGISTRY.filter((c) => c.category === cat);
}

export function getById(id: string): ComponentMeta | null {
  return COMPONENT_REGISTRY.find((c) => c.id === id) ?? null;
}

/** Valide qu'une composition est correcte (header obligatoire, contact obligatoire, etc.) */
export function validateComposition(comp: {
  header?: string;
  sections: string[];
  footer?: string;
}): { ok: true } | { ok: false; reason: string } {
  if (!comp.header) return { ok: false, reason: "Header (variante de hero) obligatoire" };
  const headerMeta = getById(comp.header);
  if (!headerMeta || headerMeta.category !== "header") {
    return { ok: false, reason: `Header inconnu: ${comp.header}` };
  }
  if (!comp.sections.length) {
    return { ok: false, reason: "Au moins une section requise" };
  }
  for (const s of comp.sections) {
    const meta = getById(s);
    if (!meta) return { ok: false, reason: `Section inconnue: ${s}` };
    if (meta.category !== "section") {
      return { ok: false, reason: `${s} n'est pas une section (catégorie: ${meta.category})` };
    }
  }
  return { ok: true };
}
