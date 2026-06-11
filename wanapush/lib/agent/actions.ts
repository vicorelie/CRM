// Moteur de la file d'actions de l'auto-pilote (Phase 1).
// Transforme les signaux (anomalies analytics) en CARTES D'ACTION préparées,
// rankées par impact×effort×confiance, avec niveau d'autonomie + évidence source.
// Cf. SKILL_wanapush_agentic_approval_ux.md + SKILL_wanapush_onboarding_activation.md.

import { prisma } from "@/lib/prisma";
import { detectAnomalies, type Anomaly } from "@/lib/analytics/anomalies";
import type { AgentAction } from "@/lib/generated/prisma/client";

type Template = {
  title: string;
  autonomyTier: "autopilot" | "batch" | "one_by_one" | "human_only";
  effort: number; // 0 = one-click, 100 = needs heavy input
  deepLink: string;
};

// Mapping anomalie → action préparée. Les actions "money/customer-facing" sont en
// one_by_one (validation unitaire) ; le contenu en batch. (cf. skill agentique §4)
const TEMPLATES: Record<Anomaly["type"], Template> = {
  ROAS_DROP: {
    title: "Revoir les campagnes : chute de ROAS",
    autonomyTier: "one_by_one",
    effort: 40,
    deepLink: "/ads",
  },
  LEAD_INFLOW_DROP: {
    title: "Chute de leads : vérifier formulaires + pubs actives",
    autonomyTier: "one_by_one",
    effort: 35,
    deepLink: "/leads",
  },
  AD_SPEND_SPIKE: {
    title: "Pic de dépense pub : vérifier les budgets",
    autonomyTier: "one_by_one",
    effort: 30,
    deepLink: "/ads",
  },
  EMAIL_CLICK_RATE_DROP: {
    title: "Taux de clic email en baisse : revoir contenu/segmentation",
    autonomyTier: "batch",
    effort: 45,
    deepLink: "/email",
  },
};

function severityImpact(s: Anomaly["severity"]): number {
  return s === "CRITICAL" ? 90 : s === "WARNING" ? 60 : 35;
}
function severityConfidence(s: Anomaly["severity"]): number {
  return s === "CRITICAL" ? 85 : s === "WARNING" ? 65 : 45;
}
/** Priorité = pondère impact (0.6) + confiance (0.2) + faible effort (0.2). */
function computePriority(impact: number, effort: number, confidence: number): number {
  return Math.round(impact * 0.6 + confidence * 0.2 + (100 - effort) * 0.2);
}

/**
 * Génère/rafraîchit la file d'actions d'un user depuis les anomalies, puis
 * retourne les actions PROPOSED rankées. Idempotent : une action par (type, jour) ;
 * si déjà tranchée aujourd'hui, on ne la ressuscite pas.
 */
export async function syncActionsForUser(userId: string): Promise<AgentAction[]> {
  let anomalies: Anomaly[] = [];
  try {
    anomalies = await detectAnomalies(userId);
  } catch (e) {
    console.warn(`[agent] detectAnomalies failed for ${userId}: ${e instanceof Error ? e.message : e}`);
  }

  const day = new Date().toISOString().slice(0, 10);
  for (const a of anomalies) {
    const tpl = TEMPLATES[a.type];
    if (!tpl) continue;
    const dedupKey = `anomaly:${a.type}:${day}`;
    const existing = await prisma.agentAction.findUnique({
      where: { userId_dedupKey: { userId, dedupKey } },
      select: { id: true },
    });
    if (existing) continue; // déjà proposé OU tranché aujourd'hui → ne pas dupliquer/ressusciter

    const impact = severityImpact(a.severity);
    const confidence = severityConfidence(a.severity);
    await prisma.agentAction.create({
      data: {
        userId,
        dedupKey,
        type: a.type,
        source: "anomaly",
        title: tpl.title,
        rationale: a.message,
        evidence: { metric: a.metric, delta: a.delta, message: a.message },
        deepLink: tpl.deepLink,
        impactScore: impact,
        effortScore: tpl.effort,
        confidence,
        priority: computePriority(impact, tpl.effort, confidence),
        autonomyTier: tpl.autonomyTier,
      },
    });
  }

  return prisma.agentAction.findMany({
    where: { userId, status: "PROPOSED" },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: 20,
  });
}

/** Liste la file PROPOSED sans régénérer (lecture rapide). */
export function listProposedActions(userId: string): Promise<AgentAction[]> {
  return prisma.agentAction.findMany({
    where: { userId, status: "PROPOSED" },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: 20,
  });
}

/**
 * Tranche une action (approve/dismiss). Audit immuable : on garde la trace
 * (status + resolvedBy + resolvedAt) → sert au calcul du correction-rate.
 * Phase 1 : `approve` marque APPROVED + log ; l'exécution auto par type viendra
 * en Phase 2 (executors). Le deepLink permet d'agir manuellement en attendant.
 */
export async function resolveAction(
  userId: string,
  id: string,
  decision: "approve" | "dismiss",
): Promise<AgentAction | null> {
  const action = await prisma.agentAction.findFirst({ where: { id, userId } });
  if (!action) return null;
  if (action.status !== "PROPOSED") return action; // déjà tranché → idempotent
  return prisma.agentAction.update({
    where: { id },
    data: {
      status: decision === "approve" ? "APPROVED" : "DISMISSED",
      resolvedAt: new Date(),
      resolvedBy: userId,
    },
  });
}
