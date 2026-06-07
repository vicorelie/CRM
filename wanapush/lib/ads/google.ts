// Connecteur Google Ads API.
// Doc : https://developers.google.com/google-ads/api/docs/start
//
// Spécificités Google Ads :
// - Demande un Developer Token (à demander à Google, peut prendre des semaines en mode prod)
// - OAuth via Google Cloud Console
// - Header obligatoire `developer-token` sur chaque requête
// - URL : https://googleads.googleapis.com/{vN}/customers/{customerId}/...
//   (vN = constante GOOGLE_ADS_API plus bas — migrer ici à chaque sunset)
// - Scope: https://www.googleapis.com/auth/adwords
import type {
  AdAccountInfo,
  AdsConnector,
  CampaignSync,
  ConversionAction,
  ConversionActionInput,
  ConversionCategory,
  DailyMetrics,
  PushCampaignInput,
  PushCampaignResult,
} from "./types";

// Codes Google geoTargetConstants (https://developers.google.com/google-ads/api/reference/data/geotargets)
const GEO_TARGETS: Record<string, string> = {
  FR: "geoTargetConstants/2250",
  BE: "geoTargetConstants/2056",
  CH: "geoTargetConstants/2756",
  LU: "geoTargetConstants/2442",
  CA: "geoTargetConstants/2124",
  US: "geoTargetConstants/2840",
  GB: "geoTargetConstants/2826",
  ES: "geoTargetConstants/2724",
  IT: "geoTargetConstants/2380",
  DE: "geoTargetConstants/2276",
  PT: "geoTargetConstants/2620",
  NL: "geoTargetConstants/2528",
};

const SCOPES = ["https://www.googleapis.com/auth/adwords"];
// v20 sunsets 2026-06-10. v24 = avril 2026 release, supportée jusqu'à mi-2027.
// Champs core (campaign, campaign_budget, ad_group, ad_group_ad, segments,
// metrics) inchangés. Breaking changes v24 (video ad required fields,
// video_brand_safety, ShareablePreviewService partial failure) ne touchent
// pas nos endpoints SEARCH + RSA + CPC/CPA/ROAS.
const GOOGLE_ADS_API = "https://googleads.googleapis.com/v24";

function appCreds() {
  const id = process.env.GOOGLE_ADS_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID;
  const secret =
    process.env.GOOGLE_ADS_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!id || !secret || !devToken)
    throw new Error(
      "GOOGLE_ADS_CLIENT_ID/SECRET (ou GOOGLE_CLIENT_ID/SECRET) + GOOGLE_ADS_DEVELOPER_TOKEN requis",
    );
  return { id, secret, devToken };
}

function authorizeUrl(state: string, redirectUri: string): string {
  const { id } = appCreds();
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", id);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("state", state);
  u.searchParams.set("scope", SCOPES.join(" "));
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent");
  return u.toString();
}

async function safeJson<T>(res: Response, label: string): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${label} ${res.status}: ${text.slice(0, 400)}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `${label} a renvoyé du non-JSON (${res.status}): ${text.slice(0, 400)}`,
    );
  }
}

async function exchangeCode(
  code: string,
  redirectUri: string,
): Promise<AdAccountInfo[]> {
  const { id, secret, devToken } = appCreds();
  const tokRes = await fetch("https://oauth2.googleapis.com/token", {
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
  const tok = await safeJson<{
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error_description?: string;
  }>(tokRes, "OAuth token");
  if (!tok.access_token)
    throw new Error(tok.error_description ?? "Échange code Google Ads échoué");

  // Liste les Customer IDs accessibles
  const r = await fetch(`${GOOGLE_ADS_API}/customers:listAccessibleCustomers`, {
    headers: {
      Authorization: `Bearer ${tok.access_token}`,
      "developer-token": devToken,
    },
  });
  const j = await safeJson<{
    resourceNames?: string[];
    error?: { message: string };
  }>(r, "listAccessibleCustomers");
  if (j.error) throw new Error(j.error.message);
  const customers = j.resourceNames ?? [];
  if (customers.length === 0) return [];

  // Pour chaque customer, récupère le détail (devise, timezone, nom, manager flag)
  const accounts: AdAccountInfo[] = [];
  for (const resource of customers) {
    const customerId = resource.replace(/^customers\//, "");
    const detailRes = await fetch(
      `${GOOGLE_ADS_API}/customers/${customerId}/googleAds:searchStream`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tok.access_token}`,
          "developer-token": devToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query:
            "SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone, customer.manager FROM customer LIMIT 1",
        }),
      },
    );
    const dj = (await detailRes.json()) as Array<{
      results?: Array<{
        customer?: {
          id?: string;
          descriptiveName?: string;
          currencyCode?: string;
          timeZone?: string;
          manager?: boolean;
        };
      }>;
    }>;
    const c = dj?.[0]?.results?.[0]?.customer;
    accounts.push({
      externalId: resource,
      name: c?.descriptiveName ?? customerId,
      currency: c?.currencyCode,
      timezone: c?.timeZone,
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token,
      tokenExpiresAt: tok.expires_in
        ? new Date(Date.now() + tok.expires_in * 1000)
        : undefined,
      scopes: SCOPES.join(","),
      meta: { customerId, manager: c?.manager ?? false },
    });
  }

  // Note : login-customer-id (MCC) n'est utilisé QUE pour les comptes child
  // d'un MCC explicitement lié. Si l'utilisateur a un accès direct OAuth, on ne
  // passe rien et Google accepte. Pour activer un MCC, lier les comptes côté
  // Google Ads (Manager → Demande d'accès), puis re-OAuth.
  return accounts;
}

async function refreshTokenFn(account: AdAccountInfo): Promise<AdAccountInfo> {
  if (!account.refreshToken) return account;
  const { id, secret } = appCreds();
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: account.refreshToken,
      client_id: id,
      client_secret: secret,
      grant_type: "refresh_token",
    }).toString(),
  });
  const j = (await r.json()) as { access_token?: string; expires_in?: number };
  if (!j.access_token) return account;
  return {
    ...account,
    accessToken: j.access_token,
    tokenExpiresAt: j.expires_in
      ? new Date(Date.now() + j.expires_in * 1000)
      : undefined,
  };
}

async function gaqlQuery(
  account: AdAccountInfo,
  customerId: string,
  query: string,
): Promise<Array<Record<string, unknown>>> {
  const { devToken } = appCreds();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${account.accessToken}`,
    "developer-token": devToken,
    "Content-Type": "application/json",
  };
  // Pour les comptes advertiser gérés par un MCC, Google exige le header
  // login-customer-id pointant sur le MCC. On le déduit du meta de l'account.
  const loginCustomerId = (account.meta?.loginCustomerId as string | undefined) ??
    (account.meta?.manager === false ? undefined : undefined);
  if (loginCustomerId) headers["login-customer-id"] = loginCustomerId;

  const r = await fetch(
    `${GOOGLE_ADS_API}/customers/${customerId}/googleAds:searchStream`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ query }),
    },
  );
  const text = await r.text();
  if (!r.ok) {
    throw new Error(`gaqlQuery ${r.status} (cust ${customerId}): ${text.slice(0, 400)}`);
  }
  let j: unknown;
  try {
    j = JSON.parse(text);
  } catch {
    throw new Error(`gaqlQuery non-JSON: ${text.slice(0, 400)}`);
  }
  if (Array.isArray(j)) {
    return j.flatMap(
      (chunk: { results?: Array<Record<string, unknown>> }) => chunk.results ?? [],
    );
  }
  const errObj = j as { error?: { message?: string } };
  if (errObj.error?.message) throw new Error(errObj.error.message);
  return [];
}

