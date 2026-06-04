// Connecteur LinkedIn Marketing Solutions API.
// Doc : https://learn.microsoft.com/en-us/linkedin/marketing/
//
// Setup LinkedIn :
// - Demander accès au programme "Marketing Developer Platform" (review LinkedIn obligatoire)
// - Scopes : r_ads, r_ads_reporting, rw_ads (rw_ads requiert review supplémentaire)
import type {
  AdAccountInfo,
  AdsConnector,
  CampaignSync,
  DailyMetrics,
} from "./types";

const API = "https://api.linkedin.com";
const SCOPES = ["r_ads", "r_ads_reporting"];

function appCreds() {
  const id = process.env.LINKEDIN_ADS_CLIENT_ID ?? process.env.LINKEDIN_CLIENT_ID;
  const secret =
    process.env.LINKEDIN_ADS_CLIENT_SECRET ?? process.env.LINKEDIN_CLIENT_SECRET;
  if (!id || !secret)
    throw new Error("LINKEDIN_ADS_CLIENT_ID/SECRET (ou LINKEDIN_CLIENT_ID/SECRET) requis");
  return { id, secret };
}

function authorizeUrl(state: string, redirectUri: string): string {
  const { id } = appCreds();
  const u = new URL("https://www.linkedin.com/oauth/v2/authorization");
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", id);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("state", state);
  u.searchParams.set("scope", SCOPES.join(" "));
  return u.toString();
}

async function exchangeCode(
  code: string,
  redirectUri: string,
): Promise<AdAccountInfo[]> {
  const { id, secret } = appCreds();
  const tokRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: id,
      client_secret: secret,
    }).toString(),
  });
  const tok = (await tokRes.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    error_description?: string;
  };
  if (!tok.access_token)
    throw new Error(tok.error_description ?? "Échange code LinkedIn Ads échoué");

  // Liste les Ad Accounts du user
  const r = await fetch(
    `${API}/rest/adAccounts?q=search&search=(status:(values:List(ACTIVE)))`,
    {
      headers: {
        Authorization: `Bearer ${tok.access_token}`,
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202410",
      },
    },
  );
  const j = (await r.json()) as {
    elements?: Array<{
      id: number;
      name?: string;
      currency?: string;
      reference?: string;
    }>;
    message?: string;
  };
  if (!j.elements) throw new Error(j.message ?? "Aucun ad account LinkedIn accessible");

  return j.elements.map((a) => ({
    externalId: `urn:li:sponsoredAccount:${a.id}`,
    name: a.name,
    currency: a.currency,
    accessToken: tok.access_token!,
    refreshToken: tok.refresh_token,
    tokenExpiresAt: tok.expires_in
      ? new Date(Date.now() + tok.expires_in * 1000)
      : undefined,
    scopes: SCOPES.join(","),
    meta: { sponsoredAccountId: a.id, reference: a.reference },
  }));
}

async function refreshTokenFn(account: AdAccountInfo): Promise<AdAccountInfo> {
  if (!account.refreshToken) return account;
  const { id, secret } = appCreds();
  const r = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: account.refreshToken,
      client_id: id,
      client_secret: secret,
    }).toString(),
  });
  const j = (await r.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
  };
  if (!j.access_token) return account;
  return {
    ...account,
    accessToken: j.access_token,
    refreshToken: j.refresh_token ?? account.refreshToken,
    tokenExpiresAt: j.expires_in
      ? new Date(Date.now() + j.expires_in * 1000)
      : undefined,
  };
}

async function listCampaigns(account: AdAccountInfo): Promise<CampaignSync[]> {
  const accountId = (account.meta?.sponsoredAccountId as number) ?? 0;
  const r = await fetch(
    `${API}/rest/adAccounts/${accountId}/adCampaigns?q=search&search=(status:(values:List(ACTIVE,PAUSED,DRAFT)))`,
    {
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202410",
      },
    },
  );
  const j = (await r.json()) as {
    elements?: Array<{
      id: number;
      name?: string;
      objectiveType?: string;
      status?: string;
      dailyBudget?: { amount?: string };
      totalBudget?: { amount?: string };
      runSchedule?: { start?: number; end?: number };
    }>;
    message?: string;
  };
  if (!j.elements) throw new Error(j.message ?? "Erreur listCampaigns LinkedIn");
  return j.elements.map((c) => ({
    externalId: String(c.id),
    name: c.name ?? `Campaign ${c.id}`,
    objective: c.objectiveType,
    status: c.status,
    dailyBudget: c.dailyBudget?.amount ? Number(c.dailyBudget.amount) : undefined,
    lifetimeBudget: c.totalBudget?.amount ? Number(c.totalBudget.amount) : undefined,
    startDate: c.runSchedule?.start ? new Date(c.runSchedule.start) : undefined,
    endDate: c.runSchedule?.end ? new Date(c.runSchedule.end) : undefined,
  }));
}

async function fetchMetrics(
  account: AdAccountInfo,
  campaignExternalId: string,
  since: Date,
  until: Date,
): Promise<DailyMetrics[]> {
  // LinkedIn AdAnalytics API : timeGranularity=DAILY, pivot=CAMPAIGN, dateRange=...
  const params = new URLSearchParams({
    q: "analytics",
    pivot: "CAMPAIGN",
    timeGranularity: "DAILY",
    fields: "dateRange,impressions,clicks,costInUsd,externalWebsiteConversions,conversionValueInLocalCurrency",
    "dateRange.start.year": String(since.getUTCFullYear()),
    "dateRange.start.month": String(since.getUTCMonth() + 1),
    "dateRange.start.day": String(since.getUTCDate()),
    "dateRange.end.year": String(until.getUTCFullYear()),
    "dateRange.end.month": String(until.getUTCMonth() + 1),
    "dateRange.end.day": String(until.getUTCDate()),
    "campaigns[0]": `urn:li:sponsoredCampaign:${campaignExternalId}`,
  });
  const r = await fetch(`${API}/rest/adAnalytics?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": "202410",
    },
  });
  const j = (await r.json()) as {
    elements?: Array<{
      dateRange?: {
        start?: { year: number; month: number; day: number };
      };
      impressions?: number;
      clicks?: number;
      costInUsd?: string;
      externalWebsiteConversions?: number;
      conversionValueInLocalCurrency?: string;
    }>;
    message?: string;
  };
  if (!j.elements) {
    if (j.message) throw new Error(j.message);
    return [];
  }
  return j.elements.map((row) => {
    const d = row.dateRange?.start;
    const date = d ? new Date(Date.UTC(d.year, d.month - 1, d.day)) : new Date();
    return {
      date,
      spend: Number(row.costInUsd ?? 0),
      impressions: Number(row.impressions ?? 0),
      clicks: Number(row.clicks ?? 0),
      conversions: Number(row.externalWebsiteConversions ?? 0),
      revenue: Number(row.conversionValueInLocalCurrency ?? 0),
      raw: row as Record<string, unknown>,
    };
  });
}

export const linkedinAdsConnector: AdsConnector = {
  platform: "LINKEDIN_ADS",
  authorizeUrl,
  exchangeCode,
  refreshToken: refreshTokenFn,
  listCampaigns,
  fetchMetrics,
};
