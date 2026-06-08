// Slack Notifications — incoming webhooks Block Kit pour alertes + digest.
//
// Pattern V1 : incoming webhook URL (channel-specific, identity-locked par Slack).
// L'URL est le SECRET → on la stocke chiffrée AES-256-GCM.
//
// Format : Block Kit (https://api.slack.com/block-kit) — composants riches
// (header, sections, dividers, context, actions). C'est ce que les SaaS
// leaders 2026 utilisent (PostHog, Linear, Vercel).
//
// V2 (phase 2) : OAuth app full avec bot token + signing secret HMAC pour
// slash commands `/wanapush ask <question>`.

import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import type { AnalyticsOverview } from "@/lib/analytics/aggregators";
import type { Anomaly } from "@/lib/analytics/anomalies";

// ─── Types Block Kit ────────────────────────────────────────────────────────

type SlackBlock =
  | { type: "header"; text: { type: "plain_text"; text: string; emoji?: boolean } }
  | { type: "section"; text: { type: "mrkdwn"; text: string }; fields?: Array<{ type: "mrkdwn"; text: string }> }
  | { type: "divider" }
  | { type: "context"; elements: Array<{ type: "mrkdwn"; text: string }> }
  | { type: "actions"; elements: Array<{ type: "button"; text: { type: "plain_text"; text: string }; url: string; style?: "primary" | "danger" }> };

type SlackPayload = {
  /** Texte fallback affiché si Block Kit non rendu (notif mobile). */
  text: string;
  blocks: SlackBlock[];
};

// ─── Low-level send ─────────────────────────────────────────────────────────

