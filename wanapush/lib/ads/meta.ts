// Connecteur Meta Marketing API (Facebook + Instagram Ads).
// Doc : https://developers.facebook.com/docs/marketing-api/
//
// Setup côté Meta : ajouter le produit "Marketing API" sur l'app wanapush, ajouter
// les permissions ads_management, ads_read, business_management. App review requise
// pour publier hors mode dev.
import type {
  AdAccountInfo,
  AdsConnector,
  CampaignSync,
  DailyMetrics,
  PushCampaignInput,
  PushCampaignResult,
} from "./types";

const GRAPH = "https://graph.facebook.com/v21.0";
const GRAPH_V22 = "https://graph.facebook.com/v22.0"; // pour les endpoints push (Marketing API 2026)

const META_ADS_SCOPES = [
  "ads_management",
  "ads_read",
  "business_management",
  "pages_show_list",
];

function appCreds() {
  const id = process.env.META_APP_ID;
  const secret = process.env.META_APP_SECRET;
  if (!id || !secret) throw new Error("META_APP_ID/META_APP_SECRET non définis");
  return { id, secret };
}

function authorizeUrl(state: string, redirectUri: string): string {
  const { id } = appCreds();
  const u = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  u.searchParams.set("client_id", id);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("state", state);
  u.searchParams.set("scope", META_ADS_SCOPES.join(","));
  u.searchParams.set("response_type", "code");
  return u.toString();
}

async function exchangeCode(
  code: string,
  redirectUri: string,
): Promise<AdAccountInfo[]> {
  const { id, secret } = appCreds();

  const tokRes = await fetch(
    `${GRAPH}/oauth/access_token?` +
      new URLSearchParams({
        client_id: id,
        client_secret: secret,
        redirect_uri: redirectUri,
        code,
      }).toString(),
  );
  const tokJson = (await tokRes.json()) as {
    access_token?: string;
    error?: { message: string };
  };
  if (!tokJson.access_token)
    throw new Error(tokJson.error?.message ?? "Échange code Meta échoué");

  // Long-lived token (~60 jours)
  const longRes = await fetch(
    `${GRAPH}/oauth/access_token?` +
      new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: id,
        client_secret: secret,
        fb_exchange_token: tokJson.access_token,
      }).toString(),
  );
  const longJson = (await longRes.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  const userToken = longJson.access_token ?? tokJson.access_token;
  const expiresAt = longJson.expires_in
    ? new Date(Date.now() + longJson.expires_in * 1000)
    : undefined;

  const r = await fetch(
    `${GRAPH}/me/adaccounts?fields=id,account_id,name,currency,timezone_name,account_status,business&limit=200&access_token=${encodeURIComponent(userToken)}`,
  );
  const j = (await r.json()) as {
    data?: Array<{
      id: string;
      account_id: string;
      name?: string;
      currency?: string;
      timezone_name?: string;
      account_status?: number;
      business?: { id: string; name?: string };
    }>;
    error?: { message: string };
  };
  console.log("[metaAds.exchangeCode] /me/adaccounts:", JSON.stringify(j).slice(0, 1500));
  if (!j.data) throw new Error(j.error?.message ?? "Aucun ad account accessible");
  if (j.data.length === 0) {
    throw new Error(
      "Aucun compte publicitaire accordé. Sur la popup Meta, cliquez « Modifier les paramètres » puis cochez WanaPush Ads à l'écran « Comptes publicitaires ».",
    );
  }

  return j.data.map((a) => ({
    externalId: a.id,
    name: a.name,
    currency: a.currency,
    timezone: a.timezone_name,
    accessToken: userToken,
    tokenExpiresAt: expiresAt,
    scopes: META_ADS_SCOPES.join(","),
    meta: {
      account_id: a.account_id,
      account_status: a.account_status,
      business: a.business,
    },
  }));
}

