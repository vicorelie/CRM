// Module Email marketing — core (send + broadcast).
//
// Provider : Resend (SDK officiel) — clé globale RESEND_API_KEY.
// Distinct du module Shop transactionnel (lib/shop-email.ts).
//
// Best practices Apple Mail Privacy Protection (MPP) 2026 :
//  - MPP cache l'IP + pré-load les images → fausse les open rates
//  - On track quand même les opens (signal directionnel) MAIS on priorise les
//    clicks + reply rate dans le dashboard fondateur
//  - Évite les pixels invisibles : laisse Resend gérer le tracking pixel natif
//
// Best practices RGPD/CAN-SPAM/CASL 2026 :
//  - List-Unsubscribe RFC 8058 one-click → cf lib/email/unsubscribe.ts
//  - Stocker source de consentement dans EmailContact.source + consentedAt
//  - Footer obligatoire : adresse postale + lien unsub manuel (en plus du header)

import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { buildUnsubHeaders, unsubUrl } from "./unsubscribe";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// ─── Types publics ───────────────────────────────────────────────────────────

export type SendEmailInput = {
  to: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string; // fallback plain-text (best practice deliverability)
  /** Contact ID — utilisé pour générer List-Unsubscribe + tracker l'envoi */
  contactId: string;
  /** Optionnel : EmailSend.id si on track une send DB. */
  sendId?: string;
  /** Headers additionnels (List-Unsubscribe est auto-ajouté) */
  headers?: Record<string, string>;
  /** Tags Resend pour analytics (filterable dans dashboard Resend) */
  tags?: Array<{ name: string; value: string }>;
};

export type SendResult = {
  ok: boolean;
  resendId?: string;
  error?: string;
};

// ─── Render markdown → HTML (réutilise renderMd du Shop) ────────────────────
// Note : on garde une version minimaliste ici. Pour des templates plus riches
// (drag-and-drop, blocks réutilisables), prévoir un éditeur visuel en phase 2.

const MARKDOWN_BR = /\r?\n\r?\n/g;
const MARKDOWN_LINK = /\[([^\]]+)\]\(([^)]+)\)/g;
const MARKDOWN_BOLD = /\*\*([^*]+)\*\*/g;
const MARKDOWN_ITALIC = /(?<!\*)\*([^*]+)\*(?!\*)/g;
const MARKDOWN_H1 = /^# (.+)$/gm;
const MARKDOWN_H2 = /^## (.+)$/gm;
const MARKDOWN_H3 = /^### (.+)$/gm;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Convertit markdown simple en HTML sécurisé. Pour des templates marketing
 *  riches (logo, bouton CTA, multi-colonnes), prévoir un wrapper template MJML
 *  en phase 2. Ce render est suffisant pour newsletters simples. */
export function renderMarkdownToHtml(markdown: string): string {
  let html = escapeHtml(markdown);
  html = html.replace(MARKDOWN_H1, '<h1 style="font-size:24px;font-weight:700;margin:24px 0 16px;color:#111">$1</h1>');
  html = html.replace(MARKDOWN_H2, '<h2 style="font-size:20px;font-weight:700;margin:20px 0 12px;color:#111">$1</h2>');
  html = html.replace(MARKDOWN_H3, '<h3 style="font-size:18px;font-weight:600;margin:16px 0 8px;color:#111">$1</h3>');
  html = html.replace(MARKDOWN_BOLD, '<strong>$1</strong>');
  html = html.replace(MARKDOWN_ITALIC, '<em>$1</em>');
  html = html.replace(MARKDOWN_LINK, '<a href="$2" style="color:#3b82f6;text-decoration:underline">$1</a>');
  html = html.replace(MARKDOWN_BR, "</p><p>");
  return `<p style="margin:0 0 16px;line-height:1.6;color:#374151">${html}</p>`;
}

