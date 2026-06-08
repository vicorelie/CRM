// Google Business Profile module — OAuth + 5 sub-APIs Google.
//
// APIs utilisées (toutes actives juin 2026) :
//  - Account Management : mybusinessaccountmanagement.googleapis.com/v1
//  - Business Information : mybusinessbusinessinformation.googleapis.com/v1
//  - Performance : businessprofileperformance.googleapis.com/v1
//  - Reviews (v4 legacy actif) : mybusiness.googleapis.com/v4
//  - Local Posts (v4 legacy actif) : mybusiness.googleapis.com/v4
//
// Scope OAuth : https://www.googleapis.com/auth/business.manage
//
// ⚠️ Quota Google : sans accès production (à demander à Google, 2-4 semaines),
//   la quota est ~10 requêtes/jour. Pour prod : remplir le formulaire de
//   vérification dans Google Cloud Console.

import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/crypto";
import type {
  GbpAccountAPI,
  GbpLocationAPI,
  GbpReviewAPI,
  GbpLocalPostInput,
  GbpInsightMetric,
} from "./types";

// ─── Constantes ─────────────────────────────────────────────────────────────

export const GBP_SCOPE = "https://www.googleapis.com/auth/business.manage";

const ACCOUNT_API = "https://mybusinessaccountmanagement.googleapis.com/v1";
const BUSINESS_INFO_API = "https://mybusinessbusinessinformation.googleapis.com/v1";
const PERFORMANCE_API = "https://businessprofileperformance.googleapis.com/v1";
const V4_API = "https://mybusiness.googleapis.com/v4"; // Reviews + Posts legacy

// ─── OAuth Helpers ──────────────────────────────────────────────────────────

function gbpCreds() {
  const id = process.env.GBP_GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GBP_GOOGLE_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error("GBP_GOOGLE_CLIENT_ID/SECRET (ou GOOGLE_CLIENT_ID/SECRET) requis pour GBP OAuth");
  }
  return { id, secret };
}

/** Construit l'URL OAuth Google avec scope business.manage. */
export function buildAuthorizeUrl(state: string, redirectUri: string): string {
  const { id } = gbpCreds();
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", id);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("state", state);
  u.searchParams.set("scope", GBP_SCOPE);
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent");
  return u.toString();
}

/** Échange code OAuth → tokens. */
export async function exchangeCode(
  code: string,
  redirectUri: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number; scope: string }> {
  const { id, secret } = gbpCreds();
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: id,
      client_secret: secret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  });
  const j = (await r.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    error_description?: string;
  };
  if (!j.access_token || !j.refresh_token) {
    throw new Error(j.error_description ?? "Échec OAuth Google GBP (refresh_token absent ?)");
  }
  return {
    accessToken: j.access_token,
    refreshToken: j.refresh_token,
    expiresIn: j.expires_in ?? 3600,
    scope: j.scope ?? GBP_SCOPE,
  };
}

/** Refresh access_token via refresh_token. */
export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
  const { id, secret } = gbpCreds();
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: id,
      client_secret: secret,
      grant_type: "refresh_token",
    }).toString(),
  });
  const j = (await r.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!j.access_token) throw new Error(j.error ?? "Refresh token Google GBP échoué");
  return { accessToken: j.access_token, expiresIn: j.expires_in ?? 3600 };
}

/** Récupère un access_token frais pour un GbpAccount (refresh auto si expiré). */
export async function getValidAccessToken(gbpAccountId: string): Promise<string> {
  const acc = await prisma.gbpAccount.findUnique({
    where: { id: gbpAccountId },
    select: { id: true, accessToken: true, refreshToken: true, expiresAt: true },
  });
  if (!acc) throw new Error(`GbpAccount ${gbpAccountId} introuvable`);

  // Marge 60s avant expiration → refresh
  if (acc.expiresAt > new Date(Date.now() + 60_000)) {
    return decrypt(acc.accessToken);
  }
  const refreshed = await refreshAccessToken(decrypt(acc.refreshToken));
  const newExp = new Date(Date.now() + refreshed.expiresIn * 1000);
  await prisma.gbpAccount.update({
    where: { id: acc.id },
    data: { accessToken: encrypt(refreshed.accessToken), expiresAt: newExp },
  });
  return refreshed.accessToken;
}