async function listCampaigns(account: AdAccountInfo): Promise<CampaignSync[]> {
  const r = await fetch(
    `${GRAPH}/${account.externalId}/campaigns?fields=id,name,objective,effective_status,daily_budget,lifetime_budget,start_time,stop_time&limit=200&access_token=${encodeURIComponent(account.accessToken)}`,
  );
  const j = (await r.json()) as {
    data?: Array<{
      id: string;
      name: string;
      objective?: string;
      effective_status?: string;
      daily_budget?: string;
      lifetime_budget?: string;
      start_time?: string;
      stop_time?: string;
    }>;
    error?: { message: string };
  };
  if (!j.data) throw new Error(j.error?.message ?? "Erreur listCampaigns Meta");
  return j.data.map((c) => ({
    externalId: c.id,
    name: c.name,
    objective: c.objective,
    status: c.effective_status,
    // Meta renvoie les budgets en cents
    dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : undefined,
    lifetimeBudget: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : undefined,
    startDate: c.start_time ? new Date(c.start_time) : undefined,
    endDate: c.stop_time ? new Date(c.stop_time) : undefined,
  }));
}

async function fetchMetrics(
  account: AdAccountInfo,
  campaignExternalId: string,
  since: Date,
  until: Date,
): Promise<DailyMetrics[]> {
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const url =
    `${GRAPH}/${campaignExternalId}/insights?` +
    new URLSearchParams({
      fields:
        "spend,impressions,clicks,actions,action_values,date_start,date_stop",
      time_increment: "1",
      time_range: JSON.stringify({ since: fmt(since), until: fmt(until) }),
      access_token: account.accessToken,
    }).toString();
  const r = await fetch(url);
  const j = (await r.json()) as {
    data?: Array<{
      spend?: string;
      impressions?: string;
      clicks?: string;
      date_start?: string;
      actions?: Array<{ action_type: string; value: string }>;
      action_values?: Array<{ action_type: string; value: string }>;
    }>;
    error?: { message: string };
  };
  if (!j.data) {
    if (j.error) throw new Error(j.error.message);
    return [];
  }
  return j.data.map((row) => {
    const purchases = row.actions?.find((a) =>
      ["purchase", "offsite_conversion.fb_pixel_purchase"].includes(a.action_type),
    );
    const purchaseValue = row.action_values?.find((a) =>
      ["purchase", "offsite_conversion.fb_pixel_purchase"].includes(a.action_type),
    );
    return {
      date: row.date_start ? new Date(row.date_start) : new Date(),
      spend: Number(row.spend ?? 0),
      impressions: Number(row.impressions ?? 0),
      clicks: Number(row.clicks ?? 0),
      conversions: Number(purchases?.value ?? 0),
      revenue: Number(purchaseValue?.value ?? 0),
      raw: row as Record<string, unknown>,
    };
  });
}

// ────────────────────────────────────────────────────────────────────────────
// PUSH CAMPAIGN — Création Campaign + AdSet + AdCreative + Ad sur Meta Ads
// ────────────────────────────────────────────────────────────────────────────
//
// Crée toute la hiérarchie Meta nécessaire pour qu'une campagne soit "prête à
// activer" dans Meta Ads Manager. Tout est créé en status=PAUSED par sécurité
// (l'utilisateur active manuellement après vérification).
//
// Best practices 2026 appliquées :
//   - Objective system "Outcomes" (OUTCOME_TRAFFIC, OUTCOME_LEADS, etc.) v22.0+
//   - Advantage+ Audience activé par défaut (CPA -32% vs targeting manuel)
//   - billing_event/optimization_goal alignés sur l'objective
//   - Status PAUSED systématique → 0 risque de brûler du budget

type MetaError = { message?: string; code?: number; error_subcode?: number; fbtrace_id?: string };
type MetaResource = { id: string };

/**
 * POST helper vers Meta Marketing API v22.0.
 *
 * Encode le body en x-www-form-urlencoded (les objets JSON imbriqués sont
 * sérialisés en string JSON, c'est la convention Meta).
 */
