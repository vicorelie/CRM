// Moteur d'optimisation continue pour les campagnes WanaPush.
//
// Logique :
//   1. Lit les AdMetrics des N derniers jours pour une campagne
//   2. Calcule ROAS, CPA, CTR agrégés sur la période
//   3. Applique des règles déterministes pour suggérer une action
//   4. En mode non-dry-run : exécute l'action via AdsConnector + met à jour la DB
//
// Règles (modifiables via OptimizationThresholds) :
//   PAUSE  : ROAS < roasPauseBelow ET spend > minSpendToAct (sous-performer avéré)
//   SCALE  : ROAS >= roasScaleAbove ET conversions >= minConversionsToScale → +30% budget
//   REDUCE : roasPauseBelow <= ROAS < roasReduceBelow ET spend > minSpendToAct → -25% budget
//   WATCH  : tout le reste (ROAS correct mais pas encore assez de données)

import { prisma } from "@/lib/prisma";
import { getAdsConnector, ensureFreshAdAccount } from "@/lib/ads/index";
import type { AdPlatform } from "@/lib/ads/types";
import { decrypt } from "@/lib/crypto";
import { getCreativeFatigue, type CreativeFatigueReport } from "@/lib/ads/meta";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OptimizationAction =
  | "PAUSE"
  | "SCALE"
  | "REDUCE_BUDGET"
  | "REFRESH_CREATIVE"
  | "WATCH"
  | "INSUFFICIENT_DATA";

export type OptimizationSuggestion = {
  campaignId: string;
  campaignName: string;
  platform: AdPlatform;
  externalId: string | null;
  action: OptimizationAction;
  reason: string;
  /** Métriques agrégées sur la période analysée */
  metrics: {
    days: number;
    spend: number;
    revenue: number;
    conversions: number;
    clicks: number;
    impressions: number;
    roas: number | null;
    cpa: number | null;
    ctr: number | null;
  };
  /** Budget journalier actuel en DB (peut être null si non connu) */
  currentDailyBudget: number | null;
  /** Budget proposé après action (null si pas de changement de budget) */
  newDailyBudget: number | null;
  /** true si l'action a été appliquée (mode non-dry-run) */
  applied: boolean;
  appliedError?: string;
  /** Rapport de fatigue créative (Meta uniquement, si disponible) */
  fatigueReport?: CreativeFatigueReport;
};

export type OptimizationThresholds = {
  /** Fenêtre d'analyse en jours (défaut 7) */
  windowDays: number;
  /** ROAS en-dessous duquel on pause (défaut 0.5) */
  roasPauseBelow: number;
  /** ROAS en-dessous duquel on réduit le budget de 25% (défaut 1.0) */
  roasReduceBelow: number;
  /** ROAS au-dessus duquel on scale de 30% (défaut 2.5) */
  roasScaleAbove: number;
  /** Dépense minimum pour agir (évite de toucher aux campagnes trop jeunes, défaut 10€) */
  minSpendToAct: number;
  /** Nombre minimum de conversions pour scale (défaut 2) */
  minConversionsToScale: number;
  /** Multiplicateur de budget pour scale (défaut 1.30 = +30%) */
  scaleFactor: number;
  /** Multiplicateur de budget pour reduce (défaut 0.75 = -25%) */
  reduceFactor: number;
  /** Budget journalier minimum après réduction (défaut 1€) */
  minDailyBudget: number;
};

export const DEFAULT_THRESHOLDS: OptimizationThresholds = {
  windowDays: 7,
  roasPauseBelow: 0.5,
  roasReduceBelow: 1.0,
  roasScaleAbove: 2.5,
  minSpendToAct: 10,
  minConversionsToScale: 2,
  scaleFactor: 1.3,
  reduceFactor: 0.75,
  minDailyBudget: 1,
};

// ─── Analyse d'une seule campagne ─────────────────────────────────────────────

