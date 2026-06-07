// Rapport hebdomadaire automatique — envoyé chaque lundi 8h UTC.
// Agrège les KPIs de toutes les campagnes actives sur les 7 derniers jours.
// Transport : Resend. No-op silencieux si RESEND_API_KEY absent.
//
// Appelé par app/api/ads/cron/weekly-report/route.ts

import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.OPTIMIZER_EMAIL_FROM ?? "WanaPush Auto-Pilote <autopilote@wanapush.com>";
const BASE_URL = (process.env.NEXTAUTH_URL ?? "https://wanapush.com").replace(/\/$/, "");

// ─── Types ────────────────────────────────────────────────────────────────────

type CampaignStat = {
  id: string;
  name: string;
  platform: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roas: number | null;
};

type WeeklyReport = {
  userId: string;
  userName: string;
  userEmail: string;
  weekStart: Date;
  weekEnd: Date;
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  globalRoas: number | null;
  activeCampaigns: number;
  campaigns: CampaignStat[];
  optimizerActionsCount: number;
};

// ─── Agrégation ───────────────────────────────────────────────────────────────

export async function buildWeeklyReports(weekStart: Date, weekEnd: Date): Promise<WeeklyReport[]> {
  // Toutes les métriques sur la période par campaign
  const metrics = await prisma.adMetrics.findMany({
    where: { date: { gte: weekStart, lt: weekEnd } },
    include: {
      campaign: {
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          business: { select: { userId: true } },
        },
      },
    },
  });

  // Compter les actions optimizer appliquées sur la période
  const optimizerLogs = await prisma.campaign.findMany({
    where: { updatedAt: { gte: weekStart, lt: weekEnd }, status: "PAUSED" },
    select: { business: { select: { userId: true } } },
  });

  // Regrouper par userId
  const byUser = new Map<
    string,
    {
      campaigns: Map<string, { name: string; platform: string; spend: number; impressions: number; clicks: number; conversions: number; revenue: number }>;
      optimizerActions: number;
    }
  >();

  for (const row of metrics) {
    const userId = row.campaign.business.userId;
    if (!byUser.has(userId)) byUser.set(userId, { campaigns: new Map(), optimizerActions: 0 });
    const user = byUser.get(userId)!;

    const campId = row.campaignId;
    if (!user.campaigns.has(campId)) {
      user.campaigns.set(campId, {
        name: row.campaign.name,
        platform: row.campaign.type,
        spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0,
      });
    }
    const c = user.campaigns.get(campId)!;
    c.spend += row.spend;
    c.impressions += row.impressions;
    c.clicks += row.clicks;
    c.conversions += row.conversions;
    c.revenue += row.revenue;
  }

  for (const row of optimizerLogs) {
    const uid = row.business.userId;
    const entry = byUser.get(uid);
    if (entry) entry.optimizerActions += 1;
  }

  // Pour chaque userId, charger les infos user et assembler le report
  const reports: WeeklyReport[] = [];
  for (const [userId, data] of Array.from(byUser)) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (!user?.email) continue;

    const campaigns: CampaignStat[] = Array.from(data.campaigns.entries()).map(([id, c]) => ({
      id,
      name: c.name,
      platform: c.platform,
      spend: c.spend,
      impressions: c.impressions,
      clicks: c.clicks,
      conversions: c.conversions,
      revenue: c.revenue,
      roas: c.spend > 0 ? c.revenue / c.spend : null,
    }));

    const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
    const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0);
    const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
    const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
    const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);

    reports.push({
      userId,
      userName: user.name ?? "là",
      userEmail: user.email,
      weekStart,
      weekEnd,
      totalSpend,
      totalImpressions,
      totalClicks,
      totalConversions,
      totalRevenue,
      globalRoas: totalSpend > 0 ? totalRevenue / totalSpend : null,
      activeCampaigns: campaigns.filter((c) => c.spend > 0).length,
      campaigns,
      optimizerActionsCount: data.optimizerActions,
    });
  }

  return reports;
}

