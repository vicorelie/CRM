// Types partagés des connecteurs Ad Manager.
import type { AdPlatform } from "@prisma/client";

export type AdAccountInfo = {
  externalId: string;     // act_xxx (Meta), customers/123 (Google), advertiser_id (TikTok), urn:li:sponsoredAccount:x (LinkedIn)
  name?: string;
  currency?: string;
  timezone?: string;
  /** Tokens à stocker (chiffrés en amont via lib/crypto). */
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  scopes?: string;
  meta?: Record<string, unknown>;
};

export type CampaignSync = {
  externalId: string;
  name: string;
  objective?: string;
  status?: string;        // ACTIVE, PAUSED, ARCHIVED…
  dailyBudget?: number;   // en devise du compte
  lifetimeBudget?: number;
  startDate?: Date;
  endDate?: Date;
};

export type DailyMetrics = {
  date: Date;             // 00:00 UTC
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  raw?: Record<string, unknown>;
};

/** Données nécessaires pour CRÉER une campagne sur la plateforme */
export type PushCampaignInput = {
  name: string;
  /** Budget journalier en devise du compte (EUR, USD, etc.) */
  dailyBudget: number;
  /** Type / canal de campagne — interprété par chaque connecteur */
  campaignType?: string;
  /** Stratégie d'enchères — interprétée par chaque connecteur */
  biddingStrategy?: string;
  /** Stratégie cible (CPA en € ou ROAS en %) */
  biddingTarget?: number;
  /** URL de destination des annonces */
  finalUrl?: string;
  /** Codes pays ISO ciblés (ex: ["FR", "BE"]) — legacy, équivalent à geoLocations.countries */
  countries?: string[];
  /** Ciblage géographique complet Meta (cities/regions/zips/custom_locations + radius). Si fourni, prime sur `countries`. */
  geoLocations?: {
    countries?: string[];
    regions?: Array<{ key: string }>;
    cities?: Array<{
      key: string;
      radius?: number;
      distance_unit?: "kilometer" | "mile";
    }>;
    zips?: Array<{ key: string }>;
    custom_locations?: Array<{
      latitude: number;
      longitude: number;
      radius: number;
      distance_unit?: "kilometer" | "mile";
      name?: string;
    }>;
  };
  /** Mots-clés pour Search/Display */
  keywords?: Array<{ text: string; matchType: "BROAD" | "PHRASE" | "EXACT" }>;
  /** Mots-clés à exclure (negative keywords) — Search uniquement. Anti-gaspillage
   * budget : "gratuit", "emploi", "tutoriel" si on vend du service payant. */
  negativeKeywords?: Array<{ text: string; matchType: "BROAD" | "PHRASE" | "EXACT" }>;
  /** Sitelinks (Google Asset Extensions) — 4-6 recommandés. Affichés sous l'annonce
   * Search, +10-20% CTR typique. linkText max 25 chars, descriptions max 35 chars. */
  sitelinks?: Array<{
    linkText: string;
    finalUrl: string;
    description1?: string;
    description2?: string;
  }>;
  /** Callouts (Google Asset Extensions) — 4-10 phrases courtes (max 25 chars chacune).
   * Ex: "Livraison gratuite", "Devis 24h", "10 ans d'expertise". */
  callouts?: string[];
  /** Structured snippets (Google) — listes structurées sous l'annonce.
   * Headers parmi : "Services", "Brands", "Types", "Models", "Featured hotels"…
   * 3-10 values max. */
  structuredSnippets?: Array<{ header: string; values: string[] }>;
  /** ID(s) de ConversionAction(s) à lier à la campagne — débloque smart bidding.
   * Sans ça, TARGET_CPA et TARGET_ROAS ne peuvent pas fonctionner. */
  conversionActionIds?: string[];
  /** Headlines (3-15 pour Google RSA, 1-5 pour Meta) */
  headlines?: string[];
  /** Descriptions (2-4 pour Google RSA, 1 pour Meta) */
  descriptions?: string[];
  /** Texte principal (Meta primary_text, LinkedIn intro_text) */
  primaryText?: string;
  /** Bouton CTA */
  cta?: string;
  /** Audience description (Meta) — utilisée pour audience saved future */
  audienceDescription?: string;
  /** URL publique de l'image creative (Meta télécharge depuis là si fourni) */
  imageUrl?: string;
  /** DSA — nom du bénéficiaire (Meta UE, requis depuis juillet 2023). Fallback : nom du AdAccount. */
  dsaBeneficiary?: string;
  /** DSA — nom du payeur (Meta UE, requis depuis juillet 2023). Fallback : dsaBeneficiary. */
  dsaPayor?: string;
  /** Âge min ciblé (défaut 18). */
  ageMin?: number;
  /** Âge max ciblé (défaut 65). */
  ageMax?: number;
  /** Genres ciblés Meta : 1=male, 2=female. Si vide → tous. */
  genders?: Array<1 | 2>;
  /** Instagram actor_id (Meta) — pour ads cross-platform FB+IG. Auto-détecté si non fourni. */
  instagramActorId?: string;
  /** Toggle Advantage+ Audience (défaut true, best practice 2026). */
  advantageAudience?: boolean;
  /** Toggle Advantage+ Creative (défaut true, +14% CPR). */
  advantageCreative?: boolean;
  /** Toggle Multi-advertiser ads (défaut true, scale 2026). */
  multiAdvertiserAds?: boolean;
  /** Pixel Meta explicite — prend le pas sur l'auto-detect (utilisé pour Mode A/B/C destination). */
  pixelId?: string;
};

