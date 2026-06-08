// Lead Sync — auto-pilote post-capture FormSubmission.
//
// À chaque création de FormSubmission, on déclenche en fire-and-forget :
//  1. scoreLead() → met à jour leadScore + leadTemperature
//  2. createOrUpsertEmailContact() → ajoute au module Email pour nurturing
//  3. notifySiteOwner() → email owner via lib/email avec preview lead + score
//  4. fireWebhooks() → envoie le lead à tous les LeadWebhook actifs du user
//     (filtrés par siteSlug + minTemperature). HMAC signed avec secret.
//
// Si une étape échoue, les autres continuent (best-effort). Toutes les étapes
// sont synchrones dans cette fonction mais l'appelant doit la lancer en
// `void runLeadPipeline(...)` pour ne pas bloquer le submit.

import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { sendEmail, renderMarkdownToHtml, wrapHtmlTemplate } from "@/lib/email";
import { unsubUrl } from "@/lib/email/unsubscribe";
import { scoreLead } from "./scoring";

/** Pipeline complet pour 1 FormSubmission. Idempotent : on update si déjà scoré. */
export async function runLeadPipeline(submissionId: string): Promise<void> {
  const submission = await prisma.formSubmission.findUnique({
    where: { id: submissionId },
    select: { id: true, siteSlug: true, email: true, data: true, type: true, leadScore: true, emailContactId: true },
  });
  if (!submission) return;

  // Résoudre user/site
  const site = await prisma.generatedSite.findFirst({
    where: {
      OR: [
        { slug: submission.siteSlug },
        { meta: { path: "$.siteSlug", equals: submission.siteSlug } },
      ],
    },
    select: { id: true, userId: true, brief: true, meta: true },
  });
  if (!site) return; // site introuvable, on skip silencieusement

  const userId = site.userId;
  const data = (submission.data as Record<string, unknown>) ?? {};

  // ─── 1. Scoring (sync, ~5-15s avec IA) ─────────────────────────────────
  let score = submission.leadScore ?? 0;
  let temperature: "HOT" | "WARM" | "COLD" | "INVALID" = "COLD";
  let scoreReason = "";
  try {
    const r = await scoreLead(submission.email, { ...data, type: submission.type });
    score = r.score;
    temperature = r.temperature;
    scoreReason = r.reason;
    await prisma.formSubmission.update({
      where: { id: submission.id },
      data: {
        leadScore: r.score,
        leadTemperature: r.temperature,
        leadScoreReason: r.reason,
      },
    });
  } catch (e) {
    console.warn(`[leads/sync] scoreLead failed for ${submission.id}: ${e instanceof Error ? e.message : e}`);
  }

  // Skip pipeline si INVALID (spam, jetable, malformé)
  if (temperature === "INVALID") return;

  // ─── 2. EmailContact sync (auto-add à la liste pour nurturing) ─────────
  if (submission.email && !submission.emailContactId) {
    try {
      const firstName = (data.firstName ?? data.first_name ?? data.prenom) as string | undefined;
      const lastName = (data.lastName ?? data.last_name ?? data.nom) as string | undefined;
      const tags = ["lead", `temp:${temperature.toLowerCase()}`, `site:${submission.siteSlug}`, `type:${submission.type}`];
      const contact = await prisma.emailContact.upsert({
        where: { userId_email: { userId, email: submission.email } },
        create: {
          userId,
          email: submission.email,
          firstName: typeof firstName === "string" ? firstName : undefined,
          lastName: typeof lastName === "string" ? lastName : undefined,
          tags,
          attributes: { leadScore: score, leadTemperature: temperature, formSubmissionId: submission.id },
          source: `lead:${submission.siteSlug}:${submission.type}`,
          // Implied consent : l'user a soumis volontairement un form → ACTIVE
          status: "ACTIVE",
          consentedAt: new Date(),
        },
        update: {
          firstName: typeof firstName === "string" ? firstName : undefined,
          lastName: typeof lastName === "string" ? lastName : undefined,
          // Merge tags (préserve les tags existants)
          tags: tags as never,
          // Update attributes au plus haut score
          attributes: { leadScore: score, leadTemperature: temperature, formSubmissionId: submission.id } as never,
        },
      });
      await prisma.formSubmission.update({
        where: { id: submission.id },
        data: { emailContactId: contact.id },
      });
    } catch (e) {
      console.warn(`[leads/sync] EmailContact upsert failed for ${submission.id}: ${e instanceof Error ? e.message : e}`);
    }
  }

  // ─── 3. Notify owner (email récap) ─────────────────────────────────────
  try {
    const owner = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    if (owner?.email) {
      const brandName = readBrandName(site) ?? submission.siteSlug;
      await notifyOwner(owner.email, owner.name ?? "Propriétaire", {
        siteSlug: submission.siteSlug,
        brandName,
        leadEmail: submission.email,
        type: submission.type,
        score,
        temperature,
        reason: scoreReason,
        formData: data,
        submissionId: submission.id,
      });
      await prisma.formSubmission.update({
        where: { id: submission.id },
        data: { notifiedAt: new Date() },
      });
    }
  } catch (e) {
    console.warn(`[leads/sync] notifyOwner failed for ${submission.id}: ${e instanceof Error ? e.message : e}`);
  }

  // ─── 4. Fan-out webhooks sortants (CRM externes) ───────────────────────
  try {
    await fireWebhooks(userId, {
      submissionId: submission.id,
      siteSlug: submission.siteSlug,
      type: submission.type,
      email: submission.email,
      leadScore: score,
      leadTemperature: temperature,
      leadScoreReason: scoreReason,
      data,
    });
  } catch (e) {
    console.warn(`[leads/sync] fireWebhooks failed for ${submission.id}: ${e instanceof Error ? e.message : e}`);
  }
}

