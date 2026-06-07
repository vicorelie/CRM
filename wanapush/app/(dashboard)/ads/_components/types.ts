import type { AdPlatform, CampaignObjective, CampaignStatus } from "../types";

export type Totals = {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
};

export type CampaignRich = {
  id: string;
  name: string;
  type: AdPlatform;
  status: CampaignStatus;
  budget: number | null;
  dailyBudget: number | null;
  externalId: string | null;
  objective: string | null;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
  results: unknown;
  adAccount: { id: string; name: string | null; currency: string | null } | null;
  totals: Totals;
  ctr: number | null;
  cpc: number | null;
  cpa: number | null;
  roas: number | null;
};

export type GeoTarget = {
  /** Type Meta : country, region, city, zip, custom (custom_locations) */
  type: "country" | "region" | "city" | "zip" | "custom";
  /** Clé Meta pour country/region/city/zip — non utilisé pour custom */
  key: string;
  /** Nom affiché en chip */
  label: string;
  /** Rayon km — uniquement pour city + custom */
  radius?: number;
  /** Coordonnées — uniquement pour custom */
  latitude?: number;
  longitude?: number;
};

export type GeoLocationsPayload = {
  countries?: string[];
  regions?: Array<{ key: string }>;
  cities?: Array<{ key: string; radius?: number; distance_unit?: "kilometer" }>;
  zips?: Array<{ key: string }>;
  custom_locations?: Array<{
    latitude: number;
    longitude: number;
    radius: number;
    distance_unit: "kilometer";
    name?: string;
  }>;
};

export type DestinationMode = "wanapush_site" | "external_with_pixel" | "external_install";

export type WanapushSiteOption = {
  siteId: string;
  slug: string;
  url: string;
  type: string | null;
  sector: string | null;
  pixelId: string | null;
  pixelName: string | null;
  pixelEnabled: boolean;
  events: string[];
};

export type AvailablePixel = { id: string; name: string };

export type WizardMode = "create" | "edit_and_push";

export type AdAccountChoice = {
  id: string;
  name: string;
  platform: AdPlatform;
  currency: string | null;
};

export type PushModalState = {
  /** "create" : pas de campagne existante. "edit_and_push" : pousse une DRAFT existante. */
  mode: WizardMode;
  /** Brief (mode create uniquement, mais sections visibles en edit aussi) */
  briefName: string;
  briefPlatform: AdPlatform;
  briefAdAccountId: string;
  briefAvailableAdAccounts: AdAccountChoice[];
  briefProduct: string;
  briefAudience: string;
  briefTone: "DIRECT" | "PREMIUM" | "FRIENDLY" | "URGENT" | "STORYTELLING";
  briefTotalBudget: string;
  expandBrief: boolean;
  /** En mode "create" jusqu'à sauvegarde, on a une campagne fantôme avec adAccount résolu. */
  campaign: CampaignRich;
  objective: CampaignObjective;
  finalUrl: string;
  dailyBudget: string;
  // Destination
  destinationMode: DestinationMode;
  wanapushSites: WanapushSiteOption[];
  availablePixels: AvailablePixel[];
  selectedSiteId: string | null;
  externalUrl: string;
  externalPixelId: string;
  pixelVerifyResult: { ok: boolean; found: boolean; hint?: string; error?: string } | null;
  // Texte de l'annonce
  primaryText: string;
  headline: string;
  description: string;
  cta: string;
  /** Variantes A/B/C générées par le builder (si dispo) — sélecteur radio */
  variants: Array<{
    angle?: string;
    primary_text?: string;
    headline?: string;
    description?: string;
    cta?: string;
  }>;
  /** Index de la variante actuellement sélectionnée */
  selectedVariantIndex: number;
  // Ciblage
  geoTargets: GeoTarget[];
  geoQuery: string;
  geoSuggestions: Array<{ key: string; name: string; type: string; country_code?: string }>;
  ageMin: string;
  ageMax: string;
  genders: Array<1 | 2>;
  // Instagram
  instagramActorId: string;
  // Advantage+
  advantageAudience: boolean;
  advantageCreative: boolean;
  multiAdvertiserAds: boolean;
  // Image
  imageMode: "upload" | "ai" | "url";
  aiBrief: string;
  urlInput: string;
  imageUrl: string | null;
  // UI state
  busyAction:
    | "uploading"
    | "generating"
    | "pushing"
    | "geo-searching"
    | "auto-configuring"
    | "fetching-pixel"
    | "verifying-pixel"
    | "loading-destinations"
    | null;
  error: string | null;
  successUrl: string | null;
  aiRationale: string | null;
  /** Pixels détectés sur le AdAccount (fetché à l'ouverture pour LEADS/SALES) */
  detectedPixel: { id: string; name: string } | null;
  // Sections collapsibles
  expandText: boolean;
  expandTargeting: boolean;
  expandAdvanced: boolean;
  /** Section "Smart Bidding & Tracking" Google Ads — affichée uniquement si
   * platform === GOOGLE_ADS. */
  expandGoogle: boolean;
  // ─── Google Ads spécifiques ──────────────────────────────────────────
  /** Mots-clés négatifs (Search) — un par ligne dans le textarea, parsé
   * lors du push. Anti-gaspillage budget : "gratuit", "emploi", "tutoriel"
   * si on vend un service payant. */
  negativeKeywordsText: string;
  /** Sélection d'une ConversionAction Google Ads pour selectiveOptimization.
   * Sans ça, smart bidding optimise sur le pool global du compte (moins
   * prédictif si plusieurs goals coexistent). */
  selectedConversionActionId: string | null;
  /** Cache des conversions disponibles (chargées au passage en
   * TARGET_CPA / TARGET_ROAS — exigent du tracking pour fonctionner). */
  availableConversionActions: Array<{ id: string; name: string; category: string; status: string }>;
  /** Si true et variants.length >= 2 : pousse 1 AdSet par variante sous la même Campaign CBO (A/B test). */
  pushAllVariants: boolean;
};
