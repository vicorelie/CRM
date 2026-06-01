// Enrichissement côté serveur du user_data avec données contextuelles HTTP.
//
// Champs enrichis automatiquement :
//   - client_ip_address : depuis X-Forwarded-For (prio 1), X-Real-IP, X-Vercel-Forwarded-For
//   - client_user_agent : depuis User-Agent
//   - fbp               : depuis cookie `_fbp` (Facebook Browser ID)
//   - fbc               : depuis cookie `_fbc` ou construit depuis ?fbclid= dans l'URL source
//
// Ces 4 champs augmentent significativement le Match Quality Score Meta même
// quand on n'a pas d'email/téléphone (cas du PageView sur visiteur inconnu).

import type { UserDataInput } from "./types";

/**
 * Extrait la 1ère IP publique d'un X-Forwarded-For (peut contenir plusieurs IPs
 * séparées par virgule en cas de chaînage proxy).
 */
function firstIp(value: string | null): string | undefined {
  if (!value) return undefined;
  const first = value.split(",")[0]?.trim();
  if (!first) return undefined;
  // Filtre les IPs privées (RFC 1918) — Meta veut l'IP publique du visiteur
  if (
    first.startsWith("10.") ||
    first.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(first) ||
    first === "127.0.0.1" ||
    first === "::1"
  ) {
    return undefined;
  }
  return first;
}

/**
 * Parse les cookies d'un header `Cookie: a=1; b=2; ...` en Map.
 */
export function parseCookies(cookieHeader: string | null): Map<string, string> {
  const out = new Map<string, string>();
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k) out.set(k, decodeURIComponent(v));
  }
  return out;
}

/**
 * Construit fbc depuis ?fbclid= dans l'URL source si pas de cookie _fbc.
 *
 * Format attendu par Meta : `fb.<subdomain_index>.<creation_time>.<fbclid>`
 *   - subdomain_index : 1 pour com (la plupart des cas)
 *   - creation_time : Unix ms au moment du clic (on prend now())
 *   - fbclid : valeur du param ?fbclid=
 *
 * Doc : https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters#fbc
 */
function fbcFromFbclid(eventSourceUrl: string | undefined, nowMs: number): string | undefined {
  if (!eventSourceUrl) return undefined;
  try {
    const url = new URL(eventSourceUrl);
    const fbclid = url.searchParams.get("fbclid");
    if (!fbclid) return undefined;
    return `fb.1.${nowMs}.${fbclid}`;
  } catch {
    return undefined;
  }
}

/**
 * Headers acceptés en entrée. On accepte un objet plat ou une Headers Web API.
 */
export type RequestLikeHeaders = Headers | { get(name: string): string | null } | Record<string, string | undefined>;

function headerOf(h: RequestLikeHeaders, name: string): string | null {
  if (h instanceof Headers) return h.get(name);
  if (typeof (h as { get?: unknown }).get === "function") {
    return (h as { get(n: string): string | null }).get(name);
  }
  // Plain object
  const rec = h as Record<string, string | undefined>;
  const lower = name.toLowerCase();
  for (const k of Object.keys(rec)) {
    if (k.toLowerCase() === lower) return rec[k] ?? null;
  }
  return null;
}

/**
 * Enrichit un UserDataInput avec les données HTTP du visiteur. Les valeurs
 * fournies par le client priment sur celles dérivées du serveur (utile si le
 * site veut overrider l'IP via une logique custom).
 */
export function enrichUserData(
  input: UserDataInput | undefined,
  headers: RequestLikeHeaders,
  eventSourceUrl?: string,
  nowMs: number = Date.now(),
): UserDataInput {
  const out: UserDataInput = { ...(input ?? {}) };

  // IP : on prend la 1ère IP publique trouvée dans les headers de proxy/CDN
  if (!out.client_ip_address) {
    const ip =
      firstIp(headerOf(headers, "x-forwarded-for")) ??
      firstIp(headerOf(headers, "x-real-ip")) ??
      firstIp(headerOf(headers, "x-vercel-forwarded-for")) ??
      firstIp(headerOf(headers, "cf-connecting-ip")); // Cloudflare
    if (ip) out.client_ip_address = ip;
  }

  // User Agent
  if (!out.client_user_agent) {
    const ua = headerOf(headers, "user-agent");
    if (ua) out.client_user_agent = ua;
  }

  // Cookies _fbp et _fbc
  const cookies = parseCookies(headerOf(headers, "cookie"));
  if (!out.fbp) {
    const fbp = cookies.get("_fbp");
    if (fbp) out.fbp = fbp;
  }
  if (!out.fbc) {
    const fbc = cookies.get("_fbc") ?? fbcFromFbclid(eventSourceUrl, nowMs);
    if (fbc) out.fbc = fbc;
  }

  return out;
}

/** Helpers exportés pour tests. */
export const __testing = { firstIp, fbcFromFbclid, headerOf };
