// Connecteur LinkedIn — partage personnel (member URN). Posts texte + image + vidéo.
// Doc : https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/posts-api
import type {
  ConnectorAccount,
  Metrics,
  PublishInput,
  PublishResult,
  SocialConnector,
} from "./types";

const API = "https://api.linkedin.com";
const SCOPES = ["openid", "profile", "email", "w_member_social"];

function appCreds() {
  const id = process.env.LINKEDIN_CLIENT_ID;
  const secret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!id || !secret) throw new Error("LINKEDIN_CLIENT_ID/SECRET non définis");
  return { id, secret };
}

export function liAuthorizeUrl(state: string, redirectUri: string): string {
  const { id } = appCreds();
  const u = new URL("https://www.linkedin.com/oauth/v2/authorization");
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", id);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("state", state);
  u.searchParams.set("scope", SCOPES.join(" "));
  return u.toString();
}

export async function liExchangeCode(
  code: string,
  redirectUri: string,
): Promise<ConnectorAccount[]> {
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
  const tokJson = (await tokRes.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    error_description?: string;
  };
  if (!tokJson.access_token)
    throw new Error(tokJson.error_description ?? "Échange code LinkedIn échoué");

  // Récupère le sub (URN) via OIDC userinfo
  const meRes = await fetch(`${API}/v2/userinfo`, {
    headers: { Authorization: `Bearer ${tokJson.access_token}` },
  });
  const me = (await meRes.json()) as {
    sub?: string;
    name?: string;
    email?: string;
    picture?: string;
  };
  if (!me.sub) throw new Error("Impossible de lire le profil LinkedIn");

  return [
    {
      accountId: me.sub,
      username: me.email ?? me.sub,
      displayName: me.name,
      avatarUrl: me.picture,
      accessToken: tokJson.access_token,
      refreshToken: tokJson.refresh_token,
      tokenExpiresAt: tokJson.expires_in
        ? new Date(Date.now() + tokJson.expires_in * 1000)
        : undefined,
      scopes: SCOPES.join(","),
      meta: { authorUrn: `urn:li:person:${me.sub}` },
    },
  ];
}

export async function liRefreshToken(account: ConnectorAccount): Promise<ConnectorAccount> {
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
    tokenExpiresAt: j.expires_in ? new Date(Date.now() + j.expires_in * 1000) : undefined,
  };
}

async function uploadAsset(
  account: ConnectorAccount,
  authorUrn: string,
  fileUrl: string,
  type: "image" | "video",
): Promise<string | null> {
  // Étape 1 : initialise l'upload
  const recipe =
    type === "image"
      ? "urn:li:digitalmediaRecipe:feedshare-image"
      : "urn:li:digitalmediaRecipe:feedshare-video";
  const initRes = await fetch(`${API}/v2/assets?action=registerUpload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: [recipe],
        owner: authorUrn,
        serviceRelationships: [
          {
            relationshipType: "OWNER",
            identifier: "urn:li:userGeneratedContent",
          },
        ],
      },
    }),
  });
  const init = (await initRes.json()) as {
    value?: {
      uploadMechanism?: {
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"?: { uploadUrl?: string };
      };
      asset?: string;
    };
  };
  const uploadUrl =
    init.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]
      ?.uploadUrl;
  const asset = init.value?.asset;
  if (!uploadUrl || !asset) return null;

  // Étape 2 : télécharge le binaire et l'uploade
  const fileRes = await fetch(fileUrl);
  const buf = Buffer.from(await fileRes.arrayBuffer());
  await fetch(uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${account.accessToken}` },
    body: buf,
  });
  return asset;
}

async function publish(
  account: ConnectorAccount,
  input: PublishInput,
): Promise<PublishResult> {
  const authorUrn = (account.meta?.authorUrn as string) ?? `urn:li:person:${account.accountId}`;
  const text =
    input.caption +
    (input.options?.hashtags?.length
      ? "\n\n" + input.options.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")
      : "");

  const mediaCategory =
    input.media.length === 0
      ? "NONE"
      : input.media[0].type === "video"
        ? "VIDEO"
        : "IMAGE";

  const mediaArr: Array<{ status: string; description?: { text: string }; media: string; title?: { text: string } }> = [];
  for (const m of input.media) {
    const asset = await uploadAsset(account, authorUrn, m.url, m.type);
    if (asset) mediaArr.push({ status: "READY", media: asset, description: m.alt ? { text: m.alt } : undefined });
  }

  const body = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: mediaCategory,
        ...(mediaArr.length > 0 ? { media: mediaArr } : {}),
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  };

  const r = await fetch(`${API}/v2/ugcPosts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const errText = await r.text();
    return { ok: false, error: `LinkedIn ${r.status}: ${errText.slice(0, 300)}` };
  }
  const id = r.headers.get("x-restli-id") ?? (await r.json().then((j: { id?: string }) => j.id));
  if (!id) return { ok: false, error: "ID post LinkedIn non retourné" };
  return {
    ok: true,
    externalId: id,
    externalUrl: `https://www.linkedin.com/feed/update/${encodeURIComponent(id)}/`,
  };
}

async function fetchMetrics(account: ConnectorAccount, externalId: string): Promise<Metrics> {
  // Pour les posts personnels via w_member_social, l'API analytics est très limitée.
  // On retourne un Metrics minimaliste basé sur la socialActions API.
  const r = await fetch(
    `${API}/v2/socialActions/${encodeURIComponent(externalId)}`,
    { headers: { Authorization: `Bearer ${account.accessToken}` } },
  );
  if (!r.ok) return { raw: { error: `LI ${r.status}` } };
  const j = (await r.json()) as {
    likesSummary?: { totalLikes?: number };
    commentsSummary?: { totalFirstLevelComments?: number };
  };
  return {
    likes: j.likesSummary?.totalLikes,
    comments: j.commentsSummary?.totalFirstLevelComments,
    raw: j as Record<string, unknown>,
  };
}

export const linkedinConnector: SocialConnector = {
  platform: "LINKEDIN",
  authorizeUrl: liAuthorizeUrl,
  exchangeCode: liExchangeCode,
  refreshToken: liRefreshToken,
  publish,
  fetchMetrics,
};
