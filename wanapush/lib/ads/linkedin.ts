// Connecteur LinkedIn Marketing Solutions API.
// Doc : https://learn.microsoft.com/en-us/linkedin/marketing/
//
// Setup LinkedIn :
// - Demander accès au programme "Marketing Developer Platform" (review LinkedIn obligatoire)
// - Scopes : r_ads, r_ads_reporting, rw_ads (rw_ads requis pour push — review supplémentaire)
// - ⚠️  Comptes connectés SANS rw_ads devront se reconnecter pour utiliser pushCampaign.
import type {
  AdAccountInfo,
  AdsConnector,
  CampaignSync,
  DailyMetrics,
  PushCampaignInput,
  PushCampaignResult,
} from "./types";

const API = "https://api.linkedin.com";
const LI_VERSION = "202605";
// rw_ads ajouté pour push — nécessite Marketing Developer Platform approval.
const SCOPES = ["r_ads", "r_ads_reporting", "rw_ads"];

function appCreds() {
  const id = process.env.LINKEDIN_ADS_CLIENT_ID ?? process.env.LINKEDIN_CLIENT_ID;
  const secret =
    process.env.LINKEDIN_ADS_CLIENT_SECRET ?? process.env.LINKEDIN_CLIENT_SECRET;
  if (!id || !secret)
    throw new Error("LINKEDIN_ADS_CLIENT_ID/SECRET (ou LINKEDIN_CLIENT_ID/SECRET) requis");
  return { id, secret };
}

// Headers communs LinkedIn REST API
function liHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
    "LinkedIn-Version": LI_VERSION,
  };
}

// ─── Geo URN map (ISO → urn:li:geo) ──────────────────────────────────────────
// Source : LinkedIn Marketing Audience API /rest/adTargetingFacets/locations
const GEO_URN: Record<string, string> = {
  FR: "urn:li:geo:105015875",
  BE: "urn:li:geo:100565514",
  CH: "urn:li:geo:106693272",
  LU: "urn:li:geo:104042105",
  MA: "urn:li:geo:102787409",
  SN: "urn:li:geo:100992546",
  CI: "urn:li:geo:100160856",
  US: "urn:li:geo:103644278",
  GB: "urn:li:geo:101165590",
  DE: "urn:li:geo:101282230",
  ES: "urn:li:geo:105646813",
  IT: "urn:li:geo:103350119",
  NL: "urn:li:geo:102890719",
  CA: "urn:li:geo:101174742",
  AU: "urn:li:geo:101452733",
  PT: "urn:li:geo:100364837",
};

function resolveGeoUrns(countries: string[]): string[] {
  const urns = countries.map((cc) => GEO_URN[cc.toUpperCase()]).filter(Boolean) as string[];
  return urns.length > 0 ? urns : [GEO_URN.FR!];
}

