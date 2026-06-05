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

async function pushCampaign(
  account: AdAccountInfo,
  input: PushCampaignInput,
): Promise<PushCampaignResult> {
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
    // Google exige un format yyyy-MM-dd pour start_date
    const today = new Date();
    const fmtDate = (d: Date) =>
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    const campaignBody: Record<string, unknown> = {
      name: input.name,
      advertisingChannelType: channelType,
      status: "PAUSED",
      campaignBudget: budgetRes.resourceName,
      startDate: fmtDate(today),
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

export const googleAdsConnector: AdsConnector = {
  platform: "GOOGLE_ADS",
  authorizeUrl,
  exchangeCode,
  refreshToken: refreshTokenFn,
  listCampaigns,
  fetchMetrics,
  pushCampaign,
};
