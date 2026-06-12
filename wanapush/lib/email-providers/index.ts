// Registre des fournisseurs d'email + helper de connexion utilisateur.

import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { brevoProvider } from "./brevo";
import type { EmailProvider, ProviderId } from "./types";

export * from "./types";

const PROVIDERS: Record<ProviderId, EmailProvider> = {
  brevo: brevoProvider,
};

export function getProvider(id: ProviderId): EmailProvider {
  const p = PROVIDERS[id];
  if (!p) throw new Error(`Fournisseur email inconnu : ${id}`);
  return p;
}

export function isProviderId(id: string): id is ProviderId {
  return id in PROVIDERS;
}

/** Liste des providers disponibles (pour l'UI de connexion). */
export const AVAILABLE_PROVIDERS: Array<{ id: ProviderId; label: string }> = Object.values(
  PROVIDERS,
).map((p) => ({ id: p.id, label: p.label }));

export interface UserEmailConnection {
  connectionId: string;
  provider: EmailProvider;
  apiKey: string;
  accountEmail: string | null;
  accountName: string | null;
  plan: string | null;
  status: string;
}

/**
 * Récupère la connexion email active de l'utilisateur (clé déchiffrée).
 * Renvoie null si aucun provider n'est connecté.
 */
export async function getUserEmailConnection(userId: string): Promise<UserEmailConnection | null> {
  const conn = await prisma.emailProviderConnection.findFirst({
    where: { userId, status: "CONNECTED" },
    orderBy: { updatedAt: "desc" },
  });
  if (!conn || !isProviderId(conn.provider)) return null;
  let apiKey: string;
  try {
    apiKey = decrypt(conn.apiKey);
  } catch {
    return null;
  }
  return {
    connectionId: conn.id,
    provider: getProvider(conn.provider),
    apiKey,
    accountEmail: conn.accountEmail,
    accountName: conn.accountName,
    plan: conn.plan,
    status: conn.status,
  };
}