async function listCampaigns(account: AdAccountInfo): Promise<CampaignSync[]> {
  const customerId = (account.meta?.customerId as string) ?? "";
  const rows = await gaqlQuery(
    account,
    customerId,
    `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, campaign.start_date, campaign.end_date, campaign_budget.amount_micros FROM campaign WHERE campaign.status != 'REMOVED' LIMIT 500`,
  );
  return rows.map((r) => {
    const c = (r.campaign as Record<string, unknown>) ?? {};
    const b = (r.campaignBudget as Record<string, unknown>) ?? {};
    const micros = Number(b.amountMicros ?? 0);
    return {
      externalId: String(c.id ?? ""),
      name: String(c.name ?? ""),
      status: String(c.status ?? ""),
      objective: String(c.advertisingChannelType ?? ""),
      dailyBudget: micros > 0 ? micros / 1_000_000 : undefined,
      startDate: c.startDate ? new Date(String(c.startDate)) : undefined,
      endDate: c.endDate ? new Date(String(c.endDate)) : undefined,
    };
  });
}

async function fetchMetrics(
  account: AdAccountInfo,
  campaignExternalId: string,
  since: Date,
  until: Date,
): Promise<DailyMetrics[]> {
  const customerId = (account.meta?.customerId as string) ?? "";
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const rows = await gaqlQuery(
    account,
    customerId,
    `SELECT segments.date, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.conversions_value FROM campaign WHERE campaign.id = ${Number(campaignExternalId)} AND segments.date BETWEEN '${fmt(since)}' AND '${fmt(until)}'`,
  );
  return rows.map((r) => {
    const seg = (r.segments as Record<string, unknown>) ?? {};
    const m = (r.metrics as Record<string, unknown>) ?? {};
    return {
      date: new Date(String(seg.date ?? "")),
      spend: Number(m.costMicros ?? 0) / 1_000_000,
      impressions: Number(m.impressions ?? 0),
      clicks: Number(m.clicks ?? 0),
      conversions: Number(m.conversions ?? 0),
      revenue: Number(m.conversionsValue ?? 0),
      raw: r,
    };
  });
}

async function mutate(
  account: AdAccountInfo,
  customerId: string,
  resource: string,
  body: Record<string, unknown>,
): Promise<{ resourceName: string; raw: unknown }> {
  const { devToken } = appCreds();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${account.accessToken}`,
    "developer-token": devToken,
    "Content-Type": "application/json",
  };
  const loginCustomerId = account.meta?.loginCustomerId as string | undefined;
  if (loginCustomerId) headers["login-customer-id"] = loginCustomerId;

  const r = await fetch(
    `${GOOGLE_ADS_API}/customers/${customerId}/${resource}:mutate`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    },
  );
  const text = await r.text();
  if (!r.ok) {
    // Tente d'extraire un message + un field path lisibles
    let detail = text.slice(0, 600);
    try {
      const j = JSON.parse(text) as {
        error?: {
          message?: string;
          details?: Array<{
            errors?: Array<{
              errorCode?: Record<string, string>;
              message?: string;
              location?: { fieldPathElements?: Array<{ fieldName?: string; index?: number }> };
            }>;
          }>;
        };
      };
      const errs = j.error?.details?.[0]?.errors ?? [];
      if (errs.length > 0) {
        detail = errs
          .map((e) => {
            const code = Object.values(e.errorCode ?? {})[0];
            const path = (e.location?.fieldPathElements ?? [])
              .map((p) => `${p.fieldName}${p.index !== undefined ? `[${p.index}]` : ""}`)
              .join(".");
            return `${code} on ${path}: ${e.message}`;
          })
          .join(" | ");
      } else if (j.error?.message) {
        detail = j.error.message;
      }
    } catch {
      // garde le text brut
    }
    throw new Error(`mutate ${resource} ${r.status}: ${detail}`);
  }
  let j: unknown;
  try {
    j = JSON.parse(text);
  } catch {
    throw new Error(`mutate ${resource} non-JSON: ${text.slice(0, 400)}`);
  }
  const results = (j as { results?: Array<{ resourceName: string }> }).results ?? [];
  if (results.length === 0)
    throw new Error(`mutate ${resource}: pas de resourceName retourné`);
  return { resourceName: results[0].resourceName, raw: j };
}

// ─── Batched mutate (Performance Max) ───────────────────────────────────
// Pour PMax, Google exige UNE seule requête atomique qui crée Budget + Campaign
// + AssetGroup + Assets + AssetGroupAssets ensemble, en se référant via des
// resourceNames TEMPORAIRES négatifs (-1, -2, -3, …).
// Doc : https://developers.google.com/google-ads/api/samples/add-performance-max-campaign

type MutateOperation = Record<string, unknown>;

async function googleAdsMutateBatch(
  account: AdAccountInfo,
  customerId: string,
  operations: MutateOperation[],
): Promise<Array<Record<string, unknown>>> {
  const { devToken } = appCreds();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${account.accessToken}`,
    "developer-token": devToken,
    "Content-Type": "application/json",
  };
  const loginCustomerId = account.meta?.loginCustomerId as string | undefined;
  if (loginCustomerId) headers["login-customer-id"] = loginCustomerId;

  const r = await fetch(
    `${GOOGLE_ADS_API}/customers/${customerId}/googleAds:mutate`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ mutateOperations: operations }),
    },
  );
  const text = await r.text();
  if (!r.ok) {
    // Format détaillé errors[].errorCode + location pour debug PMax
    let detail = text.slice(0, 800);
    try {
      const j = JSON.parse(text) as {
        error?: {
          message?: string;
          details?: Array<{
            errors?: Array<{
              errorCode?: Record<string, string>;
              message?: string;
              location?: { fieldPathElements?: Array<{ fieldName?: string; index?: number }> };
            }>;
          }>;
        };
      };
      const errs = j.error?.details?.[0]?.errors ?? [];
      if (errs.length > 0) {
        detail = errs
          .map((e) => {
            const code = Object.values(e.errorCode ?? {})[0];
            const path = (e.location?.fieldPathElements ?? [])
              .map((p) => `${p.fieldName}${p.index !== undefined ? `[${p.index}]` : ""}`)
              .join(".");
            return `${code} on ${path}: ${e.message}`;
          })
          .join(" | ");
      } else if (j.error?.message) {
        detail = j.error.message;
      }
    } catch {
      // garde le brut
    }
    throw new Error(`googleAds:mutate ${r.status}: ${detail}`);
  }
  const j = JSON.parse(text) as {
    mutateOperationResponses?: Array<Record<string, unknown>>;
  };
  return j.mutateOperationResponses ?? [];
}

