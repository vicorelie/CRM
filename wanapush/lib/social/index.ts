// Registry des connecteurs social + helpers DB.
import type { Platform, SocialAccount } from "@prisma/client";
import { decrypt, encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { facebookConnector } from "./facebook";
import { instagramConnector } from "./instagram";
import { linkedinConnector } from "./linkedin";
import { tiktokConnector } from "./tiktok";
import type { ConnectorAccount, SocialConnector } from "./types";
import { youtubeConnector } from "./youtube";

const REGISTRY: Record<string, SocialConnector> = {
  FACEBOOK: facebookConnector,
  INSTAGRAM: instagramConnector,
  LINKEDIN: linkedinConnector,
  YOUTUBE: youtubeConnector,
  TIKTOK: tiktokConnector,
};

export function getConnector(platform: Platform): SocialConnector {
  const c = REGISTRY[platform];
  if (!c) throw new Error(`Aucun connecteur pour ${platform}`);
  return c;
}

export function platformConfigured(platform: Platform): boolean {
  switch (platform) {
    case "FACEBOOK":
      return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
    case "INSTAGRAM":
      return Boolean(process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET);
    case "LINKEDIN":
      return Boolean(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);
    case "YOUTUBE":
      return Boolean(
        (process.env.YOUTUBE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID) &&
          (process.env.YOUTUBE_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET),
      );
    case "TIKTOK":
      return Boolean(process.env.TIKTOK_APP_ID && process.env.TIKTOK_APP_SECRET);
    default:
      return false;
  }
}

export const SUPPORTED_PLATFORMS: Platform[] = [
  "FACEBOOK",
  "INSTAGRAM",
  "LINKEDIN",
  "YOUTUBE",
  "TIKTOK",
];

/** Convertit un row DB en objet ConnectorAccount avec tokens déchiffrés. */
export function toConnectorAccount(row: SocialAccount): ConnectorAccount {
  return {
    accountId: row.accountId,
    username: row.username ?? undefined,
    displayName: row.displayName ?? undefined,
    avatarUrl: row.avatarUrl ?? undefined,
    accessToken: decrypt(row.accessToken),
    refreshToken: row.refreshToken ? decrypt(row.refreshToken) : undefined,
    tokenExpiresAt: row.tokenExpiresAt ?? undefined,
    scopes: row.scopes ?? undefined,
    meta: (row.meta as Record<string, unknown> | null) ?? undefined,
  };
}

/** Sauvegarde / met à jour un compte (upsert sur (userId, platform, accountId)). */
export async function saveConnectorAccount(
  userId: string,
  platform: Platform,
  acc: ConnectorAccount,
) {
  return prisma.socialAccount.upsert({
    where: {
      userId_platform_accountId: {
        userId,
        platform,
        accountId: acc.accountId,
      },
    },
    update: {
      username: acc.username,
      displayName: acc.displayName,
      avatarUrl: acc.avatarUrl,
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
      accountId: acc.accountId,
      username: acc.username,
      displayName: acc.displayName,
      avatarUrl: acc.avatarUrl,
      accessToken: encrypt(acc.accessToken),
      refreshToken: acc.refreshToken ? encrypt(acc.refreshToken) : null,
      tokenExpiresAt: acc.tokenExpiresAt ?? null,
      scopes: acc.scopes,
      status: "CONNECTED",
      meta: (acc.meta as object | undefined) ?? undefined,
    },
  });
}

/** Si le token est sur le point d'expirer, rafraîchit et persiste. */
export async function ensureFreshAccount(row: SocialAccount): Promise<SocialAccount> {
  if (!row.tokenExpiresAt) return row;
  const margin = 5 * 60 * 1000;
  if (row.tokenExpiresAt.getTime() - Date.now() > margin) return row;
  const conn = getConnector(row.platform);
  if (!conn.refreshToken) return row;
  try {
    const updated = await conn.refreshToken(toConnectorAccount(row));
    return prisma.socialAccount.update({
      where: { id: row.id },
      data: {
        accessToken: encrypt(updated.accessToken),
        refreshToken: updated.refreshToken ? encrypt(updated.refreshToken) : row.refreshToken,
        tokenExpiresAt: updated.tokenExpiresAt ?? null,
      },
    });
  } catch (e) {
    await prisma.socialAccount.update({
      where: { id: row.id },
      data: {
        status: "EXPIRED",
        lastError: e instanceof Error ? e.message : String(e),
      },
    });
    return row;
  }
}
