// MCP Server — auth via Bearer token (API key format "wp_mcp_<random>").
//
// Stratégie : génère un token aléatoire, retourne en clair UNE SEULE FOIS au
// caller (à la création), stocke SHA-256 hex hash en DB. Lookup via index sur
// tokenHash. Pas de bcrypt (overkill pour API key opaque haute-entropie).

import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_PREFIX = "wp_mcp_";

export function genMcpToken(): { token: string; hash: string; prefix: string } {
  // 32 bytes random → base64url (43 chars) → ~256 bits d'entropie
  const random = randomBytes(32).toString("base64url");
  const token = `${TOKEN_PREFIX}${random}`;
  const hash = createHash("sha256").update(token).digest("hex");
  const prefix = `${token.slice(0, 14)}…`; // affichage UI ("wp_mcp_abcdefg…")
  return { token, hash, prefix };
}

export type McpAuthResult = {
  userId: string;
  scopes: string;
  keyId: string;
};

/** Vérifie un Bearer token. Retourne null si invalide/expiré/disabled. */
export async function verifyMcpToken(token: string | null): Promise<McpAuthResult | null> {
  if (!token || !token.startsWith(TOKEN_PREFIX)) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  const key = await prisma.mcpApiKey.findUnique({
    where: { tokenHash: hash },
    select: { id: true, userId: true, scopes: true, enabled: true, expiresAt: true },
  });
  if (!key || !key.enabled) return null;
  if (key.expiresAt && key.expiresAt < new Date()) return null;
  return { userId: key.userId, scopes: key.scopes, keyId: key.id };
}

/** Extrait le token Bearer depuis le header Authorization. */
export function extractBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(\S+)$/i);
  return m?.[1] ?? null;
}

/** Increment usage counter (best-effort, fire-and-forget côté caller). */
export async function trackMcpUsage(keyId: string, error?: string): Promise<void> {
  await prisma.mcpApiKey.update({
    where: { id: keyId },
    data: {
      totalCalls: { increment: 1 },
      lastUsedAt: new Date(),
      lastError: error?.slice(0, 1000) ?? null,
    },
  });
}