export async function analyzeCampaign(
  campaignId: string,
  thresholds: OptimizationThresholds = DEFAULT_THRESHOLDS,
): Promise<OptimizationSuggestion | null> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      adAccount: {
        select: {
          id: true,
          platform: true,
          accessToken: true,
          refreshToken: true,
          tokenExpiresAt: true,
          meta: true,
          status: true,
        },
      },
      metrics: {
        where: { date: { gte: daysAgo(thresholds.windowDays) } },
        select: { spend: true, revenue: true, conversions: true, clicks: true, impressions: true },
      },
    },
  });

  if (!campaign) return null;

  const platform = (campaign.type as AdPlatform) ?? campaign.adAccount?.platform;
  const metrics = aggregateMetrics(campaign.metrics);

  const suggestion: OptimizationSuggestion = {
    campaignId: campaign.id,
    campaignName: campaign.name,
    platform: platform as AdPlatform,
    externalId: campaign.externalId ?? null,
    action: "WATCH",
    reason: "",
    metrics,
    currentDailyBudget: campaign.dailyBudget ?? null,
    newDailyBudget: null,
    applied: false,
  };

  // Données insuffisantes — trop peu de spend pour décider
  if (metrics.spend < thresholds.minSpendToAct) {
    suggestion.action = "INSUFFICIENT_DATA";
    suggestion.reason = `Seulement ${fmtEur(metrics.spend)} dépensé sur ${thresholds.windowDays}j — minimum ${fmtEur(thresholds.minSpendToAct)} requis pour optimiser.`;
    return suggestion;
  }

  // Campagne sans externalId → pas encore pushée, rien à faire
  if (!campaign.externalId) {
    suggestion.action = "INSUFFICIENT_DATA";
    suggestion.reason = "Campagne non encore poussée sur la plateforme.";
    return suggestion;
  }

  const roas = metrics.roas;

  // PAUSE — sous-performer avéré
  if (roas !== null && roas < thresholds.roasPauseBelow) {
    suggestion.action = "PAUSE";
    suggestion.reason = `ROAS de ${fmtRoas(roas)} sur ${thresholds.windowDays}j (seuil : ${thresholds.roasPauseBelow}). ${fmtEur(metrics.spend)} dépensé pour ${fmtEur(metrics.revenue)} générés.`;
    return suggestion;
  }

  // REDUCE_BUDGET — ROAS marginal
  if (roas !== null && roas < thresholds.roasReduceBelow) {
    const current = campaign.dailyBudget ?? 10;
    const reduced = Math.max(current * thresholds.reduceFactor, thresholds.minDailyBudget);
    suggestion.action = "REDUCE_BUDGET";
    suggestion.reason = `ROAS de ${fmtRoas(roas)} — marginalement rentable. Réduction du budget journalier de ${fmtEur(current)} à ${fmtEur(reduced)} (−${Math.round((1 - thresholds.reduceFactor) * 100)}%).`;
    suggestion.newDailyBudget = reduced;
    return suggestion;
  }

  // SCALE — winner
  if (
    roas !== null &&
    roas >= thresholds.roasScaleAbove &&
    metrics.conversions >= thresholds.minConversionsToScale
  ) {
    const current = campaign.dailyBudget ?? 10;
    const scaled = current * thresholds.scaleFactor;
    suggestion.action = "SCALE";
    suggestion.reason = `ROAS de ${fmtRoas(roas)} avec ${metrics.conversions} conversions sur ${thresholds.windowDays}j — winner. Budget journalier proposé : ${fmtEur(current)} → ${fmtEur(scaled)} (+${Math.round((thresholds.scaleFactor - 1) * 100)}%).`;
    suggestion.newDailyBudget = scaled;
    return suggestion;
  }

  // REFRESH_CREATIVE — fatigue créative détectée sur Meta (fréquence trop haute)
  // Ne s'applique qu'aux campagnes META_ADS avec un externalId valide.
  if (platform === "META_ADS" && campaign.adAccount) {
    try {
      const accountInfo = {
        ...campaign.adAccount,
        accessToken: decrypt(campaign.adAccount.accessToken),
        refreshToken: campaign.adAccount.refreshToken
          ? decrypt(campaign.adAccount.refreshToken)
          : undefined,
      };
      const fatigue = await getCreativeFatigue(accountInfo as never, campaign.externalId!);
      suggestion.fatigueReport = fatigue;
      if (fatigue.level === "HIGH" || fatigue.level === "MEDIUM") {
        suggestion.action = "REFRESH_CREATIVE";
        suggestion.reason = fatigue.recommendation;
        return suggestion;
      }
    } catch {
      // Fatigue check non bloquant — continuer avec WATCH si erreur
    }
  }

  // WATCH — performances acceptables, pas d'action
  suggestion.action = "WATCH";
  suggestion.reason = roas !== null
    ? `ROAS de ${fmtRoas(roas)} — dans la norme. Surveillance recommandée.`
    : `Pas assez de conversions pour calculer le ROAS. ${fmtEur(metrics.spend)} dépensé, ${metrics.clicks} clics.`;
  return suggestion;
}