/** Push une campagne Performance Max. Crée tout en une requête atomique :
 *  Budget + Campaign + CampaignCriteria (geo) + Assets (text) + AssetGroup
 *  + AssetGroupAssets. Images doivent être ajoutées séparément côté Google
 *  Ads UI (upload binaire complexe à exposer dans un wizard) — la campagne
 *  reste PAUSED tant que l'user n'a pas ajouté au moins 1 image.
 */
async function pushPmaxCampaign(
  account: AdAccountInfo,
  input: PushCampaignInput,
): Promise<PushCampaignResult> {
  const customerId = (account.meta?.customerId as string) ?? "";
  const resources: Record<string, string> = {};

  try {
    // Resource names temporaires (négatifs, propres à la requête)
    const TMP = {
      budget: `customers/${customerId}/campaignBudgets/-1`,
      campaign: `customers/${customerId}/campaigns/-2`,
      assetGroup: `customers/${customerId}/assetGroups/-3`,
    };

    // Bidding strategy : MAXIMIZE_CONVERSIONS par défaut (recommandé pendant la
    // learning phase 4-6 semaines), TARGET_CPA / TARGET_ROAS sinon.
    const biddingStrategy = (input.biddingStrategy ?? "MAXIMIZE_CONVERSIONS").toUpperCase();
    const campaignBody: Record<string, unknown> = {
      resourceName: TMP.campaign,
      name: input.name,
      advertisingChannelType: "PERFORMANCE_MAX",
      status: "PAUSED",
      campaignBudget: TMP.budget,
      startDate: fmtDate(new Date()),
      containsEuPoliticalAdvertising: "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING",
      // PMax peut bénéficier des asset extensions de la marque (logo, business
      // name, etc.) si on active brandGuidelinesEnabled — pas obligatoire.
    };
    if (biddingStrategy === "MAXIMIZE_CONVERSIONS") {
      campaignBody.maximizeConversions = {};
      if (input.biddingTarget !== undefined) {
        campaignBody.maximizeConversions = {
          targetCpaMicros: String(Math.round(input.biddingTarget * 1_000_000)),
        };
      }
    } else if (biddingStrategy === "TARGET_ROAS" && input.biddingTarget) {
      campaignBody.maximizeConversionValue = { targetRoas: input.biddingTarget };
    } else if (biddingStrategy === "TARGET_CPA" && input.biddingTarget) {
      campaignBody.maximizeConversions = {
        targetCpaMicros: String(Math.round(input.biddingTarget * 1_000_000)),
      };
    } else {
      // PMax n'accepte pas MANUAL_CPC. Fallback safe.
      campaignBody.maximizeConversions = {};
    }
    // Selective optimization si conversions spécifiées
    if ((input.conversionActionIds ?? []).length > 0) {
      campaignBody.selectiveOptimization = {
        conversionActions: input.conversionActionIds!.map(
          (id) => `customers/${customerId}/conversionActions/${id}`,
        ),
      };
    }

    // Construction des opérations dans l'ordre exigé par Google :
    const ops: MutateOperation[] = [];
    let tmpIdx = -4;

    // 1) Budget
    ops.push({
      campaignBudgetOperation: {
        create: {
          resourceName: TMP.budget,
          name: `${input.name} – budget`,
          amountMicros: String(Math.round(input.dailyBudget * 1_000_000)),
          deliveryMethod: "STANDARD",
          explicitlyShared: false,
        },
      },
    });

    // 2) Campagne
    ops.push({ campaignOperation: { create: campaignBody } });

    // 3) Geo targeting (CampaignCriterion)
    for (const c of input.countries ?? []) {
      const geo = GEO_TARGETS[c.toUpperCase()];
      if (!geo) continue;
      ops.push({
        campaignCriterionOperation: {
          create: {
            campaign: TMP.campaign,
            location: { geoTargetConstant: geo },
            negative: false,
          },
        },
      });
    }

    // 4) Text Assets + 5) liens AssetGroupAsset.
    // PMax exige minimum :
    //   - 3 HEADLINE (30 chars max)
    //   - 1 LONG_HEADLINE (90 chars max)
    //   - 2 DESCRIPTION (90 chars max)
    //   - 1 BUSINESS_NAME (25 chars max)
    //   - 1 image MARKETING_IMAGE + 1 SQUARE_MARKETING_IMAGE + 1 LOGO
    // Les 4 premiers sont gérés ici. Les 3 images sont à uploader manuellement
    // côté Google Ads UI (PMax requires images, mais la campagne PAUSED peut
    // être créée sans — Google laisse user-friendly l'ajout d'images).

    const addTextAsset = (text: string, fieldType: string) => {
      const tmp = `customers/${customerId}/assets/${tmpIdx--}`;
      ops.push({
        assetOperation: {
          create: { resourceName: tmp, textAsset: { text } },
        },
      });
      ops.push({
        assetGroupAssetOperation: {
          create: {
            assetGroup: `customers/${customerId}/assetGroups/-3`,
            asset: tmp,
            fieldType,
          },
        },
      });
    };

    // 4a) AssetGroup (créé AVANT ses assets via resourceName tmp — Google gère
    //     les forward refs grâce aux temp IDs négatifs)
    const finalUrls = input.finalUrl ? [input.finalUrl] : [];
    if (finalUrls.length === 0) {
      throw new Error("finalUrl requis pour Performance Max");
    }
    ops.push({
      assetGroupOperation: {
        create: {
          resourceName: TMP.assetGroup,
          name: `${input.name} – Asset Group 1`,
          campaign: TMP.campaign,
          finalUrls,
          finalMobileUrls: finalUrls,
          status: "PAUSED",
        },
      },
    });

    // 4b) Headlines (3-15, max 30 chars)
    const headlines = (input.headlines ?? [])
      .filter((h) => h && h.length <= 30)
      .slice(0, 15);
    if (headlines.length < 3) {
      throw new Error(
        `Performance Max exige au moins 3 headlines ≤ 30 chars (reçu ${headlines.length}).`,
      );
    }
    for (const h of headlines) addTextAsset(h, "HEADLINE");

    // 4c) Long headlines (1-5, max 90 chars) — réutilise la primaryText si
    // descriptive, sinon utilise les descriptions longues comme proxy.
    const longHeadlines = [
      input.primaryText,
      ...(input.descriptions ?? []),
    ]
      .filter((t): t is string => !!t && t.length > 30 && t.length <= 90)
      .slice(0, 5);
    if (longHeadlines.length === 0) {
      // PMax exige ≥1 long headline. On reprend la 1ère headline + un suffixe
      // pour atteindre > 30 chars (rare cas où aucune description longue).
      const fallback = (headlines[0] + " – " + (input.name ?? "")).slice(0, 90);
      if (fallback.length > 30) addTextAsset(fallback, "LONG_HEADLINE");
      else throw new Error("Pas de long headline candidate (> 30 chars).");
    } else {
      for (const lh of longHeadlines) addTextAsset(lh, "LONG_HEADLINE");
    }

    // 4d) Descriptions (2-5, max 90 chars)
    const descriptions = (input.descriptions ?? [])
      .filter((d) => d && d.length <= 90)
      .slice(0, 5);
    if (descriptions.length < 2) {
      throw new Error(
        `Performance Max exige au moins 2 descriptions ≤ 90 chars (reçu ${descriptions.length}).`,
      );
    }
    for (const d of descriptions) addTextAsset(d, "DESCRIPTION");

    // 4e) Business name (≤25 chars). On utilise dsaBeneficiary ou le nom de la
    // campagne tronqué — l'user pourra le corriger côté UI Google.
    const businessName = (input.dsaBeneficiary ?? input.name).slice(0, 25);
    addTextAsset(businessName, "BUSINESS_NAME");

    // 4f) Call-to-action (CTA) — optionnel mais recommandé pour le format
    // Discovery. Pris depuis input.cta s'il est dans la liste autorisée Google
    // (LEARN_MORE, SHOP_NOW, ...) — sinon ignoré.
    // [skip pour MVP, Google met une CTA par défaut]

    // Note : PMax peut prendre AssetGroupSignals (audience hints, search themes)
    // pour aider l'IA Google. Pas exposé en input pour l'instant — sera Sprint 5
    // (Audience signals + Customer Match).

    // Exécution atomique
    const responses = await googleAdsMutateBatch(account, customerId, ops);

    // Le campaignOperation est la 2ème op → on récupère son resourceName final
    const campaignResp = responses[1] as { campaignResult?: { resourceName?: string } };
    const finalCampaignResource = campaignResp.campaignResult?.resourceName ?? TMP.campaign;
    const campaignId = finalCampaignResource.split("/").pop() ?? "";
    resources.campaign = finalCampaignResource;
    resources.budget = (responses[0] as { campaignBudgetResult?: { resourceName?: string } })
      .campaignBudgetResult?.resourceName ?? TMP.budget;

    // Negative keywords au niveau campagne (supportés en PMax depuis jan 2025).
    // Appel séparé après le batch principal car le resourceName final est requis.
    // PMax accepte EXACT, PHRASE et BROAD — on cible EXACT par défaut pour les
    // nouvelles campagnes (contrôle maximum, pas de gaspillage budget).
    const negKw = (input.negativeKeywords ?? []).slice(0, 5000);
    if (negKw.length > 0) {
      try {
        await mutate(account, customerId, "campaignCriteria", {
          operations: negKw.map((k) => ({
            create: {
              campaign: finalCampaignResource,
              negative: true,
              keyword: { text: k.text, matchType: k.matchType ?? "EXACT" },
            },
          })),
        });
        resources.negativeKeywords = String(negKw.length);
      } catch (negErr) {
        console.warn(`[google.pushPmaxCampaign] Negative keywords non ajoutés (non-bloquant) : ${negErr instanceof Error ? negErr.message : negErr}`);
      }
    }

    return {
      ok: true,
      externalId: campaignId,
      externalUrl: `https://ads.google.com/aw/campaigns?campaignId=${campaignId}`,
      resources,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      resources,
    };
  }
}

