// Connecteur Facebook (Pages) via Meta Graph API.
// Une connexion Facebook génère 1 compte par Page administrée.
// Pour Instagram, voir lib/social/instagram.ts (Instagram Business Login direct).
// Doc : https://developers.facebook.com/docs/pages-api/
import { encrypt } from "@/lib/crypto";
import type {
  ConnectorAccount,
  Metrics,
  PublishInput,
  PublishResult,
  SocialConnector,
} from "./types";

const GRAPH = "https://graph.facebook.com/v25.0";

function appCreds() {
  const id = process.env.META_APP_ID;
  const secret = process.env.META_APP_SECRET;
  if (!id || !secret) throw new Error("META_APP_ID/META_APP_SECRET non définis");
  return { id, secret };
}

// Scopes ne sont PLUS demandés via l'URL OAuth quand on utilise "Facebook Login
// for Business" — les permissions sont définies dans la Login Configuration côté
// Meta dashboard, identifiée par META_LOGIN_CONFIG_ID. On garde la liste ici
// uniquement pour mémoire (utilisée dans la colonne `scopes` de SocialAccount).
const FB_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "pages_manage_metadata",
  "pages_manage_engagement",
  "business_management",
  "read_insights",
];

export function fbAuthorizeUrl(state: string, redirectUri: string): string {
  const { id } = appCreds();
  const configId = process.env.META_LOGIN_CONFIG_ID;
  const u = new URL("https://www.facebook.com/v25.0/dialog/oauth");
  u.searchParams.set("client_id", id);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("state", state);
  u.searchParams.set("response_type", "code");
  if (configId) {
    // Facebook Login for Business → permissions définies dans la config Meta
    u.searchParams.set("config_id", configId);
  } else {
    // Fallback : ancien Facebook Login standard avec scope= explicite
    u.searchParams.set("scope", FB_SCOPES.join(","));
  }
  return u.toString();
}

export async function fbExchangeCode(
  code: string,
  redirectUri: string,
): Promise<ConnectorAccount[]> {
  const { id, secret } = appCreds();

  // 1) Code → short-lived user token
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

  // 2) Long-lived token (~60 jours)
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
    error?: { message: string };
  };
  const userToken = longJson.access_token ?? tokJson.access_token;

  // 3) Liste des Pages — avec Facebook Login for Business, /me/accounts retourne
  // souvent vide. On combine 2 sources et on déduplique par page id :
  //   a) /me/accounts (pages où l'user est admin direct, hors business)
  //   b) /me/businesses puis /{biz_id}/owned_pages + /{biz_id}/client_pages
  //      (pages accessibles via les portfolios accordés)
  type PageRaw = {
    id: string;
    name: string;
    username?: string;
    access_token: string;
    picture?: { data?: { url?: string } };
  };
  const PAGE_FIELDS = "id,name,username,access_token,picture{url}";
  const collected = new Map<string, PageRaw>();

  // a) /me/accounts
  const meAccRes = await fetch(
    `${GRAPH}/me/accounts?fields=${PAGE_FIELDS}&limit=100&access_token=${encodeURIComponent(userToken)}`,
  );
  const meAccJson = (await meAccRes.json()) as { data?: PageRaw[]; error?: { message: string } };
  for (const p of meAccJson.data ?? []) collected.set(p.id, p);

  // b) businesses → owned_pages + client_pages
  const bizRes = await fetch(
    `${GRAPH}/me/businesses?fields=id,name&access_token=${encodeURIComponent(userToken)}`,
  );
  const bizJson = (await bizRes.json()) as {
    data?: Array<{ id: string; name: string }>;
    error?: { message: string };
  };
  for (const biz of bizJson.data ?? []) {
    const [ownedRes, clientRes] = await Promise.all([
      fetch(
        `${GRAPH}/${biz.id}/owned_pages?fields=${PAGE_FIELDS}&limit=100&access_token=${encodeURIComponent(userToken)}`,
      ),
      fetch(
        `${GRAPH}/${biz.id}/client_pages?fields=${PAGE_FIELDS}&limit=100&access_token=${encodeURIComponent(userToken)}`,
      ),
    ]);
    const [ownedJson, clientJson] = (await Promise.all([ownedRes.json(), clientRes.json()])) as [
      { data?: PageRaw[]; error?: { message: string } },
      { data?: PageRaw[]; error?: { message: string } },
    ];
    console.log(
      `[fbExchangeCode] biz "${biz.name}" (${biz.id}) owned_pages:`,
      JSON.stringify(ownedJson),
    );
    console.log(
      `[fbExchangeCode] biz "${biz.name}" (${biz.id}) client_pages:`,
      JSON.stringify(clientJson),
    );
    for (const p of ownedJson.data ?? []) collected.set(p.id, p);
    for (const p of clientJson.data ?? []) collected.set(p.id, p);
  }

  // owned_pages/client_pages ne retournent PAS le page-access-token avec un user token
  // (limitation API Meta). On le récupère pour chaque page via un appel séparé. Si Meta
  // refuse pour certaines pages, on utilise le userToken en fallback (moins propre car
  // expire dans ~60j vs page token qui n'expire jamais, mais ça débloque le MVP).
  for (const [pageId, p] of Array.from(collected.entries())) {
    if (p.access_token) continue;
    const r = await fetch(
      `${GRAPH}/${pageId}?fields=access_token&access_token=${encodeURIComponent(userToken)}`,
    );
    const j = (await r.json()) as { access_token?: string; error?: { message: string } };
    if (j.access_token) p.access_token = j.access_token;
    else {
      console.log(
        `[fbExchangeCode] no access_token for page ${p.name} (${pageId}), using userToken fallback. Error:`,
        j.error?.message,
      );
      p.access_token = userToken;
    }
  }

  const pages = Array.from(collected.values());
  console.log(
    `[fbExchangeCode] collected ${pages.length} pages (me/accounts: ${meAccJson.data?.length ?? 0}, businesses: ${bizJson.data?.length ?? 0})`,
  );
  if (pages.length === 0) {
    throw new Error(
      "Aucune Page Facebook accordée. Cochez explicitement une Page dans l'écran Meta « Choisir les éléments : Pages » (cliquez « Modifier les paramètres » dans la popup OAuth Facebook), puis recommencez.",
    );
  }

  return pages.map((p) => ({
    accountId: p.id,
    username: p.username ?? p.name,
    displayName: p.name,
    avatarUrl: p.picture?.data?.url,
    accessToken: p.access_token,
    scopes: FB_SCOPES.join(","),
    // userToken chiffré au repos (audit H6) : meta n'est PAS chiffré globalement,
    // et un user token FB peut générer des page tokens / lire le portfolio. Champ
    // suffixé `Enc` pour signaler aux lecteurs futurs qu'il faut decrypt() avant usage.
    meta: { kind: "page", pageId: p.id, userTokenEnc: encrypt(userToken) },
  }));
}