/** Génère le HTML complet de l'email avec footer RGPD obligatoire.
 *  Le footer contient : adresse postale + lien unsub manuel (en + du header).
 *  CAN-SPAM exige une adresse physique valide. */
export function wrapHtmlTemplate(params: {
  contentHtml: string;
  preheader?: string;
  unsubUrl: string;
  fromName: string;
  /** Adresse postale du sender (CAN-SPAM Section 3 obligatoire) */
  postalAddress?: string;
}): string {
  const preheaderHtml = params.preheader
    ? `<div style="display:none;font-size:0;line-height:0;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(params.preheader)}</div>`
    : "";
  const address = params.postalAddress ?? "WanaPush — France";
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title></title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
${preheaderHtml}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9fafb">
  <tr>
    <td align="center" style="padding:32px 16px">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;border-radius:8px">
        <tr><td style="padding:32px">${params.contentHtml}</td></tr>
        <tr><td style="padding:24px 32px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;line-height:1.6">
          ${escapeHtml(params.fromName)} — ${escapeHtml(address)}<br>
          Vous recevez cet email parce que vous êtes inscrit·e à notre liste.
          <a href="${params.unsubUrl}" style="color:#6b7280;text-decoration:underline">Se désabonner</a> en un clic.
        </td></tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// ─── Send single email (utilisé par campaigns + sequences) ──────────────────

export async function sendEmail(input: SendEmailInput): Promise<SendResult> {
  if (!resend) {
    return { ok: false, error: "RESEND_API_KEY non configuré" };
  }

  const headers = {
    ...buildUnsubHeaders(input.contactId, input.sendId),
    ...(input.headers ?? {}),
  };

  try {
    const r = await resend.emails.send({
      from: `${input.fromName} <${input.fromEmail}>`,
      to: [input.to],
      replyTo: input.replyTo,
      subject: input.subject,
      html: input.bodyHtml,
      text: input.bodyText,
      headers,
      tags: input.tags,
    });
    if (r.error) return { ok: false, error: r.error.message };
    return { ok: true, resendId: r.data?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─── Batch send (utilisé par broadcasts) ────────────────────────────────────
// Resend `batch.send` permet d'envoyer jusqu'à 100 emails en 1 requête.
// Pour >100 destinataires, on chunk côté caller.

export async function sendBatch(inputs: SendEmailInput[]): Promise<SendResult[]> {
  if (!resend) {
    return inputs.map(() => ({ ok: false, error: "RESEND_API_KEY non configuré" }));
  }
  if (inputs.length === 0) return [];
  if (inputs.length > 100) {
    throw new Error(`Resend batch max 100 (reçu ${inputs.length}). Chunke côté caller.`);
  }

  const payload = inputs.map((i) => ({
    from: `${i.fromName} <${i.fromEmail}>`,
    to: [i.to],
    replyTo: i.replyTo,
    subject: i.subject,
    html: i.bodyHtml,
    text: i.bodyText,
    headers: { ...buildUnsubHeaders(i.contactId, i.sendId), ...(i.headers ?? {}) },
    tags: i.tags,
  }));

  try {
    const r = await resend.batch.send(payload);
    if (r.error) {
      return inputs.map(() => ({ ok: false, error: r.error?.message ?? "batch error" }));
    }
    return (r.data?.data ?? []).map((d) => ({
      ok: !!d.id,
      resendId: d.id,
    }));
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return inputs.map(() => ({ ok: false, error }));
  }
}

// ─── High-level : envoyer une campaign ──────────────────────────────────────

/** Envoie une EmailCampaign vers tous les EmailContacts matchant le segment.
 *  Idempotence : si campaign.status === "SENT", refuse. Sinon, marque
 *  SENDING → boucle batch send → SENT. */
export async function sendCampaign(campaignId: string): Promise<{ recipients: number; sent: number; failed: number }> {
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) throw new Error(`Campaign ${campaignId} introuvable`);
  if (campaign.status === "SENT" || campaign.status === "SENDING") {
    throw new Error(`Campaign déjà en ${campaign.status}`);
  }

  // Render HTML une fois (snapshot)
  const contentHtml = renderMarkdownToHtml(campaign.bodyMarkdown);

  // Résout les contacts via segmentJson (basique : status=ACTIVE + tags si fourni)
  const segment = (campaign.segmentJson as Record<string, unknown> | null) ?? {};
  const tagFilter = (segment.tags as string[] | undefined) ?? [];
  const contacts = await prisma.emailContact.findMany({
    where: {
      userId: campaign.userId,
      status: "ACTIVE",
      ...(tagFilter.length > 0
        ? { tags: { array_contains: tagFilter as never } }
        : {}),
    },
    select: { id: true, email: true, firstName: true, lastName: true },
    take: 50_000, // garde-fou
  });

  if (contacts.length === 0) {
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: "FAILED", stats: { recipients: 0, error: "Aucun contact actif matchant le segment" } as never },
    });
    return { recipients: 0, sent: 0, failed: 0 };
  }

  // Mark SENDING
  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: {
      status: "SENDING",
      sentAt: new Date(),
      bodyHtmlSnapshot: contentHtml,
    },
  });

  let sent = 0;
  let failed = 0;

  // Crée toutes les EmailSends en avance (status QUEUED) puis batch send
  // Cela permet de fournir le sendId au token unsub (1 token / send unique)
  const sendsToCreate = contacts.map((c) => ({
    campaignId,
    contactId: c.id,
    status: "QUEUED" as const,
  }));
  await prisma.emailSend.createMany({ data: sendsToCreate });
  const sends = await prisma.emailSend.findMany({
    where: { campaignId },
    select: { id: true, contactId: true },
  });
  const sendsByContact = new Map(sends.map((s) => [s.contactId, s.id]));

  // Chunk 100 (limite Resend batch)
  for (let i = 0; i < contacts.length; i += 100) {
    const chunk = contacts.slice(i, i + 100);
    const inputs: SendEmailInput[] = chunk.map((c) => {
      const sendId = sendsByContact.get(c.id);
      const fullHtml = wrapHtmlTemplate({
        contentHtml,
        preheader: campaign.preheader ?? undefined,
        unsubUrl: unsubUrl(c.id, sendId),
        fromName: campaign.fromName,
      });
      return {
        to: c.email,
        fromName: campaign.fromName,
        fromEmail: campaign.fromEmail,
        replyTo: campaign.replyTo ?? undefined,
        subject: campaign.subject,
        bodyHtml: fullHtml,
        contactId: c.id,
        sendId,
        tags: [
          { name: "campaign_id", value: campaignId },
          { name: "campaign_type", value: "broadcast" },
        ],
      };
    });

    const results = await sendBatch(inputs);

    // Update EmailSend.resendId + status
    await Promise.all(
      results.map(async (res, idx) => {
        const sendId = sendsByContact.get(chunk[idx].id);
        if (!sendId) return;
        if (res.ok) {
          sent++;
          await prisma.emailSend.update({
            where: { id: sendId },
            data: { status: "SENT", resendId: res.resendId, sentAt: new Date() },
          });
        } else {
          failed++;
          await prisma.emailSend.update({
            where: { id: sendId },
            data: { status: "FAILED", errorMessage: res.error?.slice(0, 1000) },
          });
        }
      }),
    );
  }

  // Mark SENT + agrège stats
  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: {
      status: failed === contacts.length ? "FAILED" : "SENT",
      stats: {
        recipients: contacts.length,
        sent,
        failed,
        delivered: 0,
        opens: 0,
        uniqueOpens: 0,
        clicks: 0,
        uniqueClicks: 0,
        bounces: 0,
        complaints: 0,
        unsubscribes: 0,
      } as never,
    },
  });

  return { recipients: contacts.length, sent, failed };
}