async function metaPost<T = MetaResource>(
  account: AdAccountInfo,
  resource: string,
  body: Record<string, unknown>,
): Promise<T> {
  const url = `${GRAPH_V22}/${resource}`;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined || v === null) continue;
    params.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }
  params.set("access_token", account.accessToken);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Meta ${resource}: réponse non-JSON (HTTP ${res.status})`);
  }

  if (!res.ok) {
    const err = (json as { error?: MetaError })?.error;
    const msg = err?.message ?? `HTTP ${res.status}`;
    const codeStr = err?.code
      ? ` [code ${err.code}${err.error_subcode ? `/${err.error_subcode}` : ""}]`
      : "";
    const traceStr = err?.fbtrace_id ? ` (fbtrace_id ${err.fbtrace_id})` : "";
    throw new Error(`Meta ${resource}: ${msg}${codeStr}${traceStr}`);
  }

  return json as T;
}

/** Mappe le champ libre `campaignType` du PushCampaignInput vers un Meta objective. */
function mapObjective(campaignType: string | undefined): string {
  const v = (campaignType ?? "").toLowerCase().trim();
  if (!v) return "OUTCOME_TRAFFIC";
  if (v.includes("notori") || v.includes("aware") || v === "reach") return "OUTCOME_AWARENESS";
  if (v.includes("trafic") || v.includes("traffic") || v.includes("clic")) return "OUTCOME_TRAFFIC";
  if (v.includes("engag") || v.includes("video") || v.includes("vidéo")) return "OUTCOME_ENGAGEMENT";
  if (v.includes("lead") || v.includes("contact") || v.includes("formul")) return "OUTCOME_LEADS";
  if (v.includes("vente") || v.includes("sale") || v.includes("convers") || v.includes("achat")) {
    return "OUTCOME_SALES";
  }
  if (v.includes("app") || v.includes("install")) return "OUTCOME_APP_PROMOTION";
  return "OUTCOME_TRAFFIC"; // défaut sûr
}

/** Mappe l'objective → optimization_goal cohérent côté AdSet. */
function mapOptimizationGoal(objective: string): string {
  switch (objective) {
    case "OUTCOME_AWARENESS":
      return "REACH";
    case "OUTCOME_TRAFFIC":
      return "LINK_CLICKS";
    case "OUTCOME_ENGAGEMENT":
      return "POST_ENGAGEMENT";
    case "OUTCOME_LEADS":
      return "OFFSITE_CONVERSIONS";
    case "OUTCOME_SALES":
      return "OFFSITE_CONVERSIONS";
    case "OUTCOME_APP_PROMOTION":
      return "APP_INSTALLS";
    default:
      return "LINK_CLICKS";
  }
}

/** Mappe l'objective → billing_event (ce que Meta facture). */
function mapBillingEvent(objective: string): string {
  switch (objective) {
    case "OUTCOME_TRAFFIC":
      return "LINK_CLICKS";
    case "OUTCOME_ENGAGEMENT":
      return "POST_ENGAGEMENT";
    default:
      return "IMPRESSIONS";
  }
}

/** Mappe un CTA libre (FR/EN) vers un code Meta CTA valide. */
function mapCTA(cta: string | undefined): string {
  const v = (cta ?? "").toLowerCase().trim();
  if (!v) return "LEARN_MORE";
  if (v.includes("en savoir") || v.includes("learn more") || v.includes("plus d'info")) return "LEARN_MORE";
  if (v.includes("acheter") || v.includes("shop now") || v.includes("achetez")) return "SHOP_NOW";
  if (v.includes("inscri") || v.includes("sign up") || v.includes("subscribe") || v.includes("abonn")) return "SUBSCRIBE";
  if (v.includes("contact")) return "CONTACT_US";
  if (v.includes("réserv") || v.includes("book")) return "BOOK_TRAVEL";
  if (v.includes("téléch") || v.includes("download")) return "DOWNLOAD";
  if (v.includes("appel") || v.includes("call")) return "CALL_NOW";
  if (v.includes("postul") || v.includes("apply")) return "APPLY_NOW";
  if (v.includes("don") || v.includes("donate")) return "DONATE";
  if (v.includes("devis") || v.includes("quote")) return "GET_QUOTE";
  if (v.includes("offre") || v.includes("get offer")) return "GET_OFFER";
  if (v.includes("commencer") || v.includes("start") || v.includes("démar")) return "GET_STARTED";
  if (v.includes("voir") || v.includes("see") || v.includes("watch") || v.includes("regard")) return "WATCH_MORE";
  return "LEARN_MORE";
}

/** Récupère la 1ère page Facebook accessible si pageId pas dans account.meta. */
async function getDefaultPageId(account: AdAccountInfo): Promise<string | null> {
  try {
    const r = await fetch(
      `${GRAPH_V22}/me/accounts?limit=1&fields=id,name&access_token=${encodeURIComponent(account.accessToken)}`,
    );
    if (!r.ok) return null;
    const j = (await r.json()) as { data?: Array<{ id: string }> };
    return j.data?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Crée une campagne complète sur Meta Ads (Campaign → AdSet → Creative → Ad).
 * Tout est créé en PAUSED. L'externalId retourné est l'ID de la Campaign.
 *
 * En cas d'échec intermédiaire (ex: AdSet créé mais Creative échoue), les
 * resources déjà créées sont retournées pour permettre un rollback manuel ou
 * un retry partiel ultérieur.
 */
async function pushCampaign(
  account: AdAccountInfo,
  input: PushCampaignInput,
): Promise<PushCampaignResult> {
  const accountId = account.externalId; // format "act_xxx"
  const resources: Record<string, string> = {};

  try {
    const objective = mapObjective(input.campaignType);
    const optimizationGoal = mapOptimizationGoal(objective);
    const billingEvent = mapBillingEvent(objective);

    // 1) Campaign
    const campaign = await metaPost<MetaResource>(account, `${accountId}/campaigns`, {
      name: input.name,
      objective,
      status: "PAUSED",
      special_ad_categories: [], // requis depuis 2021
      buying_type: "AUCTION",
    });
    resources.campaign = campaign.id;

    // 2) AdSet — Advantage+ Audience par défaut (best practice 2026)
    const startTime = new Date(Date.now() + 60_000).toISOString(); // +1min pour éviter "start_time in past"
    const adset = await metaPost<MetaResource>(account, `${accountId}/adsets`, {
      name: `${input.name} – Ensemble`,
      campaign_id: campaign.id,
      daily_budget: Math.round(input.dailyBudget * 100), // Meta utilise les cents
      billing_event: billingEvent,
      optimization_goal: optimizationGoal,
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      targeting: {
        geo_locations: { countries: input.countries ?? ["FR"] },
        age_min: 18,
        age_max: 65,
        // Advantage+ Audience — meilleur ML Meta, +11% CTR, -32% CPA en moy.
        targeting_automation: { advantage_audience: 1 },
      },
      start_time: startTime,
      status: "PAUSED",
    });
    resources.adset = adset.id;

    // 3) AdCreative — exige un page_id (Facebook Page) pour les Link Ads
    let pageId = (account.meta?.pageId as string | undefined) ?? undefined;
    if (!pageId) pageId = (await getDefaultPageId(account)) ?? undefined;
    if (!pageId) {
      return {
        ok: false,
        error:
          "Aucune Facebook Page accessible pour publier l'annonce. Connecte une page dans Meta Business Manager puis ré-OAuth.",
        resources,
      };
    }

    const finalUrl = input.finalUrl ?? "https://wanapush.com";
    const headline = (input.headlines?.[0] ?? input.name).slice(0, 40);
    const description = (input.descriptions?.[0] ?? "").slice(0, 30);
    const primaryText = (input.primaryText ?? headline).slice(0, 125);

    const creative = await metaPost<MetaResource>(account, `${accountId}/adcreatives`, {
      name: `${input.name} – Créa`,
      object_story_spec: {
        page_id: pageId,
        link_data: {
          link: finalUrl,
          message: primaryText,
          name: headline,
          description,
          call_to_action: { type: mapCTA(input.cta) },
        },
      },
    });
    resources.creative = creative.id;

    // 4) Ad
    const ad = await metaPost<MetaResource>(account, `${accountId}/ads`, {
      name: `${input.name} – Annonce`,
      adset_id: adset.id,
      creative: { creative_id: creative.id },
      status: "PAUSED",
    });
    resources.ad = ad.id;

    // Lien direct vers la campagne dans Meta Ads Manager
    const acctNumber = accountId.replace(/^act_/, "");
    const externalUrl = `https://business.facebook.com/adsmanager/manage/campaigns?act=${acctNumber}&selected_campaign_ids=${campaign.id}`;

    return {
      ok: true,
      externalId: campaign.id,
      externalUrl,
      resources,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Erreur inconnue lors du push Meta",
      resources, // utile pour rollback si la campagne est créée mais l'adset/ad échoue
    };
  }
}

/** Helpers exportés pour tests unit. */
export const __pushTesting = { mapObjective, mapOptimizationGoal, mapBillingEvent, mapCTA };

export const metaAdsConnector: AdsConnector = {
  platform: "META_ADS",
  authorizeUrl,
  exchangeCode,
  listCampaigns,
  fetchMetrics,
  pushCampaign,
};
