// Email digest envoyé après chaque action du cron auto-optimizer.
// Transport : Resend. No-op silencieux si RESEND_API_KEY absent.
//
// Appelé par app/api/ads/cron/optimize/route.ts après le tick().
// Une seule email par user par run, listant toutes les actions appliquées.

import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import type { AdPlatform } from "@/lib/ads/types";
import type { OptimizationAction } from "@/lib/ads/auto-optimizer";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.OPTIMIZER_EMAIL_FROM ?? "WanaPush Auto-Pilote <autopilote@wanapush.com>";
const BASE_URL = (process.env.NEXTAUTH_URL ?? "https://wanapush.com").replace(/\/$/, "");

export type OptimizerEmailRow = {
  campaignId: string;
  campaignName: string;
  platform: AdPlatform;
  action: OptimizationAction;
  roas: number | null;
  spend: number;
  currentBudget: number | null;
  newBudget: number | null;
};

export async function sendOptimizerDigest(
  userId: string,
  rows: OptimizerEmailRow[],
): Promise<boolean> {
  if (!resend) return false;

  const actionRows = rows.filter(
    (r) => r.action !== "WATCH" && r.action !== "INSUFFICIENT_DATA",
  );
  if (actionRows.length === 0) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!user?.email) return false;

  const subject =
    actionRows.length === 1
      ? `Auto-pilote : ${actionLabel(actionRows[0].action)} sur "${actionRows[0].campaignName}"`
      : `Auto-pilote : ${actionRows.length} actions sur vos campagnes`;

  try {
    await resend.emails.send({
      from: FROM,
      to: user.email,
      subject,
      html: buildHtml(user.name ?? "là", actionRows),
    });
    console.log(`[optimizer-email] Digest envoyé à ${user.email} (${actionRows.length} actions)`);
    return true;
  } catch (e) {
    console.error("[optimizer-email] Échec envoi:", e instanceof Error ? e.message : e);
    return false;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function actionLabel(action: OptimizationAction): string {
  switch (action) {
    case "PAUSE":        return "Mise en pause";
    case "SCALE":        return "Budget augmenté";
    case "REDUCE_BUDGET": return "Budget réduit";
    default:             return action;
  }
}

const ACTION_COLOR: Record<string, string> = {
  PAUSE:         "#dc2626", // rouge
  SCALE:         "#16a34a", // vert
  REDUCE_BUDGET: "#d97706", // orange
};

const PLATFORM_LABEL: Record<string, string> = {
  META_ADS:    "Meta Ads",
  GOOGLE_ADS:  "Google Ads",
  TIKTOK_ADS:  "TikTok Ads",
  LINKEDIN_ADS:"LinkedIn Ads",
};

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function fmtEur(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function buildHtml(name: string, rows: OptimizerEmailRow[]): string {
  const rowsHtml = rows.map((r) => {
    const color = ACTION_COLOR[r.action] ?? "#6b7280";
    const label = actionLabel(r.action);
    const roasStr = r.roas !== null ? `${r.roas.toFixed(2)}x` : "—";
    const budgetStr =
      r.action === "SCALE" || r.action === "REDUCE_BUDGET"
        ? `${fmtEur(r.currentBudget ?? 0)} → <strong>${fmtEur(r.newBudget ?? 0)}</strong>`
        : `Budget journalier : ${r.currentBudget !== null ? fmtEur(r.currentBudget) : "—"}`;

    return `
      <tr>
        <td style="padding:16px 24px;border-bottom:1px solid #f3f4f6;">
          <div style="display:flex;align-items:flex-start;gap:12px;">
            <div style="flex:1;min-width:0;">
              <div style="font-weight:600;color:#111827;font-size:15px;">${esc(r.campaignName)}</div>
              <div style="color:#6b7280;font-size:12px;margin-top:2px;">${esc(PLATFORM_LABEL[r.platform] ?? r.platform)}</div>
            </div>
            <div style="text-align:right;white-space:nowrap;">
              <div style="display:inline-block;background:${color}1a;color:${color};font-weight:700;font-size:11px;padding:3px 10px;border-radius:999px;border:1px solid ${color}33;">
                ${label.toUpperCase()}
              </div>
              <div style="margin-top:6px;font-size:12px;color:#374151;">
                ROAS : <strong>${roasStr}</strong> &nbsp;·&nbsp; Dépense : <strong>${fmtEur(r.spend)}</strong>
              </div>
              <div style="margin-top:2px;font-size:12px;color:#374151;">${budgetStr}</div>
            </div>
          </div>
        </td>
      </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);padding:32px 24px;text-align:center;">
          <div style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">WanaPush</div>
          <div style="color:#e0d9ff;font-size:13px;margin-top:4px;">Auto-Pilote Publicité</div>
        </td></tr>

        <!-- Intro -->
        <tr><td style="padding:28px 24px 0;">
          <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">
            Bonjour ${esc(name)},
          </h1>
          <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;">
            Votre auto-pilote a analysé vos campagnes ce matin et a appliqué
            <strong style="color:#111827;">${rows.length} action${rows.length > 1 ? "s" : ""}</strong>
            pour optimiser vos performances publicitaires.
          </p>
        </td></tr>

        <!-- Actions table -->
        <tr><td style="padding:20px 0 0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 24px 10px;">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af;">
                Actions appliquées
              </div>
            </td></tr>
            ${rowsHtml}
          </table>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:28px 24px;text-align:center;">
          <a href="${BASE_URL}/ads" style="display:inline-block;background:#7c3aed;color:#ffffff;font-weight:700;font-size:14px;padding:13px 28px;border-radius:10px;text-decoration:none;">
            Voir mes campagnes →
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 24px;border-top:1px solid #f3f4f6;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
            Vous recevez cet email car l&apos;auto-optimisation est activée sur votre compte WanaPush.<br>
            Pour désactiver les notifications, rendez-vous dans <a href="${BASE_URL}/settings" style="color:#7c3aed;text-decoration:none;">Paramètres</a>.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`;
}
