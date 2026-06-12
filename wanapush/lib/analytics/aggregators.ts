// Analytics — agrégateurs cross-modules pour le dashboard founder.
//
// KPIs trackés (best practices SaaS 2026) :
//  - Acquisition : CAC, CAC Payback, Lead Velocity Rate, ROAS
//  - Retention : Churn, NRR, LTV
//  - Cross-channel : email engagement, GBP visibility, lead funnel
//
// Architecture : 1 fonction par section + 1 orchestrator getOverview() qui
// fait tout en parallèle (Promise.all). Best-effort par section.

import { prisma } from "@/lib/prisma";

export type DateRange = { start: Date; end: Date };

// ─── Helper ─────────────────────────────────────────────────────────────────

export function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function defaultRange(days = 30): DateRange {
  return { start: daysAgo(days), end: new Date() };
}

// ─── 1. Leads Funnel ────────────────────────────────────────────────────────

export type LeadsFunnel = {
  total: number;
  byTemperature: { HOT: number; WARM: number; COLD: number; INVALID: number };
  byStatus: { NEW: number; CONTACTED: number; QUALIFIED: number; CONVERTED: number; DISQUALIFIED: number };
  conversionRate: number; // CONVERTED / total ACTIVE (NEW+CONTACTED+QUALIFIED+CONVERTED)
  averageScore: number | null;
};

export async function getLeadsFunnel(userId: string, range: DateRange): Promise<LeadsFunnel> {
  // Résoudre les sites du user (siteSlug du FormSubmission n'est pas FK direct)
  const sites = await prisma.generatedSite.findMany({
    where: { userId },
    select: { slug: true, meta: true },
  });
  const slugs = sites
    .map((s) => s.slug ?? ((s.meta as Record<string, unknown> | null)?.siteSlug as string | undefined))
    .filter(Boolean) as string[];

  if (slugs.length === 0) {
    return {
      total: 0,
      byTemperature: { HOT: 0, WARM: 0, COLD: 0, INVALID: 0 },
      byStatus: { NEW: 0, CONTACTED: 0, QUALIFIED: 0, CONVERTED: 0, DISQUALIFIED: 0 },
      conversionRate: 0,
      averageScore: null,
    };
  }

  const where = {
    siteSlug: { in: slugs },
    createdAt: { gte: range.start, lte: range.end },
  };

  const [total, tempCounts, statusCounts, avg] = await Promise.all([
    prisma.formSubmission.count({ where }),
    prisma.formSubmission.groupBy({
      by: ["leadTemperature"],
      where,
      _count: { _all: true },
    }),
    prisma.formSubmission.groupBy({
      by: ["leadStatus"],
      where,
      _count: { _all: true },
    }),
    prisma.formSubmission.aggregate({ where, _avg: { leadScore: true } }),
  ]);

  const byTemperature = { HOT: 0, WARM: 0, COLD: 0, INVALID: 0 };
  for (const t of tempCounts) {
    if (t.leadTemperature) byTemperature[t.leadTemperature] = t._count._all;
  }
  const byStatus = { NEW: 0, CONTACTED: 0, QUALIFIED: 0, CONVERTED: 0, DISQUALIFIED: 0 };
  for (const s of statusCounts) {
    byStatus[s.leadStatus] = s._count._all;
  }

  const active = byStatus.NEW + byStatus.CONTACTED + byStatus.QUALIFIED + byStatus.CONVERTED;
  const conversionRate = active > 0 ? byStatus.CONVERTED / active : 0;

  return {
    total,
    byTemperature,
    byStatus,
    conversionRate,
    averageScore: avg._avg.leadScore,
  };
}

// ─── 2. Email Engagement ────────────────────────────────────────────────────

export type EmailEngagement = {
  campaignsSent: number;
  totalRecipients: number;
  totalSent: number;
  totalDelivered: number;
  uniqueOpens: number;
  uniqueClicks: number;
  bounces: number;
  complaints: number;
  unsubscribes: number;
  /** Rates calculés sur delivered (best practice 2026) */
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubRate: number;
};