// ─── Appliquer l'action sur la plateforme ─────────────────────────────────────

export async function applyOptimization(
  suggestion: OptimizationSuggestion,
): Promise<OptimizationSuggestion> {
  if (
    suggestion.action === "WATCH" ||
    suggestion.action === "INSUFFICIENT_DATA" ||
    !suggestion.externalId
  ) {
    return suggestion;
  }

  // Charger le compte pub avec tokens déchiffrés
  const campaign = await prisma.campaign.findUnique({
    where: { id: suggestion.campaignId },
    include: {
      adAccount: {
        select: {
          id: true,
          platform: true,
          accessToken: true,
          refreshToken: true,
          tokenExpiresAt: true,
          meta: true,
          status: true,
        },
      },
    },
  });

  if (!campaign?.adAccount) {
    return { ...suggestion, applied: false, appliedError: "AdAccount introuvable" };
  }

  let accountInfo = {
    ...campaign.adAccount,
    accessToken: decrypt(campaign.adAccount.accessToken),
    refreshToken: campaign.adAccount.refreshToken
      ? decrypt(campaign.adAccount.refreshToken)
      : undefined,
  };

  try {
    accountInfo = await ensureFreshAdAccount(accountInfo as never) as typeof accountInfo;
  } catch {
    // Token refresh failed — on continue avec le token actuel, l'action échouera si expiré
  }

  const connector = getAdsConnector(suggestion.platform);

  try {
    if (suggestion.action === "PAUSE") {
      if (!connector.updateCampaignStatus) {
        throw new Error(`${suggestion.platform} ne supporte pas updateCampaignStatus`);
      }
      await connector.updateCampaignStatus(accountInfo as never, suggestion.externalId, "PAUSED");
      await prisma.campaign.update({
        where: { id: suggestion.campaignId },
        data: { status: "PAUSED" },
      });

    } else if (suggestion.action === "SCALE" || suggestion.action === "REDUCE_BUDGET") {
      if (suggestion.newDailyBudget === null) {
        throw new Error("newDailyBudget absent pour SCALE/REDUCE_BUDGET");
      }
      if (!connector.updateCampaignBudget) {
        throw new Error(`${suggestion.platform} ne supporte pas updateCampaignBudget`);
      }
      await connector.updateCampaignBudget(
        accountInfo as never,
        suggestion.externalId,
        suggestion.newDailyBudget,
      );
      await prisma.campaign.update({
        where: { id: suggestion.campaignId },
        data: { dailyBudget: suggestion.newDailyBudget },
      });
    }

    return { ...suggestion, applied: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[auto-optimizer] applyOptimization failed for ${suggestion.campaignId}:`, msg);
    return { ...suggestion, applied: false, appliedError: msg };
  }
}

// ─── Analyser toutes les campagnes actives d'un user ─────────────────────────

export async function analyzeUserCampaigns(
  userId: string,
  thresholds: OptimizationThresholds = DEFAULT_THRESHOLDS,
): Promise<OptimizationSuggestion[]> {
  const campaigns = await prisma.campaign.findMany({
    where: {
      business: { userId },
      status: { in: ["ACTIVE", "PAUSED"] },
      externalId: { not: null },
    },
    select: { id: true },
  });

  const results = await Promise.all(
    campaigns.map((c) => analyzeCampaign(c.id, thresholds)),
  );
  return results.filter((r): r is OptimizationSuggestion => r !== null);
}

// ─── Helpers internes ─────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function aggregateMetrics(rows: { spend: number; revenue: number; conversions: number; clicks: number; impressions: number }[]) {
  const spend = rows.reduce((s, r) => s + r.spend, 0);
  const revenue = rows.reduce((s, r) => s + r.revenue, 0);
  const conversions = rows.reduce((s, r) => s + r.conversions, 0);
  const clicks = rows.reduce((s, r) => s + r.clicks, 0);
  const impressions = rows.reduce((s, r) => s + r.impressions, 0);
  const roas = spend > 0 && revenue > 0 ? revenue / spend : null;
  const cpa = conversions > 0 && spend > 0 ? spend / conversions : null;
  const ctr = impressions > 0 && clicks > 0 ? clicks / impressions : null;
  return { days: 0, spend, revenue, conversions, clicks, impressions, roas, cpa, ctr };
}

function fmtEur(n: number) {
  return `${n.toFixed(2)} €`;
}

function fmtRoas(n: number) {
  return `${n.toFixed(2)}x`;
}
