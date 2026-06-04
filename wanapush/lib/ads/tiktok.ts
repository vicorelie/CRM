// Connecteur TikTok Marketing API.
// Doc : https://business-api.tiktok.com/portal/docs
//
// Setup TikTok :
// - Créer une app sur https://business-api.tiktok.com/portal
// - Demander Standard API Approval (l'app passe en Sandbox tant que pas approuvée)
// - Scopes : ads management, reporting
import type {
  AdAccountInfo,
  AdsConnector,
  CampaignSync,
  DailyMetrics,
} from "./types";

const API = "https://business-api.tiktok.com/open_api/v1.3";

function appCreds() {
  const id = process.env.TIKTOK_ADS_APP_ID ?? process.env.TIKTOK_APP_ID;
  const secret = process.env.TIKTOK_ADS_APP_SECRET ?? process.env.TIKTOK_APP_SECRET;
  if (!id || !secret)
    throw new Error("TIKTOK_ADS_APP_ID/SECRET (ou TIKTOK_APP_ID/SECRET) requis");
  return { id, secret };
}

function authorizeUrl(state: string, redirectUri: string): string {
  const { id } = appCreds();
  // Note : TikTok Marketing utilise une URL différente du Login Kit (qui sert pour le social).
  const u = new URL("https://business-api.tiktok.com/portal/auth");
  u.searchParams.set("app_id", id);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("state", state);
  return u.toString();
}

async function exchangeCode(
  code: string,
  _redirectUri: string,
): Promise<AdAccountInfo[]> {
  const { id, secret } = appCreds();
  const r = await fetch(`${API}/oauth2/access_token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: id, secret, auth_code: code }),
  });
  const j = (await r.json()) as {
    code?: number;
    message?: string;
    data?: {
      access_token?: string;
      advertiser_ids?: string[];
      scope?: string[];
    };
  };
  if (!j.data?.access_token)
    throw new Error(j.message ?? "Échange code TikTok Ads échoué");

  const token = j.data.access_token;
  const advertiserIds = j.data.advertiser_ids ?? [];
  if (advertiserIds.length === 0) return [];

  // Détails advertisers
  const detRes = await fetch(
    `${API}/advertiser/info/?` +
      new URLSearchParams({
        advertiser_ids: JSON.stringify(advertiserIds),
        fields: JSON.stringify([
          "id",
          "name",
          "currency",
          "timezone",
          "status",
        ]),
      }).toString(),
    { headers: { "Access-Token": token } },
  );
  const dj = (await detRes.json()) as {
    data?: {
      list?: Array<{
        id: string;
        name?: string;
        currency?: string;
        timezone?: string;
        status?: string;
      }>;
    };
  };
  const list = dj.data?.list ?? [];

  return list.map((a) => ({
    externalId: a.id,
    name: a.name,
    currency: a.currency,
    timezone: a.timezone,
    accessToken: token,
    scopes: j.data?.scope?.join(",") ?? "",
    meta: { advertiserId: a.id, status: a.status },
  }));
}

async function listCampaigns(account: AdAccountInfo): Promise<CampaignSync[]> {
  const advertiserId = (account.meta?.advertiserId as string) ?? account.externalId;
  const r = await fetch(
    `${API}/campaign/get/?` +
      new URLSearchParams({
        advertiser_id: advertiserId,
        page_size: "100",
      }).toString(),
    { headers: { "Access-Token": account.accessToken } },
  );
  const j = (await r.json()) as {
    code?: number;
    message?: string;
    data?: {
      list?: Array<{
        campaign_id: string;
        campaign_name: string;
        objective_type?: string;
        operation_status?: string;
        budget?: number;
        budget_mode?: string;
      }>;
    };
  };
  if (j.code !== 0) throw new Error(j.message ?? "Erreur listCampaigns TikTok");
  return (j.data?.list ?? []).map((c) => ({
    externalId: c.campaign_id,
    name: c.campaign_name,
    objective: c.objective_type,
    status: c.operation_status,
    dailyBudget: c.budget_mode === "BUDGET_MODE_DAY" ? c.budget : undefined,
    lifetimeBudget: c.budget_mode === "BUDGET_MODE_TOTAL" ? c.budget : undefined,
  }));
}

async function fetchMetrics(
  account: AdAccountInfo,
  campaignExternalId: string,
  since: Date,
  until: Date,
): Promise<DailyMetrics[]> {
  const advertiserId = (account.meta?.advertiserId as string) ?? account.externalId;
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const r = await fetch(
    `${API}/report/integrated/get/?` +
      new URLSearchParams({
        advertiser_id: advertiserId,
        report_type: "BASIC",
        data_level: "AUCTION_CAMPAIGN",
        dimensions: JSON.stringify(["campaign_id", "stat_time_day"]),
        metrics: JSON.stringify([
          "spend",
          "impressions",
          "clicks",
          "conversion",
          "real_time_conversion",
          "total_purchase_value",
        ]),
        start_date: fmt(since),
        end_date: fmt(until),
        filtering: JSON.stringify([
          { field_name: "campaign_ids", filter_type: "IN", filter_value: JSON.stringify([campaignExternalId]) },
        ]),
        page_size: "1000",
      }).toString(),
    { headers: { "Access-Token": account.accessToken } },
  );
  const j = (await r.json()) as {
    code?: number;
    message?: string;
    data?: {
      list?: Array<{
        dimensions?: { stat_time_day?: string };
        metrics?: {
          spend?: string;
          impressions?: string;
          clicks?: string;
          conversion?: string;
          total_purchase_value?: string;
        };
      }>;
    };
  };
  if (j.code !== 0) throw new Error(j.message ?? "Erreur metrics TikTok");
  return (j.data?.list ?? []).map((row) => ({
    date: new Date(String(row.dimensions?.stat_time_day ?? "")),
    spend: Number(row.metrics?.spend ?? 0),
    impressions: Number(row.metrics?.impressions ?? 0),
    clicks: Number(row.metrics?.clicks ?? 0),
    conversions: Number(row.metrics?.conversion ?? 0),
    revenue: Number(row.metrics?.total_purchase_value ?? 0),
    raw: row as Record<string, unknown>,
  }));
}

export const tiktokAdsConnector: AdsConnector = {
  platform: "TIKTOK_ADS",
  authorizeUrl,
  exchangeCode,
  listCampaigns,
  fetchMetrics,
};