export type PushCampaignResult = {
  ok: boolean;
  externalId?: string;
  /** Lien vers la campagne dans l'Ad Manager natif */
  externalUrl?: string;
  /** Sous-objets créés (budget, adgroup, ad…) — utile pour le rollback */
  resources?: Record<string, string>;
  error?: string;
};

// ─── Conversion tracking ────────────────────────────────────────────────
// Spec Google Ads ConversionAction. Mappable côté Meta vers Pixel custom events
// + CAPI. Pour l'instant supporté uniquement par Google côté push (Meta a son
// propre flow CAPI via lib/capi).

/** Catégorie business d'une conversion — détermine la valeur stratégique côté
 * smart bidding (PURCHASE > LEAD > PAGE_VIEW). */
export type ConversionCategory =
  | "PURCHASE"             // Achat e-commerce
  | "LEAD"                 // Formulaire / appel / contact
  | "SIGN_UP"              // Inscription / newsletter
  | "BOOK_APPOINTMENT"     // RDV / réservation
  | "REQUEST_QUOTE"        // Demande de devis
  | "GET_DIRECTIONS"       // Itinéraire vers point de vente
  | "OUTBOUND_CLICK"       // Clic sortant (affiliation)
  | "CONTACT"              // Clic email / téléphone
  | "PAGE_VIEW"            // Vue de page clé (download brochure, etc.)
  | "DEFAULT";             // Catch-all

export type ConversionActionInput = {
  /** Nom interne (affiché dans Google Ads UI + WanaPush) */
  name: string;
  /** Catégorie business — pondère le smart bidding */
  category: ConversionCategory;
  /** Valeur monétaire par défaut. Si vide, la conversion compte sans valeur
   * (ne marche pas pour TARGET_ROAS — il faut une valeur). */
  defaultValue?: number;
  /** Devise (sinon devise du compte) */
  defaultCurrencyCode?: string;
  /** Toujours utiliser la valeur par défaut ? Sinon, on lit la valeur envoyée
   * dans le gtag('event', ...) — recommandé pour e-commerce avec paniers
   * variables. */
  alwaysUseDefaultValue?: boolean;
  /** Fenêtre d'attribution clic (1-90 jours, défaut 30) */
  clickThroughLookbackWindowDays?: number;
  /** Fenêtre d'attribution view (1-30 jours, défaut 1) */
  viewThroughLookbackWindowDays?: number;
};

