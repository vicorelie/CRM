// Auth des CLIENTS d'une boutique (storefront), distinct de l'admin NextAuth.
// Magic link via email : on signe un token HMAC-SHA256 contenant
// { customerId, shopId, exp } et on le pose en cookie HTTP-only.

import { createHmac, timingSafeEqual } from "node:crypto";

// Secret de signature des tokens customer. PAS de fallback en dur (audit H4) :
// un secret constant connu permettrait de forger { customerId, shopId } et
// d'usurper n'importe quel client. On garde l'ordre NEXTAUTH_SECRET → ENCRYPTION_KEY
// pour ne pas invalider les sessions existantes ; throw si aucun n'est défini.
function getSecret(): string {
  const s = process.env.NEXTAUTH_SECRET || process.env.ENCRYPTION_KEY;
  if (!s) {
    throw new Error("NEXTAUTH_SECRET (ou ENCRYPTION_KEY) requis pour signer les tokens customer");
  }
  return s;
}

export type CustomerToken = {
  customerId: string;
  shopId: string;
  exp: number; // unix seconds
};

function base64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromBase64url(input: string): string {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString();
}

export function signCustomerToken(payload: Omit<CustomerToken, "exp">, ttlSeconds: number): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const body = base64url(JSON.stringify({ ...payload, exp }));
  const sig = base64url(createHmac("sha256", getSecret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyCustomerToken(token: string): CustomerToken | null {
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;
    const expected = base64url(createHmac("sha256", getSecret()).update(body).digest());
    // Comparaison à temps constant (audit H4 : `!==` = timing oracle sur la signature).
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
    const data = JSON.parse(fromBase64url(body)) as CustomerToken;
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

export const COOKIE_NAME = "wp_customer";
export const COOKIE_TTL_DAYS = 30;
export const MAGIC_TTL_MIN = 30;

export function cookieHeader(token: string): string {
  const maxAge = COOKIE_TTL_DAYS * 86400;
  // Path / pour que le cookie soit accessible depuis /preview/{slug}/ ET /wanapush/api/
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax; Secure`;
}

export function clearCookieHeader(): string {
  return `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; Secure`;
}

export function readCustomerCookie(req: Request): CustomerToken | null {
  const raw = req.headers.get("cookie") ?? "";
  const m = raw.match(new RegExp("(?:^|; )" + COOKIE_NAME + "=([^;]+)"));
  if (!m) return null;
  return verifyCustomerToken(decodeURIComponent(m[1]));
}