export async function sendWeeklyReport(report: WeeklyReport): Promise<boolean> {
  if (!resend) return false;
  if (report.campaigns.length === 0) return false;

  const weekLabel = report.weekStart.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

  const subject = report.activeCampaigns > 0
    ? `Bilan semaine du ${weekLabel} — ${fmtEur(report.totalSpend)} dépensés, ROAS ${report.globalRoas !== null ? report.globalRoas.toFixed(2) + "x" : "n/a"}`
    : `Bilan semaine du ${weekLabel} — aucune dépense active`;

  try {
    await resend.emails.send({
      from: FROM,
      to: report.userEmail,
      subject,
      html: buildHtml(report),
    });
    console.log(`[weekly-report] Envoyé à ${report.userEmail} (${report.activeCampaigns} campagnes actives)`);
    return true;
  } catch (e) {
    console.error("[weekly-report] Échec:", e instanceof Error ? e.message : e);
    return false;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PLATFORM_LABEL: Record<string, string> = {
  META_ADS: "Meta Ads",
  GOOGLE_ADS: "Google Ads",
  TIKTOK_ADS: "TikTok Ads",
  LINKEDIN_ADS: "LinkedIn Ads",
};

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function fmtEur(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function fmtNum(n: number): string {
  return n.toLocaleString("fr-FR");
}

function roasColor(roas: number | null): string {
  if (roas === null) return "#6b7280";
  if (roas >= 2.5) return "#16a34a";
  if (roas >= 1.0) return "#d97706";
  return "#dc2626";
}

// Trie les campagnes par dépense décroissante et sépare top/flop
function sortCampaigns(campaigns: CampaignStat[]): {
  top: CampaignStat[];
  flop: CampaignStat[];
  rest: CampaignStat[];
} {
  const active = campaigns.filter((c) => c.spend > 0).sort((a, b) => (b.roas ?? -1) - (a.roas ?? -1));
  const inactive = campaigns.filter((c) => c.spend === 0);
  const top = active.slice(0, 3);
  const flop = active.length > 3 ? active.slice(-Math.min(3, active.length - 3)) : [];
  const rest = inactive.slice(0, 5);
  return { top, flop, rest };
}

function campaignRow(c: CampaignStat, isFlop = false): string {
  const roas = c.roas !== null ? `${c.roas.toFixed(2)}x` : "—";
  const color = roasColor(c.roas);
  const roasBg = isFlop ? "#fef2f2" : c.roas !== null && c.roas >= 2.5 ? "#f0fdf4" : "#fffbeb";
  const platformLabel = PLATFORM_LABEL[c.platform] ?? c.platform;

  return `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;">
        <div style="font-weight:600;color:#111827;font-size:13px;">${esc(c.name)}</div>
        <div style="color:#9ca3af;font-size:11px;margin-top:1px;">${esc(platformLabel)}</div>
      </td>
      <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;text-align:right;font-size:12px;color:#374151;">
        ${fmtEur(c.spend)}
      </td>
      <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;text-align:right;font-size:12px;color:#374151;">
        ${fmtNum(c.impressions)}
      </td>
      <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;text-align:right;font-size:12px;color:#374151;">
        ${fmtNum(c.conversions)}
      </td>
      <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;text-align:right;">
        <span style="display:inline-block;background:${roasBg};color:${color};font-weight:700;font-size:12px;padding:2px 8px;border-radius:6px;">
          ${roas}
        </span>
      </td>
    </tr>`;
}

function buildHtml(report: WeeklyReport): string {
  const { top, flop } = sortCampaigns(report.campaigns);
  const weekRange = `${report.weekStart.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} – ${report.weekEnd.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`;
  const roasStr = report.globalRoas !== null ? `${report.globalRoas.toFixed(2)}x` : "—";
  const roasClr = roasColor(report.globalRoas);
  const ctr = report.totalImpressions > 0 ? ((report.totalClicks / report.totalImpressions) * 100).toFixed(2) + "%" : "—";

  const statsCards = [
    { label: "Dépenses", value: fmtEur(report.totalSpend), color: "#7c3aed" },
    { label: "ROAS global", value: roasStr, color: roasClr },
    { label: "Conversions", value: fmtNum(report.totalConversions), color: "#0891b2" },
    { label: "Impressions", value: fmtNum(report.totalImpressions), color: "#6b7280" },
    { label: "Clics (CTR)", value: `${fmtNum(report.totalClicks)} (${ctr})`, color: "#6b7280" },
    { label: "Campagnes actives", value: String(report.activeCampaigns), color: "#6b7280" },
  ];

  const statsHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr>
        ${statsCards.slice(0, 3).map((s) => `
          <td style="width:33%;padding:8px;">
            <div style="background:#f9fafb;border:1px solid #f3f4f6;border-radius:12px;padding:16px 12px;text-align:center;">
              <div style="font-size:22px;font-weight:800;color:${s.color};">${esc(s.value)}</div>
              <div style="font-size:11px;color:#9ca3af;margin-top:2px;text-transform:uppercase;letter-spacing:.06em;">${esc(s.label)}</div>
            </div>
          </td>`).join("")}
      </tr>
      <tr>
        ${statsCards.slice(3).map((s) => `
          <td style="width:33%;padding:8px;">
            <div style="background:#f9fafb;border:1px solid #f3f4f6;border-radius:12px;padding:14px 12px;text-align:center;">
              <div style="font-size:17px;font-weight:700;color:${s.color};">${esc(s.value)}</div>
              <div style="font-size:11px;color:#9ca3af;margin-top:2px;text-transform:uppercase;letter-spacing:.06em;">${esc(s.label)}</div>
            </div>
          </td>`).join("")}
      </tr>
    </table>`;

  const tableHeader = `
    <tr style="background:#f9fafb;">
      <th style="padding:8px 16px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;">Campagne</th>
      <th style="padding:8px 16px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;">Dépense</th>
      <th style="padding:8px 16px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;">Impressions</th>
      <th style="padding:8px 16px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;">Conv.</th>
      <th style="padding:8px 16px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;">ROAS</th>
    </tr>`;

  const topTableHtml = top.length > 0 ? `
    <tr><td style="padding:20px 24px 8px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#16a34a;">Meilleures campagnes</div>
    </td></tr>
    <tr><td style="padding:0 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f3f4f6;border-radius:10px;overflow:hidden;">
        ${tableHeader}
        ${top.map((c) => campaignRow(c, false)).join("")}
      </table>
    </td></tr>` : "";

  const flopTableHtml = flop.length > 0 ? `
    <tr><td style="padding:20px 24px 8px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#dc2626;">Campagnes à surveiller</div>
    </td></tr>
    <tr><td style="padding:0 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fecaca;border-radius:10px;overflow:hidden;">
        ${tableHeader}
        ${flop.map((c) => campaignRow(c, true)).join("")}
      </table>
    </td></tr>` : "";

  const optimizerNote = report.optimizerActionsCount > 0 ? `
    <tr><td style="padding:16px 24px 0;">
      <div style="background:#f5f3ff;border:1px solid #ede9fe;border-radius:10px;padding:12px 16px;font-size:12px;color:#6d28d9;">
        ✦ L&apos;auto-pilote a appliqué <strong>${report.optimizerActionsCount} action${report.optimizerActionsCount > 1 ? "s" : ""}</strong> cette semaine
        (mise en pause, réduction ou augmentation de budget).
        <a href="${BASE_URL}/ads" style="color:#7c3aed;text-decoration:none;margin-left:4px;">Voir le détail →</a>
      </div>
    </td></tr>` : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);padding:28px 24px;">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div>
              <div style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">WanaPush</div>
              <div style="color:#e0d9ff;font-size:12px;margin-top:2px;">Bilan hebdomadaire publicité</div>
            </div>
            <div style="text-align:right;">
              <div style="color:#e0d9ff;font-size:11px;">${esc(weekRange)}</div>
            </div>
          </div>
        </td></tr>

        <!-- Intro -->
        <tr><td style="padding:24px 24px 8px;">
          <h1 style="margin:0 0 6px;font-size:18px;font-weight:700;color:#111827;">
            Bonjour ${esc(report.userName)},
          </h1>
          <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
            Voici le bilan de vos campagnes publicitaires sur les 7 derniers jours.
          </p>
        </td></tr>

        <!-- Stats cards -->
        <tr><td style="padding:16px 16px 0;">${statsHtml}</td></tr>

        <!-- Optimizer note -->
        ${optimizerNote}

        <!-- Top campaigns -->
        ${topTableHtml}

        <!-- Flop campaigns -->
        ${flopTableHtml}

        <!-- CTA -->
        <tr><td style="padding:28px 24px;text-align:center;">
          <a href="${BASE_URL}/ads" style="display:inline-block;background:#7c3aed;color:#ffffff;font-weight:700;font-size:14px;padding:13px 28px;border-radius:10px;text-decoration:none;">
            Gérer mes campagnes →
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 24px;border-top:1px solid #f3f4f6;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
            Vous recevez cet email chaque lundi car vous avez des campagnes actives sur WanaPush.<br>
            Pour désactiver, rendez-vous dans <a href="${BASE_URL}/settings" style="color:#7c3aed;text-decoration:none;">Paramètres</a>.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`;
}
