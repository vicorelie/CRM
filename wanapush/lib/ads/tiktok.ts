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
  PushCampaignInput,
  PushCampaignResult,
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

// ─── POST helper ─────────────────────────────────────────────────────────────
async function tiktokPost<T = Record<string, unknown>>(
  account: AdAccountInfo,
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const r = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Token": account.accessToken,
    },
    body: JSON.stringify(body),
  });
  const j = (await r.json()) as { code?: number; message?: string; data?: T };
  if (j.code !== 0) {
    throw new Error(`TikTok ${path} error ${j.code}: ${j.message ?? "unknown"}`);
  }
  return j.data as T;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────
function mapObjective(campaignType: string | undefined): string {
  switch ((campaignType ?? "").toUpperCase()) {
    case "TRAFFIC":
    case "LINK_CLICKS":
      return "TRAFFIC";
    case "CONVERSIONS":
    case "OUTCOME_SALES":
    case "OUTCOME_TRAFFIC":
      return "CONVERSIONS";
    case "REACH":
      return "REACH";
    case "LEAD_GENERATION":
    case "OUTCOME_LEADS":
      return "LEAD_GENERATION";
    case "VIDEO_VIEWS":
      return "VIDEO_VIEWS";
    default:
      return "TRAFFIC";
  }
}

function mapOptGoal(objective: string): string {
  switch (objective) {
    case "CONVERSIONS": return "CONVERT";
    case "LEAD_GENERATION": return "LEAD";
    case "VIDEO_VIEWS": return "VIDEO_VIEW";
    case "REACH": return "REACH";
    default: return "CLICK";
  }
}

// OCPM pour conversions/leads (optimisation automatique par TikTok),
// CPC pour trafic (pay-per-click, adapté aux nouvelles campagnes sans historique),
// CPM pour reach/video (awareness).
function mapBillingEvent(objective: string): string {
  switch (objective) {
    case "CONVERSIONS":
    case "LEAD_GENERATION": return "OCPM";
    case "REACH":
    case "VIDEO_VIEWS": return "CPM";
    default: return "CPC";
  }
}

// ─── Résolution des location_ids ──────────────────────────────────────────────
// TikTok attend des IDs numériques propriétaires, pas des codes ISO.
// On appelle /tool/region/ pour mapper ISO → TikTok location_id.
// Fallback : si l'appel échoue, on passe les ISO bruts (certains environnements
// sandbox les acceptent directement).
async function resolveLocationIds(
  account: AdAccountInfo,
  advertiserId: string,
  countryCodes: string[],
  objectiveType: string,
): Promise<string[]> {
  try {
    const r = await fetch(
      `${API}/tool/region/?` +
        new URLSearchParams({
          advertiser_id: advertiserId,
          placements: JSON.stringify(["PLACEMENT_TIKTOK"]),
          objective_type: objectiveType,
        }),
      { headers: { "Access-Token": account.accessToken } },
    );
    const j = (await r.json()) as {
      code?: number;
      data?: { regions?: Array<{ region_code: string; location_id: string }> };
    };
    if (j.code !== 0 || !j.data?.regions) throw new Error("no regions");
    const regionMap = new Map(j.data.regions.map((r) => [r.region_code, r.location_id]));
    const resolved = countryCodes
      .map((cc) => regionMap.get(cc.toUpperCase()))
      .filter(Boolean) as string[];
    return resolved.length > 0 ? resolved : countryCodes;
  } catch {
    return countryCodes;
  }
}

function mapCTA(cta: string | undefined): string {
  switch ((cta ?? "").toUpperCase()) {
    case "SHOP_NOW": return "SHOP_NOW";
    case "SIGN_UP":
    case "SUBSCRIBE": return "SIGN_UP";
    case "LEARN_MORE": return "LEARN_MORE";
    case "CONTACT_US": return "CONTACT_US";
    case "DOWNLOAD": return "DOWNLOAD_NOW";
    case "BOOK_NOW":
    case "BOOK_TRAVEL": return "BOOK_NOW";
    case "APPLY_NOW": return "APPLY_NOW";
    case "GET_QUOTE": return "GET_QUOTE";
    case "ORDER_NOW": return "ORDER_NOW";
    default: return "LEARN_MORE";
  }
}

