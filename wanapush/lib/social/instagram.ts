// Connecteur Instagram via Instagram Business Login (api.instagram.com / graph.instagram.com).
// Indépendant de Facebook : OAuth direct, App ID + Secret séparés (sub-app "wanapush-IG").
// Doc : https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login
import type {
  ConnectorAccount,
  Metrics,
  PublishInput,
  PublishResult,
  SocialConnector,
} from "./types";

const GRAPH = "https://graph.instagram.com/v24.0";
// Scopes alignés sur l'URL officielle générée par le dashboard Meta (sub-app WanaPush-IG).
const SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
  "instagram_business_content_publish",
  "instagram_business_manage_insights",
];

function appCreds() {
  const id = process.env.INSTAGRAM_APP_ID;
  const secret = process.env.INSTAGRAM_APP_SECRET;
  if (!id || !secret) throw new Error("INSTAGRAM_APP_ID/SECRET non définis");
  return { id, secret };
}

export function igAuthorizeUrl(state: string, redirectUri: string): string {
  const { id } = appCreds();
  // URL alignée sur celle générée par le dashboard Meta (sub-app WanaPush-IG, étape 4).
  // Paramètres inconnus (ex. enable_fb_login, force_authentication) provoquent un redirect
  // silencieux vers instagram.com/ au lieu d'afficher la page d'autorisation.
  // Pas de force_reauth=true : avec 2FA push activée, la confirmation via notif termine
  // le re-login mais Instagram redirige vers la home au lieu de revenir au flow OAuth.
  const u = new URL("https://www.instagram.com/oauth/authorize");
  u.searchParams.set("client_id", id);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", SCOPES.join(","));
  u.searchParams.set("state", state);
  return u.toString();
}

export async function igExchangeCode(
  code: string,
  redirectUri: string,
): Promise<ConnectorAccount[]> {
  const { id, secret } = appCreds();

  // 1) Code → short-lived token
  const tokRes = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: id,
      client_secret: secret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    }).toString(),
  });
  const tokJson = (await tokRes.json()) as {
    access_token?: string;
    user_id?: string | number;
    permissions?: string[];
    error_message?: string;
  };
  if (!tokJson.access_token)
    throw new Error(tokJson.error_message ?? "Échange code Instagram échoué");

  // 2) Long-lived token (~60 jours)
  const longRes = await fetch(
    `${GRAPH}/access_token?` +
      new URLSearchParams({
        grant_type: "ig_exchange_token",
        client_secret: secret,
        access_token: tokJson.access_token,
      }).toString(),
  );
  const longJson = (await longRes.json()) as {
    access_token?: string;
    expires_in?: number;
    token_type?: string;
  };
  const accessToken = longJson.access_token ?? tokJson.access_token;
  const expiresAt = longJson.expires_in
    ? new Date(Date.now() + longJson.expires_in * 1000)
    : undefined;

  // 3) Profil
  const meRes = await fetch(
    `${GRAPH}/me?fields=user_id,username,name,account_type,profile_picture_url&access_token=${encodeURIComponent(accessToken)}`,
  );
  const me = (await meRes.json()) as {
    user_id?: string;
    id?: string;
    username?: string;
    name?: string;
    account_type?: string;
    profile_picture_url?: string;
  };
  const accountId = String(me.user_id ?? me.id ?? tokJson.user_id ?? "");
  if (!accountId) throw new Error("Impossible de lire le user_id Instagram");

  return [
    {
      accountId,
      username: me.username,
      displayName: me.name ?? me.username,
      avatarUrl: me.profile_picture_url,
      accessToken,
      tokenExpiresAt: expiresAt,
      scopes: (tokJson.permissions ?? SCOPES).join(","),
      meta: { igUserId: accountId, accountType: me.account_type },
    },
  ];
}

// Refresh des long-lived tokens (avant expiration). Fenêtre : token doit être valide ET avoir au moins 24h de vie.
export async function igRefreshToken(account: ConnectorAccount): Promise<ConnectorAccount> {
  const r = await fetch(
    `${GRAPH}/refresh_access_token?` +
      new URLSearchParams({
        grant_type: "ig_refresh_token",
        access_token: account.accessToken,
      }).toString(),
  );
  const j = (await r.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!j.access_token) return account;
  return {
    ...account,
    accessToken: j.access_token,
    tokenExpiresAt: j.expires_in ? new Date(Date.now() + j.expires_in * 1000) : undefined,
  };
}

