// Sync automatique des audiences WanaPush → listes Brevo.
// Source 1 : EmailContact (prospects/abonnés captés par WanaPush) status ACTIVE.
// Source 2 : Customer (clients des boutiques de l'utilisateur).
// Idempotent : les listes sont retrouvées par nom (sinon créées), l'import Brevo
// fait un upsert (updateExistingContacts).

import { prisma } from "@/lib/prisma";
import { getUserEmailConnection } from "./index";
import type { ImportContactInput, ProviderList } from "./types";

const LIST_PROSPECTS = "WanaPush — Prospects";
const LIST_CLIENTS = "WanaPush — Clients boutique";
const CHUNK = 500;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function ensureList(
  apiKey: string,
  provider: { getLists: (k: string) => Promise<ProviderList[]>; createList: (k: string, n: string) => Promise<ProviderList> },
  existing: ProviderList[],
  name: string,
): Promise<ProviderList> {
  const found = existing.find((l) => l.name.trim().toLowerCase() === name.toLowerCase());
  if (found) return found;
  return provider.createList(apiKey, name);
}

export interface SyncResult {
  prospects: number;
  clients: number;
  lists: { prospects: number; clients: number };
}

export async function syncAudiencesToBrevo(userId: string): Promise<SyncResult> {
  const conn = await getUserEmailConnection(userId);
  if (!conn) throw new Error("Aucun fournisseur email connecté.");

  // Sources WanaPush
  const [contacts, customers] = await Promise.all([
    prisma.emailContact.findMany({
      where: { userId, status: "ACTIVE" },
      select: { email: true, firstName: true, lastName: true },
    }),
    prisma.customer.findMany({
      where: { shop: { userId }, email: { not: "" } },
      select: { email: true, firstName: true, lastName: true },
      distinct: ["email"],
    }),
  ]);

  const toInput = (c: { email: string; firstName: string | null; lastName: string | null }): ImportContactInput => ({
    email: c.email,
    firstName: c.firstName ?? undefined,
    lastName: c.lastName ?? undefined,
  });

  const existingLists = await conn.provider.getLists(conn.apiKey);
  const prospectList = await ensureList(conn.apiKey, conn.provider, existingLists, LIST_PROSPECTS);
  const clientList = await ensureList(conn.apiKey, conn.provider, existingLists, LIST_CLIENTS);

  let prospects = 0;
  for (const part of chunk(contacts.map(toInput), CHUNK)) {
    const { imported } = await conn.provider.importContacts(conn.apiKey, prospectList.id, part);
    prospects += imported;
  }
  let clients = 0;
  for (const part of chunk(customers.map(toInput), CHUNK)) {
    const { imported } = await conn.provider.importContacts(conn.apiKey, clientList.id, part);
    clients += imported;
  }

  await prisma.emailProviderConnection.update({
    where: { id: conn.connectionId },
    data: { lastSyncAt: new Date(), lastError: null },
  });

  return { prospects, clients, lists: { prospects: prospectList.id, clients: clientList.id } };
}
