// Connecteur Meta Marketing API (Facebook + Instagram Ads).
// Doc : https://developers.facebook.com/docs/marketing-api/
//
// Setup côté Meta : ajouter le produit "Marketing API" sur l'app wanapush, ajouter
// les permissions ads_management, ads_read, business_management. App review requise
// pour publier hors mode dev.
import { fetchPixelsForAdAccount } from "@/lib/capi/fetch-pixels";
import type {
  AdAccountInfo,
  AdsConnector,
  CampaignSync,
  DailyMetrics,
  PushCampaignInput,
  PushCampaignResult,
} from "./types";

const GRAPH = "https://graph.facebook.com/v25.0";

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
  const u = new URL("https://www.facebook.com/v25.0/dialog/oauth");
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
//   - Objective system "Outcomes" (OUTCOME_TRAFFIC, OUTCOME_LEADS, etc.) v17.0+
//   - Advantage+ Audience activé par défaut (CPA -32% vs targeting manuel)
//   - billing_event/optimization_goal alignés sur l'objective
//   - Status PAUSED systématique → 0 risque de brûler du budget

type MetaError = { message?: string; code?: number; error_subcode?: number; fbtrace_id?: string };
type MetaResource = { id: string };

/**
 * POST helper vers Meta Marketing API v25+.0.
 *
 * Encode le body en x-www-form-urlencoded (les objets JSON imbriqués sont
 * sérialisés en string JSON, c'est la convention Meta).
 */
async function metaPost<T = MetaResource>(
  account: AdAccountInfo,
  resource: string,
  body: Record<string, unknown>,
): Promise<T> {
  const url = `${GRAPH}/${resource}`;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined || v === null) continue;
    params.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }
  params.set("access_token", account.accessToken);

  // Log du payload (sans le token) pour debug
  const bodyForLog = { ...body };
  console.log(`[meta.pushCampaign] POST ${resource}:`, JSON.stringify(bodyForLog).slice(0, 800));

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

/**
 * Mappe le champ libre `campaignType` du PushCampaignInput vers un Meta objective.
 *
 * ⚠️ IMPORTANT (Meta 2026) — table destination_type officielle :
 *   - OUTCOME_TRAFFIC    : UNDEFINED, MESSENGER, WHATSAPP, PHONE_CALL (pas WEBSITE)
 *   - OUTCOME_ENGAGEMENT : UNDEFINED, MESSENGER, WHATSAPP, PHONE_CALL, INSTAGRAM_DIRECT (pas WEBSITE)
 *   - OUTCOME_AWARENESS  : inclut WEBSITE ✓
 *   - OUTCOME_LEADS      : inclut WEBSITE ✓ (nécessite lead form ou Pixel)
 *   - OUTCOME_SALES      : inclut WEBSITE ✓ (nécessite Pixel + conversion event)
 *
 * Conséquence : pour envoyer du trafic vers un SITE WEB sans config Pixel, on
 * passe par OUTCOME_AWARENESS (REACH/IMPRESSIONS, destination WEBSITE OK).
 *
 * Doc : https://developers.facebook.com/docs/marketing-api/adset/destination_type/
 */
function mapObjective(campaignType: string | undefined): string {
  const v = (campaignType ?? "").toLowerCase().trim();
  if (!v) return "OUTCOME_AWARENESS";
  if (v.includes("notori") || v.includes("aware") || v === "reach")
    return "OUTCOME_AWARENESS";
  // "trafic site" → AWARENESS (seule la branche AWARENESS/LEADS/SALES supporte destination WEBSITE)
  if (v.includes("trafic") || v.includes("traffic") || v.includes("clic"))
    return "OUTCOME_AWARENESS";
  // Messagerie / appel = vraies destinations conversationnelles
  if (
    v.includes("message") ||
    v.includes("messenger") ||
    v.includes("whatsapp") ||
    v.includes("appel") ||
    v.includes("call")
  ) {
    return "OUTCOME_TRAFFIC";
  }
  // ENGAGEMENT = interactions sociales (post likes, vidéo views) — pas pour driver vers site
  if (v.includes("engag") || v.includes("video") || v.includes("vidéo"))
    return "OUTCOME_ENGAGEMENT";
  if (v.includes("lead") || v.includes("contact") || v.includes("formul"))
    return "OUTCOME_LEADS";
  if (
    v.includes("vente") ||
    v.includes("sale") ||
    v.includes("convers") ||
    v.includes("achat")
  ) {
    return "OUTCOME_SALES";
  }
  if (v.includes("app") || v.includes("install")) return "OUTCOME_APP_PROMOTION";
  return "OUTCOME_AWARENESS"; // défaut sûr : seul à supporter destination WEBSITE sans config Pixel
}

