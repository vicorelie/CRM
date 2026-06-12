// Connecteur Brevo (ex-Sendinblue) — API v3.
// Doc vérifiée 06/2026 : base https://api.brevo.com/v3, auth header `api-key`.
//   GET  /account                       → infos compte
//   GET  /contacts/lists                → listes (audiences)
//   POST /contacts/lists                → créer une liste
//   POST /contacts/import               → import contacts (async, upsert)
//   GET  /emailCampaigns                → campagnes
//   POST /emailCampaigns                → créer (brouillon)
//   POST /emailCampaigns/{id}/sendNow   → envoyer

import {
  EmailProvider,
  ProviderAccount,
  ProviderList,
  ProviderSender,
  ProviderCampaign,
  CreateCampaignInput,
  ImportContactInput,
  ProviderError,
} from "./types";

const BASE = "https://api.brevo.com/v3";

async function brevoFetch<T>(
  apiKey: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
        ...(init?.headers ?? {}),
      },
      // Pas de cache pour des données de compte qui changent
      cache: "no-store",
    });
  } catch (e) {
    throw new ProviderError(`Brevo injoignable : ${e instanceof Error ? e.message : String(e)}`);
  }

  if (res.status === 401 || res.status === 403) {
    throw new ProviderError("Clé API Brevo invalide ou non autorisée.", res.status);
  }
  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      /* certaines réponses (204) sont vides */
    }
  }
  if (!res.ok) {
    const msg =
      (json as { message?: string } | null)?.message ??
      `Erreur Brevo (HTTP ${res.status}).`;
    throw new ProviderError(msg, res.status);
  }
  return (json ?? {}) as T;
}

export const brevoProvider: EmailProvider = {
  id: "brevo",
  label: "Brevo",

  async validate(apiKey: string): Promise<ProviderAccount> {
    const acc = await brevoFetch<{
      email?: string;
      companyName?: string;
      plan?: Array<{ type?: string }>;
    }>(apiKey, "/account");
    return {
      email: acc.email ?? "",
      companyName: acc.companyName,
      plan: acc.plan?.[0]?.type,
    };
  },

  async getLists(apiKey: string): Promise<ProviderList[]> {
    const data = await brevoFetch<{
      lists?: Array<{ id: number; name: string; totalSubscribers?: number }>;
    }>(apiKey, "/contacts/lists?limit=50&offset=0");
    return (data.lists ?? []).map((l) => ({
      id: l.id,
      name: l.name,
      totalSubscribers: l.totalSubscribers ?? 0,
    }));
  },

  async getSenders(apiKey: string): Promise<ProviderSender[]> {
    const data = await brevoFetch<{
      senders?: Array<{ id: number; name: string; email: string; active?: boolean }>;
    }>(apiKey, "/senders");
    return (data.senders ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      active: s.active ?? true,
    }));
  },

  async createList(apiKey: string, name: string): Promise<ProviderList> {
    // Brevo range les listes dans des "folders" ; folderId 1 = dossier par défaut.
    const created = await brevoFetch<{ id: number }>(apiKey, "/contacts/lists", {
      method: "POST",
      body: JSON.stringify({ name, folderId: 1 }),
    });
    return { id: created.id, name, totalSubscribers: 0 };
  },

  async importContacts(
    apiKey: string,
    listId: number,
    contacts: ImportContactInput[],
  ): Promise<{ imported: number }> {
    if (contacts.length === 0) return { imported: 0 };
    await brevoFetch(apiKey, "/contacts/import", {
      method: "POST",
      body: JSON.stringify({
        listIds: [listId],
        updateExistingContacts: true,
        emptyContactsAttributes: false,
        jsonBody: contacts.map((c) => ({
          email: c.email,
          attributes: {
            ...(c.firstName ? { FIRSTNAME: c.firstName } : {}),
            ...(c.lastName ? { LASTNAME: c.lastName } : {}),
          },
        })),
      }),
    });
    // L'import Brevo est asynchrone : on renvoie le nombre soumis.
    return { imported: contacts.length };
  },

  async getCampaigns(apiKey: string, limit = 10): Promise<ProviderCampaign[]> {
    const data = await brevoFetch<{
      campaigns?: Array<{
        id: number;
        name: string;
        subject?: string;
        status?: string;
        sentDate?: string | null;
        statistics?: {
          globalStats?: { sent?: number; delivered?: number; uniqueViews?: number; viewed?: number; uniqueClicks?: number; clickers?: number };
        };
      }>;
    }>(apiKey, `/emailCampaigns?limit=${limit}&offset=0&sort=desc`);
    return (data.campaigns ?? []).map((c) => {
      const g = c.statistics?.globalStats;
      const stats =
        g && (g.sent || g.delivered || g.uniqueViews || g.uniqueClicks)
          ? {
              sent: g.sent,
              delivered: g.delivered,
              opens: g.uniqueViews ?? g.viewed,
              clicks: g.uniqueClicks ?? g.clickers,
            }
          : null;
      return {
        id: String(c.id),
        name: c.name,
        subject: c.subject ?? "",
        status: c.status ?? "draft",
        sentAt: c.sentDate ?? null,
        stats,
      };
    });
  },

  async createCampaign(apiKey: string, input: CreateCampaignInput): Promise<{ id: string }> {
    const body: Record<string, unknown> = {
      name: input.name,
      subject: input.subject,
      sender: { name: input.fromName, email: input.fromEmail },
      htmlContent: input.htmlContent,
      recipients: { listIds: input.listIds },
    };
    if (input.replyTo) body.replyTo = input.replyTo;
    if (input.scheduledAt) body.scheduledAt = input.scheduledAt;
    const created = await brevoFetch<{ id: number }>(apiKey, "/emailCampaigns", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { id: String(created.id) };
  },

  async sendCampaign(apiKey: string, campaignId: string): Promise<void> {
    await brevoFetch(apiKey, `/emailCampaigns/${campaignId}/sendNow`, { method: "POST" });
  },
};