export async function getEmailEngagement(userId: string, range: DateRange): Promise<EmailEngagement> {
  const campaigns = await prisma.emailCampaign.findMany({
    where: { userId, sentAt: { gte: range.start, lte: range.end }, status: "SENT" },
    select: { stats: true },
  });

  let totalRecipients = 0;
  let totalSent = 0;
  let totalDelivered = 0;
  let uniqueOpens = 0;
  let uniqueClicks = 0;
  let bounces = 0;
  let complaints = 0;
  let unsubscribes = 0;

  for (const c of campaigns) {
    const s = (c.stats as Record<string, number> | null) ?? {};
    totalRecipients += s.recipients ?? 0;
    totalSent += s.sent ?? 0;
    totalDelivered += s.delivered ?? 0;
    uniqueOpens += s.uniqueOpens ?? 0;
    uniqueClicks += s.uniqueClicks ?? 0;
    bounces += s.bounces ?? 0;
    complaints += s.complaints ?? 0;
    unsubscribes += s.unsubscribes ?? 0;
  }

  let campaignsSent = campaigns.length;

  // Merge du snapshot fournisseur externe (Brevo) écrit par le cron. Le snapshot
  // couvre 30j → on ne le fusionne que si la range demandée est ~30j (overview),
  // pour rester cohérent côté dates (sinon stats natives uniquement).
  const rangeDays = Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000);
  if (Math.abs(rangeDays - 30) <= 7) {
    const conn = await prisma.emailProviderConnection.findFirst({
      where: { userId, status: "CONNECTED" },
      select: { statsJson: true },
    });
    const snap = conn?.statsJson as Record<string, number> | null;
    if (snap) {
      campaignsSent += snap.campaignsSent ?? 0;
      totalSent += snap.sent ?? 0;
      totalDelivered += snap.delivered ?? 0;
      uniqueOpens += snap.opens ?? 0;
      uniqueClicks += snap.clicks ?? 0;
    }
  }

  const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);
  return {
    campaignsSent,
    totalRecipients,
    totalSent,
    totalDelivered,
    uniqueOpens,
    uniqueClicks,
    bounces,
    complaints,
    unsubscribes,
    openRate: safeDiv(uniqueOpens, totalDelivered),
    clickRate: safeDiv(uniqueClicks, totalDelivered),
    bounceRate: safeDiv(bounces, totalSent),
    unsubRate: safeDiv(unsubscribes, totalDelivered),
  };
}

// ─── 3. Ads ROI (cross-platform) ────────────────────────────────────────────

export type AdsROI = {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  /** ROAS global = revenue / spend */
  roas: number;
  /** CTR = clicks / impressions */
  ctr: number;
  /** CPA = spend / conversions */
  cpa: number;
  /** Détail par plateforme */
  byPlatform: Array<{
    platform: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    roas: number;
  }>;
};

export async function getAdsROI(userId: string, range: DateRange): Promise<AdsROI> {
  // Résoudre les AdAccounts du user puis les campaigns
  const campaigns = await prisma.campaign.findMany({
    where: { adAccount: { userId } },
    select: { id: true, adAccount: { select: { platform: true } } },
  });
  const campaignIds = campaigns.map((c) => c.id);
  const platformByCampaign = new Map(campaigns.map((c) => [c.id, c.adAccount?.platform ?? "UNKNOWN"]));

  if (campaignIds.length === 0) {
    return {
      totalSpend: 0,
      totalImpressions: 0,
      totalClicks: 0,
      totalConversions: 0,
      totalRevenue: 0,
      roas: 0, ctr: 0, cpa: 0,
      byPlatform: [],
    };
  }

  const metrics = await prisma.adMetrics.findMany({
    where: {
      campaignId: { in: campaignIds },
      date: { gte: range.start, lte: range.end },
    },
    select: { campaignId: true, spend: true, impressions: true, clicks: true, conversions: true, revenue: true },
  });

  let totalSpend = 0, totalImpressions = 0, totalClicks = 0, totalConversions = 0, totalRevenue = 0;
  const byPlat = new Map<string, { spend: number; impressions: number; clicks: number; conversions: number; revenue: number }>();
  for (const m of metrics) {
    totalSpend += m.spend;
    totalImpressions += m.impressions;
    totalClicks += m.clicks;
    totalConversions += m.conversions;
    totalRevenue += m.revenue;
    const platform = platformByCampaign.get(m.campaignId) ?? "UNKNOWN";
    const cur = byPlat.get(platform) ?? { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 };
    cur.spend += m.spend;
    cur.impressions += m.impressions;
    cur.clicks += m.clicks;
    cur.conversions += m.conversions;
    cur.revenue += m.revenue;
    byPlat.set(platform, cur);
  }

  const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);
  return {
    totalSpend, totalImpressions, totalClicks, totalConversions, totalRevenue,
    roas: safeDiv(totalRevenue, totalSpend),
    ctr: safeDiv(totalClicks, totalImpressions),
    cpa: safeDiv(totalSpend, totalConversions),
    byPlatform: Array.from(byPlat.entries())
      .map(([platform, v]) => ({ platform, ...v, roas: safeDiv(v.revenue, v.spend) }))
      .sort((a, b) => b.spend - a.spend),
  };
}