// Extrait l'ID numérique d'un URN ou d'un header Location LinkedIn.
function extractId(locationOrUrn: string): string {
  const match = locationOrUrn.match(/:(\d+)$/) ?? locationOrUrn.match(/(\d+)$/);
  return match?.[1] ?? locationOrUrn;
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
        "LinkedIn-Version": LI_VERSION,
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
        "LinkedIn-Version": LI_VERSION,
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
      "LinkedIn-Version": LI_VERSION,
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

// ─── getOrCreateCampaignGroup ─────────────────────────────────────────────────
// Les campagnes LinkedIn doivent appartenir à un Campaign Group.
// On récupère le premier groupe ACTIVE existant, ou on en crée un.
async function getOrCreateCampaignGroup(
  account: AdAccountInfo,
  accountId: string | number,
  accountUrn: string,
): Promise<string> {
  const r = await fetch(
    `${API}/rest/adAccounts/${accountId}/adCampaignGroups?q=search&search=(status:(values:List(ACTIVE,DRAFT)))&count=1`,
    { headers: liHeaders(account.accessToken) },
  );
  const j = (await r.json()) as { elements?: Array<{ id: number }> };
  if (j.elements?.[0]?.id) {
    return `urn:li:sponsoredCampaignGroup:${j.elements[0].id}`;
  }
  // Créer un groupe par défaut
  const createRes = await fetch(`${API}/rest/adAccounts/${accountId}/adCampaignGroups`, {
    method: "POST",
    headers: liHeaders(account.accessToken),
    body: JSON.stringify({
      account: accountUrn,
      name: "WanaPush — Campagnes",
      status: "ACTIVE",
      runSchedule: { start: Date.now() },
    }),
  });
  const loc = createRes.headers.get("x-restli-id") ?? createRes.headers.get("location") ?? "";
  const gid = extractId(loc);
  if (!gid) throw new Error("Impossible de créer un Campaign Group LinkedIn");
  return `urn:li:sponsoredCampaignGroup:${gid}`;
}

// ─── uploadImageFromUrl ───────────────────────────────────────────────────────
// LinkedIn Images API : 1) initializeUpload → uploadUrl + imageUrn
//                       2) PUT binaire sur uploadUrl
async function uploadImageFromUrl(
  account: AdAccountInfo,
  accountUrn: string,
  imageUrl: string,
): Promise<string> {
  // Étape 1 : initialiser l'upload
  const initRes = await fetch(`${API}/rest/images?action=initializeUpload`, {
    method: "POST",
    headers: liHeaders(account.accessToken),
    body: JSON.stringify({ initializeUploadRequest: { owner: accountUrn } }),
  });
  const initJ = (await initRes.json()) as {
    value?: { uploadUrl?: string; image?: string };
    message?: string;
  };
  if (!initJ.value?.uploadUrl || !initJ.value?.image) {
    throw new Error(`LinkedIn image init error: ${initJ.message ?? "uploadUrl absent"}`);
  }
  const { uploadUrl, image: imageUrn } = initJ.value;

  // Étape 2 : fetcher + PUT les bytes de l'image
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Image fetch failed: ${imgRes.status}`);
  const imgBuffer = await imgRes.arrayBuffer();
  const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: imgBuffer,
  });
  if (!putRes.ok) throw new Error(`LinkedIn image PUT failed: ${putRes.status}`);

  return imageUrn;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────
function mapObjective(campaignType: string | undefined): string {
  switch ((campaignType ?? "").toUpperCase()) {
    case "TRAFFIC":
    case "LINK_CLICKS":
    case "OUTCOME_TRAFFIC":
      return "WEBSITE_VISITS";
    case "CONVERSIONS":
    case "OUTCOME_SALES":
      return "WEBSITE_CONVERSIONS";
    case "LEAD_GENERATION":
    case "OUTCOME_LEADS":
      return "LEAD_GENERATION";
    case "REACH":
    case "BRAND_AWARENESS":
    case "OUTCOME_AWARENESS":
      return "BRAND_AWARENESS";
    case "VIDEO_VIEWS":
    case "OUTCOME_ENGAGEMENT":
      return "VIDEO_VIEWS";
    case "ENGAGEMENT":
      return "ENGAGEMENT";
    default:
      return "WEBSITE_VISITS";
  }
}

// LinkedIn recommande CPM pour awareness, CPV pour vidéo, CPC pour le reste.
// unitCost = enchère de départ (montant en devise du compte).
function mapBidding(objective: string): { costType: string; unitCost: number } {
  switch (objective) {
    case "BRAND_AWARENESS": return { costType: "CPM", unitCost: 8 };
    case "VIDEO_VIEWS": return { costType: "CPV", unitCost: 0.05 };
    default: return { costType: "CPC", unitCost: 2 };
  }
}

function mapCTA(cta: string | undefined): string {
  switch ((cta ?? "").toUpperCase()) {
    case "LEARN_MORE": return "LEARN_MORE";
    case "SIGN_UP": return "SIGN_UP";
    case "SUBSCRIBE": return "SUBSCRIBE";
    case "REGISTER": return "REGISTER";
    case "CONTACT_US": return "CONTACT_US";
    case "APPLY_NOW": return "APPLY_NOW";
    case "DOWNLOAD": return "DOWNLOAD";
    case "SHOP_NOW": return "SHOP_NOW";
    case "BOOK_NOW": return "BOOK_NOW";
    case "ORDER_NOW": return "ORDER_NOW";
    case "GET_QUOTE": return "REQUEST_DEMO";
    default: return "LEARN_MORE";
  }
}

// ─── pushCampaign ─────────────────────────────────────────────────────────────
// Flow : CampaignGroup (get/create) → Campaign (DRAFT) → Image upload → Creative (DRAFT)
// Nécessite scope rw_ads (Marketing Developer Platform approval).
async function pushCampaign(
  account: AdAccountInfo,
  input: PushCampaignInput,
): Promise<PushCampaignResult> {
  const accountId = (account.meta?.sponsoredAccountId as number | string) ?? account.externalId;
  const accountUrn = `urn:li:sponsoredAccount:${accountId}`;
  const currency = account.currency ?? "EUR";
  const resources: Record<string, string> = {};

  try {
    // 1. Campaign Group (requis par LinkedIn)
    const campaignGroupUrn = await getOrCreateCampaignGroup(account, accountId, accountUrn);
    resources.campaignGroup = campaignGroupUrn;

    // 2. Campaign
    const countries = input.geoLocations?.countries ?? input.countries ?? ["FR"];
    const geoUrns = resolveGeoUrns(countries);
    const objective = mapObjective(input.campaignType);
    const { costType, unitCost } = mapBidding(objective);

    const campaignRes = await fetch(`${API}/rest/adAccounts/${accountId}/adCampaigns`, {
      method: "POST",
      headers: liHeaders(account.accessToken),
      body: JSON.stringify({
        account: accountUrn,
        campaignGroup: campaignGroupUrn,
        name: input.name,
        status: "DRAFT",
        type: "SPONSORED_UPDATES",
        objectiveType: objective,
        costType,
        dailyBudget: { amount: input.dailyBudget.toFixed(2), currencyCode: currency },
        unitCost: { amount: unitCost.toFixed(2), currencyCode: currency },
        locale: { country: countries[0]?.toUpperCase() ?? "FR", language: "fr" },
        targeting: {
          includedTargetingFacets: { locations: geoUrns },
        },
      }),
    });
    const campaignLoc = campaignRes.headers.get("x-restli-id") ?? campaignRes.headers.get("location") ?? "";
    const campaignId = extractId(campaignLoc);
    if (!campaignId) {
      const errJ = await campaignRes.json().catch(() => ({})) as { message?: string };
      throw new Error(`Campaign LinkedIn non créée : ${errJ.message ?? campaignRes.status}`);
    }
    resources.campaign = campaignId;
    const campaignUrn = `urn:li:sponsoredCampaign:${campaignId}`;
    console.log(`[linkedin.pushCampaign] Campaign créée : ${campaignId}`);

    // 3. Image upload (optionnel — annonce texte si echec)
    let imageUrn: string | undefined;
    if (input.imageUrl) {
      try {
        imageUrn = await uploadImageFromUrl(account, accountUrn, input.imageUrl);
        resources.image = imageUrn;
        console.log(`[linkedin.pushCampaign] Image uploadée : ${imageUrn}`);
      } catch (imgErr) {
        const msg = imgErr instanceof Error ? imgErr.message : String(imgErr);
        console.warn(`[linkedin.pushCampaign] Image upload échouée (${msg.slice(0, 100)}) — creative sans image`);
      }
    }

    // 4. Creative (Single Image ou texte seul si pas d'image)
    const headline = (input.headlines?.[0] ?? input.name).slice(0, 150);
    const body = (input.primaryText ?? headline).slice(0, 600);
    const finalUrl = input.finalUrl ?? "";

    const singleImage: Record<string, unknown> = {
      headline,
      body,
      landingPage: { url: finalUrl },
      callToAction: { label: mapCTA(input.cta), url: finalUrl },
    };
    if (imageUrn) singleImage.media = { id: imageUrn };

    const creativeRes = await fetch(`${API}/rest/adAccounts/${accountId}/adCreatives`, {
      method: "POST",
      headers: liHeaders(account.accessToken),
      body: JSON.stringify({
        account: accountUrn,
        campaign: campaignUrn,
        status: "DRAFT",
        type: "SINGLE_IMAGE",
        content: { singleImage },
      }),
    });
    const creativeLoc = creativeRes.headers.get("x-restli-id") ?? creativeRes.headers.get("location") ?? "";
    const creativeId = extractId(creativeLoc);
    if (creativeId) {
      resources.creative = creativeId;
      console.log(`[linkedin.pushCampaign] Creative créée : ${creativeId}`);
    }

    const externalUrl = `https://www.linkedin.com/campaignmanager/accounts/${accountId}/campaigns/${campaignId}`;
    return { ok: true, externalId: campaignId, externalUrl, resources };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[linkedin.pushCampaign] Échec : ${error}`);
    return { ok: false, error, resources };
  }
}

// ─── updateCampaignStatus ─────────────────────────────────────────────────────
async function updateCampaignStatus(
  account: AdAccountInfo,
  externalId: string,
  status: "ACTIVE" | "PAUSED",
): Promise<void> {
  const accountId = (account.meta?.sponsoredAccountId as number | string) ?? account.externalId;
  const r = await fetch(
    `${API}/rest/adAccounts/${accountId}/adCampaigns/${externalId}`,
    {
      method: "PATCH",
      headers: liHeaders(account.accessToken),
      body: JSON.stringify({ patch: { $set: { status } } }),
    },
  );
  if (!r.ok) {
    const j = await r.json().catch(() => ({})) as { message?: string };
    throw new Error(`LinkedIn updateStatus failed: ${j.message ?? r.status}`);
  }
}

// ─── updateCampaignBudget ─────────────────────────────────────────────────────
async function updateCampaignBudget(
  account: AdAccountInfo,
  externalId: string,
  dailyBudget: number,
): Promise<void> {
  if (dailyBudget < 0.01) throw new Error(`Budget trop bas : ${dailyBudget}`);
  const accountId = (account.meta?.sponsoredAccountId as number | string) ?? account.externalId;
  const currency = account.currency ?? "EUR";
  const r = await fetch(
    `${API}/rest/adAccounts/${accountId}/adCampaigns/${externalId}`,
    {
      method: "PATCH",
      headers: liHeaders(account.accessToken),
      body: JSON.stringify({
        patch: {
          $set: { dailyBudget: { amount: dailyBudget.toFixed(2), currencyCode: currency } },
        },
      }),
    },
  );
  if (!r.ok) {
    const j = await r.json().catch(() => ({})) as { message?: string };
    throw new Error(`LinkedIn updateBudget failed: ${j.message ?? r.status}`);
  }
}

export const linkedinAdsConnector: AdsConnector = {
  platform: "LINKEDIN_ADS",
  authorizeUrl,
  exchangeCode,
  refreshToken: refreshTokenFn,
  listCampaigns,
  fetchMetrics,
  pushCampaign,
  updateCampaignStatus,
  updateCampaignBudget,
};