// ─── Image upload (URL → TikTok Creative Library) ────────────────────────────
async function uploadImageFromUrl(
  account: AdAccountInfo,
  advertiserId: string,
  imageUrl: string,
): Promise<string> {
  const r = await fetch(`${API}/file/image/ad/upload/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Token": account.accessToken,
    },
    body: JSON.stringify({
      advertiser_id: advertiserId,
      upload_type: "UPLOAD_BY_URL",
      image_url: imageUrl,
    }),
  });
  const j = (await r.json()) as {
    code?: number;
    message?: string;
    data?: { image_id?: string };
  };
  if (j.code !== 0 || !j.data?.image_id) {
    throw new Error(`TikTok image upload error ${j.code}: ${j.message ?? "image_id absent"}`);
  }
  return j.data.image_id;
}

// ─── pushCampaign ─────────────────────────────────────────────────────────────
// Crée Campaign → AdGroup → Ad (SINGLE_IMAGE) tout en DISABLE (PAUSED).
// Nécessite Standard API Approval — fonctionne en mode Sandbox sur comptes test.
async function pushCampaign(
  account: AdAccountInfo,
  input: PushCampaignInput,
): Promise<PushCampaignResult> {
  const advertiserId = (account.meta?.advertiserId as string) ?? account.externalId;
  const resources: Record<string, string> = {};

  try {
    // 1. Campaign
    const objective = mapObjective(input.campaignType);
    const campaignData = await tiktokPost<{ campaign_id: string }>(
      account,
      "/campaign/create/",
      {
        advertiser_id: advertiserId,
        campaign_name: input.name,
        objective_type: objective,
        budget_mode: "BUDGET_MODE_DAY",
        budget: input.dailyBudget,
        operation_status: "DISABLE",
      },
    );
    const campaignId = campaignData.campaign_id;
    resources.campaign = campaignId;
    console.log(`[tiktok.pushCampaign] Campaign créée : ${campaignId}`);

    // 2. AdGroup
    const countries = input.geoLocations?.countries ?? input.countries ?? ["FR"];
    const locationIds = await resolveLocationIds(account, advertiserId, countries, objective);
    const optGoal = mapOptGoal(objective);
    const billingEvent = mapBillingEvent(objective);
    const adgroupData = await tiktokPost<{ adgroup_id: string }>(
      account,
      "/adgroup/create/",
      {
        advertiser_id: advertiserId,
        campaign_id: campaignId,
        adgroup_name: `${input.name} – Groupe`,
        placement_type: "PLACEMENT_TYPE_AUTOMATIC",
        location_ids: locationIds,
        budget_mode: "BUDGET_MODE_DAY",
        budget: input.dailyBudget,
        schedule_type: "SCHEDULE_FROM_NOW",
        optimization_goal: optGoal,
        billing_event: billingEvent,
        bid_type: "BID_TYPE_NO_BID",
        operation_status: "DISABLE",
      },
    );
    const adgroupId = adgroupData.adgroup_id;
    resources.adgroup = adgroupId;
    console.log(`[tiktok.pushCampaign] AdGroup créé : ${adgroupId}`);

    // 3. Image upload
    let imageId: string | undefined;
    if (input.imageUrl) {
      try {
        imageId = await uploadImageFromUrl(account, advertiserId, input.imageUrl);
        resources.image = imageId;
        console.log(`[tiktok.pushCampaign] Image uploadée : ${imageId}`);
      } catch (imgErr) {
        const msg = imgErr instanceof Error ? imgErr.message : String(imgErr);
        console.warn(`[tiktok.pushCampaign] Image upload échouée (${msg.slice(0, 100)}) — annonce sans visuel`);
      }
    }

    // 4. Ad
    const adTitle = (input.headlines?.[0] ?? input.name).slice(0, 100);
    const adText = (input.primaryText ?? adTitle).slice(0, 100);
    const finalUrl = input.finalUrl ?? "";

    const adPayload: Record<string, unknown> = {
      advertiser_id: advertiserId,
      adgroup_id: adgroupId,
      ad_name: `${input.name} – Annonce`,
      ad_text: adText,
      call_to_action: mapCTA(input.cta),
      landing_page_url: finalUrl,
      operation_status: "DISABLE",
    };
    if (imageId) {
      adPayload.image_ids = [imageId];
      adPayload.ad_format = "SINGLE_IMAGE";
    }

    const adData = await tiktokPost<{ ad_id: string }>(
      account,
      "/ad/create/",
      adPayload,
    );
    resources.ad = adData.ad_id;
    console.log(`[tiktok.pushCampaign] Ad créée : ${adData.ad_id}`);

    const externalUrl = `https://ads.tiktok.com/i18n/perf/campaign?aadvid=${advertiserId}`;
    return { ok: true, externalId: campaignId, externalUrl, resources };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[tiktok.pushCampaign] Échec : ${error}`);
    return { ok: false, error, resources };
  }
}

// ─── updateCampaignStatus ─────────────────────────────────────────────────────
async function updateCampaignStatus(
  account: AdAccountInfo,
  externalId: string,
  status: "ACTIVE" | "PAUSED",
): Promise<void> {
  const advertiserId = (account.meta?.advertiserId as string) ?? account.externalId;
  await tiktokPost(account, "/campaign/status/update/", {
    advertiser_id: advertiserId,
    campaign_ids: [externalId],
    operation_status: status === "ACTIVE" ? "ENABLE" : "DISABLE",
  });
}

// ─── updateCampaignBudget ─────────────────────────────────────────────────────
async function updateCampaignBudget(
  account: AdAccountInfo,
  externalId: string,
  dailyBudget: number,
): Promise<void> {
  if (dailyBudget < 0.01) throw new Error(`Budget trop bas : ${dailyBudget}`);
  const advertiserId = (account.meta?.advertiserId as string) ?? account.externalId;
  await tiktokPost(account, "/campaign/budget/update/", {
    advertiser_id: advertiserId,
    budget_list: [{ campaign_id: externalId, budget: dailyBudget }],
  });
}

export const tiktokAdsConnector: AdsConnector = {
  platform: "TIKTOK_ADS",
  authorizeUrl,
  exchangeCode,
  listCampaigns,
  fetchMetrics,
  pushCampaign,
  updateCampaignStatus,
  updateCampaignBudget,
};
