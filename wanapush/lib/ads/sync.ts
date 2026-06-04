// Sync : pull les campagnes + les KPIs daily depuis chaque Ad Account connecté.
// Upsert dans Campaign + AdMetrics.
import type { AdAccount } from "@prisma/client";
import { ensureFreshAdAccount, getAdsConnector, toAdAccountInfo } from "@/lib/ads";
import { prisma } from "@/lib/prisma";

const DEFAULT_LOOKBACK_DAYS = 30;

export async function syncAccount(account: AdAccount, lookbackDays = DEFAULT_LOOKBACK_DAYS) {
  const fresh = await ensureFreshAdAccount(account);
  const conn = getAdsConnector(fresh.platform);
  const info = toAdAccountInfo(fresh);

  // 1) Campagnes : on s'assure qu'un Business par défaut existe pour cet user
  let business = await prisma.business.findFirst({
    where: { userId: fresh.userId },
    orderBy: { createdAt: "asc" },
  });
  if (!business) {
    const u = await prisma.user.findUniqueOrThrow({
      where: { id: fresh.userId },
      select: { name: true, email: true },
    });
    business = await prisma.business.create({
      data: {
        userId: fresh.userId,
        name: u.name ?? u.email.split("@")[0],
      },
    });
  }

  let campaignsSynced = 0;
  let metricsSynced = 0;
  let errors: string[] = [];

  try {
    const campaigns = await conn.listCampaigns(info);
    const since = new Date(Date.now() - lookbackDays * 24 * 3600 * 1000);
    const until = new Date();

    for (const c of campaigns) {
      // Upsert campagne (clé = adAccountId + externalId)
      const existing = await prisma.campaign.findFirst({
        where: { adAccountId: fresh.id, externalId: c.externalId },
      });
      const data = {
        name: c.name,
        objective: c.objective,
        dailyBudget: c.dailyBudget,
        lifetimeBudget: c.lifetimeBudget,
        startDate: c.startDate,
        endDate: c.endDate,
        status: mapStatus(c.status),
        lastSyncAt: new Date(),
      } as const;
      const campaign = existing
        ? await prisma.campaign.update({ where: { id: existing.id }, data })
        : await prisma.campaign.create({
            data: {
              ...data,
              businessId: business.id,
              adAccountId: fresh.id,
              type: fresh.platform,
              externalId: c.externalId,
            },
          });
      campaignsSynced++;

      // Pull metrics daily
      try {
        const dailies = await conn.fetchMetrics(info, c.externalId, since, until);
        for (const d of dailies) {
          await prisma.adMetrics.upsert({
            where: { campaignId_date: { campaignId: campaign.id, date: d.date } },
            update: {
              spend: d.spend,
              impressions: d.impressions,
              clicks: d.clicks,
              conversions: d.conversions,
              revenue: d.revenue,
              raw: d.raw as never,
              fetchedAt: new Date(),
            },
            create: {
              campaignId: campaign.id,
              date: d.date,
              spend: d.spend,
              impressions: d.impressions,
              clicks: d.clicks,
              conversions: d.conversions,
              revenue: d.revenue,
              raw: d.raw as never,
            },
          });
          metricsSynced++;
        }
      } catch (e) {
        errors.push(
          `metrics ${c.externalId}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  } catch (e) {
    errors.push(`listCampaigns: ${e instanceof Error ? e.message : String(e)}`);
    await prisma.adAccount.update({
      where: { id: fresh.id },
      data: { status: "ERROR", lastError: errors[0] },
    });
  }

  return { campaignsSynced, metricsSynced, errors };
}

function mapStatus(raw?: string): "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" {
  if (!raw) return "DRAFT";
  const s = raw.toUpperCase();
  // Meta : ACTIVE, PAUSED, ARCHIVED, DELETED, IN_PROCESS, WITH_ISSUES…
  // Google : ENABLED, PAUSED, REMOVED
  // TikTok : ENABLE, DISABLE, PAUSED
  // LinkedIn : ACTIVE, PAUSED, DRAFT, ARCHIVED, COMPLETED, CANCELED
  if (s.includes("ACTIVE") || s.includes("ENABLE") || s.includes("RUNNING"))
    return "ACTIVE";
  if (s.includes("PAUS") || s.includes("DISABLE")) return "PAUSED";
  if (
    s.includes("ARCHIV") ||
    s.includes("COMPLET") ||
    s.includes("ENDED") ||
    s.includes("REMOV") ||
    s.includes("DELET")
  )
    return "COMPLETED";
  return "DRAFT";
}
