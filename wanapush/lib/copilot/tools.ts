// AI Marketing Copilot — définitions des tools que Claude peut appeler.
//
// Pattern : chaque tool a un schema JSON Schema (input_schema) qui permet à
// Claude de comprendre quels arguments fournir + un handler async qui exécute
// la fonction côté serveur en utilisant les aggregators analytics et connectors
// existants.
//
// Tools exposés (snapshot business → strategic action) :
//  - get_overview : KPIs cross-modules
//  - get_anomalies : alertes détectées
//  - get_leads_funnel : détail leads + breakdown
//  - get_ads_roi : ROAS par plateforme
//  - get_top_campaigns : meilleures / pires campagnes
//  - get_email_engagement : opens/clicks
//  - get_shop_revenue : CA, AOV, retention
//  - get_unit_economics : CAC / LTV / payback

import { prisma } from "@/lib/prisma";
import {
  getOverview,
  getLeadsFunnel,
  getEmailEngagement,
  getAdsROI,
  getShopRevenue,
  getGbpVisibility,
  getUnitEconomics,
  defaultRange,
  type DateRange,
} from "@/lib/analytics/aggregators";
import { detectAnomalies } from "@/lib/analytics/anomalies";

// ─── Anthropic Tool type ────────────────────────────────────────────────────

export type AnthropicTool = {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
};

export type ToolHandler = (userId: string, input: Record<string, unknown>) => Promise<unknown>;

// ─── Helper : parse days param → DateRange ──────────────────────────────────

function parseRange(input: Record<string, unknown>): DateRange {
  const days = Math.min(365, Math.max(1, Number(input.days ?? 30)));
  return defaultRange(days);
}

const DAYS_INPUT = {
  days: {
    type: "integer" as const,
    description: "Nombre de jours en arrière (1-365). Défaut 30.",
    minimum: 1,
    maximum: 365,
  },
};

// ─── Tools définitions + handlers ───────────────────────────────────────────

export const TOOLS: Array<{ tool: AnthropicTool; handler: ToolHandler }> = [
  {
    tool: {
      name: "get_overview",
      description:
        "Récupère les KPIs cross-modules (Ads, Leads, Email, Shop, GBP, Unit Economics) sur une période donnée. À utiliser pour avoir une vue d'ensemble du business avant de répondre à une question stratégique.",
      input_schema: { type: "object", properties: DAYS_INPUT },
    },
    handler: async (userId, input) => getOverview(userId, parseRange(input)),
  },
  {
    tool: {
      name: "get_anomalies",
      description:
        "Liste les anomalies détectées (chutes ROAS, lead inflow, spike spend) via écart-type 30j. À utiliser si l'user demande ce qui ne va pas ou ce qui doit être surveillé.",
      input_schema: { type: "object", properties: {} },
    },
    handler: async (userId) => ({ anomalies: await detectAnomalies(userId) }),
  },
  {
    tool: {
      name: "get_leads_funnel",
      description: "Détail des leads sur la période : breakdown par temperature et status, taux conversion, score moyen.",
      input_schema: { type: "object", properties: DAYS_INPUT },
    },
    handler: async (userId, input) => getLeadsFunnel(userId, parseRange(input)),
  },
  {
    tool: {
      name: "get_ads_roi",
      description: "Métriques publicités cross-plateforme : spend, ROAS, CTR, CPA + breakdown par plateforme (Meta, Google, TikTok, LinkedIn).",
      input_schema: { type: "object", properties: DAYS_INPUT },
    },
    handler: async (userId, input) => getAdsROI(userId, parseRange(input)),
  },
  {
    tool: {
      name: "get_email_engagement",
      description: "Engagement email marketing : campagnes envoyées, taux ouverture/clic/désabo/bounce.",
      input_schema: { type: "object", properties: DAYS_INPUT },
    },
    handler: async (userId, input) => getEmailEngagement(userId, parseRange(input)),
  },
  {
    tool: {
      name: "get_shop_revenue",
      description: "Revenue boutique e-commerce : CA, panier moyen, remboursements, net, taux de clients fidèles.",
      input_schema: { type: "object", properties: DAYS_INPUT },
    },
    handler: async (userId, input) => getShopRevenue(userId, parseRange(input)),
  },
  {
    tool: {
      name: "get_gbp_visibility",
      description: "Visibilité Google Business Profile : impressions Maps/Search, clics web/appels/itinéraires, note moyenne, score audit.",
      input_schema: { type: "object", properties: DAYS_INPUT },
    },
    handler: async (userId, input) => getGbpVisibility(userId, parseRange(input)),
  },
  {
    tool: {
      name: "get_unit_economics",
      description: "Unit Economics : CAC, LTV, ratio LTV:CAC (cible 3:1+), CAC Payback months, Lead Velocity Rate (LVR % vs période précédente).",
      input_schema: { type: "object", properties: DAYS_INPUT },
    },
    handler: async (userId, input) => getUnitEconomics(userId, parseRange(input)),
  },
  {
    tool: {
      name: "get_top_campaigns",
      description: "Top N campagnes publicitaires par ROAS sur la période. À utiliser pour identifier ce qui marche le mieux.",
      input_schema: {
        type: "object",
        properties: {
          ...DAYS_INPUT,
          limit: { type: "integer", description: "Nombre max de campagnes à retourner (1-20). Défaut 5.", minimum: 1, maximum: 20 },
        },
      },
    },
    handler: async (userId, input) => {
      const range = parseRange(input);
      const limit = Math.min(20, Math.max(1, Number(input.limit ?? 5)));
      const campaigns = await prisma.campaign.findMany({
        where: { adAccount: { userId } },
        select: {
          id: true, name: true, type: true, status: true,
          adAccount: { select: { platform: true, name: true } },
          metrics: {
            where: { date: { gte: range.start, lte: range.end } },
            select: { spend: true, impressions: true, clicks: true, conversions: true, revenue: true },
          },
        },
      });
      const aggregated = campaigns
        .map((c) => {
          const sums = c.metrics.reduce(
            (s, m) => ({
              spend: s.spend + m.spend,
              impressions: s.impressions + m.impressions,
              clicks: s.clicks + m.clicks,
              conversions: s.conversions + m.conversions,
              revenue: s.revenue + m.revenue,
            }),
            { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
          );
          return {
            id: c.id,
            name: c.name,
            platform: c.adAccount?.platform,
            status: c.status,
            ...sums,
            roas: sums.spend > 0 ? sums.revenue / sums.spend : 0,
            cpa: sums.conversions > 0 ? sums.spend / sums.conversions : null,
          };
        })
        .filter((c) => c.spend > 0)
        .sort((a, b) => b.roas - a.roas)
        .slice(0, limit);
      return { campaigns: aggregated };
    },
  },
];

export const TOOL_BY_NAME = new Map(TOOLS.map((t) => [t.tool.name, t]));

export function getAnthropicTools(): AnthropicTool[] {
  return TOOLS.map((t) => t.tool);
}
