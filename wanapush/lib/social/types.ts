// Types partagés des connecteurs réseaux sociaux.
import type { Platform } from "@prisma/client";

export type Media = {
  url: string;
  type: "image" | "video";
  alt?: string;
};

export type PublishInput = {
  caption: string;
  media: Media[];
  options?: {
    firstComment?: string;
    location?: string;
    /** Titre vidéo (YouTube) */
    title?: string;
    /** Privacy spécifique plateforme */
    privacy?: "public" | "unlisted" | "private";
    /** Hashtags additionnels (concaténés à la caption si la plateforme ne gère pas séparément) */
    hashtags?: string[];
  };
};

export type PublishResult = {
  ok: boolean;
  externalId?: string;
  externalUrl?: string;
  error?: string;
};

export type Metrics = {
  impressions?: number;
  reach?: number;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  watchTimeSec?: number;
  ctr?: number;
  followers?: number;
  raw?: Record<string, unknown>;
};

export type ConnectorAccount = {
  /** ID externe stable (page id, channel id, urn, etc.) */
  accountId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  /** Tokens à stocker (chiffrés en amont) */
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  scopes?: string;
  meta?: Record<string, unknown>;
};

/** Contrat minimal d'un connecteur réseau social */
export type SocialConnector = {
  platform: Platform;
  /** URL d'autorisation OAuth (étape 1) */
  authorizeUrl(state: string, redirectUri: string): string;
  /** Échange le code OAuth contre un (ou plusieurs) compte(s) */
  exchangeCode(code: string, redirectUri: string): Promise<ConnectorAccount[]>;
  /** Rafraîchit le token si la plateforme le supporte. Retourne le compte mis à jour. */
  refreshToken?(account: ConnectorAccount): Promise<ConnectorAccount>;
  /** Publie un post pour le compte donné */
  publish(account: ConnectorAccount, input: PublishInput): Promise<PublishResult>;
  /** Récupère les métriques d'un post publié */
  fetchMetrics?(account: ConnectorAccount, externalId: string): Promise<Metrics>;
};

export type OAuthStartResult = {
  url: string;
  state: string;
};
