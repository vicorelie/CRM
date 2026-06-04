// Connecteur YouTube — upload de vidéos via Google API. OAuth via Google.
// Utilise les vars LINKEDIN-style YOUTUBE_CLIENT_ID/SECRET (pour ne pas confondre avec le login Google).
// Doc : https://developers.google.com/youtube/v3/docs/videos/insert
import type {
  ConnectorAccount,
  Metrics,
  PublishInput,
  PublishResult,
  SocialConnector,
} from "./types";

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
];

function appCreds() {
  const id = process.env.YOUTUBE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.YOUTUBE_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret)
    throw new Error("YOUTUBE_CLIENT_ID/SECRET (ou GOOGLE_CLIENT_ID/SECRET) non définis");
  return { id, secret };
}

export function ytAuthorizeUrl(state: string, redirectUri: string): string {
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

export async function ytExchangeCode(
  code: string,
  redirectUri: string,
): Promise<ConnectorAccount[]> {
  const { id, secret } = appCreds();
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
  const tok = (await tokRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error_description?: string;
  };
  if (!tok.access_token) throw new Error(tok.error_description ?? "Échange code YouTube échoué");

  // Liste les channels accessibles
  const chRes = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&mine=true",
    { headers: { Authorization: `Bearer ${tok.access_token}` } },
  );
  const chJson = (await chRes.json()) as {
    items?: Array<{
      id: string;
      snippet: { title: string; thumbnails?: { default?: { url?: string } }; customUrl?: string };
    }>;
  };
  const items = chJson.items ?? [];
  if (items.length === 0) throw new Error("Aucune chaîne YouTube trouvée");

  return items.map((c) => ({
    accountId: c.id,
    username: c.snippet.customUrl ?? c.id,
    displayName: c.snippet.title,
    avatarUrl: c.snippet.thumbnails?.default?.url,
    accessToken: tok.access_token!,
    refreshToken: tok.refresh_token,
    tokenExpiresAt: tok.expires_in ? new Date(Date.now() + tok.expires_in * 1000) : undefined,
    scopes: SCOPES.join(","),
    meta: { channelId: c.id },
  }));
}

export async function ytRefreshToken(account: ConnectorAccount): Promise<ConnectorAccount> {
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
    tokenExpiresAt: j.expires_in ? new Date(Date.now() + j.expires_in * 1000) : undefined,
  };
}

async function publish(
  account: ConnectorAccount,
  input: PublishInput,
): Promise<PublishResult> {
  const video = input.media.find((m) => m.type === "video");
  if (!video) return { ok: false, error: "YouTube exige une vidéo" };

  const fileRes = await fetch(video.url);
  if (!fileRes.ok) return { ok: false, error: `Impossible de télécharger la vidéo (${fileRes.status})` };
  const buf = Buffer.from(await fileRes.arrayBuffer());

  const title = (input.options?.title ?? input.caption.split("\n")[0]).slice(0, 100);
  const description =
    input.caption +
    (input.options?.hashtags?.length
      ? "\n\n" + input.options.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")
      : "");
  const privacyStatus = input.options?.privacy ?? "public";

  const meta = {
    snippet: { title, description },
    status: { privacyStatus, selfDeclaredMadeForKids: false },
  };

  // Upload multipart resumable simplifié → API resumable upload
  const initRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": fileRes.headers.get("content-type") ?? "video/mp4",
        "X-Upload-Content-Length": String(buf.length),
      },
      body: JSON.stringify(meta),
    },
  );
  const uploadUrl = initRes.headers.get("location");
  if (!initRes.ok || !uploadUrl) {
    const t = await initRes.text();
    return { ok: false, error: `YT init upload: ${initRes.status} ${t.slice(0, 200)}` };
  }

  const upRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      "Content-Type": fileRes.headers.get("content-type") ?? "video/mp4",
    },
    body: buf,
  });
  const upJson = (await upRes.json()) as { id?: string; error?: { message: string } };
  if (!upJson.id) return { ok: false, error: upJson.error?.message ?? "Upload YT échoué" };
  return {
    ok: true,
    externalId: upJson.id,
    externalUrl: `https://youtube.com/watch?v=${upJson.id}`,
  };
}

async function fetchMetrics(account: ConnectorAccount, externalId: string): Promise<Metrics> {
  const r = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${externalId}`,
    { headers: { Authorization: `Bearer ${account.accessToken}` } },
  );
  const j = (await r.json()) as {
    items?: Array<{
      statistics?: {
        viewCount?: string;
        likeCount?: string;
        commentCount?: string;
        favoriteCount?: string;
      };
    }>;
  };
  const s = j.items?.[0]?.statistics;
  return {
    views: s?.viewCount ? Number(s.viewCount) : undefined,
    likes: s?.likeCount ? Number(s.likeCount) : undefined,
    comments: s?.commentCount ? Number(s.commentCount) : undefined,
    raw: j as Record<string, unknown>,
  };
}

export const youtubeConnector: SocialConnector = {
  platform: "YOUTUBE",
  authorizeUrl: ytAuthorizeUrl,
  exchangeCode: ytExchangeCode,
  refreshToken: ytRefreshToken,
  publish,
  fetchMetrics,
};