async function publish(
  account: ConnectorAccount,
  input: PublishInput,
): Promise<PublishResult> {
  const igId = (account.meta?.igUserId as string) ?? account.accountId;
  const token = account.accessToken;
  if (input.media.length === 0)
    return { ok: false, error: "Instagram exige au moins une image ou vidéo" };

  const caption =
    input.caption +
    (input.options?.hashtags?.length
      ? "\n\n" +
        input.options.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")
      : "");

  // Single media
  if (input.media.length === 1) {
    const m = input.media[0];
    const params = new URLSearchParams({ caption, access_token: token });
    if (m.type === "video") {
      params.set("media_type", "REELS");
      params.set("video_url", m.url);
    } else {
      params.set("image_url", m.url);
    }
    const r = await fetch(`${GRAPH}/${igId}/media?${params.toString()}`, {
      method: "POST",
    });
    const j = (await r.json()) as { id?: string; error?: { message: string } };
    if (!j.id)
      return { ok: false, error: j.error?.message ?? "Erreur création container IG" };

    if (m.type === "video") {
      // Polling status (Reels prennent du temps)
      for (let i = 0; i < 20; i++) {
        await new Promise((res) => setTimeout(res, 3000));
        const s = await fetch(
          `${GRAPH}/${j.id}?fields=status_code&access_token=${encodeURIComponent(token)}`,
        );
        const sj = (await s.json()) as { status_code?: string };
        if (sj.status_code === "FINISHED") break;
        if (sj.status_code === "ERROR")
          return { ok: false, error: "Traitement vidéo Instagram échoué" };
      }
    }

    const pub = await fetch(`${GRAPH}/${igId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: j.id, access_token: token }),
    });
    const pubJ = (await pub.json()) as { id?: string; error?: { message: string } };
    if (!pubJ.id)
      return { ok: false, error: pubJ.error?.message ?? "Publication Instagram échouée" };
    return {
      ok: true,
      externalId: pubJ.id,
      externalUrl: account.username
        ? `https://www.instagram.com/${account.username}/`
        : undefined,
    };
  }

  // Carousel (mix images + vidéos jusqu'à 10)
  const childIds: string[] = [];
  for (const m of input.media) {
    const params = new URLSearchParams({
      is_carousel_item: "true",
      access_token: token,
    });
    if (m.type === "video") {
      params.set("media_type", "VIDEO");
      params.set("video_url", m.url);
    } else {
      params.set("image_url", m.url);
    }
    const r = await fetch(`${GRAPH}/${igId}/media?${params.toString()}`, {
      method: "POST",
    });
    const j = (await r.json()) as { id?: string };
    if (j.id) childIds.push(j.id);
  }

  if (childIds.length === 0)
    return { ok: false, error: "Aucun média carousel n'a pu être créé" };

  const containerR = await fetch(
    `${GRAPH}/${igId}/media?` +
      new URLSearchParams({
        media_type: "CAROUSEL",
        children: childIds.join(","),
        caption,
        access_token: token,
      }).toString(),
    { method: "POST" },
  );
  const containerJ = (await containerR.json()) as {
    id?: string;
    error?: { message: string };
  };
  if (!containerJ.id)
    return {
      ok: false,
      error: containerJ.error?.message ?? "Création carousel IG échouée",
    };
  const pub = await fetch(`${GRAPH}/${igId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: containerJ.id, access_token: token }),
  });
  const pubJ = (await pub.json()) as { id?: string; error?: { message: string } };
  if (!pubJ.id)
    return { ok: false, error: pubJ.error?.message ?? "Publication carousel IG échouée" };
  return { ok: true, externalId: pubJ.id };
}

async function fetchMetrics(account: ConnectorAccount, externalId: string): Promise<Metrics> {
  const token = account.accessToken;
  // Meta a déprécié `impressions` pour la plupart des media types IG en 2024.
  // Métriques actuelles : reach, likes, comments, saved, shares, views, total_interactions.
  const r = await fetch(
    `${GRAPH}/${externalId}/insights?metric=reach,likes,comments,saved,shares,views,total_interactions&access_token=${encodeURIComponent(token)}`,
  );
  const j = (await r.json()) as {
    data?: Array<{ name: string; values: Array<{ value: unknown }> }>;
    error?: { message: string };
  };
  const m: Metrics = { raw: j as Record<string, unknown> };
  for (const d of j.data ?? []) {
    const v = Number((d.values?.[0]?.value as number) ?? 0);
    if (d.name === "reach") m.reach = v;
    if (d.name === "likes") m.likes = v;
    if (d.name === "comments") m.comments = v;
    if (d.name === "saved") m.saves = v;
    if (d.name === "shares") m.shares = v;
    if (d.name === "views") m.views = v;
    if (d.name === "total_interactions") m.impressions = v; // approx pour le dashboard
  }
  return m;
}

export const instagramConnector: SocialConnector = {
  platform: "INSTAGRAM",
  authorizeUrl: igAuthorizeUrl,
  exchangeCode: igExchangeCode,
  refreshToken: igRefreshToken,
  publish,
  fetchMetrics,
};