/**
 * Mappe vers un objective LEGACY (pré-2024). Certains comptes pub Meta ne
 * supportent pas encore les "Outcomes" v22+ et exigent les anciennes valeurs.
 * Utilisé en fallback automatique si Meta retourne code 100/4834011.
 */
function mapLegacyObjective(campaignType: string | undefined): string {
  const v = (campaignType ?? "").toLowerCase().trim();
  if (!v) return "LINK_CLICKS";
  if (v.includes("notori") || v.includes("aware") || v === "reach") return "REACH";
  if (v.includes("trafic") || v.includes("traffic") || v.includes("clic")) return "LINK_CLICKS";
  if (v.includes("engag") || v.includes("video") || v.includes("vidéo")) return "POST_ENGAGEMENT";
  if (v.includes("lead") || v.includes("contact") || v.includes("formul")) return "LEAD_GENERATION";
  if (v.includes("vente") || v.includes("sale") || v.includes("convers") || v.includes("achat")) {
    return "CONVERSIONS";
  }
  if (v.includes("app") || v.includes("install")) return "APP_INSTALLS";
  return "LINK_CLICKS";
}

/** Mappe l'objective → optimization_goal cohérent côté AdSet (Outcomes v22+ ET legacy). */
function mapOptimizationGoal(objective: string): string {
  switch (objective) {
    // Outcomes v22+ (2024-2026)
    case "OUTCOME_AWARENESS":
      return "REACH";
    case "OUTCOME_TRAFFIC":
      // OUTCOME_TRAFFIC = conversationnel (Messenger/WhatsApp/Phone)
      return "LINK_CLICKS";
    case "OUTCOME_ENGAGEMENT":
      // ENGAGEMENT (Messenger/WhatsApp/Phone/Instagram_Direct) → POST_ENGAGEMENT universel
      return "POST_ENGAGEMENT";
    case "OUTCOME_LEADS":
      return "OFFSITE_CONVERSIONS";
    case "OUTCOME_SALES":
      return "OFFSITE_CONVERSIONS";
    case "OUTCOME_APP_PROMOTION":
      return "APP_INSTALLS";
    // Legacy (pré-2024) — pour les comptes pub qui ne supportent pas Outcomes
    case "REACH":
      return "REACH";
    case "LINK_CLICKS":
      return "LINK_CLICKS";
    case "POST_ENGAGEMENT":
      return "POST_ENGAGEMENT";
    case "LEAD_GENERATION":
      return "LEAD_GENERATION";
    case "CONVERSIONS":
      return "OFFSITE_CONVERSIONS";
    case "APP_INSTALLS":
      return "APP_INSTALLS";
    case "BRAND_AWARENESS":
      return "BRAND_AWARENESS";
    case "VIDEO_VIEWS":
      return "THRUPLAY";
    default:
      return "LINK_CLICKS";
  }
}