export type ConversionAction = {
  /** ID interne Google Ads (utilisable dans conversionActionIds) */
  id: string;
  /** Resource name complet : customers/123/conversionActions/456 */
  resourceName: string;
  name: string;
  category: string;
  type: string;
  status: string;
  /** Tag à coller sur le site du client (global_site_tag) — chargé une fois
   * dans <head>. Retourné par getConversionAction(). */
  globalSiteTag?: string;
  /** Event snippet — collé sur la page de remerciement / confirmation. */
  eventSnippet?: string;
  /** Nombre de conversions enregistrées (pour status display). */
  conversionCount?: number;
  /** Dernière conversion reçue (pour debug "ça track ou pas ?"). */
  lastConversionAt?: Date;
};

/** Contrat minimal d'un connecteur Ad Manager */
export type AdsConnector = {
  platform: AdPlatform;
  /** OAuth — étape 1 : URL d'autorisation */
  authorizeUrl(state: string, redirectUri: string): string;
  /** OAuth — étape 2 : échange du code contre 1..N comptes pub */
  exchangeCode(code: string, redirectUri: string): Promise<AdAccountInfo[]>;
  /** Refresh token si la plateforme le supporte */
  refreshToken?(account: AdAccountInfo): Promise<AdAccountInfo>;
  /** Liste les campagnes du compte */
  listCampaigns(account: AdAccountInfo): Promise<CampaignSync[]>;
  /** Pull les KPIs quotidiens d'une campagne sur la fenêtre [since, until] */
  fetchMetrics(
    account: AdAccountInfo,
    campaignExternalId: string,
    since: Date,
    until: Date,
  ): Promise<DailyMetrics[]>;
  /** CRÉE une campagne réelle sur la plateforme (status=PAUSED par sécurité) */
  pushCampaign?(
    account: AdAccountInfo,
    input: PushCampaignInput,
  ): Promise<PushCampaignResult>;
  /** Crée une ConversionAction + retourne son ID + son snippet à coller. */
  createConversionAction?(
    account: AdAccountInfo,
    input: ConversionActionInput,
  ): Promise<ConversionAction>;
  /** Liste les ConversionActions du compte (pour wizard "lier au smart bidding") */
  listConversionActions?(account: AdAccountInfo): Promise<ConversionAction[]>;
  /** Récupère le snippet d'une ConversionAction existante. */
  getConversionAction?(
    account: AdAccountInfo,
    id: string,
  ): Promise<ConversionAction | null>;
};

export const PLATFORM_LABEL: Record<AdPlatform, string> = {
  META_ADS: "Meta Ads",
  GOOGLE_ADS: "Google Ads",
  TIKTOK_ADS: "TikTok Ads",
  LINKEDIN_ADS: "LinkedIn Ads",
};

// Limites de caractères des copies par plateforme — usées par le builder pour les
// compteurs visuels et la validation côté UI.
export const COPY_LIMITS: Record<
  AdPlatform,
  Record<string, { soft: number; hard: number }>
> = {
  META_ADS: {
    primary_text: { soft: 90, hard: 125 },
    headline: { soft: 27, hard: 40 },
    description: { soft: 27, hard: 30 },
    cta: { soft: 15, hard: 20 },
  },
  GOOGLE_ADS: {
    headlines: { soft: 30, hard: 30 },
    descriptions: { soft: 90, hard: 90 },
    display_path: { soft: 15, hard: 15 },
  },
  TIKTOK_ADS: {
    hook: { soft: 50, hard: 100 },
    text: { soft: 80, hard: 100 },
    cta: { soft: 15, hard: 20 },
  },
  LINKEDIN_ADS: {
    intro_text: { soft: 150, hard: 600 },
    headline: { soft: 50, hard: 70 },
    description: { soft: 70, hard: 100 },
    cta: { soft: 15, hard: 20 },
  },
};
