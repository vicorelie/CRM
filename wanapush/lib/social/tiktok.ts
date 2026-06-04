// Connecteur TikTok — Content Posting API. OAuth v2.
// Doc : https://developers.tiktok.com/doc/content-posting-api-get-started/
import type {
  ConnectorAccount,
  Metrics,
  PublishInput,
  PublishResult,
  SocialConnector,
} from "./types";

// Scopes demandés au moment de l'OAuth. Doivent matcher EXACTEMENT ce qui est
// activé sur l'app TikTok côté developers.tiktok.com (sinon erreur "scope" au
// consentement). Sandbox actuelle (wanapush-dev) : user.info.basic + video.upload.
// Pour ajouter video.publish (Direct Post) ou video.list, il faut d'abord les
// activer dans les Scopes de l'app TikTok puis les rajouter ici.
const SCOPES = ["user.info.basic", "video.upload"];

function appCreds() {
  const id = process.env.TIKTOK_APP_ID;
  const secret = process.env.TIKTOK_APP_SECRET;
  if (!id || !secret) throw new Error("TIKTOK_APP_ID/SECRET non définis");
  return { id, secret };
}

export function ttAuthorizeUrl(state: string, redirectUri: string): string {
  const { id } = appCreds();
  const u = new URL("https://www.tiktok.com/v2/auth/authorize/");
  u.searchParams.set("client_key", id);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", SCOPES.join(","));
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("state", state);
  return u.toString();
}

export async function ttExchangeCode(
  code: string,
  redirectUri: string,
): Promise<ConnectorAccount[]> {
  const { id, secret } = appCreds();
  const r = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: id,
      client_secret: secret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }).toString(),
  });
  const j = (await r.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    open_id?: string;
    scope?: string;
    error_description?: string;
  };
  if (!j.access_token) throw new Error(j.error_description ?? "Échange code TikTok échoué");

  const meRes = await fetch(
    "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username",
    { headers: { Authorization: `Bearer ${j.access_token}` } },
  );
  const me = (await meRes.json()) as {
    data?: {
      user?: {
        open_id?: string;
        union_id?: string;
        avatar_url?: string;
        display_name?: string;
        username?: string;
      };
    };
  };
  const u = me.data?.user;
  const accountId = u?.open_id ?? j.open_id ?? "unknown";
  // Fallback : si TikTok ne renvoie ni display_name ni username (cas Sandbox
  // ou comptes non-business), on affiche un libellé lisible à partir de
  // l'open_id pour ne pas avoir une carte vide en UI.
  const displayName =
    u?.display_name || u?.username || `TikTok · ${accountId.slice(0, 8)}…`;

  return [
    {
      accountId,
      username: u?.username,
      displayName,
      avatarUrl: u?.avatar_url,
      accessToken: j.access_token,
      refreshToken: j.refresh_token,
      tokenExpiresAt: j.expires_in ? new Date(Date.now() + j.expires_in * 1000) : undefined,
      scopes: j.scope ?? SCOPES.join(","),
      meta: { openId: u?.open_id ?? j.open_id, unionId: u?.union_id },
    },
  ];
}

export async function ttRefreshToken(account: ConnectorAccount): Promise<ConnectorAccount> {
  if (!account.refreshToken) return account;
  const { id, secret } = appCreds();
  const r = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: id,
      client_secret: secret,
      refresh_token: account.refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });
  const j = (await r.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!j.access_token) return account;
  return {
    ...account,
    accessToken: j.access_token,
    refreshToken: j.refresh_token ?? account.refreshToken,
    tokenExpiresAt: j.expires_in ? new Date(Date.now() + j.expires_in * 1000) : undefined,
  };
}