// ─── 4. Shop Revenue ────────────────────────────────────────────────────────

export type ShopRevenue = {
  totalRevenue: number;
  paidOrders: number;
  averageOrderValue: number;
  refundedAmount: number;
  netRevenue: number;
  uniqueCustomers: number;
  repeatCustomersRate: number; // ordersCount >= 2 / total customers
};

export async function getShopRevenue(userId: string, range: DateRange): Promise<ShopRevenue> {
  const shops = await prisma.shop.findMany({
    where: { userId },
    select: { id: true },
  });
  const shopIds = shops.map((s) => s.id);
  if (shopIds.length === 0) {
    return {
      totalRevenue: 0, paidOrders: 0, averageOrderValue: 0, refundedAmount: 0,
      netRevenue: 0, uniqueCustomers: 0, repeatCustomersRate: 0,
    };
  }

  const orderWhere = {
    shopId: { in: shopIds },
    paidAt: { gte: range.start, lte: range.end },
    financialStatus: { in: ["PAID", "PARTIALLY_REFUNDED"] as Array<"PAID" | "PARTIALLY_REFUNDED"> },
  };

  const [aggOrders, refundsAgg, uniqueCustomers, repeatCustomers] = await Promise.all([
    prisma.order.aggregate({
      where: orderWhere,
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.refund.aggregate({
      where: { order: { shopId: { in: shopIds } }, createdAt: { gte: range.start, lte: range.end } },
      _sum: { amount: true },
    }),
    prisma.order.findMany({
      where: orderWhere,
      select: { customerEmail: true },
      distinct: ["customerEmail"],
    }),
    prisma.customer.count({
      where: { shopId: { in: shopIds }, ordersCount: { gte: 2 } },
    }),
  ]);

  const totalRevenue = Number(aggOrders._sum.total ?? 0);
  const paidOrders = aggOrders._count._all;
  const refundedAmount = Number(refundsAgg._sum.amount ?? 0);
  const totalCustomers = await prisma.customer.count({ where: { shopId: { in: shopIds } } });

  return {
    totalRevenue,
    paidOrders,
    averageOrderValue: paidOrders > 0 ? totalRevenue / paidOrders : 0,
    refundedAmount,
    netRevenue: totalRevenue - refundedAmount,
    uniqueCustomers: uniqueCustomers.length,
    repeatCustomersRate: totalCustomers > 0 ? repeatCustomers / totalCustomers : 0,
  };
}

// ─── 5. GBP Visibility ──────────────────────────────────────────────────────

export type GbpVisibility = {
  totalImpressions: number;
  websiteClicks: number;
  callClicks: number;
  directionClicks: number;
  averageRating: number | null;
  totalReviews: number;
  /** Score audit moyen sur toutes les locations du user (0-100) */
  averageAuditScore: number | null;
};

export async function getGbpVisibility(userId: string, range: DateRange): Promise<GbpVisibility> {
  const locations = await prisma.gbpLocation.findMany({
    where: { account: { userId } },
    select: { id: true, reviewsCount: true, averageRating: true, auditScore: true },
  });
  if (locations.length === 0) {
    return {
      totalImpressions: 0, websiteClicks: 0, callClicks: 0, directionClicks: 0,
      averageRating: null, totalReviews: 0, averageAuditScore: null,
    };
  }
  const locIds = locations.map((l) => l.id);

  const agg = await prisma.gbpInsight.aggregate({
    where: { locationId: { in: locIds }, date: { gte: range.start, lte: range.end } },
    _sum: { impressions: true, websiteClicks: true, callClicks: true, directionClicks: true },
  });

  const ratings = locations.filter((l) => l.averageRating !== null).map((l) => l.averageRating!);
  const auditScores = locations.filter((l) => l.auditScore !== null).map((l) => l.auditScore!);
  const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

  return {
    totalImpressions: agg._sum.impressions ?? 0,
    websiteClicks: agg._sum.websiteClicks ?? 0,
    callClicks: agg._sum.callClicks ?? 0,
    directionClicks: agg._sum.directionClicks ?? 0,
    averageRating: avg(ratings),
    totalReviews: locations.reduce((s, l) => s + l.reviewsCount, 0),
    averageAuditScore: avg(auditScores),
  };
}

// ─── 6. Unit Economics (CAC + LTV cross-channel) ───────────────────────────

export type UnitEconomics = {
  /** Customer Acquisition Cost = Ads spend / new customers (Stripe Shop) */
  cac: number | null;
  /** Lifetime Value = avg revenue per customer (totalSpent / count) */
  ltv: number | null;
  /** Ratio LTV/CAC (cible 3:1+) */
  ltvCacRatio: number | null;
  /** CAC Payback = CAC / (LTV / lifetimeMonths). Approximé sur derniers 30j. */
  cacPaybackMonths: number | null;
  /** Lead Velocity Rate : croissance % du flux lead MoM */
  leadVelocityRate: number | null;
  newCustomersInRange: number;
  totalSpendInRange: number;
};

export async function getUnitEconomics(userId: string, range: DateRange): Promise<UnitEconomics> {
  const [ads, shop] = await Promise.all([
    getAdsROI(userId, range),
    getShopRevenue(userId, range),
  ]);

  // CAC : spend Ads / new paying customers (orders payés dans range)
  const newCustomers = shop.uniqueCustomers;
  const cac = newCustomers > 0 ? ads.totalSpend / newCustomers : null;

  // LTV approx : moyenne du totalSpent sur tous les Customers du user
  const shops = await prisma.shop.findMany({ where: { userId }, select: { id: true } });
  const shopIds = shops.map((s) => s.id);
  let ltv: number | null = null;
  if (shopIds.length > 0) {
    const cust = await prisma.customer.aggregate({
      where: { shopId: { in: shopIds }, ordersCount: { gte: 1 } },
      _avg: { totalSpent: true },
    });
    ltv = cust._avg.totalSpent ? Number(cust._avg.totalSpent) : null;
  }

  const ltvCacRatio = cac && ltv ? ltv / cac : null;
  // CAC Payback : si on suppose une période de 1 mois pour le range (approx)
  // payback = CAC / monthlyRevPerCustomer
  const days = Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / 86400000));
  const monthlyRev = (shop.netRevenue / newCustomers) * (30 / days);
  const cacPaybackMonths = cac && monthlyRev > 0 ? cac / monthlyRev : null;

  // Lead Velocity Rate (LVR) : croissance leads vs période précédente même durée
  const previousRange: DateRange = {
    start: new Date(range.start.getTime() - days * 86400000),
    end: range.start,
  };
  const [currLeads, prevLeads] = await Promise.all([
    getLeadsFunnel(userId, range),
    getLeadsFunnel(userId, previousRange),
  ]);
  const leadVelocityRate =
    prevLeads.total > 0 ? (currLeads.total - prevLeads.total) / prevLeads.total : null;

  return {
    cac,
    ltv,
    ltvCacRatio,
    cacPaybackMonths,
    leadVelocityRate,
    newCustomersInRange: newCustomers,
    totalSpendInRange: ads.totalSpend,
  };
}

// ─── 7. Orchestrator : overview tout-en-un ─────────────────────────────────

export type AnalyticsOverview = {
  range: { start: string; end: string };
  leads: LeadsFunnel;
  email: EmailEngagement;
  ads: AdsROI;
  shop: ShopRevenue;
  gbp: GbpVisibility;
  unitEconomics: UnitEconomics;
};

/** Charge toutes les sections en parallèle (Promise.all). Best-effort par
 *  section (chaque aggregator return des zeros si pas de data). */
export async function getOverview(userId: string, range?: DateRange): Promise<AnalyticsOverview> {
  const r = range ?? defaultRange(30);
  const [leads, email, ads, shop, gbp, unitEconomics] = await Promise.all([
    getLeadsFunnel(userId, r),
    getEmailEngagement(userId, r),
    getAdsROI(userId, r),
    getShopRevenue(userId, r),
    getGbpVisibility(userId, r),
    getUnitEconomics(userId, r),
  ]);
  return {
    range: { start: r.start.toISOString(), end: r.end.toISOString() },
    leads, email, ads, shop, gbp, unitEconomics,
  };
}
