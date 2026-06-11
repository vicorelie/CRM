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

// ─── Opportunités d'activation (next-best-action proactif) ──────────────────
// Cartes "la prochaine chose à faire" surfacées même sans anomalie. Deep-link
// uniquement (aucune auto-dépense / auto-envoi). dedupKey STABLE (pas de jour) →
// créées une fois, AUTO-RÉSOLUES quand la condition est levée (cf. syncActions).
type Opportunity = {
  dedupKey: string;
  type: string;
  title: string;
  rationale: string;
  deepLink: string;
  impact: number;
  effort: number;
  confidence: number;
  tier: Template["autonomyTier"];
};

async function detectOpportunities(userId: string): Promise<Opportunity[]> {
  const [adCount, gbpCount, emailCampCount, shops, sites] = await Promise.all([
    prisma.adAccount.count({ where: { userId } }),
    prisma.gbpAccount.count({ where: { userId } }),
    prisma.emailCampaign.count({ where: { userId } }),
    prisma.shop.findMany({ where: { userId }, select: { id: true, name: true, siteSlug: true, stripeSecretKey: true, paypalClientId: true } }),
    prisma.generatedSite.findMany({ where: { userId }, select: { id: true, slug: true, sitePixel: { select: { id: true } } } }),
  ]);

  const opps: Opportunity[] = [];
  if (adCount === 0) {
    opps.push({ dedupKey: "opp:connect_ads", type: "CONNECT_ADS", title: "Connecte un compte publicitaire", rationale: "Sans compte pub connecté, impossible de lancer ni d'optimiser des campagnes. ~5 min.", deepLink: "/ads", impact: 70, effort: 20, confidence: 90, tier: "batch" });
  }
  if (gbpCount === 0) {
    opps.push({ dedupKey: "opp:connect_gbp", type: "CONNECT_GBP", title: "Connecte ta fiche Google Business Profile", rationale: "Le GBP est le 1er levier de visibilité locale (posts + avis). Branche-le pour automatiser.", deepLink: "/gbp", impact: 65, effort: 20, confidence: 90, tier: "batch" });
  }
  if (emailCampCount === 0) {
    opps.push({ dedupKey: "opp:first_email", type: "FIRST_EMAIL", title: "Crée ta première newsletter", rationale: "L'email segmenté est le levier ROI #1. Lance une 1re campagne pour activer le canal.", deepLink: "/email", impact: 60, effort: 30, confidence: 85, tier: "batch" });
  }
  for (const s of shops) {
    if (!s.stripeSecretKey && !s.paypalClientId) {
      opps.push({ dedupKey: `opp:payment:${s.id}`, type: "SHOP_PAYMENT", title: `Configure un paiement sur « ${s.name} »`, rationale: "Sans Stripe ni PayPal, la boutique ne peut pas encaisser.", deepLink: `/shop/${s.siteSlug}/settings?tab=payments`, impact: 75, effort: 25, confidence: 90, tier: "one_by_one" });
    }
  }
  for (const site of sites) {
    if (!site.sitePixel) {
      opps.push({ dedupKey: `opp:tracking:${site.id}`, type: "SITE_TRACKING", title: `Active le tracking sur « ${site.slug ?? site.id} »`, rationale: "Sans Pixel + CAPI, impossible de mesurer les conversions ni d'optimiser les pubs.", deepLink: `/generated-sites/${site.id}/pixel`, impact: 60, effort: 25, confidence: 85, tier: "batch" });
    }
  }
  return opps;
}

/**
 * Génère/rafraîchit la file d'actions d'un user (anomalies + opportunités), puis
 * retourne les actions PROPOSED rankées. Idempotent. Les opportunités sont
 * auto-résolues dès que leur condition est levée.
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

  // Opportunités d'activation (next-best-action) — créées si absentes,
  // auto-résolues quand la condition est levée (ex: compte pub connecté).
  let opps: Opportunity[] = [];
  try {
    opps = await detectOpportunities(userId);
  } catch (e) {
    console.warn(`[agent] detectOpportunities failed for ${userId}: ${e instanceof Error ? e.message : e}`);
  }
  const currentOppKeys = new Set(opps.map((o) => o.dedupKey));
  for (const o of opps) {
    const existing = await prisma.agentAction.findUnique({
      where: { userId_dedupKey: { userId, dedupKey: o.dedupKey } },
      select: { id: true, status: true },
    });
    if (!existing) {
      await prisma.agentAction.create({
        data: {
          userId, dedupKey: o.dedupKey, type: o.type, source: "opportunity",
          title: o.title, rationale: o.rationale, deepLink: o.deepLink,
          impactScore: o.impact, effortScore: o.effort, confidence: o.confidence,
          priority: computePriority(o.impact, o.effort, o.confidence), autonomyTier: o.tier,
        },
      });
      continue;
    }
    // L'opportunité existe ET la condition tient toujours :
    //  - DISMISSED → on respecte le choix (l'user l'a masquée).
    //  - PROPOSED → rien à faire.
    //  - APPROVED/EXECUTED/FAILED → la condition n'est PAS réellement levée (une
    //    carte d'activation ne s'exécute pas via "Approuver") → on la re-propose.
    if (existing.status === "APPROVED" || existing.status === "EXECUTED" || existing.status === "FAILED") {
      await prisma.agentAction.update({
        where: { id: existing.id },
        data: { status: "PROPOSED", resolvedAt: null, resolvedBy: null },
      });
    }
  }
  // Auto-résolution : opportunités PROPOSED dont la condition n'existe plus.
  const open = await prisma.agentAction.findMany({
    where: { userId, source: "opportunity", status: "PROPOSED" },
    select: { id: true, dedupKey: true },
  });
  const resolved = open.filter((a) => !currentOppKeys.has(a.dedupKey)).map((a) => a.id);
  if (resolved.length > 0) {
    await prisma.agentAction.updateMany({
      where: { id: { in: resolved } },
      data: { status: "EXECUTED", resolvedAt: new Date() },
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
