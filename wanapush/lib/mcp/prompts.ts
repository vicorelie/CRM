// MCP Prompts — templates pré-faits pour le founder.
//
// Pattern (spec 2025-06-18) :
//  - Slash commands dans les clients IA (Claude.ai, Cursor, etc.)
//  - L'user sélectionne un prompt → arguments demandés → server génère
//    les messages avec contexte injecté (data WanaPush via tools en amont)
//
// Pour V1 : les prompts sont des templates statiques qui incluent les
// data via resource references — Claude.ai appellera ensuite resources/read
// pour charger le snapshot.

import { getOverview, defaultRange } from "@/lib/analytics/aggregators";
import { detectAnomalies } from "@/lib/analytics/anomalies";

// ─── Types MCP ──────────────────────────────────────────────────────────────

export type McpPromptArgument = {
  name: string;
  description?: string;
  required?: boolean;
};

export type McpPrompt = {
  name: string;
  title?: string;
  description?: string;
  arguments?: McpPromptArgument[];
};

export type McpPromptMessage = {
  role: "user" | "assistant";
  content:
    | { type: "text"; text: string }
    | { type: "resource"; resource: { uri: string; mimeType?: string; text: string } };
};

export type McpPromptResult = {
  description?: string;
  messages: McpPromptMessage[];
};

// ─── Liste des prompts disponibles ─────────────────────────────────────────

export const PROMPTS: McpPrompt[] = [
  {
    name: "diagnostic_roas",
    title: "📊 Diagnostic ROAS",
    description: "Analyse complète de la performance publicitaire : ROAS par plateforme, anomalies, top campagnes, plan d'action concret.",
    arguments: [],
  },
  {
    name: "growth_plan_90d",
    title: "🚀 Plan de croissance 90 jours",
    description: "Roadmap stratégique pour atteindre un objectif MRR sur 90 jours, basée sur les KPIs actuels + benchmarks SaaS 2026.",
    arguments: [
      {
        name: "objectif_mrr",
        description: "Objectif MRR cible (ex: 5000 pour 5k€/mois)",
        required: true,
      },
    ],
  },
  {
    name: "weekly_review",
    title: "📅 Revue hebdo founder",
    description: "Récap structuré des 7 derniers jours : variations clés, anomalies, top wins, top problèmes, top 3 actions semaine prochaine.",
    arguments: [],
  },
  {
    name: "lead_qualification",
    title: "🎯 Qualifier un lead",
    description: "Aide à qualifier un lead spécifique : analyse du scoring + recommandation d'action (CONTACTED / QUALIFIED / DISQUALIFIED).",
    arguments: [
      {
        name: "lead_id",
        description: "ID du lead à qualifier (FormSubmission.id)",
        required: true,
      },
    ],
  },
  {
    name: "anomaly_postmortem",
    title: "🔴 Postmortem anomalie",
    description: "Analyse post-mortem d'une anomalie : root cause probable + actions correctives + plan de prévention.",
    arguments: [
      {
        name: "anomaly_type",
        description: "Type d'anomalie : ROAS_DROP | LEAD_INFLOW_DROP | AD_SPEND_SPIKE",
        required: true,
      },
    ],
  },
];

export function listPrompts(): McpPrompt[] {
  return PROMPTS;
}

// ─── Get prompt : instancie un template avec args ──────────────────────────

const SYSTEM_NOTE = `Tu es WanaPush Copilot. Tu reçois ci-dessous un snapshot des données réelles du founder. Analyse-le et réponds de manière actionable :
- Cite les chiffres exacts (pas de "à peu près")
- Top 3 actions max, classées par Impact (Fort/Moyen/Faible)
- Pour chaque action : KPI cible + impact estimé
- Ton direct, pragmatique, fondateur-PME française
- Si data manquante, dis-le clairement`;

