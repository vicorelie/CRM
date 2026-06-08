// Founder Digest — génération HTML d'un récap KPIs cross-modules + anomalies.
//
// Best practices 2026 (sources : taskade, klipfolio, eleken, thoughtspot) :
//  - Daily : seulement les alertes CRITICAL (sinon fatigue d'email)
//  - Weekly : récap complet (sweet spot pour PME — pas trop bruyant)
//  - Monthly : revenue + retention focus
//  - Quarterly : performance + ROI strategic
//  - Format actionable : pas que des nombres, des comparaisons + variations %
//
// On utilise lib/email.sendEmail pour bénéficier du List-Unsubscribe RFC 8058
// + footer RGPD + wrapping HTML cohérent (header/preheader/footer).

import { sendEmail, renderMarkdownToHtml, wrapHtmlTemplate } from "@/lib/email";
import { unsubUrl } from "@/lib/email/unsubscribe";
import type { AnalyticsOverview } from "./aggregators";
import type { Anomaly } from "./anomalies";

// ─── Helpers format ─────────────────────────────────────────────────────────

function fmtMoney(n: number, currency = "EUR"): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

function fmtPercent(n: number, digits = 1): string {
  return new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: digits }).format(n);
}

function fmtNum(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

function variation(current: number, previous: number): string {
  if (previous === 0 && current === 0) return "—";
  if (previous === 0) return "▲ +∞";
  const delta = (current - previous) / previous;
  const sign = delta >= 0 ? "▲ +" : "▼ ";
  return `${sign}${fmtPercent(Math.abs(delta))}`;
}

// ─── Section builders (markdown) ────────────────────────────────────────────

function buildAnomaliesSection(anomalies: Anomaly[]): string {
  if (anomalies.length === 0) return "";

  const lines = anomalies.slice(0, 5).map((a) => {
    const emoji = a.severity === "CRITICAL" ? "🔴" : a.severity === "WARNING" ? "🟠" : "🟡";
    return `${emoji} **[${a.severity}]** ${a.message}`;
  });
  return `## 🚨 Anomalies détectées\n\n${lines.join("\n\n")}\n\n---\n`;
}

function buildAdsSection(ads: AnalyticsOverview["ads"]): string {
  if (ads.totalSpend === 0) return "";
  const topPlatform = ads.byPlatform[0];
  const lines = [
    `**Dépense** : ${fmtMoney(ads.totalSpend)}`,
    `**Revenue** : ${fmtMoney(ads.totalRevenue)}`,
    `**ROAS** : ${ads.roas.toFixed(2)}x`,
    `**Conversions** : ${fmtNum(ads.totalConversions)}`,
    `**CPA** : ${ads.cpa > 0 ? fmtMoney(ads.cpa) : "—"}`,
  ];
  if (topPlatform) {
    lines.push(`**Top plateforme** : ${topPlatform.platform} (${topPlatform.roas.toFixed(2)}x ROAS sur ${fmtMoney(topPlatform.spend)})`);
  }
  return `## 📢 Publicité\n\n${lines.join("\n\n")}\n\n---\n`;
}

function buildLeadsSection(leads: AnalyticsOverview["leads"]): string {
  if (leads.total === 0) return "";
  const lines = [
    `**Nouveaux leads** : ${fmtNum(leads.total)}`,
    `**🔥 HOT** : ${leads.byTemperature.HOT} | **🌡️ WARM** : ${leads.byTemperature.WARM} | **❄️ COLD** : ${leads.byTemperature.COLD}`,
    `**Score moyen** : ${leads.averageScore?.toFixed(0) ?? "—"}/100`,
    `**Taux de conversion** : ${fmtPercent(leads.conversionRate)} (${leads.byStatus.CONVERTED} converti·es)`,
  ];
  return `## 🎯 Leads\n\n${lines.join("\n\n")}\n\n---\n`;
}

function buildEmailSection(email: AnalyticsOverview["email"]): string {
  if (email.campaignsSent === 0) return "";
  const lines = [
    `**Campagnes envoyées** : ${email.campaignsSent}`,
    `**Destinataires** : ${fmtNum(email.totalDelivered)}`,
    `**Taux d'ouverture** : ${fmtPercent(email.openRate)} (${email.uniqueOpens} uniques)`,
    `**Taux de clic** : ${fmtPercent(email.clickRate)} (${email.uniqueClicks} uniques)`,
    `**Désabonnements** : ${email.unsubscribes} (${fmtPercent(email.unsubRate)})`,
  ];
  return `## ✉️ Email marketing\n\n${lines.join("\n\n")}\n\n---\n`;
}

function buildShopSection(shop: AnalyticsOverview["shop"]): string {
  if (shop.paidOrders === 0) return "";
  const lines = [
    `**Chiffre d'affaires** : ${fmtMoney(shop.totalRevenue)}`,
    `**Commandes payées** : ${fmtNum(shop.paidOrders)}`,
    `**Panier moyen** : ${fmtMoney(shop.averageOrderValue)}`,
    `**Remboursements** : ${fmtMoney(shop.refundedAmount)}`,
    `**Net** : ${fmtMoney(shop.netRevenue)}`,
    `**Clients fidèles** : ${fmtPercent(shop.repeatCustomersRate)} (≥ 2 commandes)`,
  ];
  return `## 🛒 Boutique\n\n${lines.join("\n\n")}\n\n---\n`;
}

function buildGbpSection(gbp: AnalyticsOverview["gbp"]): string {
  if (gbp.totalImpressions === 0 && gbp.totalReviews === 0) return "";
  const lines = [
    `**Impressions Google Maps/Search** : ${fmtNum(gbp.totalImpressions)}`,
    `**Clics site web** : ${fmtNum(gbp.websiteClicks)}`,
    `**Appels** : ${fmtNum(gbp.callClicks)}`,
    `**Itinéraires** : ${fmtNum(gbp.directionClicks)}`,
  ];
  if (gbp.averageRating !== null) {
    lines.push(`**Note moyenne** : ${gbp.averageRating.toFixed(1)}★ (${fmtNum(gbp.totalReviews)} avis)`);
  }
  return `## 📍 Google Business Profile\n\n${lines.join("\n\n")}\n\n---\n`;
}

function buildUnitEconomicsSection(unit: AnalyticsOverview["unitEconomics"]): string {
  if (unit.cac === null && unit.ltv === null) return "";
  const lines: string[] = [];
  if (unit.cac !== null) lines.push(`**CAC** (coût d'acquisition client) : ${fmtMoney(unit.cac)}`);
  if (unit.ltv !== null) lines.push(`**LTV** (valeur vie client) : ${fmtMoney(unit.ltv)}`);
  if (unit.ltvCacRatio !== null) {
    const target = unit.ltvCacRatio >= 3 ? "✅" : "⚠️";
    lines.push(`**LTV / CAC** : ${unit.ltvCacRatio.toFixed(2)}:1 ${target} (cible ≥ 3:1)`);
  }
  if (unit.cacPaybackMonths !== null) {
    lines.push(`**CAC Payback** : ${unit.cacPaybackMonths.toFixed(1)} mois`);
  }
  if (unit.leadVelocityRate !== null) {
    lines.push(`**Croissance leads** (vs période précédente) : ${unit.leadVelocityRate >= 0 ? "▲ +" : "▼ "}${fmtPercent(Math.abs(unit.leadVelocityRate))}`);
  }
  if (lines.length === 0) return "";
  return `## 💰 Unit Economics\n\n${lines.join("\n\n")}\n\n---\n`;
}

// ─── Builders top-level : weekly digest + anomaly alert ─────────────────────

/** Génère le markdown source d'un digest weekly. */
export function buildWeeklyDigestMarkdown(
  ownerName: string,
  rangeDays: number,
  overview: AnalyticsOverview,
  anomalies: Anomaly[],
): string {
  const sections = [
    buildAnomaliesSection(anomalies),
    buildAdsSection(overview.ads),
    buildLeadsSection(overview.leads),
    buildEmailSection(overview.email),
    buildShopSection(overview.shop),
    buildGbpSection(overview.gbp),
    buildUnitEconomicsSection(overview.unitEconomics),
  ].filter(Boolean);

  // Si AUCUNE section n'a de data, on retourne un message minimal "rien à signaler"
  if (sections.length === 0) {
    return `# Hello ${ownerName} 👋\n\nPas encore de données sur les ${rangeDays} derniers jours. Lance ta première campagne pour démarrer le tracking.`;
  }

  const intro = `# Hello ${ownerName} 👋\n\nVoici ton récap des **${rangeDays} derniers jours** sur WanaPush.`;
  return `${intro}\n\n---\n\n${sections.join("\n")}`;
}

/** Envoie un weekly digest à un user. Fire-and-forget côté caller.
 *  Pas d'envoi si l'overview est totalement vide ET aucune anomalie. */
export async function sendWeeklyDigest(
  ownerEmail: string,
  ownerName: string,
  overview: AnalyticsOverview,
  anomalies: Anomaly[],
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const range = (() => {
    const start = new Date(overview.range.start);
    const end = new Date(overview.range.end);
    return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
  })();

  // Skip si rien de remontable
  const empty =
    overview.ads.totalSpend === 0 &&
    overview.leads.total === 0 &&
    overview.email.campaignsSent === 0 &&
    overview.shop.paidOrders === 0 &&
    overview.gbp.totalImpressions === 0 &&
    overview.unitEconomics.cac === null &&
    anomalies.length === 0;
  if (empty) return { ok: true, skipped: true };

  const markdown = buildWeeklyDigestMarkdown(ownerName, range, overview, anomalies);
  const contentHtml = renderMarkdownToHtml(markdown);

  // Virtual contactId pour token unsub (l'owner n'est pas un EmailContact réel)
  const virtualId = `founder_${Buffer.from(ownerEmail).toString("base64url").slice(0, 24)}`;
  const fullHtml = wrapHtmlTemplate({
    contentHtml,
    preheader: anomalies.length > 0
      ? `🚨 ${anomalies.length} anomalie${anomalies.length > 1 ? "s" : ""} détectée${anomalies.length > 1 ? "s" : ""}`
      : `Ton récap des ${range} derniers jours`,
    unsubUrl: unsubUrl(virtualId),
    fromName: "WanaPush",
  });

  const subject = anomalies.length > 0 && anomalies[0].severity === "CRITICAL"
    ? `🔴 Anomalie critique + récap ${range}j WanaPush`
    : `📊 Ton récap WanaPush des ${range} derniers jours`;

  const result = await sendEmail({
    to: ownerEmail,
    fromName: "WanaPush Analytics",
    fromEmail: process.env.EMAIL_FROM_DEFAULT ?? "analytics@wanapush.com",
    subject,
    bodyHtml: fullHtml,
    contactId: virtualId,
    tags: [
      { name: "type", value: "weekly_digest" },
      { name: "anomalies_count", value: String(anomalies.length) },
    ],
  });

  return { ok: result.ok, error: result.error };
}

/** Envoie un email alerte CRITICAL seulement (daily). Format ultra-court. */
export async function sendCriticalAnomalyAlert(
  ownerEmail: string,
  ownerName: string,
  anomalies: Anomaly[],
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const criticals = anomalies.filter((a) => a.severity === "CRITICAL");
  if (criticals.length === 0) return { ok: true, skipped: true };

  const lines = criticals.map((a) => `🔴 **${a.message}**`).join("\n\n");
  const markdown = `# 🚨 Alerte WanaPush — ${criticals.length} anomalie${criticals.length > 1 ? "s" : ""} critique${criticals.length > 1 ? "s" : ""}

Hello ${ownerName},

${lines}

Va vérifier ton dashboard pour analyser et corriger.`;

  const contentHtml = renderMarkdownToHtml(markdown);
  const virtualId = `founder_alert_${Buffer.from(ownerEmail).toString("base64url").slice(0, 24)}`;
  const fullHtml = wrapHtmlTemplate({
    contentHtml,
    preheader: criticals[0].message.slice(0, 100),
    unsubUrl: unsubUrl(virtualId),
    fromName: "WanaPush Alertes",
  });

  const result = await sendEmail({
    to: ownerEmail,
    fromName: "WanaPush Alertes",
    fromEmail: process.env.EMAIL_FROM_DEFAULT ?? "alerts@wanapush.com",
    subject: `🔴 ${criticals.length} alerte${criticals.length > 1 ? "s" : ""} critique${criticals.length > 1 ? "s" : ""} WanaPush`,
    bodyHtml: fullHtml,
    contactId: virtualId,
    tags: [
      { name: "type", value: "critical_alert" },
      { name: "anomalies_count", value: String(criticals.length) },
    ],
  });

  return { ok: result.ok, error: result.error };
}
