// Unsubscribe — RFC 8058 List-Unsubscribe one-click compliance.
//
// Gmail + Yahoo exigent depuis fév 2024 le List-Unsubscribe header avec
// le mécanisme one-click (POST sur l'URL avec body `List-Unsubscribe=One-Click`).
// Apple Mail affiche un bouton "Unsubscribe" si le header `mailto:` est présent.
//
// Stratégie : token HMAC-SHA256(sendId + contactId, secret) — vérifiable
// stateless, pas de DB lookup pour valider. URL : /api/email/unsubscribe/{token}
// Body POST : List-Unsubscribe=One-Click (Gmail/Yahoo)
// Body GET : juste un endpoint public qui affiche une page de confirmation

import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.NEXTAUTH_SECRET ?? "fallback-email-unsub-secret";

/** Token format : base64url("{contactId}.{sendId}.hmac")
 *  HMAC = HMAC-SHA256(contactId + "." + sendId, SECRET) — first 16 bytes hex.
 *  Stateless : pas de DB lookup pour valider, juste verify HMAC. */
export function genUnsubToken(contactId: string, sendId?: string): string {
  const payload = `${contactId}.${sendId ?? ""}`;
  const mac = createHmac("sha256", SECRET).update(payload).digest("hex").slice(0, 32);
  // base64url-safe encoding sans padding
  const raw = `${payload}.${mac}`;
  return Buffer.from(raw, "utf8").toString("base64url");
}

export function verifyUnsubToken(
  token: string,
): { contactId: string; sendId: string | null } | null {
  let decoded: string;
  try {
    decoded = Buffer.from(token, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const parts = decoded.split(".");
  if (parts.length !== 3) return null;
  const [contactId, sendId, gotMac] = parts;
  if (!contactId || !gotMac) return null;
  const expectedMac = createHmac("sha256", SECRET)
    .update(`${contactId}.${sendId}`)
    .digest("hex")
    .slice(0, 32);
  // timing-safe compare
  if (gotMac.length !== expectedMac.length) return null;
  const a = Buffer.from(gotMac, "hex");
  const b = Buffer.from(expectedMac, "hex");
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  return { contactId, sendId: sendId || null };
}

/** URL publique 1-click pour le List-Unsubscribe header */
export function unsubUrl(contactId: string, sendId?: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://wanapush.com";
  return `${base}/api/email/unsubscribe/${genUnsubToken(contactId, sendId)}`;
}

/** Header List-Unsubscribe à inclure dans tous les emails marketing.
 *  - mailto: déclenche le banner Apple Mail
 *  - https: déclenche le bouton Gmail/Yahoo
 *  Apparié avec `List-Unsubscribe-Post: List-Unsubscribe=One-Click` pour
 *  signaler la compliance one-click (Gmail/Yahoo exigent depuis fév 2024). */
export function buildUnsubHeaders(
  contactId: string,
  sendId?: string,
): Record<string, string> {
  const url = unsubUrl(contactId, sendId);
  const fromEmail = process.env.EMAIL_FROM_DEFAULT ?? "noreply@wanapush.com";
  return {
    "List-Unsubscribe": `<mailto:${fromEmail}?subject=unsubscribe>, <${url}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