export async function getPrompt(
  userId: string,
  name: string,
  args: Record<string, string>,
): Promise<McpPromptResult | null> {
  switch (name) {
    case "diagnostic_roas": {
      const [overview, anomalies] = await Promise.all([
        getOverview(userId, defaultRange(30)),
        detectAnomalies(userId),
      ]);
      const snapshot = JSON.stringify({
        ads: overview.ads,
        topPlatforms: overview.ads.byPlatform,
        anomalies: anomalies.filter((a) => a.type.startsWith("ROAS") || a.type.startsWith("AD_")),
        unitEconomics: overview.unitEconomics,
      }, null, 2);
      return {
        description: "Diagnostic ROAS avec data live",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `${SYSTEM_NOTE}\n\n# Question\n\nFais-moi un diagnostic complet de mon ROAS publicitaire sur 30 jours. Identifie ce qui marche, ce qui dérape, et donne-moi un plan d'action concret pour optimiser le ROAS.\n\n# Snapshot data (30j)\n\n\`\`\`json\n${snapshot}\n\`\`\``,
            },
          },
        ],
      };
    }

    case "growth_plan_90d": {
      const target = args.objectif_mrr;
      if (!target) return null;
      const overview = await getOverview(userId, defaultRange(30));
      const snapshot = JSON.stringify({
        currentRevenue: overview.shop.totalRevenue,
        netRevenue: overview.shop.netRevenue,
        unitEconomics: overview.unitEconomics,
        leadsFunnel: overview.leads,
        adsROI: { spend: overview.ads.totalSpend, roas: overview.ads.roas },
      }, null, 2);
      return {
        description: `Plan croissance 90j (objectif MRR: ${target}€)`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `${SYSTEM_NOTE}\n\n# Question\n\nÉtablis un plan de croissance sur 90 jours pour atteindre **${target}€/mois de MRR**. Base-toi sur mon état actuel + les benchmarks SaaS 2026 (LTV:CAC ≥ 3:1, CAC Payback < 18 mois, Churn < 5%). Découpe en 3 sprints de 30 jours avec KPIs cibles par sprint.\n\n# Snapshot data (30j)\n\n\`\`\`json\n${snapshot}\n\`\`\``,
            },
          },
        ],
      };
    }

    case "weekly_review": {
      const [last7, prev7, anomalies] = await Promise.all([
        getOverview(userId, defaultRange(7)),
        getOverview(userId, {
          start: new Date(Date.now() - 14 * 86400000),
          end: new Date(Date.now() - 7 * 86400000),
        }),
        detectAnomalies(userId),
      ]);
      const snapshot = JSON.stringify({
        last7days: last7,
        previousWeek: prev7,
        anomalies,
      }, null, 2);
      return {
        description: "Revue hebdomadaire founder",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `${SYSTEM_NOTE}\n\n# Question\n\nFais ma revue hebdomadaire : compare les 7 derniers jours vs la semaine précédente, identifie les variations clés (positives ou négatives), les anomalies détectées, et donne-moi les top 3 actions à prendre cette semaine.\n\n# Snapshot data\n\n\`\`\`json\n${snapshot}\n\`\`\``,
            },
          },
        ],
      };
    }

    case "lead_qualification": {
      const leadId = args.lead_id;
      if (!leadId) return null;
      return {
        description: `Qualification du lead ${leadId}`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `${SYSTEM_NOTE}\n\n# Question\n\nAide-moi à qualifier le lead identifié ci-dessous. Analyse son scoring, sa temperature, ses données form, et recommande une action concrète :\n- **CONTACTED** : à appeler/écrire immédiatement (HOT/qualifié)\n- **QUALIFIED** : prospect sérieux à nurturer\n- **DISQUALIFIED** : pas viable, exclure des séquences\n\nUtilise le resource \`wanapush://lead/${leadId}\` pour charger les data complètes.`,
            },
          },
        ],
      };
    }

    case "anomaly_postmortem": {
      const type = args.anomaly_type;
      if (!type) return null;
      const anomalies = await detectAnomalies(userId);
      const matching = anomalies.filter((a) => a.type === type);
      const overview = await getOverview(userId, defaultRange(30));
      const snapshot = JSON.stringify({
        anomalies: matching,
        contextOverview: overview,
      }, null, 2);
      return {
        description: `Postmortem anomalie ${type}`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `${SYSTEM_NOTE}\n\n# Question\n\nFais un postmortem complet sur cette anomalie de type **${type}**. Donne :\n1. Root cause probable (avec ranking de probabilité)\n2. Actions correctives immédiates (top 3)\n3. Plan de prévention pour éviter récurrence\n4. KPIs à monitorer pour détecter le problème plus tôt\n\n# Data anomalie + contexte\n\n\`\`\`json\n${snapshot}\n\`\`\``,
            },
          },
        ],
      };
    }

    default:
      return null;
  }
}
