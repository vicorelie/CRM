// MCP Resources — expose les data WanaPush via URIs `wanapush://...`.
//
// Pattern (spec 2025-06-18) :
//  - Resources statiques : URIs fixes (`wanapush://overview`, `wanapush://anomalies`)
//  - Resource Templates : URIs paramétrées RFC 6570 (`wanapush://campaign/{id}`)
//
// Permet à Claude.ai d'INCLURE les data WanaPush directement dans son
// contexte sans appeler de tool. Pattern best-in-class 2026 (PostHog, Linear).
//
// Auth : userId du Bearer token → handlers Prisma scopés strictement.

import { prisma } from "@/lib/prisma";
import { getOverview, defaultRange } from "@/lib/analytics/aggregators";
import { detectAnomalies } from "@/lib/analytics/anomalies";

// ─── Types MCP ──────────────────────────────────────────────────────────────

export type McpResource = {
  uri: string;
  name: string;
  title?: string;
  description?: string;
  mimeType?: string;
  size?: number;
  annotations?: {
    audience?: ("user" | "assistant")[];
    priority?: number;
    lastModified?: string;
  };
};

export type McpResourceTemplate = {
  uriTemplate: string;
  name: string;
  title?: string;
  description?: string;
  mimeType?: string;
};

export type McpResourceContents = {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string; // base64
};

// ─── Resources statiques disponibles ────────────────────────────────────────

const STATIC_RESOURCES: McpResource[] = [
  {
    uri: "wanapush://overview",
    name: "overview",
    title: "📊 KPIs cross-modules (30 derniers jours)",
    description:
      "Snapshot complet du business : Ads, Leads, Email, Shop, GBP, Unit Economics. " +
      "JSON structuré pour analyse et reporting.",
    mimeType: "application/json",
    annotations: { audience: ["user", "assistant"], priority: 0.9 },
  },
  {
    uri: "wanapush://anomalies",
    name: "anomalies",
    title: "🚨 Anomalies détectées",
    description:
      "Liste des anomalies actuelles (ROAS drop, lead inflow drop, ad spend spike) " +
      "via écart-type 30j glissants. Triées CRITICAL → INFO.",
    mimeType: "application/json",
    annotations: { audience: ["user", "assistant"], priority: 1.0 },
  },
];

// ─── Resource Templates (URIs paramétrées RFC 6570) ─────────────────────────

const RESOURCE_TEMPLATES: McpResourceTemplate[] = [
  {
    uriTemplate: "wanapush://campaign/{id}",
    name: "campaign",
    title: "📢 Campagne publicitaire",
    description:
      "Détail d'une campagne ads (Meta/Google/TikTok/LinkedIn) : config + métriques " +
      "agrégées sur 30j. Argument `id` = Campaign.id.",
    mimeType: "application/json",
  },
  {
    uriTemplate: "wanapush://lead/{id}",
    name: "lead",
    title: "🎯 Lead",
    description:
      "Détail d'un lead (FormSubmission) avec scoring, temperature, status, données form, " +
      "lien EmailContact si sync. Argument `id` = FormSubmission.id.",
    mimeType: "application/json",
  },
  {
    uriTemplate: "wanapush://email-campaign/{id}",
    name: "email-campaign",
    title: "✉️ Campagne email",
    description:
      "Détail d'une campagne email marketing avec stats agrégées (opens/clicks/bounces). " +
      "Argument `id` = EmailCampaign.id.",
    mimeType: "application/json",
  },
  {
    uriTemplate: "wanapush://order/{id}",
    name: "order",
    title: "🛒 Commande Shop",
    description:
      "Détail d'une commande Shop avec produits, customer, paiement, livraison. " +
      "Argument `id` = Order.id.",
    mimeType: "application/json",
  },
];

// ─── List handlers ──────────────────────────────────────────────────────────

export function listResources(): McpResource[] {
  return STATIC_RESOURCES;
}

