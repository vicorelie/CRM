// Snapshot des stats campagnes du fournisseur (30 derniers jours).
// Écrit par le cron quotidien sur EmailProviderConnection.statsJson → le module
// Analytics lit ce snapshot (lecture DB) sans appel API live (zéro latence ajoutée).

import { prisma } from "@/lib/prisma";
import { getUserEmailConnection } from "./index";

export interface ProviderStatsSnapshot {
  campaignsSent: number;
  sent: number;
  delivered: number;
  opens: number;
  clicks: number;
  /** Fenêtre du snapshot, en jours (pour aligner avec la range Analytics). */
  windowDays: number;
  /** Signature d'index → compatible avec le type JSON d'entrée Prisma. */
  [k: string]: number;
}

const WINDOW_DAYS = 30;

export async function snapshotProviderStats(userId: string): Promise<ProviderStatsSnapshot | null> {
  const conn = await getUserEmailConnection(userId);
  if (!conn) return null;

  const campaigns = await conn.provider.getCampaigns(conn.apiKey, 50);
  const cutoff = Date.now() - WINDOW_DAYS * 86_400_000;

  const agg: ProviderStatsSnapshot = {
    campaignsSent: 0,
    sent: 0,
    delivered: 0,
    opens: 0,
    clicks: 0,
    windowDays: WINDOW_DAYS,
  };
  for (const c of campaigns) {
    if (c.status !== "sent") continue;
    const t = c.sentAt ? Date.parse(c.sentAt) : NaN;
    if (Number.isNaN(t) || t < cutoff) continue;
    agg.campaignsSent += 1;
    agg.sent += c.stats?.sent ?? 0;
    agg.delivered += c.stats?.delivered ?? 0;
    agg.opens += c.stats?.opens ?? 0;
    agg.clicks += c.stats?.clicks ?? 0;
  }

  await prisma.emailProviderConnection.update({
    where: { id: conn.connectionId },
    data: { statsJson: agg, statsSyncedAt: new Date() },
  });
  return agg;
}