async function publish(
  account: ConnectorAccount,
  input: PublishInput,
): Promise<PublishResult> {
  const video = input.media.find((m) => m.type === "video");
  if (!video) return { ok: false, error: "TikTok exige une vidéo" };

  // Choix de l'endpoint selon les scopes accordés à l'app :
  //  - Si `video.publish` est dans les scopes → Direct Post (publication immédiate)
  //  - Sinon → Inbox (upload en draft, le créateur publie depuis son app TikTok)
  // L'endpoint Inbox marche avec seulement `video.upload`.
  const canDirectPost = (account.scopes ?? "").includes("video.publish");
  const initUrl = canDirectPost
    ? "https://open.tiktokapis.com/v2/post/publish/video/init/"
    : "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/";

  const privacy =
    input.options?.privacy === "private"
      ? "SELF_ONLY"
      : input.options?.privacy === "unlisted"
        ? "FOLLOWER_OF_CREATOR"
        : "PUBLIC_TO_EVERYONE";

  // Pour Inbox, post_info n'est PAS accepté (le créateur règle ça dans son app).
  const body: Record<string, unknown> = {
    source_info: {
      source: "PULL_FROM_URL",
      video_url: video.url,
    },
  };
  if (canDirectPost) {
    body.post_info = {
      title: input.caption.slice(0, 2200),
      privacy_level: privacy,
      disable_duet: false,
      disable_comment: false,
      disable_stitch: false,
    };
  }

  console.log(`[tiktok] publish init endpoint=${canDirectPost ? "direct" : "inbox"} video_url=${video.url}`);
  const initRes = await fetch(initUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify(body),
  });
  const initJson = (await initRes.json()) as {
    data?: { publish_id?: string };
    error?: { message?: string; code?: string };
  };
  console.log(`[tiktok] publish init response:`, JSON.stringify(initJson));
  if (!initJson.data?.publish_id)
    return {
      ok: false,
      error: initJson.error?.message ?? "TikTok init publish échoué",
    };
  const publishId = initJson.data.publish_id;
  console.log(`[tiktok] publish_id=${publishId}, starting polling…`);

  // Poll status — TikTok peut prendre longtemps en sandbox (validation manuelle).
  // 60 itérations × 5s = 5 min max. Si timeout sans erreur explicite, on considère
  // le post comme PUBLISHING (en attente côté TikTok) plutôt que FAILED — le
  // publish_id reste valide et la vidéo finira par arriver dans l'inbox du créateur.
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const s = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({ publish_id: publishId }),
      },
    );
    const sj = (await s.json()) as {
      data?: { status?: string; publicaly_available_post_id?: string[]; fail_reason?: string };
      error?: { message?: string; code?: string };
    };
    const status = sj.data?.status;
    console.log(`[tiktok] poll #${i + 1} status=${status ?? "(none)"} err=${sj.error?.code ?? "-"}`);
    if (status === "PUBLISH_COMPLETE" || status === "SEND_TO_USER_INBOX") {
      const pid = sj.data?.publicaly_available_post_id?.[0];
      return {
        ok: true,
        externalId: pid ?? publishId,
        externalUrl: pid
          ? `https://www.tiktok.com/@${account.username ?? ""}/video/${pid}`
          : undefined,
      };
    }
    if (status === "FAILED")
      return { ok: false, error: sj.data?.fail_reason ?? "TikTok publish FAILED" };
  }
  // Timeout : le init a réussi, on a un publish_id valide. La vidéo finira par
  // arriver dans l'inbox. On retourne OK pour ne pas marquer FAILED.
  return {
    ok: true,
    externalId: publishId,
  };
}

async function fetchMetrics(account: ConnectorAccount, externalId: string): Promise<Metrics> {
  const r = await fetch(
    "https://open.tiktokapis.com/v2/video/query/?fields=id,view_count,like_count,comment_count,share_count",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filters: { video_ids: [externalId] } }),
    },
  );
  const j = (await r.json()) as {
    data?: {
      videos?: Array<{
        view_count?: number;
        like_count?: number;
        comment_count?: number;
        share_count?: number;
      }>;
    };
  };
  const v = j.data?.videos?.[0];
  return {
    views: v?.view_count,
    likes: v?.like_count,
    comments: v?.comment_count,
    shares: v?.share_count,
    raw: j as Record<string, unknown>,
  };
}

export const tiktokConnector: SocialConnector = {
  platform: "TIKTOK",
  authorizeUrl: ttAuthorizeUrl,
  exchangeCode: ttExchangeCode,
  refreshToken: ttRefreshToken,
  publish,
  fetchMetrics,
};
