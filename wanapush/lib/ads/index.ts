// Registry des connecteurs Ads + helpers DB.
import type { AdAccount, AdPlatform } from "@prisma/client";
import { decrypt, encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { googleAdsConnector } from "./google";
import { linkedinAdsConnector } from "./linkedin";
import { metaAdsConnector } from "./meta";
import { tiktokAdsConnector } from "./tiktok";
import type { AdAccountInfo, AdsConnector } from "./types";

const REGISTRY: Record<AdPlatform, AdsConnector> = {
  META_ADS: metaAdsConnector,
  GOOGLE_ADS: googleAdsConnector,
  TIKTOK_ADS: tiktokAdsConnector,
  LINKEDIN_ADS: linkedinAdsConnector,
};

export const SUPPORTED_AD_PLATFORMS: AdPlatform[] = [
  "META_ADS",
  "GOOGLE_ADS",
  "TIKTOK_ADS",
  "LINKEDIN_ADS",
];

export function getAdsConnector(platform: AdPlatform): AdsConnector {
  const c = REGISTRY[platform];
  if (!c) throw new Error(`Aucun connecteur ads pour ${platform}`);
  return c;
}

export function adPlatformConfigured(platform: AdPlatform): boolean {
  switch (platform) {
    case "META_ADS":
      return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
    case "GOOGLE_ADS":
      return Boolean(
        (process.env.GOOGLE_ADS_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID) &&
          (process.env.GOOGLE_ADS_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET) &&
          process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      );
    case "TIKTOK_ADS":
      return Boolean(
        (process.env.TIKTOK_ADS_APP_ID ?? process.env.TIKTOK_APP_ID) &&
          (process.env.TIKTOK_ADS_APP_SECRET ?? process.env.TIKTOK_APP_SECRET),
      );
    case "LINKEDIN_ADS":
      return Boolean(
        (process.env.LINKEDIN_ADS_CLIENT_ID ?? process.env.LINKEDIN_CLIENT_ID) &&
          (process.env.LINKEDIN_ADS_CLIENT_SECRET ?? process.env.LINKEDIN_CLIENT_SECRET),
      );
    default:
      return false;
  }
}

export function toAdAccountInfo(row: AdAccount): AdAccountInfo {
  return {
    externalId: row.externalId,
    name: row.name ?? undefined,
    currency: row.currency ?? undefined,
    timezone: row.timezone ?? undefined,
    accessToken: decrypt(row.accessToken),
    refreshToken: row.refreshToken ? decrypt(row.refreshToken) : undefined,
    tokenExpiresAt: row.tokenExpiresAt ?? undefined,
    scopes: row.scopes ?? undefined,
    meta: (row.meta as Record<string, unknown> | null) ?? undefined,
  };
}

export async function saveAdAccount(
  userId: string,
  platform: AdPlatform,
  acc: AdAccountInfo,
) {
  return prisma.adAccount.upsert({
    where: {
      userId_platform_externalId: {
        userId,
        platform,
        externalId: acc.externalId,
      },
    },
    update: {
      name: acc.name,
      currency: acc.currency,
      timezone: acc.timezone,
      accessToken: encrypt(acc.accessToken),
      refreshToken: acc.refreshToken ? encrypt(acc.refreshToken) : null,
      tokenExpiresAt: acc.tokenExpiresAt ?? null,
      scopes: acc.scopes,
      status: "CONNECTED",
      lastError: null,
      meta: (acc.meta as object | undefined) ?? undefined,
    },
    create: {
      userId,
      platform,
      externalId: acc.externalId,
      name: acc.name,
      currency: acc.currency,
      timezone: acc.timezone,
      accessToken: encrypt(acc.accessToken),
      refreshToken: acc.refreshToken ? encrypt(acc.refreshToken) : null,
      tokenExpiresAt: acc.tokenExpiresAt ?? null,
      scopes: acc.scopes,
      status: "CONNECTED",
      meta: (acc.meta as object | undefined) ?? undefined,
    },
  });
}

export async function ensureFreshAdAccount(row: AdAccount): Promise<AdAccount> {
  if (!row.tokenExpiresAt) return row;
  const margin = 5 * 60 * 1000;
  if (row.tokenExpiresAt.getTime() - Date.now() > margin) return row;
  const conn = getAdsConnector(row.platform);
  if (!conn.refreshToken) return row;
  try {
    const updated = await conn.refreshToken(toAdAccountInfo(row));
    return prisma.adAccount.update({
      where: { id: row.id },
      data: {
        accessToken: encrypt(updated.accessToken),
        refreshToken: updated.refreshToken
          ? encrypt(updated.refreshToken)
          : row.refreshToken,
        tokenExpiresAt: updated.tokenExpiresAt ?? null,
      },
    });
  } catch (e) {
    await prisma.adAccount.update({
      where: { id: row.id },
      data: {
        status: "EXPIRED",
        lastError: e instanceof Error ? e.message : String(e),
      },
    });
    return row;
  }
}
