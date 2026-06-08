// Resend webhooks handler — vérifie signature Svix + applique l'event sur EmailSend.
//
// Resend utilise Svix pour signer ses webhooks. Format des headers :
//  - svix-id : ID unique de l'event (dedup)
//  - svix-timestamp : Unix seconds
//  - svix-signature : "v1,base64sig v1,base64sig2 ..." (peut contenir plusieurs)
//
// Algorithme HMAC-SHA256 :
//   signed_content = `${svix-id}.${svix-timestamp}.${raw_body}`
//   signature = base64(HMAC_SHA256(signed_content, base64decode(secret_after_whsec_)))
//
// Events à gérer :
//  - email.sent / email.delivered / email.delivery_delayed
//  - email.bounced (hard ou soft)
//  - email.complained (marqué spam → status COMPLAINED + EmailContact.status)
//  - email.opened / email.clicked
//  - email.failed
//
// Doc : https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests

import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

/** Vérifie la signature Svix d'un webhook Resend.
 *  Tolérance timestamp : 5 minutes (anti-replay).
 *  @param rawBody le body brut (NE PAS parser en JSON avant verify)
 *  @param headers signature headers récupérés via req.headers.get(...)
 *  @param secret webhook secret depuis Resend dashboard, format "whsec_..."
 *  @returns true si signature valide ET timestamp dans la fenêtre */
