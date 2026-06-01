// Récupère les Pixels Meta disponibles dans un AdAccount, via Graph API.
//
// Endpoint Meta : GET /{adAccountId}/adspixels?fields=id,name,code,owner_business
// Doc : https://developers.facebook.com/docs/marketing-api/reference/ads-pixel/
//
// Le `adAccountId` est le `externalId` côté WanaPush (format "act_xxx").
// Le `accessToken` est le user/system token déchiffré depuis AdAccount.accessToken.

const META_GRAPH_VERSION = "v22.0";
const META_GRAPH_BASE = "https://graph.facebook.com";

export type MetaPixel = {
  id: string;
  name: string;
  ownerBusinessId?: string;
};

export type FetchPixelsResult =
  | { ok: true; pixels: MetaPixel[] }
  | { ok: false; error: string; metaCode?: number; metaSubcode?: number };

/**
 * Liste les Pixels accessibles dans un AdAccount Meta.
 *
 * @param adAccountExternalId Format Meta "act_xxx"
 * @param accessToken         User access token (déchiffré depuis AdAccount.accessToken)
 */
export async function fetchPixelsForAdAccount(
  adAccountExternalId: string,
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FetchPixelsResult> {
  const url = new URL(`${META_GRAPH_BASE}/${META_GRAPH_VERSION}/${adAccountExternalId}/adspixels`);
  url.searchParams.set("fields", "id,name,owner_business");
  url.searchParams.set("limit", "100");
  url.searchParams.set("access_token", accessToken);

  let res: Response;
  try {
    res = await fetchImpl(url.toString(), { method: "GET" });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau" };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { ok: false, error: `Réponse non-JSON (HTTP ${res.status})` };
  }

  if (!res.ok) {
    const err = (body as { error?: { message?: string; code?: number; error_subcode?: number } })?.error;
    return {
      ok: false,
      error: err?.message ?? `Erreur Meta (HTTP ${res.status})`,
      metaCode: err?.code,
      metaSubcode: err?.error_subcode,
    };
  }

  const data = (body as { data?: Array<{ id: string; name: string; owner_business?: { id: string } }> }).data ?? [];

  return {
    ok: true,
    pixels: data.map((p) => ({
      id: p.id,
      name: p.name,
      ownerBusinessId: p.owner_business?.id,
    })),
  };
}
