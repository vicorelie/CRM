// Génère et valide un state OAuth signé HMAC pour éviter le besoin d'un store côté serveur.
// Le state encode: platform, userId, nonce, exp.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// 30 min : le flow Facebook Login for Business prend 5+ écrans (portfolio, Insta,
// pages, review, "J'ai compris") et peut excéder 10 min avec des sélections complexes.
const STATE_TTL_MS = 30 * 60 * 1000;

function secret(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET requis pour signer le state OAuth");
  return s;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function signState(payload: {
  platform: string;
  userId: string;
  returnTo?: string;
}): string {
  const data: Record<string, unknown> = {
    p: payload.platform,
    u: payload.userId,
    n: randomBytes(8).toString("hex"),
    e: Date.now() + STATE_TTL_MS,
  };
  if (payload.returnTo) data.r = payload.returnTo;
  const body = b64url(Buffer.from(JSON.stringify(data)));
  const sig = b64url(createHmac("sha256", secret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyState(
  state: string,
): { platform: string; userId: string; returnTo?: string } | null {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = b64url(createHmac("sha256", secret()).update(body).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(b64urlDecode(body).toString("utf8")) as {
      p: string;
      u: string;
      e: number;
      r?: string;
    };
    if (data.e < Date.now()) return null;
    return { platform: data.p, userId: data.u, returnTo: data.r };
  } catch {
    return null;
  }
}

/**
 * Valide un chemin de retour : doit être un chemin relatif sur notre app
 * (commence par /, pas de //, pas de schéma). Sinon retourne null (open-redirect protection).
 */
export function safeReturnTo(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  if (!raw.startsWith("/")) return undefined;
  if (raw.startsWith("//")) return undefined;
  if (raw.includes("://")) return undefined;
  return raw;
}