function readBrandName(site: { brief: unknown; meta: unknown }): string | null {
  const brief = (site.brief as Record<string, unknown> | null) ?? {};
  const meta = (site.meta as Record<string, unknown> | null) ?? {};
  return (brief.brand as string | undefined) ?? (meta.brand as string | undefined) ?? null;
}

// ─── Email owner via lib/email ─────────────────────────────────────────────

const TEMPERATURE_EMOJI: Record<string, string> = {
  HOT: "🔥",
  WARM: "🌡️",
  COLD: "❄️",
};

const TEMPERATURE_COLOR: Record<string, string> = {
  HOT: "#dc2626",
  WARM: "#f59e0b",
  COLD: "#3b82f6",
};

async function notifyOwner(
  ownerEmail: string,
  ownerName: string,
  payload: {
    siteSlug: string;
    brandName: string;
    leadEmail: string | null;
    type: string;
    score: number;
    temperature: string;
    reason: string;
    formData: Record<string, unknown>;
    submissionId: string;
  },
): Promise<void> {
  const emoji = TEMPERATURE_EMOJI[payload.temperature] ?? "✉️";
  const color = TEMPERATURE_COLOR[payload.temperature] ?? "#374151";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://wanapush.com";

  const fieldsList = Object.entries(payload.formData)
    .filter(([k, v]) => typeof v === "string" || typeof v === "number")
    .map(([k, v]) => `**${escapeBasic(k)}** : ${escapeBasic(String(v)).slice(0, 200)}`)
    .join("\n\n");

  const markdown = `# ${emoji} Nouveau lead — ${payload.brandName}

**Score** : ${payload.score}/100 — ${payload.temperature}
**Source** : ${payload.type === "newsletter" ? "Newsletter" : "Formulaire de contact"}
**Email lead** : ${payload.leadEmail ?? "(non renseigné)"}

**Pourquoi ce score** : ${payload.reason || "—"}

## Données du formulaire

${fieldsList || "(aucune donnée structurée)"}

[Voir le détail dans le dashboard](${baseUrl}/leads)`;

  const contentHtml = renderMarkdownToHtml(markdown);
  // Inject le badge score en haut
  const badgedContent = `<div style="display:inline-block;padding:6px 14px;border-radius:6px;background:${color}15;color:${color};font-weight:700;margin-bottom:16px">${emoji} ${payload.temperature} — ${payload.score}/100</div>${contentHtml}`;

  const fullHtml = wrapHtmlTemplate({
    contentHtml: badgedContent,
    preheader: `${payload.temperature} — ${payload.score}/100 — ${payload.leadEmail ?? "lead"}`,
    unsubUrl: unsubUrl(`owner_${payload.submissionId}`, payload.submissionId),
    fromName: "WanaPush Leads",
  });

  await sendEmail({
    to: ownerEmail,
    fromName: "WanaPush",
    fromEmail: process.env.EMAIL_FROM_DEFAULT ?? "leads@wanapush.com",
    subject: `${emoji} [${payload.temperature}] Nouveau lead ${payload.score}/100 — ${payload.brandName}`,
    bodyHtml: fullHtml,
    contactId: `owner_${payload.submissionId}`, // virtuel — pas un EmailContact réel
    sendId: payload.submissionId,
    tags: [
      { name: "type", value: "lead_notification" },
      { name: "temperature", value: payload.temperature },
    ],
  });
}

