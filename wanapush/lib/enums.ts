// Types unions pour remplacer les enums Prisma (non supportés par SQLite).
// Source de vérité : prisma/schema.prisma (commentaires des champs).

export const PLANS = ["STARTER", "GROWTH", "SCALE", "ENTERPRISE"] as const;
export type Plan = (typeof PLANS)[number];

export const PLATFORMS = [
  "INSTAGRAM",
  "TIKTOK",
  "YOUTUBE",
  "FACEBOOK",
  "LINKEDIN",
  "TWITTER",
  "PINTEREST",
] as const;
export type Platform = (typeof PLATFORMS)[number];

export const CAMPAIGN_TYPES = [
  "META_ADS",
  "GOOGLE_ADS",
  "TIKTOK_ADS",
  "LINKEDIN_ADS",
  "SEO",
  "EMAIL",
  "ASO",
] as const;
export type CampaignType = (typeof CAMPAIGN_TYPES)[number];

export const STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"] as const;
export type Status = (typeof STATUSES)[number];
