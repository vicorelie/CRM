export type AdPlatform = "META_ADS" | "GOOGLE_ADS" | "TIKTOK_ADS" | "LINKEDIN_ADS";

export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED";

export type CampaignObjective =
  | "AWARENESS"
  | "TRAFFIC"
  | "LEADS"
  | "CONVERSIONS"
  | "APP_INSTALLS"
  | "ENGAGEMENT";

export type CopyTone = "DIRECT" | "PREMIUM" | "FRIENDLY" | "URGENT" | "STORYTELLING";

export type GeneratedVariant = {
  angle: string;
  copy: Record<string, string | string[]>;
};

export type CampaignSummary = {
  id: string;
  name: string;
  type: AdPlatform;
  status: CampaignStatus;
  budget: number | null;
  results: unknown;
  createdAt: string;
  updatedAt: string;
};

export const PLATFORM_META: Record<
  AdPlatform,
  { label: string; emoji: string; color: string }
> = {
  META_ADS: { label: "Meta Ads", emoji: "📘", color: "text-sky-300" },
  GOOGLE_ADS: { label: "Google Ads", emoji: "🔎", color: "text-amber-800" },
  TIKTOK_ADS: { label: "TikTok Ads", emoji: "🎵", color: "text-pink-300" },
  LINKEDIN_ADS: { label: "LinkedIn Ads", emoji: "💼", color: "text-brand-700" },
};

export const OBJECTIVE_LABEL: Record<CampaignObjective, string> = {
  AWARENESS: "Notoriété",
  TRAFFIC: "Trafic",
  LEADS: "Leads",
  CONVERSIONS: "Conversions / Ventes",
  APP_INSTALLS: "Installs app",
  ENGAGEMENT: "Engagement",
};

export const TONE_LABEL: Record<CopyTone, string> = {
  DIRECT: "Direct",
  PREMIUM: "Premium",
  FRIENDLY: "Amical",
  URGENT: "Urgent",
  STORYTELLING: "Storytelling",
};

export const STATUS_BADGE: Record<CampaignStatus, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  PAUSED: "bg-amber-50 text-amber-800",
  COMPLETED: "bg-brand/15 text-brand-700",
};

// Limites de caractères des copies par plateforme (mêmes valeurs que lib/ads/types).
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