function escapeBasic(s: string): string {
  return s.replace(/[*_`]/g, "");
}

// ─── Webhooks sortants HMAC-signed ────────────────────────────────────────

const TEMP_RANK: Record<string, number> = { COLD: 1, WARM: 2, HOT: 3, INVALID: 0 };

async function fireWebhooks(
  userId: string,
  payload: {
    submissionId: string;
    siteSlug: string;
    type: string;
    email: string | null;
    leadScore: number;
    leadTemperature: string;
    leadScoreReason: string;
    data: Record<string, unknown>;
  },
): Promise<void> {
  const hooks = await prisma.leadWebhook.findMany({
    where: {
      userId,
      enabled: true,
      OR: [
        { siteSlug: null },
        { siteSlug: payload.siteSlug },
      ],
    },
    select: { id: true, url: true, secret: true, minTemperature: true },
  });
  if (hooks.length === 0) return;

  const payloadRank = TEMP_RANK[payload.leadTemperature] ?? 0;
  const filtered = hooks.filter((h) => {
    if (!h.minTemperature) return true;
    const minRank = TEMP_RANK[h.minTemperature] ?? 0;
    return payloadRank >= minRank;
  });

  await Promise.allSettled(
    filtered.map((h) => fireOne(h, payload)),
  );
}

async function fireOne(
  hook: { id: string; url: string; secret: string },
  payload: Record<string, unknown>,
): Promise<void> {
  const body = JSON.stringify({
    event: "lead.created",
    timestamp: new Date().toISOString(),
    payload,
  });
  const secret = decrypt(hook.secret);
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  try {
    const r = await fetch(hook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-WanaPush-Signature": `sha256=${signature}`,
        "X-WanaPush-Event": "lead.created",
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (r.ok) {
      await prisma.leadWebhook.update({
        where: { id: hook.id },
        data: { totalFires: { increment: 1 }, lastFiredAt: new Date(), lastError: null },
      });
    } else {
      await prisma.leadWebhook.update({
        where: { id: hook.id },
        data: {
          totalFires: { increment: 1 },
          totalFails: { increment: 1 },
          lastFiredAt: new Date(),
          lastError: `HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`,
        },
      });
    }
  } catch (e) {
    await prisma.leadWebhook.update({
      where: { id: hook.id },
      data: {
        totalFires: { increment: 1 },
        totalFails: { increment: 1 },
        lastFiredAt: new Date(),
        lastError: (e instanceof Error ? e.message : String(e)).slice(0, 300),
      },
    });
  }
}