export function listResourceTemplates(): McpResourceTemplate[] {
  return RESOURCE_TEMPLATES;
}

// ─── Read handler : dispatch URI → contenu ──────────────────────────────────

export async function readResource(
  userId: string,
  uri: string,
): Promise<McpResourceContents | null> {
  // Static resources
  if (uri === "wanapush://overview") {
    const data = await getOverview(userId, defaultRange(30));
    return { uri, mimeType: "application/json", text: JSON.stringify(data, null, 2) };
  }
  if (uri === "wanapush://anomalies") {
    const anomalies = await detectAnomalies(userId);
    return { uri, mimeType: "application/json", text: JSON.stringify({ anomalies }, null, 2) };
  }

  // Templated resources : extract {id} via pattern
  const campaignMatch = uri.match(/^wanapush:\/\/campaign\/([a-z0-9-]+)$/i);
  if (campaignMatch) {
    const id = campaignMatch[1];
    const campaign = await prisma.campaign.findFirst({
      where: { id, adAccount: { userId } },
      select: {
        id: true, name: true, type: true, status: true, objective: true, externalId: true,
        budget: true, dailyBudget: true, createdAt: true, lastSyncAt: true,
        adAccount: { select: { platform: true, name: true, currency: true } },
        metrics: {
          where: { date: { gte: defaultRange(30).start } },
          select: { date: true, spend: true, impressions: true, clicks: true, conversions: true, revenue: true },
          orderBy: { date: "desc" },
          take: 30,
        },
      },
    });
    if (!campaign) return null;
    return { uri, mimeType: "application/json", text: JSON.stringify(campaign, null, 2) };
  }

  const leadMatch = uri.match(/^wanapush:\/\/lead\/([a-z0-9]+)$/i);
  if (leadMatch) {
    const id = leadMatch[1];
    // Vérif ownership : siteSlug appartient à un GeneratedSite du user
    const sub = await prisma.formSubmission.findUnique({
      where: { id },
      select: {
        id: true, siteSlug: true, type: true, data: true, email: true,
        leadScore: true, leadTemperature: true, leadScoreReason: true, leadStatus: true,
        emailContactId: true, notifiedAt: true, createdAt: true, read: true,
      },
    });
    if (!sub) return null;
    const ownerSite = await prisma.generatedSite.findFirst({
      where: {
        userId,
        OR: [{ slug: sub.siteSlug }, { meta: { path: "$.siteSlug", equals: sub.siteSlug } }],
      },
      select: { id: true },
    });
    if (!ownerSite) return null;
    return { uri, mimeType: "application/json", text: JSON.stringify(sub, null, 2) };
  }

  const emailCampMatch = uri.match(/^wanapush:\/\/email-campaign\/([a-z0-9]+)$/i);
  if (emailCampMatch) {
    const id = emailCampMatch[1];
    const camp = await prisma.emailCampaign.findFirst({
      where: { id, userId },
      select: {
        id: true, name: true, subject: true, status: true, scheduledAt: true,
        sentAt: true, fromName: true, fromEmail: true, stats: true, createdAt: true,
      },
    });
    if (!camp) return null;
    return { uri, mimeType: "application/json", text: JSON.stringify(camp, null, 2) };
  }

  const orderMatch = uri.match(/^wanapush:\/\/order\/([a-z0-9]+)$/i);
  if (orderMatch) {
    const id = orderMatch[1];
    const order = await prisma.order.findFirst({
      where: { id, shop: { userId } },
      select: {
        id: true, orderNumber: true, status: true, financialStatus: true,
        customerEmail: true, customerName: true, currency: true,
        subtotal: true, total: true, paidAt: true, createdAt: true,
        items: { select: { productTitle: true, quantity: true, unitPrice: true, totalPrice: true } },
        shop: { select: { name: true, siteSlug: true } },
      },
    });
    if (!order) return null;
    return { uri, mimeType: "application/json", text: JSON.stringify(order, null, 2) };
  }

  return null;
}
