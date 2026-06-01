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
  /** Codes pays ISO ciblés (ex: ["FR", "BE"]) */
  countries?: string[];
  /** Mots-clés pour Search/Display */
  keywords?: Array<{ text: string; matchType: "BROAD" | "PHRASE" | "EXACT" }>;
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