async function publishFacebook(
  account: ConnectorAccount,
  input: PublishInput,
): Promise<PublishResult> {
  const pageId = (account.meta?.pageId as string) ?? account.accountId;
  const token = account.accessToken;
  const message =
    input.caption + (input.options?.hashtags?.length ? "\n\n" + input.options.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ") : "");

  if (input.media.length === 0) {
    const r = await fetch(`${GRAPH}/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, access_token: token }),
    });
    const j = (await r.json()) as { id?: string; error?: { message: string } };
    if (!j.id) return { ok: false, error: j.error?.message ?? "Erreur publication FB" };
    return { ok: true, externalId: j.id, externalUrl: `https://facebook.com/${j.id}` };
  }

  if (input.media.length === 1) {
    const m = input.media[0];
    const endpoint = m.type === "video" ? "videos" : "photos";
    const body: Record<string, unknown> = {
      [m.type === "video" ? "file_url" : "url"]: m.url,
      access_token: token,
    };
    if (m.type === "video") body.description = message;
    else body.caption = message;
    const r = await fetch(`${GRAPH}/${pageId}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = (await r.json()) as { id?: string; post_id?: string; error?: { message: string } };
    const id = j.post_id ?? j.id;
    if (!id) return { ok: false, error: j.error?.message ?? "Erreur publication FB" };
    return { ok: true, externalId: id, externalUrl: `https://facebook.com/${id}` };
  }

  // Multi-media → upload chacun en unpublished puis attache au post
  const mediaIds: string[] = [];
  for (const m of input.media) {
    if (m.type !== "image") continue; // FB multi-photo only
    const r = await fetch(`${GRAPH}/${pageId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: m.url, published: false, access_token: token }),
    });
    const j = (await r.json()) as { id?: string; error?: { message: string } };
    if (j.id) mediaIds.push(j.id);
  }
  const r = await fetch(`${GRAPH}/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      attached_media: mediaIds.map((id) => ({ media_fbid: id })),
      access_token: token,
    }),
  });
  const j = (await r.json()) as { id?: string; error?: { message: string } };
  if (!j.id) return { ok: false, error: j.error?.message ?? "Erreur publication FB" };
  return { ok: true, externalId: j.id, externalUrl: `https://facebook.com/${j.id}` };
}

async function fetchFbMetrics(account: ConnectorAccount, externalId: string): Promise<Metrics> {
  const token = account.accessToken;
  // Meta a beaucoup remanié les metric names FB Page en 2024-2025.
  // Approche : on tente chaque métrique séparément (les invalides échouent sans casser les autres).
  // On complète les likes/comments/shares depuis l'API likes/comments du post lui-même.
  const m: Metrics = { raw: {} };
  const raw: Record<string, unknown> = {};

  async function tryMetric(name: string): Promise<number | null> {
    const r = await fetch(
      `${GRAPH}/${externalId}/insights?metric=${name}&access_token=${encodeURIComponent(token)}`,
    );
    const j = (await r.json()) as {
      data?: Array<{ values: Array<{ value: unknown }> }>;
      error?: { message: string };
    };
    raw[name] = j;
    if (j.error || !j.data?.[0]) return null;
    return Number((j.data[0].values?.[0]?.value as number) ?? 0);
  }

  const [impr, reach] = await Promise.all([
    tryMetric("post_impressions"),
    tryMetric("post_impressions_unique"),
  ]);
  if (impr !== null) m.impressions = impr;
  if (reach !== null) m.reach = reach;

  // Likes / comments / shares en lecture directe sur le post (pas via insights)
  const sumRes = await fetch(
    `${GRAPH}/${externalId}?fields=likes.summary(true),comments.summary(true),shares&access_token=${encodeURIComponent(token)}`,
  );
  const sum = (await sumRes.json()) as {
    likes?: { summary?: { total_count?: number } };
    comments?: { summary?: { total_count?: number } };
    shares?: { count?: number };
    error?: { message: string };
  };
  raw.summary = sum;
  if (sum.likes?.summary?.total_count !== undefined)
    m.likes = sum.likes.summary.total_count;
  if (sum.comments?.summary?.total_count !== undefined)
    m.comments = sum.comments.summary.total_count;
  if (sum.shares?.count !== undefined) m.shares = sum.shares.count;

  m.raw = raw;
  return m;
}

export const facebookConnector: SocialConnector = {
  platform: "FACEBOOK",
  authorizeUrl: fbAuthorizeUrl,
  exchangeCode: fbExchangeCode,
  publish: publishFacebook,
  fetchMetrics: fetchFbMetrics,
};