/** Mappe l'objective → billing_event (ce que Meta facture). */
function mapBillingEvent(objective: string): string {
  switch (objective) {
    case "OUTCOME_TRAFFIC":
    case "LINK_CLICKS":
      return "LINK_CLICKS";
    case "OUTCOME_ENGAGEMENT":
    case "POST_ENGAGEMENT":
      return "POST_ENGAGEMENT";
    default:
      // OUTCOME_AWARENESS/LEADS/SALES + legacy : IMPRESSIONS universel
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
      `${GRAPH}/me/accounts?limit=1&fields=id,name&access_token=${encodeURIComponent(account.accessToken)}`,
    );
    if (!r.ok) return null;
    const j = (await r.json()) as { data?: Array<{ id: string }> };
    return j.data?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

/** Récupère l'Instagram actor_id (compte IG Business) lié à une Page FB — pour ads cross-platform. */
async function getInstagramActorId(
  pageId: string,
  accessToken: string,
): Promise<string | null> {
  try {
    const r = await fetch(
      `${GRAPH}/${pageId}?fields=instagram_business_account&access_token=${encodeURIComponent(accessToken)}`,
    );
    if (!r.ok) return null;
    const j = (await r.json()) as { instagram_business_account?: { id: string } };
    return j.instagram_business_account?.id ?? null;
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
    // 0) Page ID — requis avant la création de l'AdSet pour le promoted_object
    //    (Meta refuse les AdSets AWARENESS/REACH+WEBSITE sans page sponsor → subcode 3858081).
    //    On le fetch EN PREMIER pour échouer vite sans laisser de Campaign orpheline côté Meta.
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

    // 1) Campaign — Outcomes (v22+) avec CBO (daily_budget au niveau Campaign, obligatoire 2025+)
    //
    // ⚠️ Marketing API v25 (fév 2026) : structure unifiée Advantage+.
    // - smart_promotion_type SUPPRIMÉ depuis v25 (était utilisé pour signaler ASC/AAC en v24)
    // - existing_customer_budget_percentage SUPPRIMÉ (remplacé par 2 AdSets + Custom Audiences)
    // - NOUVEAU : advantage_state writable au niveau Campaign :
    //     "ADVANTAGE_PLUS_SALES" pour OUTCOME_SALES (e-commerce / ASC)
    //     "ADVANTAGE_PLUS_LEADS" pour OUTCOME_LEADS (lead gen / AAC)
    //     omis pour AWARENESS/TRAFFIC (campagnes classiques)
    // - Advantage+ Audience : `targeting_automation.advantage_audience: 1` au AdSet (déjà fait)
    // - Advantage+ Placements : NE PAS envoyer `publisher_platforms` au AdSet (implicite)
    // - Advantage+ Creative : `degrees_of_freedom_spec` au AdCreative (déjà fait)
    // - Advantage+ Budget : `bid_strategy` + `daily_budget` au niveau Campaign (déjà fait, CBO)
    //
    // Impact mesuré (Meta officiel + études 2026) : +16-22% ROAS vs campagnes Standard.
    const objective = mapObjective(input.campaignType);

    // Mapping objective → advantage_state (Advantage+ unifié v25)
    const advantageState =
      objective === "OUTCOME_SALES" ? "ADVANTAGE_PLUS_SALES"
        : objective === "OUTCOME_LEADS" ? "ADVANTAGE_PLUS_LEADS"
        : null;

    const buildCampaignBody = (
      obj: string,
      withAdvantageState: boolean,
    ): Record<string, unknown> => {
      const body: Record<string, unknown> = {
        name: input.name,
        objective: obj,
        status: "PAUSED",
        special_ad_categories: ["NONE"],
        buying_type: "AUCTION",
        // CBO 2025+ : daily_budget en cents + bid_strategy au niveau Campaign
        daily_budget: Math.round(input.dailyBudget * 100),
        bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      };
      if (withAdvantageState && advantageState) {
        body.advantage_state = advantageState;
      }
      return body;
    };

    let campaign: MetaResource;
    try {
      campaign = await metaPost<MetaResource>(
        account,
        `${accountId}/campaigns`,
        buildCampaignBody(objective, true),
      );
      if (advantageState) {
        resources.advantageState = advantageState;
      }
    } catch (e1) {
      const msg1 = e1 instanceof Error ? e1.message : String(e1);
      console.error(`[meta.pushCampaign] Erreur campaign Outcomes : ${msg1}`);

      // Si Meta refuse advantage_state (compte trop neuf, pas éligible ASC/AAC, etc.),
      // retry sans pour rester fonctionnel. Le compte garde Advantage+ Audience/Creative
      // au niveau AdSet (next steps) — la campagne tourne juste sans le label unifié ASC/AAC.
      const isAdvantageStateRejected =
        advantageState !== null &&
        (msg1.includes("advantage_state") ||
          msg1.includes("ADVANTAGE_PLUS") ||
          msg1.includes("not eligible"));
      if (isAdvantageStateRejected) {
        console.log(`[meta.pushCampaign] advantage_state=${advantageState} refusé → retry sans ce flag`);
        try {
          campaign = await metaPost<MetaResource>(
            account,
            `${accountId}/campaigns`,
            buildCampaignBody(objective, false),
          );
        } catch (e2) {
          const msg2 = e2 instanceof Error ? e2.message : String(e2);
          const isObjectiveRejected = msg2.includes("Invalid Objective") || msg2.includes("objective is invalid");
          if (!isObjectiveRejected) throw e2;
          console.log(`[meta.pushCampaign] Outcome ${objective} refusé → fallback legacy`);
          const legacyObjective = mapLegacyObjective(input.campaignType);
          campaign = await metaPost<MetaResource>(
            account,
            `${accountId}/campaigns`,
            buildCampaignBody(legacyObjective, false),
          );
        }
      } else {
        const isObjectiveRejected = msg1.includes("Invalid Objective") || msg1.includes("objective is invalid");
        if (!isObjectiveRejected) throw e1;

        console.log(`[meta.pushCampaign] Outcome ${objective} refusé → fallback legacy`);
        const legacyObjective = mapLegacyObjective(input.campaignType);
        campaign = await metaPost<MetaResource>(
          account,
          `${accountId}/campaigns`,
          buildCampaignBody(legacyObjective, false),
        );
      }
    }
    resources.campaign = campaign.id;

    // optimization_goal et billing_event dépendent de l'objective finalement utilisé
    const optimizationGoal = mapOptimizationGoal(objective);
    const billingEvent = mapBillingEvent(objective);

    // 2) AdSet — Advantage+ Audience par défaut (best practice 2026)
    //    promoted_object.page_id : OBLIGATOIRE pour AWARENESS/REACH+WEBSITE
    //    promoted_object.pixel_id + custom_event_type : OBLIGATOIRE pour LEADS/SALES (subcode 1815143 sinon)
    //    dsa_beneficiary + dsa_payor : OBLIGATOIRES UE depuis juillet 2023 (DSA), subcode 3858081 sinon
    const startTime = new Date(Date.now() + 60_000).toISOString(); // +1min pour éviter "start_time in past"
    const dsaBeneficiary = input.dsaBeneficiary ?? account.name;
    const dsaPayor = input.dsaPayor ?? dsaBeneficiary;

    const promotedObject: Record<string, unknown> = { page_id: pageId };
    if (objective === "OUTCOME_LEADS" || objective === "OUTCOME_SALES") {
      // Pixel explicite > auto-detect du 1er Pixel sur l'AdAccount
      let pixelIdToUse = input.pixelId;
      if (!pixelIdToUse) {
        const pixels = await fetchPixelsForAdAccount(accountId, account.accessToken);
        const firstPixel = pixels.ok && pixels.pixels[0] ? pixels.pixels[0] : null;
        pixelIdToUse = firstPixel?.id;
      }
      if (!pixelIdToUse) {
        return {
          ok: false,
          error:
            "Aucun Pixel Meta détecté sur ce compte publicitaire. Pour les objectifs Leads/Ventes, configure un Pixel dans Meta Events Manager (ou choisis Notoriété/Trafic).",
          resources,
        };
      }
      promotedObject.pixel_id = pixelIdToUse;
      promotedObject.custom_event_type =
        objective === "OUTCOME_LEADS" ? "LEAD" : "PURCHASE";
    }

    // === Best practices Meta 2026 (toggles avec défaut ON) ===
    const useAdvAudience = input.advantageAudience !== false;
    const useAdvCreative = input.advantageCreative !== false;
    const useMultiAdv = input.multiAdvertiserAds !== false;

    // Targeting : âge/genre/pays (soft constraints quand Advantage+ Audience est ON)
    // geoLocations riche prime sur countries (legacy)
    const geoLocations: Record<string, unknown> = {};
    if (input.geoLocations) {
      const g = input.geoLocations;
      if (g.countries && g.countries.length > 0) geoLocations.countries = g.countries;
      if (g.regions && g.regions.length > 0) geoLocations.regions = g.regions;
      if (g.cities && g.cities.length > 0) geoLocations.cities = g.cities;
      if (g.zips && g.zips.length > 0) geoLocations.zips = g.zips;
      if (g.custom_locations && g.custom_locations.length > 0)
        geoLocations.custom_locations = g.custom_locations;
    }
    if (Object.keys(geoLocations).length === 0) {
      geoLocations.countries = input.countries ?? ["FR"];
    }
    const targeting: Record<string, unknown> = {
      geo_locations: geoLocations,
      age_min: input.ageMin ?? 18,
      age_max: input.ageMax ?? 65,
    };
    if (input.genders && input.genders.length > 0) targeting.genders = input.genders;
    if (useAdvAudience) {
      // Advantage+ Audience : l'IA explore au-delà du ciblage (best practice 2026, +CPR amélioré)
      targeting.targeting_automation = { advantage_audience: 1 };
    }

    // Smart fallback : OFFSITE_CONVERSIONS exige des données Pixel récentes (LEAD/PURCHASE).
    // Sur un nouveau Pixel sans data, Meta refuse (subcode 1870189). On retry alors avec
    // LANDING_PAGE_VIEWS (universel) puis LINK_CLICKS en dernier recours.
    //
    // ⚠️ Chaque optimisation a son shape de promoted_object :
    //   - OFFSITE_CONVERSIONS : page_id + pixel_id + custom_event_type
    //   - LANDING_PAGE_VIEWS  : page_id + pixel_id (pas de custom_event_type, subcode 1885501)
    //   - LINK_CLICKS         : page_id seul
    const adaptPromotedObject = (optGoal: string): Record<string, unknown> => {
      const adapted: Record<string, unknown> = { page_id: promotedObject.page_id };
      if (optGoal === "OFFSITE_CONVERSIONS") {
        if (promotedObject.pixel_id) adapted.pixel_id = promotedObject.pixel_id;
        if (promotedObject.custom_event_type)
          adapted.custom_event_type = promotedObject.custom_event_type;
      } else if (optGoal === "LANDING_PAGE_VIEWS") {
        if (promotedObject.pixel_id) adapted.pixel_id = promotedObject.pixel_id;
        // pas de custom_event_type — LANDING_PAGE_VIEWS optimise sur PageView, pas LEAD/PURCHASE
      }
      // LINK_CLICKS : page_id seulement
      return adapted;
    };

    const buildAdsetPayload = (optGoal: string, billing: string, nameSuffix = "") => {
      // Pour LINK_CLICKS (fallback ultime), on retire les options conversion-based :
      // - targeting_automation.advantage_audience (exige data Pixel pour LEADS/SALES)
      // - attribution_spec (sans sens sans tracking conversion)
      const adsetTargeting = { ...targeting };
      if (optGoal === "LINK_CLICKS" && adsetTargeting.targeting_automation) {
        delete adsetTargeting.targeting_automation;
      }

      const payload: Record<string, unknown> = {
        name: `${input.name} – Ensemble${nameSuffix}`,
        campaign_id: campaign.id,
        billing_event: billing,
        optimization_goal: optGoal,
        destination_type: "WEBSITE",
        promoted_object: adaptPromotedObject(optGoal),
        dsa_beneficiary: dsaBeneficiary,
        dsa_payor: dsaPayor,
        targeting: adsetTargeting,
        start_time: startTime,
        status: "PAUSED",
      };
      // attribution_spec : utile uniquement pour les optimisations conversion-based
      // (OFFSITE_CONVERSIONS, LANDING_PAGE_VIEWS). Pas pour LINK_CLICKS pur.
      if (optGoal !== "LINK_CLICKS") {
        payload.attribution_spec = [
          { event_type: "CLICK_THROUGH", window_days: 7 },
          { event_type: "VIEW_THROUGH", window_days: 1 },
        ];
      }
      return payload;
    };

    const isOptimizationError = (msg: string) =>
      msg.includes("1870189") ||
      msg.includes("1815143") ||
      msg.includes("1885501") ||
      msg.includes("1885014") ||
      msg.includes("optimization_goal") ||
      msg.includes("custom_event_type") ||
      msg.includes("pixel") ||
      msg.includes("conversion");

    // En mode multi-variantes, les noms sont suffixés " A", " B", " C"
    const isMultiVariant = (input.copyVariants?.length ?? 0) > 1;
    const firstSuffix = isMultiVariant ? " A" : "";

    // effectiveOptGoal / effectiveBilling capturent ce qui a vraiment fonctionné après la cascade.
    // Utile pour les AdSets B, C… qui réutilisent le même optimization_goal sans re-tenter la cascade.
    let effectiveOptGoal = optimizationGoal;
    let effectiveBilling = billingEvent;

    let adset: MetaResource;
    try {
      adset = await metaPost<MetaResource>(
        account,
        `${accountId}/adsets`,
        buildAdsetPayload(optimizationGoal, billingEvent, firstSuffix),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Fallback 1 : LANDING_PAGE_VIEWS si OFFSITE_CONVERSIONS refusé (pas de data Pixel récente)
      if (optimizationGoal === "OFFSITE_CONVERSIONS" && isOptimizationError(msg)) {
        console.log(`[meta.pushCampaign] OFFSITE_CONVERSIONS refusé (${msg.slice(0, 100)}) → fallback LANDING_PAGE_VIEWS`);
        try {
          adset = await metaPost<MetaResource>(
            account,
            `${accountId}/adsets`,
            buildAdsetPayload("LANDING_PAGE_VIEWS", "IMPRESSIONS", firstSuffix),
          );
          effectiveOptGoal = "LANDING_PAGE_VIEWS";
          effectiveBilling = "IMPRESSIONS";
        } catch (e2) {
          const msg2 = e2 instanceof Error ? e2.message : String(e2);
          if (isOptimizationError(msg2)) {
            // Fallback 2 : LINK_CLICKS (sans Advantage+ Audience ni attribution_spec)
            console.log(`[meta.pushCampaign] LANDING_PAGE_VIEWS refusé (${msg2.slice(0, 100)}) → fallback LINK_CLICKS`);
            try {
              adset = await metaPost<MetaResource>(
                account,
                `${accountId}/adsets`,
                buildAdsetPayload("LINK_CLICKS", "IMPRESSIONS", firstSuffix),
              );
              effectiveOptGoal = "LINK_CLICKS";
              effectiveBilling = "IMPRESSIONS";
            } catch (e3) {
              const msg3 = e3 instanceof Error ? e3.message : String(e3);
              console.error(`[meta.pushCampaign] Toute la cascade a échoué : ${msg3.slice(0, 200)}`);
              return {
                ok: false,
                error:
                  "Cette campagne LEADS/SALES n'a pas pu être créée car le Pixel n'a pas encore reçu de données. Solutions : (1) bascule en objectif Notoriété ou Trafic dans la modale, ou (2) installe le Pixel Meta sur ton site de destination et attends quelques jours qu'il collecte des événements.",
                resources,
              };
            }
          } else {
            throw e2;
          }
        }
      } else {
        throw e;
      }
    }

    resources[`adset${firstSuffix ? "_A" : ""}`] = adset.id;

    // 3) AdCreative — Link Ad (page_id fetché en étape 0)
    //    Une image est OBLIGATOIRE pour les Link Ads Meta (pas de format texte seul).
    //    Si absente : subcode 2446496 sur /adcreatives.
    if (!input.imageUrl) {
      return {
        ok: false,
        error:
          "Une image est requise pour publier l'annonce. Génère-la avec l'IA (onglet Builder → \"Générer visuel\") puis relance le push.",
        resources,
      };
    }

    const finalUrl = input.finalUrl ?? "https://wanapush.com";
    const headline = (input.headlines?.[0] ?? input.name).slice(0, 40);
    const description = (input.descriptions?.[0] ?? "").slice(0, 30);
    const primaryText = (input.primaryText ?? headline).slice(0, 125);

    const linkData: Record<string, unknown> = {
      link: finalUrl,
      message: primaryText,
      name: headline,
      call_to_action: { type: mapCTA(input.cta) },
      picture: input.imageUrl,
    };
    // description optionnelle : on n'envoie pas de string vide (Meta rejette)
    if (description) linkData.description = description;

    // Instagram actor_id : auto-détecté depuis la Page FB pour ads cross-platform FB+IG
    const instagramActorId =
      input.instagramActorId ?? (await getInstagramActorId(pageId, account.accessToken));

    const objectStorySpec: Record<string, unknown> = {
      page_id: pageId,
      link_data: linkData,
    };
    if (instagramActorId) objectStorySpec.instagram_actor_id = instagramActorId;

    const creativePayload: Record<string, unknown> = {
      name: `${input.name} – Créa${firstSuffix}`,
      object_story_spec: objectStorySpec,
    };

    if (useAdvCreative) {
      // Advantage+ Creative : Meta améliore titre/image/texte (+14% CPR moyen vs static)
      // Garder uniquement les features documentées en snake_case (Marketing API v25++).
      // ⚠️ Pas de translate_text ici (champ inventé) — la valeur valide est TEXT_OVERLAY_TRANSLATION
      // en UPPERCASE mais elle n'est pas universelle ; on s'en passe.
      creativePayload.degrees_of_freedom_spec = {
        creative_features_spec: {
          standard_enhancements: { enroll_status: "OPT_IN" },
          image_brightness_and_contrast: { enroll_status: "OPT_IN" },
          image_uncrop: { enroll_status: "OPT_IN" },
          image_touchups: { enroll_status: "OPT_IN" },
          text_optimizations: { enroll_status: "OPT_IN" },
        },
      };
    }

    // Tracking specs : injecte le Pixel pour mesurer les conversions (Creative + Ad)
    let trackingSpecs: Array<Record<string, unknown>> | undefined;
    if (objective === "OUTCOME_LEADS" || objective === "OUTCOME_SALES") {
      const pixelId = promotedObject.pixel_id as string | undefined;
      const eventType = promotedObject.custom_event_type as string | undefined;
      if (pixelId && eventType) {
        trackingSpecs = [{ "action.type": ["offsite_conversion"], fb_pixel: [pixelId] }];
        creativePayload.tracking_specs = trackingSpecs;
      }
    }

    // Fallback : Meta refuse souvent degrees_of_freedom_spec (changements API fréquents).
    // À la 1re erreur, on retry sans Advantage+ Creative. Si ça échoue encore, on remonte.
    let creative: MetaResource;
    try {
      creative = await metaPost<MetaResource>(
        account,
        `${accountId}/adcreatives`,
        creativePayload,
      );
    } catch (eCreative) {
      const msg = eCreative instanceof Error ? eCreative.message : String(eCreative);
      if (creativePayload.degrees_of_freedom_spec) {
        console.log(
          `[meta.pushCampaign] AdCreative refusé (${msg.slice(0, 120)}) → retry sans Advantage+ Creative`,
        );
        const fallbackPayload = { ...creativePayload };
        delete fallbackPayload.degrees_of_freedom_spec;
        try {
          creative = await metaPost<MetaResource>(
            account,
            `${accountId}/adcreatives`,
            fallbackPayload,
          );
        } catch (eCreative2) {
          console.error(
            `[meta.pushCampaign] AdCreative refusé même sans Advantage+ Creative`,
          );
          throw eCreative2;
        }
      } else {
        throw eCreative;
      }
    }
    resources[`creative${firstSuffix ? "_A" : ""}`] = creative.id;

    // 4) Ad — avec multi-advertiser ads + tracking_specs hérités du Creative
    const adPayload: Record<string, unknown> = {
      name: `${input.name} – Annonce${firstSuffix}`,
      adset_id: adset.id,
      creative: { creative_id: creative.id },
      status: "PAUSED",
    };
    if (trackingSpecs) adPayload.tracking_specs = trackingSpecs;
    if (useMultiAdv) {
      // Multi-advertiser ads : Meta peut afficher ta pub dans des unités combinées (scale 2026)
      adPayload.multi_advertiser_ads = { has_opted_in_being_shown: true };
    }

    const ad = await metaPost<MetaResource>(account, `${accountId}/ads`, adPayload);
    resources[`ad${firstSuffix ? "_A" : ""}`] = ad.id;

    // ─── Variantes B, C… (A/B test multi-AdSet) ─────────────────────────────────
    // On réutilise effectiveOptGoal (déjà validé par la cascade ci-dessus).
    // Les erreurs par variante sont loggées mais ne font pas échouer le push global.
    if (isMultiVariant && input.copyVariants) {
      for (let vi = 1; vi < input.copyVariants.length; vi++) {
        const letter = String.fromCharCode(65 + vi); // B=66, C=67…
        const vc = input.copyVariants[vi];
        try {
          const adsetN = await metaPost<MetaResource>(
            account,
            `${accountId}/adsets`,
            buildAdsetPayload(effectiveOptGoal, effectiveBilling, ` ${letter}`),
          );
          resources[`adset_${letter}`] = adsetN.id;

          const varHeadline = (vc.headline ?? input.headlines?.[0] ?? input.name).slice(0, 40);
          const varDesc = (vc.description ?? input.descriptions?.[0] ?? "").slice(0, 30);
          const varPrimary = (vc.primaryText ?? input.primaryText ?? varHeadline).slice(0, 125);

          const varLinkData: Record<string, unknown> = {
            link: finalUrl,
            message: varPrimary,
            name: varHeadline,
            call_to_action: { type: mapCTA(vc.cta ?? input.cta) },
            picture: input.imageUrl,
          };
          if (varDesc) varLinkData.description = varDesc;

          const varStorySpec: Record<string, unknown> = { page_id: pageId, link_data: varLinkData };
          if (instagramActorId) varStorySpec.instagram_actor_id = instagramActorId;

          const varCreativePayload: Record<string, unknown> = {
            name: `${input.name} – Créa ${letter}`,
            object_story_spec: varStorySpec,
            ...(trackingSpecs ? { tracking_specs: trackingSpecs } : {}),
          };

          const varCreative = await metaPost<MetaResource>(account, `${accountId}/adcreatives`, varCreativePayload);
          resources[`creative_${letter}`] = varCreative.id;

          const varAd = await metaPost<MetaResource>(account, `${accountId}/ads`, {
            name: `${input.name} – Annonce ${letter}`,
            adset_id: adsetN.id,
            creative: { creative_id: varCreative.id },
            status: "PAUSED",
            ...(trackingSpecs ? { tracking_specs: trackingSpecs } : {}),
            ...(useMultiAdv ? { multi_advertiser_ads: { has_opted_in_being_shown: true } } : {}),
          });
          resources[`ad_${letter}`] = varAd.id;

          console.log(`[meta.pushCampaign] ✓ Variante ${letter} créée (adset=${adsetN.id})`);
        } catch (eVar) {
          const msgVar = eVar instanceof Error ? eVar.message : String(eVar);
          console.error(`[meta.pushCampaign] Variante ${letter} échouée (${msgVar.slice(0, 150)}) — campagne principale OK`);
        }
      }
    }

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

// ─── updateCampaignStatus ─────────────────────────────────────────────────────
async function updateCampaignStatus(
  account: AdAccountInfo,
  externalId: string,
  status: "ACTIVE" | "PAUSED",
): Promise<void> {
  const res = await metaPost<{ id: string }>(account, externalId, { status });
  if (!res?.id) throw new Error(`Meta updateCampaignStatus failed for campaign ${externalId}`);
}

// ─── updateCampaignBudget ─────────────────────────────────────────────────────
// Meta CBO : le budget journalier est en centimes (ex: 15.00 € → 1500).
async function updateCampaignBudget(
  account: AdAccountInfo,
  externalId: string,
  dailyBudget: number,
): Promise<void> {
  const budgetCents = Math.round(dailyBudget * 100);
  if (budgetCents < 100) throw new Error(`Budget trop bas : minimum 1 € (reçu ${dailyBudget} €)`);
  const res = await metaPost<{ id: string }>(account, externalId, { daily_budget: budgetCents });
  if (!res?.id) throw new Error(`Meta updateCampaignBudget failed for campaign ${externalId}`);
}

// ─── Creative Fatigue ─────────────────────────────────────────────────────────
// Appelle l'Insights API pour détecter l'essoufflement créatif sur 7 jours.
// Seuils (recommandations Meta 2026) :
//   < 2.5  → LOW    (pas d'action nécessaire)
//   2.5–4.0 → MEDIUM (préparer de nouveaux visuels cette semaine)
//   ≥ 4.0  → HIGH   (renouveler maintenant — Meta dégrade les perfs en 5-7j)
export type CreativeFatigueLevel = "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";

export interface CreativeFatigueReport {
  level: CreativeFatigueLevel;
  frequency7d: number | null;
  cpm7d: number | null;
  ctr7d: number | null;
  spend7d: number;
  impressions7d: number;
  recommendation: string;
}

export async function getCreativeFatigue(
  account: AdAccountInfo,
  campaignExternalId: string,
): Promise<CreativeFatigueReport> {
  const params = new URLSearchParams({
    fields: "frequency,cpm,ctr,spend,impressions,reach",
    date_preset: "last_7d",
    level: "campaign",
    access_token: account.accessToken,
  });
  const r = await fetch(
    `${GRAPH}/${campaignExternalId}/insights?${params.toString()}`,
  );
  const j = (await r.json()) as {
    data?: Array<{
      frequency?: string;
      cpm?: string;
      ctr?: string;
      spend?: string;
      impressions?: string;
      reach?: string;
    }>;
    error?: { message?: string };
  };

  if (j.error || !j.data?.[0]) {
    return {
      level: "UNKNOWN",
      frequency7d: null,
      cpm7d: null,
      ctr7d: null,
      spend7d: 0,
      impressions7d: 0,
      recommendation: j.error?.message ?? "Pas de données disponibles pour cette campagne.",
    };
  }

  const d = j.data[0];
  const freq = d.frequency ? Number(d.frequency) : null;
  const cpm = d.cpm ? Number(d.cpm) : null;
  const ctr = d.ctr ? Number(d.ctr) : null;
  const spend = d.spend ? Number(d.spend) : 0;
  const impressions = d.impressions ? Number(d.impressions) : 0;

  let level: CreativeFatigueLevel = "LOW";
  let recommendation = "";

  if (freq === null) {
    level = "UNKNOWN";
    recommendation = "Fréquence non disponible — vérifier que la campagne est active.";
  } else if (freq >= 4.0) {
    level = "HIGH";
    recommendation = `Fréquence de ${freq.toFixed(1)} sur 7j — CRITIQUE. Renouveler les visuels immédiatement. Meta dégrade les performances en 5-7j à cette fréquence.`;
  } else if (freq >= 2.5) {
    level = "MEDIUM";
    recommendation = `Fréquence de ${freq.toFixed(1)} sur 7j — ATTENTION. Préparer de nouveaux visuels cette semaine pour éviter la saturation.`;
  } else {
    level = "LOW";
    recommendation = `Fréquence de ${freq.toFixed(1)} sur 7j — OK. Pas d'action nécessaire.`;
  }

  return { level, frequency7d: freq, cpm7d: cpm, ctr7d: ctr, spend7d: spend, impressions7d: impressions, recommendation };
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
  updateCampaignStatus,
  updateCampaignBudget,
};
