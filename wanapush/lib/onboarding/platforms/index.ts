import type { PlatformWizardConfig } from "../types";
import { metaAdsConfig } from "./meta-ads";
import { googleAdsConfig } from "./google-ads";
import { tiktokAdsConfig } from "./tiktok-ads";
import { linkedinAdsConfig } from "./linkedin-ads";
import { facebookConfig } from "./facebook";
import { instagramConfig } from "./instagram";
import { linkedinConfig } from "./linkedin";
import { youtubeConfig } from "./youtube";
import { tiktokConfig } from "./tiktok";

export const PLATFORM_CONFIGS: PlatformWizardConfig[] = [
  // Ads
  metaAdsConfig,
  googleAdsConfig,
  tiktokAdsConfig,
  linkedinAdsConfig,
  // Social
  facebookConfig,
  instagramConfig,
  linkedinConfig,
  youtubeConfig,
  tiktokConfig,
];

/**
 * Lookup d'une config par slug + kind. Le kind est obligatoire pour éviter
 * qu'une route /ads/setup/<slug> tombe sur une config Social (et vice-versa).
 */
export function getPlatformConfigBySlug(
  slug: string,
  kind?: "ads" | "social",
): PlatformWizardConfig | null {
  return (
    PLATFORM_CONFIGS.find(
      (c) => c.slug === slug && (kind === undefined || c.kind === kind),
    ) ?? null
  );
}

export {
  metaAdsConfig,
  googleAdsConfig,
  tiktokAdsConfig,
  linkedinAdsConfig,
  facebookConfig,
  instagramConfig,
  linkedinConfig,
  youtubeConfig,
  tiktokConfig,
};