// Helper format date partagé
function fmtDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

async function pushCampaign(
  account: AdAccountInfo,
  input: PushCampaignInput,
): Promise<PushCampaignResult> {
  const type = (input.campaignType ?? "SEARCH").toUpperCase();
  // Branch Performance Max — flow atomique avec resourceNames temporaires.
  if (type === "PERFORMANCE_MAX") {
    return pushPmaxCampaign(account, input);
  }
  // Branch Demand Gen — remplace Discovery campaigns (sunset déc 2026).
  // Couvre YouTube Shorts/in-stream, Gmail, Google Discover.
  if (type === "DEMAND_GEN" || type === "DISCOVERY") {
    return pushDemandGenCampaign(account, input);
  }

  const customerId = (account.meta?.customerId as string) ?? "";
  const resources: Record<string, string> = {};

  try {
    // 1) Budget journalier (en micros : 1 EUR = 1_000_000 micros)
    const amountMicros = String(Math.round(input.dailyBudget * 1_000_000));
    const budgetRes = await mutate(account, customerId, "campaignBudgets", {
      operations: [
        {
          create: {
            name: `${input.name} – budget`,
            amountMicros,
            deliveryMethod: "STANDARD",
            explicitlyShared: false,
          },
        },
      ],
    });
    resources.budget = budgetRes.resourceName;

    // 2) Campagne (PAUSED par sécurité)
    const channelType = (input.campaignType ?? "SEARCH").toUpperCase();
    const biddingStrategy = (input.biddingStrategy ?? "MANUAL_CPC").toUpperCase();
    // Google exige un format yyyy-MM-dd pour start_date — helper fmtDate plus
    // bas dans le fichier (partagé avec PMax).
    const campaignBody: Record<string, unknown> = {
      name: input.name,
      advertisingChannelType: channelType,
      status: "PAUSED",
      campaignBudget: budgetRes.resourceName,
      startDate: fmtDate(new Date()),
      // Champ obligatoire depuis 2025 (EU Digital Services Act, déclaration politique)
      containsEuPoliticalAdvertising: "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING",
      networkSettings:
        channelType === "SEARCH"
          ? {
              targetGoogleSearch: true,
              targetSearchNetwork: true,
              targetContentNetwork: false,
              targetPartnerSearchNetwork: false,
            }
          : undefined,
    };
    if (biddingStrategy === "MANUAL_CPC") {
      campaignBody.manualCpc = { enhancedCpcEnabled: false };
    } else if (biddingStrategy === "MAXIMIZE_CONVERSIONS") {
      campaignBody.maximizeConversions = {};
    } else if (biddingStrategy === "TARGET_CPA" && input.biddingTarget) {
      campaignBody.targetCpa = {
        targetCpaMicros: String(Math.round(input.biddingTarget * 1_000_000)),
      };
    } else if (biddingStrategy === "TARGET_ROAS" && input.biddingTarget) {
      campaignBody.targetRoas = { targetRoas: input.biddingTarget };
    } else {
      campaignBody.manualCpc = { enhancedCpcEnabled: false };
    }
    const campRes = await mutate(account, customerId, "campaigns", {
      operations: [{ create: campaignBody }],
    });
    resources.campaign = campRes.resourceName;
    const campaignId = campRes.resourceName.split("/").pop()!;

    // 3) Geo targeting (CampaignCriterion)
    if (input.countries && input.countries.length > 0) {
      const geoOps = input.countries
        .filter((c) => GEO_TARGETS[c.toUpperCase()])
        .map((c) => ({
          create: {
            campaign: campRes.resourceName,
            location: { geoTargetConstant: GEO_TARGETS[c.toUpperCase()] },
          },
        }));
      if (geoOps.length > 0) {
        await mutate(account, customerId, "campaignCriteria", {
          operations: geoOps,
        });
      }
    }

    // 4) AdGroup (search ads need at least one)
    if (channelType === "SEARCH") {
      const agRes = await mutate(account, customerId, "adGroups", {
        operations: [
          {
            create: {
              name: `${input.name} – AdGroup 1`,
              campaign: campRes.resourceName,
              type: "SEARCH_STANDARD",
              status: "ENABLED",
              cpcBidMicros: "1000000", // 1 EUR default
            },
          },
        ],
      });
      resources.adGroup = agRes.resourceName;

      // 5) Mots-clés (AdGroupCriterion)
      const kw = (input.keywords ?? []).slice(0, 50);
      if (kw.length > 0) {
        await mutate(account, customerId, "adGroupCriteria", {
          operations: kw.map((k) => ({
            create: {
              adGroup: agRes.resourceName,
              status: "ENABLED",
              keyword: { text: k.text, matchType: k.matchType },
            },
          })),
        });
      }

      // 5bis) Negative keywords au niveau campagne (anti-gaspillage budget).
      // CampaignCriterion avec `negative: true` filtre toute la campagne, peu
      // importe l'AdGroup. À préférer aux AdGroup negatives qui dupliquent le
      // travail si on a plusieurs AdGroups.
      const negKw = (input.negativeKeywords ?? []).slice(0, 5000); // limit Google
      if (negKw.length > 0) {
        await mutate(account, customerId, "campaignCriteria", {
          operations: negKw.map((k) => ({
            create: {
              campaign: campRes.resourceName,
              negative: true,
              keyword: { text: k.text, matchType: k.matchType },
            },
          })),
        });
      }

      // 6) Responsive Search Ad
      const headlines = (input.headlines ?? []).slice(0, 15).filter((h) => h && h.length <= 30);
      const descriptions = (input.descriptions ?? []).slice(0, 4).filter((d) => d && d.length <= 90);
      if (headlines.length >= 3 && descriptions.length >= 2 && input.finalUrl) {
        await mutate(account, customerId, "adGroupAds", {
          operations: [
            {
              create: {
                adGroup: agRes.resourceName,
                status: "ENABLED",
                ad: {
                  finalUrls: [input.finalUrl],
                  responsiveSearchAd: {
                    headlines: headlines.map((text) => ({ text })),
                    descriptions: descriptions.map((text) => ({ text })),
                  },
                },
              },
            },
          ],
        });
      }

      // 7) Asset Extensions (sitelinks, callouts, structured snippets).
      // 2 étapes : créer les Assets, puis les lier à la Campaign via
      // CampaignAsset avec field_type adapté. +10-30% CTR en moyenne.
      const assetOps: Array<Record<string, unknown>> = [];
      const assetMeta: Array<{ type: "SITELINK" | "CALLOUT" | "STRUCTURED_SNIPPET" }> = [];

      for (const sl of (input.sitelinks ?? []).slice(0, 20)) {
        const slAsset: Record<string, unknown> = {
          linkText: sl.linkText.slice(0, 25),
          finalUrls: [sl.finalUrl],
        };
        if (sl.description1) slAsset.description1 = sl.description1.slice(0, 35);
        if (sl.description2) slAsset.description2 = sl.description2.slice(0, 35);
        assetOps.push({ create: { sitelinkAsset: slAsset } });
        assetMeta.push({ type: "SITELINK" });
      }

      for (const co of (input.callouts ?? []).slice(0, 20)) {
        assetOps.push({
          create: { calloutAsset: { calloutText: co.slice(0, 25) } },
        });
        assetMeta.push({ type: "CALLOUT" });
      }

      for (const ss of (input.structuredSnippets ?? []).slice(0, 10)) {
        assetOps.push({
          create: {
            structuredSnippetAsset: {
              header: ss.header,
              values: ss.values.slice(0, 10),
            },
          },
        });
        assetMeta.push({ type: "STRUCTURED_SNIPPET" });
      }

      if (assetOps.length > 0) {
        // Création des Assets (batch)
        const { devToken } = appCreds();
        const r = await fetch(
          `${GOOGLE_ADS_API}/customers/${customerId}/assets:mutate`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${account.accessToken}`,
              "developer-token": devToken,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ operations: assetOps }),
          },
        );
        const j = (await r.json()) as {
          results?: Array<{ resourceName: string }>;
          error?: { message?: string };
        };
        if (j.error) throw new Error(`Assets mutate: ${j.error.message}`);
        const assetResources = j.results ?? [];

        // Liens Asset → Campaign via CampaignAsset
        if (assetResources.length > 0) {
          const linkOps = assetResources.map((a, i) => ({
            create: {
              campaign: campRes.resourceName,
              asset: a.resourceName,
              fieldType: assetMeta[i].type,
            },
          }));
          await mutate(account, customerId, "campaignAssets", {
            operations: linkOps,
          });
        }
      }
    }

    // 8) Lier la campagne aux ConversionActions pour débloquer smart bidding.
    // Sans selectiveOptimization, TARGET_CPA et TARGET_ROAS optimisent sur le
    // pool de conversions par défaut du compte — peu prédictif si le compte a
    // plusieurs goals. Avec selectiveOptimization, on dit "cette campagne se
    // mesure sur CES conversions précises".
    if ((input.conversionActionIds ?? []).length > 0) {
      const convResources = input.conversionActionIds!.map(
        (id) => `customers/${customerId}/conversionActions/${id}`,
      );
      await mutate(account, customerId, "campaigns", {
        operations: [
          {
            update: {
              resourceName: campRes.resourceName,
              selectiveOptimization: { conversionActions: convResources },
            },
            updateMask: "selectiveOptimization",
          },
        ],
      });
    }

    // 9) Google AI Max for Search — l'IA Google génère et teste automatiquement
    // des variantes de titres, descriptions et URLs en plus du RSA existant.
    // Remplace progressivement Dynamic Search Ads (sunset sept 2026). Compatible
    // avec RSA (coexiste). Best practice 2026 : activer dès qu'on a >100 conv./mois.
    if (channelType === "SEARCH" && input.enableAiMax) {
      try {
        await mutate(account, customerId, "campaigns", {
          operations: [
            {
              update: {
                resourceName: campRes.resourceName,
                aiMaxSetting: { enableAiMax: true },
              },
              updateMask: "aiMaxSetting.enableAiMax",
            },
          ],
        });
        resources.aiMax = "enabled";
      } catch (aiMaxErr) {
        // Non-bloquant : la campagne reste fonctionnelle sans AI Max
        console.warn(
          `[google.pushCampaign] AI Max non activé (non-bloquant) : ${aiMaxErr instanceof Error ? aiMaxErr.message : aiMaxErr}`,
        );
      }
    }

    return {
      ok: true,
      externalId: campaignId,
      externalUrl: `https://ads.google.com/aw/campaigns?campaignId=${campaignId}`,
      resources,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      resources,
    };
  }
}

// ─── Demand Gen ──────────────────────────────────────────────────────────────
// Demand Gen = successeur de Discovery Ads (sunset déc 2026). Couvre YouTube
// (Shorts, in-stream), Google Discover, Gmail. Format multi-asset (3-5 titres,
// 2-5 descriptions, marketing image 1.91:1, square image 1:1, logo carré).
// Doc : https://developers.google.com/google-ads/api/docs/campaigns/create-demand-gen
//
// Stratégie : Budget non-shared + Campaign DEMAND_GEN + Geo + AdGroup DG +
// (optionnel) Asset image uploads + Ad demandGenMultiAssetAd.
// Si les images ne sont pas fournies, la campagne reste PAUSED sans Ad — l'user
// doit ajouter l'annonce manuellement dans Google Ads UI.
async function pushDemandGenCampaign(
  account: AdAccountInfo,
  input: PushCampaignInput,
): Promise<PushCampaignResult> {
  const customerId = (account.meta?.customerId as string) ?? "";
  const resources: Record<string, string> = {};

  try {
    // 1) Budget (Demand Gen exige explicitlyShared=false — pas de budget partagé)
    const budgetRes = await mutate(account, customerId, "campaignBudgets", {
      operations: [
        {
          create: {
            name: `${input.name} – budget DG`,
            amountMicros: String(Math.round(input.dailyBudget * 1_000_000)),
            deliveryMethod: "STANDARD",
            explicitlyShared: false,
          },
        },
      ],
    });
    resources.budget = budgetRes.resourceName;

    // 2) Campaign DEMAND_GEN
    const biddingStrategy = (input.biddingStrategy ?? "MAXIMIZE_CONVERSIONS").toUpperCase();
    const campaignBody: Record<string, unknown> = {
      name: input.name,
      advertisingChannelType: "DEMAND_GEN",
      status: "PAUSED",
      campaignBudget: budgetRes.resourceName,
      startDate: fmtDate(new Date()),
      containsEuPoliticalAdvertising: "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING",
    };
    if (biddingStrategy === "TARGET_CPA" && input.biddingTarget) {
      campaignBody.targetCpa = {
        targetCpaMicros: String(Math.round(input.biddingTarget * 1_000_000)),
      };
    } else if (biddingStrategy === "TARGET_ROAS" && input.biddingTarget) {
      campaignBody.maximizeConversionValue = { targetRoas: input.biddingTarget };
    } else {
      campaignBody.maximizeConversions = {};
    }

    const campRes = await mutate(account, customerId, "campaigns", {
      operations: [{ create: campaignBody }],
    });
    resources.campaign = campRes.resourceName;
    const campaignId = campRes.resourceName.split("/").pop()!;

    // 3) Geo targeting
    const countries = input.countries ?? input.geoLocations?.countries ?? [];
    if (countries.length > 0) {
      const geoOps = countries
        .filter((c) => GEO_TARGETS[c.toUpperCase()])
        .map((c) => ({
          create: {
            campaign: campRes.resourceName,
            location: { geoTargetConstant: GEO_TARGETS[c.toUpperCase()] },
          },
        }));
      if (geoOps.length > 0) {
        await mutate(account, customerId, "campaignCriteria", { operations: geoOps });
      }
    }

    // 4) AdGroup Demand Gen
    const agRes = await mutate(account, customerId, "adGroups", {
      operations: [
        {
          create: {
            name: `${input.name} – DG Groupe`,
            campaign: campRes.resourceName,
            type: "DEMAND_GEN_MULTI_ASSET_AD",
            status: "ENABLED",
            demandGenAdGroupSettings: {
              channelControls: { channelStrategy: "ALL_CHANNELS" },
            },
          },
        },
      ],
    });
    resources.adGroup = agRes.resourceName;

    // 5) Image assets + Ad (best-effort — sans images la campagne PAUSED reste utilisable)
    const images = input.demandGenImages ?? [];
    const marketingUrls = images.filter((i) => i.type === "MARKETING").map((i) => i.url);
    const squareUrls = images.filter((i) => i.type === "SQUARE").map((i) => i.url);
    const logoUrls = images.filter((i) => i.type === "LOGO").map((i) => i.url);
    // Fallback : si pas d'images explicites mais imageUrl générique → la traite comme MARKETING
    if (marketingUrls.length === 0 && input.imageUrl) marketingUrls.push(input.imageUrl);

    const headlines = (input.headlines ?? [])
      .filter((h) => h && h.length <= 40)
      .slice(0, 5);
    const descriptions = (input.descriptions ?? [])
      .filter((d) => d && d.length <= 90)
      .slice(0, 5);
    const businessName = (input.dsaBeneficiary ?? input.name).slice(0, 25);

    const hasMinAssets =
      headlines.length >= 3 &&
      descriptions.length >= 2 &&
      marketingUrls.length >= 1 &&
      squareUrls.length >= 1 &&
      !!input.finalUrl;

    if (hasMinAssets) {
      try {
        const uploadImageAsset = async (url: string): Promise<string> => {
          const res = await mutate(account, customerId, "assets", {
            operations: [
              { create: { imageAsset: { fullSizeImageUrl: url } } },
            ],
          });
          return res.resourceName;
        };

        // Upload en parallèle (max 3 images)
        const [marketingRn, squareRn, logoRn] = await Promise.all([
          uploadImageAsset(marketingUrls[0]),
          uploadImageAsset(squareUrls[0]),
          logoUrls.length > 0 ? uploadImageAsset(logoUrls[0]) : Promise.resolve(null),
        ]);

        const demandGenAd: Record<string, unknown> = {
          headlines: headlines.map((text) => ({ text })),
          descriptions: descriptions.map((text) => ({ text })),
          businessName,
          marketingImages: [{ asset: marketingRn }],
          squareMarketingImages: [{ asset: squareRn }],
        };
        if (logoRn) demandGenAd.logoImages = [{ asset: logoRn }];

        await mutate(account, customerId, "adGroupAds", {
          operations: [
            {
              create: {
                adGroup: agRes.resourceName,
                status: "ENABLED",
                ad: {
                  finalUrls: [input.finalUrl!],
                  demandGenMultiAssetAd: demandGenAd,
                },
              },
            },
          ],
        });
        resources.ad = "created";
      } catch (adErr) {
        console.warn(
          `[google.pushDemandGenCampaign] Ad non créée (non-bloquant) : ${adErr instanceof Error ? adErr.message : adErr}`,
        );
        resources.adHint = "Ajouter l'annonce manuellement dans Google Ads UI";
      }
    } else {
      resources.adHint =
        "Annonce non créée — il manque 3+ titres, 2+ descriptions, 1 image MARKETING + 1 SQUARE + finalUrl";
    }

    return {
      ok: true,
      externalId: campaignId,
      externalUrl: `https://ads.google.com/aw/campaigns?campaignId=${campaignId}`,
      resources,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      resources,
    };
  }
}

// ─── Conversion tracking ──────────────────────────────────────────────────
// Création + lecture des ConversionActions Google Ads. La création retourne
// l'ID + le snippet à coller sur le site du client (global_site_tag + event
// snippet). Sans ces ConversionActions, les bidding strategies smart (TARGET_CPA
// et TARGET_ROAS) ne peuvent pas fonctionner — elles ont besoin d'historique
// pour apprendre. C'est LE prérequis #1 du smart bidding 2026.

const CATEGORY_MAP: Record<ConversionCategory, string> = {
  PURCHASE: "PURCHASE",
  LEAD: "LEAD",
  SIGN_UP: "SIGNUP",
  BOOK_APPOINTMENT: "BOOK_APPOINTMENT",
  REQUEST_QUOTE: "REQUEST_QUOTE",
  GET_DIRECTIONS: "GET_DIRECTIONS",
  OUTBOUND_CLICK: "OUTBOUND_CLICK",
  CONTACT: "CONTACT",
  PAGE_VIEW: "PAGE_VIEW",
  DEFAULT: "DEFAULT",
};

function parseConversionRow(
  r: Record<string, unknown>,
  resourceName: string,
): ConversionAction {
  const c = (r.conversionAction as Record<string, unknown>) ?? {};
  const valueSettings = (c.valueSettings as Record<string, unknown>) ?? {};
  const snippets =
    ((c.tagSnippets as Array<Record<string, unknown>>) ?? []).find(
      (s) => (s.type as string) === "WEBPAGE",
    ) ?? {};

  // GAQL renvoie metrics.all_conversions et segments.conversion_action_name
  // si on les sélectionne — sinon undefined. On parse defensively.
  const metrics = (r.metrics as Record<string, unknown>) ?? {};

  return {
    id: String(c.id ?? resourceName.split("/").pop() ?? ""),
    resourceName,
    name: String(c.name ?? ""),
    category: String(c.category ?? ""),
    type: String(c.type ?? ""),
    status: String(c.status ?? ""),
    globalSiteTag: snippets.globalSiteTag as string | undefined,
    eventSnippet: snippets.eventSnippet as string | undefined,
    conversionCount:
      metrics.allConversions !== undefined
        ? Number(metrics.allConversions)
        : undefined,
    // valueSettings absent par défaut sur le retour GAQL — c'est ok.
    lastConversionAt: undefined,
  };
}

async function listConversionActions(
  account: AdAccountInfo,
): Promise<ConversionAction[]> {
  const customerId = (account.meta?.customerId as string) ?? "";
  const rows = await gaqlQuery(
    account,
    customerId,
    `SELECT
       conversion_action.id,
       conversion_action.resource_name,
       conversion_action.name,
       conversion_action.category,
       conversion_action.type,
       conversion_action.status,
       conversion_action.tag_snippets
     FROM conversion_action
     WHERE conversion_action.status != 'REMOVED'
     ORDER BY conversion_action.id DESC
     LIMIT 100`,
  );
  return rows.map((r) => {
    const c = (r.conversionAction as Record<string, unknown>) ?? {};
    return parseConversionRow(r, String(c.resourceName ?? ""));
  });
}

async function getConversionAction(
  account: AdAccountInfo,
  id: string,
): Promise<ConversionAction | null> {
  const customerId = (account.meta?.customerId as string) ?? "";
  const rows = await gaqlQuery(
    account,
    customerId,
    `SELECT
       conversion_action.id,
       conversion_action.resource_name,
       conversion_action.name,
       conversion_action.category,
       conversion_action.type,
       conversion_action.status,
       conversion_action.tag_snippets
     FROM conversion_action
     WHERE conversion_action.id = ${Number(id)}
     LIMIT 1`,
  );
  if (rows.length === 0) return null;
  const c = (rows[0].conversionAction as Record<string, unknown>) ?? {};
  return parseConversionRow(rows[0], String(c.resourceName ?? ""));
}

async function createConversionAction(
  account: AdAccountInfo,
  input: ConversionActionInput,
): Promise<ConversionAction> {
  const customerId = (account.meta?.customerId as string) ?? "";

  // Construction du payload — `type: WEBPAGE` = tracking via gtag/event snippet.
  // Pour offline / app conversions, ce serait UPLOAD_CALLS, UPLOAD_CLICKS, etc.
  // — pas couvert pour l'instant (rare en MVP).
  const body: Record<string, unknown> = {
    name: input.name,
    type: "WEBPAGE",
    category: CATEGORY_MAP[input.category] ?? "DEFAULT",
    status: "ENABLED",
    // ONE_PER_CLICK = compte 1 conversion max par clic (typique LEAD/SIGN_UP).
    // Pour PURCHASE, utiliser MANY_PER_CLICK (multi-achats sur même session).
    countingType:
      input.category === "PURCHASE" ? "MANY_PER_CLICK" : "ONE_PER_CLICK",
    clickThroughLookbackWindowDays: input.clickThroughLookbackWindowDays ?? 30,
    viewThroughLookbackWindowDays: input.viewThroughLookbackWindowDays ?? 1,
    includeInConversionsMetric: true,
    includeInClientAccountConversionsMetric: true,
  };
  if (input.defaultValue !== undefined) {
    body.valueSettings = {
      defaultValue: input.defaultValue,
      defaultCurrencyCode:
        input.defaultCurrencyCode ?? account.currency ?? "EUR",
      alwaysUseDefaultValue: input.alwaysUseDefaultValue ?? false,
    };
  }

  const res = await mutate(account, customerId, "conversionActions", {
    operations: [{ create: body }],
  });
  const id = res.resourceName.split("/").pop() ?? "";

  // L'event_snippet n'est pas retourné par la mutate — il faut GET pour le
  // récupérer après création. Retry 1 fois si Google met du temps à propager.
  let action = await getConversionAction(account, id);
  if (!action || (!action.globalSiteTag && !action.eventSnippet)) {
    await new Promise((r) => setTimeout(r, 1500));
    action = await getConversionAction(account, id);
  }
  if (!action) {
    throw new Error(
      `ConversionAction créée (${id}) mais introuvable au refetch — réessayez dans 30s.`,
    );
  }
  return action;
}

// ─── updateCampaignStatus ─────────────────────────────────────────────────────
async function updateCampaignStatus(
  account: AdAccountInfo,
  externalId: string,
  status: "ACTIVE" | "PAUSED",
): Promise<void> {
  const customerId = (account.meta?.customerId as string) ?? "";
  if (!customerId) throw new Error("customerId manquant dans account.meta");
  const googleStatus = status === "ACTIVE" ? "ENABLED" : "PAUSED";
  await mutate(account, customerId, "campaigns", {
    operations: [
      {
        update: {
          resource_name: `customers/${customerId}/campaigns/${externalId}`,
          status: googleStatus,
        },
        update_mask: { paths: ["status"] },
      },
    ],
  });
}

// ─── updateCampaignBudget ─────────────────────────────────────────────────────
// Étape 1 : retrouver le resourceName du CampaignBudget lié à la campagne.
// Étape 2 : PATCH le budget (amount_micros = dailyBudget * 1_000_000).
async function updateCampaignBudget(
  account: AdAccountInfo,
  externalId: string,
  dailyBudget: number,
): Promise<void> {
  const customerId = (account.meta?.customerId as string) ?? "";
  if (!customerId) throw new Error("customerId manquant dans account.meta");
  if (dailyBudget < 0.01) throw new Error(`Budget trop bas : minimum 0.01 (reçu ${dailyBudget})`);

  // 1) Récupérer le budgetResourceName
  const rows = await gaqlQuery(
    account,
    customerId,
    `SELECT campaign.campaign_budget FROM campaign WHERE campaign.id = ${Number(externalId)}`,
  );
  const budgetResourceName = (rows[0]?.campaign as Record<string, string> | undefined)?.campaignBudget;
  if (!budgetResourceName) {
    throw new Error(`Budget introuvable pour la campagne Google Ads ${externalId}`);
  }

  // 2) Mettre à jour le montant (en micros)
  const amountMicros = Math.round(dailyBudget * 1_000_000);
  await mutate(account, customerId, "campaignBudgets", {
    operations: [
      {
        update: {
          resource_name: budgetResourceName,
          amount_micros: amountMicros,
        },
        update_mask: { paths: ["amount_micros"] },
      },
    ],
  });
}

export const googleAdsConnector: AdsConnector = {
  platform: "GOOGLE_ADS",
  authorizeUrl,
  exchangeCode,
  refreshToken: refreshTokenFn,
  listCampaigns,
  fetchMetrics,
  pushCampaign,
  createConversionAction,
  listConversionActions,
  getConversionAction,
  updateCampaignStatus,
  updateCampaignBudget,
};
