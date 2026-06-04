// Détection du secteur d'activité à partir du prompt utilisateur.
// Utilisé pour pré-décider la composition du site (hero type, sections, designProfile)
// au lieu de laisser l'IA méta-décider — elle suit mal ce genre d'instructions.

export type Sector =
  | "artisan_urgence"
  | "creatif_visuel"
  | "agence_creative"
  | "tech_saas"
  | "restaurant_hotel"
  | "sante_bienetre"
  | "ecommerce"
  | "service_pro"
  | "generic";

type Rule = { sector: Sector; keywords: string[] };

// Règles ordonnées par spécificité (plus spécifique en premier)
const RULES: Rule[] = [
  {
    sector: "artisan_urgence",
    keywords: [
      "plombier", "plomberie", "serrurier", "serrurerie", "électricien", "electricien",
      "chauffagiste", "climatisation", "dépannage", "depannage", "urgence", "fuite",
      "canalisation", "vitrier", "déménagement urgent", "couvreur", "ramoneur",
    ],
  },
  {
    sector: "creatif_visuel",
    keywords: [
      "photographe", "photographie", "vidéaste", "videaste", "vidéo de mariage",
      "shooting", "portrait", "reportage photo", "graphiste", "illustrateur",
      "directeur artistique", "cinéaste", "cineaste", "studio photo",
    ],
  },
  {
    sector: "agence_creative",
    keywords: [
      "agence", "communication", "branding", "identité visuelle", "studio créatif",
      "marketing digital", "agence web", "agence seo", "consulting marketing",
      "stratégie de marque", "design studio",
    ],
  },
  {
    sector: "tech_saas",
    keywords: [
      "saas", "logiciel", "application web", "app mobile", "plateforme",
      "dashboard", "api", "outil tech", "produit tech", "startup tech",
      "automation", "ia", "machine learning", "no-code",
    ],
  },
  {
    sector: "restaurant_hotel",
    keywords: [
      "restaurant", "brasserie", "bistrot", "hôtel", "hotel", "chambres d'hôtes",
      "chambres d hotes", "gîte", "gite", "auberge", "café", "cafe", "bar à",
      "pizzeria", "boulangerie", "pâtisserie", "patisserie", "traiteur",
    ],
  },
  {
    sector: "sante_bienetre",
    keywords: [
      "yoga", "pilates", "méditation", "meditation", "naturopathe", "ostéopathe",
      "osteopathe", "kinésithérapeute", "kine", "coach sportif", "fitness",
      "salle de sport", "bien-être", "bien etre", "massage", "spa", "sophrologue",
      "psychologue", "thérapeute", "therapeute", "diététicien", "dieteticien",
    ],
  },
  {
    sector: "ecommerce",
    keywords: [
      "boutique en ligne", "e-commerce", "ecommerce", "vente en ligne",
      "vente de produits", "magasin", "shop", "store", "marketplace",
      "vente directe", "produits artisanaux",
    ],
  },
  {
    sector: "service_pro",
    keywords: [
      "avocat", "expert-comptable", "expert comptable", "comptable", "consultant",
      "conseil aux entreprises", "formation professionnelle", "coaching pro",
      "immobilier", "agent immobilier", "notaire", "huissier",
      "courtier", "assurance",
    ],
  },
];

/**
 * Détecte le secteur principal à partir du prompt utilisateur.
 * Retourne "generic" si rien ne match clairement.
 */
export function detectSector(userPrompt: string): Sector {
  const normalized = userPrompt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // strip accents

  // Compte les matches par secteur
  const scores: Record<string, number> = {};
  for (const rule of RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      const k = kw.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      // Recherche le mot-clé avec word boundaries pour éviter les faux positifs
      const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`\\b${escaped}\\b`, "i");
      if (re.test(normalized)) score++;
    }
    if (score > 0) scores[rule.sector] = score;
  }

  // Retourne le secteur avec le plus de matches
  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
  if (sorted.length === 0) return "generic";
  return sorted[0][0] as Sector;
}