// ─── HTTP wrapper ──────────────────────────────────────────────────────────

async function gbpFetch<T>(
  accessToken: string,
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const r = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  const text = await r.text();
  if (!r.ok) {
    throw new Error(`GBP ${r.status} (${url.split("?")[0]}): ${text.slice(0, 400)}`);
  }
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

// ─── Account Management ────────────────────────────────────────────────────

export async function listAccounts(accessToken: string): Promise<GbpAccountAPI[]> {
  const j = await gbpFetch<{ accounts?: GbpAccountAPI[] }>(
    accessToken,
    `${ACCOUNT_API}/accounts?pageSize=20`,
  );
  return j.accounts ?? [];
}

// ─── Business Information (Locations) ──────────────────────────────────────

const LOCATION_READ_MASK = [
  "name",
  "title",
  "phoneNumbers",
  "storefrontAddress",
  "websiteUri",
  "latlng",
  "categories",
  "regularHours",
  "metadata",
].join(",");

export async function listLocations(accessToken: string, accountResourceName: string): Promise<GbpLocationAPI[]> {
  const url = `${BUSINESS_INFO_API}/${accountResourceName}/locations?readMask=${encodeURIComponent(LOCATION_READ_MASK)}&pageSize=100`;
  const j = await gbpFetch<{ locations?: GbpLocationAPI[] }>(accessToken, url);
  return j.locations ?? [];
}

export async function patchLocation(
  accessToken: string,
  locationResourceName: string,
  patch: Partial<GbpLocationAPI>,
  updateMask: string[],
): Promise<GbpLocationAPI> {
  const url = `${BUSINESS_INFO_API}/${locationResourceName}?updateMask=${encodeURIComponent(updateMask.join(","))}`;
  return gbpFetch<GbpLocationAPI>(accessToken, url, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

// ─── Performance API (Insights) ────────────────────────────────────────────

const DEFAULT_METRICS: GbpInsightMetric[] = [
  "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
  "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
  "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
  "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
  "WEBSITE_CLICKS",
  "CALL_CLICKS",
  "BUSINESS_DIRECTION_REQUESTS",
  "BUSINESS_BOOKINGS",
];

export type GbpInsightDaily = {
  date: string; // YYYY-MM-DD
  metrics: Partial<Record<GbpInsightMetric, number>>;
};

/** Fetch insights via Performance API v1 (remplace l'ancien reportInsights v4). */
export async function fetchInsights(
  accessToken: string,
  locationResourceName: string,
  startDate: Date,
  endDate: Date,
  metrics: GbpInsightMetric[] = DEFAULT_METRICS,
): Promise<GbpInsightDaily[]> {
  // Endpoint format : POST :fetchMultiDailyMetricsTimeSeries
  const url = `${PERFORMANCE_API}/${locationResourceName}:fetchMultiDailyMetricsTimeSeries`;
  const fmtDate = (d: Date) => ({
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  });
  const body = {
    dailyMetrics: metrics,
    dailyRange: {
      startDate: fmtDate(startDate),
      endDate: fmtDate(endDate),
    },
  };
  const j = await gbpFetch<{
    multiDailyMetricTimeSeries?: Array<{
      dailyMetricTimeSeries?: Array<{
        dailyMetric?: GbpInsightMetric;
        timeSeries?: { datedValues?: Array<{ date?: { year: number; month: number; day: number }; value?: string }> };
      }>;
    }>;
  }>(accessToken, url, { method: "POST", body: JSON.stringify(body) });

  // Reshape : map<date, partial metrics>
  const map = new Map<string, Partial<Record<GbpInsightMetric, number>>>();
  for (const series of j.multiDailyMetricTimeSeries ?? []) {
    for (const dm of series.dailyMetricTimeSeries ?? []) {
      const metric = dm.dailyMetric;
      if (!metric) continue;
      for (const dv of dm.timeSeries?.datedValues ?? []) {
        if (!dv.date) continue;
        const key = `${dv.date.year}-${String(dv.date.month).padStart(2, "0")}-${String(dv.date.day).padStart(2, "0")}`;
        const entry = map.get(key) ?? {};
        entry[metric] = Number(dv.value ?? 0);
        map.set(key, entry);
      }
    }
  }

  return Array.from(map.entries())
    .map(([date, metrics]) => ({ date, metrics }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Reviews (v4 legacy actif) ─────────────────────────────────────────────

export async function listReviews(
  accessToken: string,
  accountResourceName: string,
  locationResourceName: string,
  pageToken?: string,
): Promise<{ reviews: GbpReviewAPI[]; nextPageToken?: string; totalReviewCount?: number; averageRating?: number }> {
  // locationResourceName est "locations/{id}" → v4 endpoint utilise le format
  // accounts/{a}/locations/{l}/reviews donc on combine.
  const locId = locationResourceName.replace(/^locations\//, "");
  const accId = accountResourceName.replace(/^accounts\//, "");
  const url = `${V4_API}/accounts/${accId}/locations/${locId}/reviews?pageSize=50${pageToken ? `&pageToken=${pageToken}` : ""}`;
  const j = await gbpFetch<{
    reviews?: GbpReviewAPI[];
    nextPageToken?: string;
    totalReviewCount?: number;
    averageRating?: number;
  }>(accessToken, url);
  return {
    reviews: j.reviews ?? [],
    nextPageToken: j.nextPageToken,
    totalReviewCount: j.totalReviewCount,
    averageRating: j.averageRating,
  };
}

export async function replyToReview(
  accessToken: string,
  accountResourceName: string,
  locationResourceName: string,
  reviewId: string,
  comment: string,
): Promise<{ comment: string; updateTime: string }> {
  const locId = locationResourceName.replace(/^locations\//, "");
  const accId = accountResourceName.replace(/^accounts\//, "");
  const url = `${V4_API}/accounts/${accId}/locations/${locId}/reviews/${reviewId}/reply`;
  return gbpFetch<{ comment: string; updateTime: string }>(accessToken, url, {
    method: "PUT",
    body: JSON.stringify({ comment }),
  });
}

// ─── Local Posts (v4 legacy actif) ─────────────────────────────────────────

export async function createLocalPost(
  accessToken: string,
  accountResourceName: string,
  locationResourceName: string,
  post: GbpLocalPostInput,
): Promise<{ name: string }> {
  const locId = locationResourceName.replace(/^locations\//, "");
  const accId = accountResourceName.replace(/^accounts\//, "");
  const url = `${V4_API}/accounts/${accId}/locations/${locId}/localPosts`;
  const body = {
    languageCode: post.languageCode ?? "fr",
    summary: post.summary,
    topicType: post.topicType,
    callToAction: post.callToAction,
    event: post.event,
    media: post.media,
  };
  return gbpFetch<{ name: string }>(accessToken, url, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ─── Helpers haut niveau : sync ────────────────────────────────────────────

/** Conversion star rating enum → int 1-5 */
const STAR_MAP: Record<GbpReviewAPI["starRating"], number> = {
  ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
};

/** Sync locations + reviews + average d'un GbpAccount.
 *  Upsert locations (cache local) + reviews (refresh IDs récents).
 *  Best-effort : continue si un endpoint échoue. */
export async function syncGbpAccount(gbpAccountId: string): Promise<{
  locationsSynced: number;
  reviewsSynced: number;
  errors: string[];
}> {
  const accessToken = await getValidAccessToken(gbpAccountId);
  const account = await prisma.gbpAccount.findUnique({
    where: { id: gbpAccountId },
    select: { id: true, googleAccountId: true },
  });
  if (!account) throw new Error(`GbpAccount ${gbpAccountId} introuvable`);

  const errors: string[] = [];
  let locationsSynced = 0;
  let reviewsSynced = 0;

  // 1. Locations
  let locations: GbpLocationAPI[] = [];
  try {
    locations = await listLocations(accessToken, account.googleAccountId);
  } catch (e) {
    errors.push(`listLocations: ${e instanceof Error ? e.message : e}`);
  }

  for (const loc of locations) {
    try {
      const addressLines = loc.storefrontAddress?.addressLines?.join(", ");
      const address = [
        addressLines,
        loc.storefrontAddress?.locality,
        loc.storefrontAddress?.postalCode,
      ].filter(Boolean).join(", ");

      const dbLoc = await prisma.gbpLocation.upsert({
        where: { accountId_googleLocationId: { accountId: account.id, googleLocationId: loc.name } },
        create: {
          accountId: account.id,
          googleLocationId: loc.name,
          title: loc.title,
          address: address || null,
          phoneNumber: loc.phoneNumbers?.primaryPhone,
          websiteUri: loc.websiteUri,
          lat: loc.latlng?.latitude,
          lng: loc.latlng?.longitude,
          primaryCategory: loc.categories?.primaryCategory?.displayName,
          regularHours: loc.regularHours as never,
          lastSyncAt: new Date(),
        },
        update: {
          title: loc.title,
          address: address || null,
          phoneNumber: loc.phoneNumbers?.primaryPhone,
          websiteUri: loc.websiteUri,
          lat: loc.latlng?.latitude,
          lng: loc.latlng?.longitude,
          primaryCategory: loc.categories?.primaryCategory?.displayName,
          regularHours: loc.regularHours as never,
          lastSyncAt: new Date(),
        },
      });
      locationsSynced++;

      // 2. Reviews (v4) — refresh IDs récents (Google a migré le format en 2026)
      try {
        const { reviews, totalReviewCount, averageRating } = await listReviews(
          accessToken,
          account.googleAccountId,
          loc.name,
        );
        // Update aggregates location
        await prisma.gbpLocation.update({
          where: { id: dbLoc.id },
          data: {
            reviewsCount: totalReviewCount ?? reviews.length,
            averageRating: averageRating ?? null,
          },
        });
        // Upsert reviews
        for (const r of reviews) {
          await prisma.gbpReview.upsert({
            where: { locationId_googleReviewId: { locationId: dbLoc.id, googleReviewId: r.name } },
            create: {
              locationId: dbLoc.id,
              googleReviewId: r.name,
              reviewerName: r.reviewer?.displayName,
              reviewerPhotoUrl: r.reviewer?.profilePhotoUrl,
              starRating: STAR_MAP[r.starRating] ?? 0,
              comment: r.comment,
              createTime: new Date(r.createTime),
              updateTime: new Date(r.updateTime),
              replyText: r.reviewReply?.comment,
              replyUpdateTime: r.reviewReply ? new Date(r.reviewReply.updateTime) : null,
              replyStatus: r.reviewReply ? "MANUAL_REPLIED" : "PENDING",
            },
            update: {
              comment: r.comment,
              updateTime: new Date(r.updateTime),
              replyText: r.reviewReply?.comment,
              replyUpdateTime: r.reviewReply ? new Date(r.reviewReply.updateTime) : null,
              replyStatus: r.reviewReply ? "MANUAL_REPLIED" : undefined,
            },
          });
          reviewsSynced++;
        }
      } catch (e) {
        errors.push(`reviews(${loc.name}): ${e instanceof Error ? e.message : e}`);
      }
    } catch (e) {
      errors.push(`upsert loc(${loc.name}): ${e instanceof Error ? e.message : e}`);
    }
  }

  await prisma.gbpAccount.update({
    where: { id: account.id },
    data: { lastSyncAt: new Date(), lastError: errors.length > 0 ? errors.slice(0, 3).join(" | ") : null },
  });

  return { locationsSynced, reviewsSynced, errors };
}