export async function sendSlackMessage(
  webhookUrl: string,
  payload: SlackPayload,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    if (r.ok) return { ok: true };
    const text = await r.text();
    return { ok: false, error: `HTTP ${r.status}: ${text.slice(0, 300)}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─── Helpers format ─────────────────────────────────────────────────────────

function fmtMoney(n: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function fmtPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

const SEVERITY_EMOJI: Record<string, string> = {
  CRITICAL: "🔴",
  WARNING: "🟠",
  INFO: "🟡",
};

// ─── Block Kit builders ────────────────────────────────────────────────────

export function formatAnomalyAlertBlocks(anomalies: Anomaly[]): SlackPayload {
  const criticals = anomalies.filter((a) => a.severity === "CRITICAL");
  const useList = criticals.length > 0 ? criticals : anomalies.slice(0, 3);
  const fallbackText = `${useList.length} anomalie${useList.length > 1 ? "s" : ""} WanaPush détectée${useList.length > 1 ? "s" : ""}`;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://wanapush.com";
  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: { type: "plain_text", text: `🚨 ${useList.length} alerte${useList.length > 1 ? "s" : ""} WanaPush`, emoji: true },
    },
    { type: "divider" },
  ];

  for (const a of useList.slice(0, 5)) {
    const emoji = SEVERITY_EMOJI[a.severity] ?? "⚠️";
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `${emoji} *[${a.severity}]* ${a.message}` },
    });
  }

  blocks.push({ type: "divider" });
  blocks.push({
    type: "actions",
    elements: [
      { type: "button", text: { type: "plain_text", text: "📊 Voir le dashboard" }, url: `${baseUrl}/analytics`, style: "primary" },
    ],
  });

  return { text: fallbackText, blocks };
}

export function formatWeeklyDigestBlocks(
  ownerName: string,
  rangeDays: number,
  overview: AnalyticsOverview,
  anomalies: Anomaly[],
): SlackPayload {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://wanapush.com";
  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: { type: "plain_text", text: `📊 Récap WanaPush — ${rangeDays} derniers jours`, emoji: true },
    },
    { type: "context", elements: [{ type: "mrkdwn", text: `Hello *${ownerName}* 👋 — voici les chiffres clés` }] },
    { type: "divider" },
  ];

  // Anomalies (si présentes)
  if (anomalies.length > 0) {
    const top = anomalies.slice(0, 3);
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*🚨 Anomalies détectées (${anomalies.length})*\n${top.map((a) => `${SEVERITY_EMOJI[a.severity] ?? "⚠️"} ${a.message}`).join("\n")}` },
    });
    blocks.push({ type: "divider" });
  }

  // Ads (si data)
  if (overview.ads.totalSpend > 0) {
    const topPlat = overview.ads.byPlatform[0];
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "*📢 Publicité*" },
      fields: [
        { type: "mrkdwn", text: `*Dépense*\n${fmtMoney(overview.ads.totalSpend)}` },
        { type: "mrkdwn", text: `*ROAS*\n${overview.ads.roas.toFixed(2)}x` },
        { type: "mrkdwn", text: `*Revenue*\n${fmtMoney(overview.ads.totalRevenue)}` },
        { type: "mrkdwn", text: `*Top plateforme*\n${topPlat ? `${topPlat.platform} (${topPlat.roas.toFixed(2)}x)` : "—"}` },
      ],
    });
  }

  // Leads (si data)
  if (overview.leads.total > 0) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "*🎯 Leads*" },
      fields: [
        { type: "mrkdwn", text: `*Total*\n${overview.leads.total}` },
        { type: "mrkdwn", text: `*🔥 HOT / 🌡️ WARM / ❄️ COLD*\n${overview.leads.byTemperature.HOT} / ${overview.leads.byTemperature.WARM} / ${overview.leads.byTemperature.COLD}` },
        { type: "mrkdwn", text: `*Score moyen*\n${overview.leads.averageScore?.toFixed(0) ?? "—"}/100` },
        { type: "mrkdwn", text: `*Taux conversion*\n${fmtPercent(overview.leads.conversionRate)}` },
      ],
    });
  }

  // Shop (si data)
  if (overview.shop.paidOrders > 0) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "*🛒 Boutique*" },
      fields: [
        { type: "mrkdwn", text: `*CA brut*\n${fmtMoney(overview.shop.totalRevenue)}` },
        { type: "mrkdwn", text: `*CA net*\n${fmtMoney(overview.shop.netRevenue)}` },
        { type: "mrkdwn", text: `*Commandes*\n${overview.shop.paidOrders}` },
        { type: "mrkdwn", text: `*Panier moyen*\n${fmtMoney(overview.shop.averageOrderValue)}` },
      ],
    });
  }

  // Email (si data)
  if (overview.email.campaignsSent > 0) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "*✉️ Email marketing*" },
      fields: [
        { type: "mrkdwn", text: `*Campagnes envoyées*\n${overview.email.campaignsSent}` },
        { type: "mrkdwn", text: `*Destinataires*\n${overview.email.totalDelivered}` },
        { type: "mrkdwn", text: `*Taux ouverture*\n${fmtPercent(overview.email.openRate)}` },
        { type: "mrkdwn", text: `*Taux de clic*\n${fmtPercent(overview.email.clickRate)}` },
      ],
    });
  }

  // Unit Economics (si data)
  const ue = overview.unitEconomics;
  if (ue.cac !== null || ue.ltv !== null) {
    const fields: Array<{ type: "mrkdwn"; text: string }> = [];
    if (ue.cac !== null) fields.push({ type: "mrkdwn", text: `*CAC*\n${fmtMoney(ue.cac)}` });
    if (ue.ltv !== null) fields.push({ type: "mrkdwn", text: `*LTV*\n${fmtMoney(ue.ltv)}` });
    if (ue.ltvCacRatio !== null) {
      const target = ue.ltvCacRatio >= 3 ? "✅" : "⚠️";
      fields.push({ type: "mrkdwn", text: `*LTV / CAC*\n${ue.ltvCacRatio.toFixed(2)}:1 ${target}` });
    }
    if (ue.leadVelocityRate !== null) {
      const sign = ue.leadVelocityRate >= 0 ? "▲" : "▼";
      fields.push({ type: "mrkdwn", text: `*LVR*\n${sign} ${fmtPercent(Math.abs(ue.leadVelocityRate))}` });
    }
    if (fields.length > 0) {
      blocks.push({ type: "section", text: { type: "mrkdwn", text: "*💰 Unit Economics*" }, fields });
    }
  }

  blocks.push({ type: "divider" });
  blocks.push({
    type: "actions",
    elements: [
      { type: "button", text: { type: "plain_text", text: "📊 Ouvrir le dashboard" }, url: `${baseUrl}/analytics`, style: "primary" },
    ],
  });

  const fallback = anomalies.length > 0
    ? `Récap ${rangeDays}j WanaPush — ${anomalies.length} anomalie${anomalies.length > 1 ? "s" : ""}`
    : `Récap WanaPush des ${rangeDays} derniers jours`;
  return { text: fallback, blocks };
}