export function verifyResendSignature(
  rawBody: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  secret: string,
): boolean {
  if (!headers.id || !headers.timestamp || !headers.signature) return false;
  if (!secret.startsWith("whsec_")) return false;

  // Anti-replay : timestamp doit être dans les 5 dernières minutes
  const ts = Number(headers.timestamp);
  if (!Number.isFinite(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 5 * 60) return false;

  // Signed content : `{id}.{ts}.{body}`
  const signedContent = `${headers.id}.${headers.timestamp}.${rawBody}`;
  const secretKey = Buffer.from(secret.slice("whsec_".length), "base64");
  const expectedSig = createHmac("sha256", secretKey)
    .update(signedContent)
    .digest("base64");

  // Le header peut contenir plusieurs signatures séparées par espace (rotation)
  // Format : "v1,<sig> v1,<sig2>"
  const sigs = headers.signature.split(" ");
  for (const item of sigs) {
    const [version, sig] = item.split(",");
    if (version !== "v1" || !sig) continue;
    try {
      const a = Buffer.from(sig, "base64");
      const b = Buffer.from(expectedSig, "base64");
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    } catch {
      // mauvais base64 → next
    }
  }
  return false;
}

// ─── Application de l'event sur EmailSend + EmailContact ────────────────────

export type ResendEvent = {
  type: string;
  data: {
    email_id?: string; // id Resend du send
    to?: string[];
    from?: string;
    subject?: string;
    created_at?: string;
    click?: { link?: string; timestamp?: string };
    bounce?: { type?: "hard" | "soft"; message?: string };
  };
  created_at?: string;
};

const TYPE_TO_STATUS: Record<string, "SENT" | "DELIVERED" | "OPENED" | "CLICKED" | "BOUNCED" | "COMPLAINED" | "FAILED"> = {
  "email.sent": "SENT",
  "email.delivered": "DELIVERED",
  "email.delivery_delayed": "SENT", // garde en SENT
  "email.opened": "OPENED",
  "email.clicked": "CLICKED",
  "email.bounced": "BOUNCED",
  "email.complained": "COMPLAINED",
  "email.failed": "FAILED",
};

/** Applique un event Resend webhook : update EmailSend + EmailContact + agrège
 *  stats EmailCampaign. Idempotent : on incrémente openCount/clickCount, on
 *  ne pas refait setter firstOpenedAt si déjà défini. */
export async function applyResendEvent(event: ResendEvent): Promise<{ matched: boolean }> {
  const resendId = event.data.email_id;
  if (!resendId) return { matched: false };

  const send = await prisma.emailSend.findFirst({
    where: { resendId },
    select: { id: true, contactId: true, campaignId: true, status: true, firstOpenedAt: true, firstClickedAt: true },
  });
  if (!send) return { matched: false };

  const now = new Date();
  const newStatus = TYPE_TO_STATUS[event.type];

  // Update EmailSend
  const updates: Record<string, unknown> = {};
  if (newStatus) updates.status = newStatus;
  if (event.type === "email.delivered") updates.deliveredAt = now;
  if (event.type === "email.bounced") {
    updates.bouncedAt = now;
    updates.errorMessage = event.data.bounce?.message?.slice(0, 500);
  }
  if (event.type === "email.opened") {
    updates.openCount = { increment: 1 };
    if (!send.firstOpenedAt) updates.firstOpenedAt = now;
  }
  if (event.type === "email.clicked") {
    updates.clickCount = { increment: 1 };
    if (!send.firstClickedAt) updates.firstClickedAt = now;
  }
  if (Object.keys(updates).length > 0) {
    await prisma.emailSend.update({ where: { id: send.id }, data: updates as never });
  }

  // Update EmailContact (engagement + status)
  const contactUpdates: Record<string, unknown> = {};
  if (event.type === "email.opened" || event.type === "email.clicked") {
    contactUpdates.lastEngagedAt = now;
  }
  if (event.type === "email.bounced" && event.data.bounce?.type === "hard") {
    contactUpdates.status = "BOUNCED";
    contactUpdates.bounceReason = event.data.bounce.message?.slice(0, 500);
  }
  if (event.type === "email.complained") {
    contactUpdates.status = "COMPLAINED";
  }
  if (Object.keys(contactUpdates).length > 0) {
    await prisma.emailContact.update({
      where: { id: send.contactId },
      data: contactUpdates as never,
    });
  }

  // Agrège stats EmailCampaign (best-effort, fire-and-forget pour ne pas bloquer le webhook)
  if (send.campaignId) {
    void aggregateCampaignStats(send.campaignId).catch(() => undefined);
  }

  return { matched: true };
}

/** Recalcule stats agrégées d'une campaign. Best-effort, peut être debounced. */
async function aggregateCampaignStats(campaignId: string): Promise<void> {
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
    select: { stats: true },
  });
  if (!campaign) return;

  // GROUP BY status pour compter chaque catégorie
  const counts = await prisma.emailSend.groupBy({
    by: ["status"],
    where: { campaignId },
    _count: { _all: true },
  });
  // Sums pour open/click count (cumul, pas unique)
  const sums = await prisma.emailSend.aggregate({
    where: { campaignId },
    _sum: { openCount: true, clickCount: true },
  });
  // Counts uniques (firstOpenedAt non null)
  const uniqueOpens = await prisma.emailSend.count({
    where: { campaignId, firstOpenedAt: { not: null } },
  });
  const uniqueClicks = await prisma.emailSend.count({
    where: { campaignId, firstClickedAt: { not: null } },
  });

  const map: Record<string, number> = {};
  for (const c of counts) map[c.status] = c._count._all;

  const recipients =
    (campaign.stats as Record<string, number> | null)?.recipients ??
    Object.values(map).reduce((s, n) => s + n, 0);

  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: {
      stats: {
        recipients,
        sent: (map.SENT ?? 0) + (map.DELIVERED ?? 0) + (map.OPENED ?? 0) + (map.CLICKED ?? 0),
        delivered: (map.DELIVERED ?? 0) + (map.OPENED ?? 0) + (map.CLICKED ?? 0),
        opens: sums._sum.openCount ?? 0,
        uniqueOpens,
        clicks: sums._sum.clickCount ?? 0,
        uniqueClicks,
        bounces: map.BOUNCED ?? 0,
        complaints: map.COMPLAINED ?? 0,
        unsubscribes: map.UNSUBSCRIBED ?? 0,
        failed: map.FAILED ?? 0,
      } as never,
    },
  });
}