// ─── High-level helpers : send vers toutes les intégrations actives ─────────

async function sendToAllIntegrations(
  userId: string,
  payload: SlackPayload,
  filter: "anomaly" | "digest",
): Promise<{ sent: number; failed: number }> {
  const integrations = await prisma.slackIntegration.findMany({
    where: {
      userId,
      enabled: true,
      ...(filter === "anomaly" ? { receiveAnomalyAlerts: true } : { receiveWeeklyDigest: true }),
    },
    select: { id: true, webhookUrl: true },
  });

  let sent = 0;
  let failed = 0;
  await Promise.all(
    integrations.map(async (i) => {
      const url = decrypt(i.webhookUrl);
      const result = await sendSlackMessage(url, payload);
      if (result.ok) {
        sent++;
        await prisma.slackIntegration.update({
          where: { id: i.id },
          data: { totalSent: { increment: 1 }, lastSentAt: new Date(), lastError: null },
        });
      } else {
        failed++;
        await prisma.slackIntegration.update({
          where: { id: i.id },
          data: {
            totalSent: { increment: 1 },
            totalFails: { increment: 1 },
            lastSentAt: new Date(),
            lastError: result.error?.slice(0, 1000),
          },
        });
      }
    }),
  );
  return { sent, failed };
}

export async function sendAnomalyAlertToSlack(
  userId: string,
  anomalies: Anomaly[],
): Promise<{ sent: number; failed: number; skipped?: boolean }> {
  const criticals = anomalies.filter((a) => a.severity === "CRITICAL");
  if (criticals.length === 0) return { sent: 0, failed: 0, skipped: true };
  const payload = formatAnomalyAlertBlocks(criticals);
  return sendToAllIntegrations(userId, payload, "anomaly");
}

export async function sendWeeklyDigestToSlack(
  userId: string,
  ownerName: string,
  rangeDays: number,
  overview: AnalyticsOverview,
  anomalies: Anomaly[],
): Promise<{ sent: number; failed: number; skipped?: boolean }> {
  // Skip si overview totalement vide ET aucune anomalie
  const empty =
    overview.ads.totalSpend === 0 &&
    overview.leads.total === 0 &&
    overview.email.campaignsSent === 0 &&
    overview.shop.paidOrders === 0 &&
    anomalies.length === 0;
  if (empty) return { sent: 0, failed: 0, skipped: true };
  const payload = formatWeeklyDigestBlocks(ownerName, rangeDays, overview, anomalies);
  return sendToAllIntegrations(userId, payload, "digest");
}

// ─── Test ping (vérifier qu'une URL est valide après création) ─────────────

export async function pingSlackIntegration(integrationId: string): Promise<{ ok: boolean; error?: string }> {
  const integ = await prisma.slackIntegration.findUnique({
    where: { id: integrationId },
    select: { webhookUrl: true, name: true },
  });
  if (!integ) return { ok: false, error: "Intégration introuvable" };
  const url = decrypt(integ.webhookUrl);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://wanapush.com";
  const payload: SlackPayload = {
    text: "✅ Intégration WanaPush testée avec succès",
    blocks: [
      { type: "header", text: { type: "plain_text", text: "✅ Test WanaPush", emoji: true } },
      { type: "section", text: { type: "mrkdwn", text: `L'intégration *${integ.name}* est correctement configurée. Tu recevras les alertes critiques et le récap hebdomadaire ici.` } },
      { type: "actions", elements: [{ type: "button", text: { type: "plain_text", text: "Dashboard" }, url: `${baseUrl}/analytics` }] },
    ],
  };
  return sendSlackMessage(url, payload);
}
