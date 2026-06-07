// Pipeline auto-pilote pour Enhanced Conversions Google Ads (Data Manager API).
//
// Branche les événements business WanaPush (lead form submit + commande Stripe
// payée) sur l'upload server-side de conversions enrichies vers Google Ads.
// → permet à Google Smart Bidding d'optimiser sur les VRAIS clients fermés,
//   pas juste les form-submits ou checkout-completes.
//
// Stratégie :
//  1. Capter `gclid`/`gbraid`/`wbraid` côté landing (parsé depuis l'URL au moment
//     du form submit ou passé via Stripe Checkout Session.metadata pour les commandes)
//  2. Stocker dans FormSubmission.gclid / Order.gclid + ecStatus = PENDING
//  3. Fire-and-forget : appeler triggerLeadConversion() / triggerSaleConversion()
//     qui résout le bon AdAccount + ConversionAction et POST vers Data Manager API
//  4. Met à jour ecStatus → SENT / FAILED / SKIPPED
//
// Auto-résolution AdAccount + ConversionAction :
//  - On cherche un AdAccount Google CONNECTED du user dont le slug correspond au
//    siteSlug (via meta.siteSlug) OU le 1er AdAccount Google du user
//  - On choisit la 1ère ConversionAction du compte avec la bonne category
//    (LEAD pour form, PURCHASE pour Order). Si aucune n'existe, on log SKIPPED.

import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { uploadConversionEvents } from "@/lib/ads/google-data-manager";
import { googleAdsConnector } from "@/lib/ads/google";
import {
  createConversionRule,
  streamConversionEvent,
  type LinkedInConversionType,
} from "@/lib/ads/linkedin-conversions";
import type { AdAccountInfo } from "@/lib/ads/types";

// ─── Parsing click identifiers depuis URL ────────────────────────────────────

/** Parse gclid/gbraid/wbraid depuis une URL string. Retourne tous les IDs trouvés. */
export function parseClickIdsFromUrl(url: string | undefined | null): {
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
} {
  if (!url) return {};
  try {
    const u = new URL(url, "https://wanapush.com");
    const out: { gclid?: string; gbraid?: string; wbraid?: string } = {};
    const gclid = u.searchParams.get("gclid")?.slice(0, 255);
    const gbraid = u.searchParams.get("gbraid")?.slice(0, 255);
    const wbraid = u.searchParams.get("wbraid")?.slice(0, 255);
    if (gclid) out.gclid = gclid;
    if (gbraid) out.gbraid = gbraid;
    if (wbraid) out.wbraid = wbraid;
    return out;
  } catch {
    return {};
  }
}

/** Extrait l'IP du client depuis les headers (utilisée comme PLAINTEXT_IP_ADDRESS LinkedIn) */
export function extractClientIp(headers: Headers): string | undefined {
  const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (fwd) return fwd;
  const real = headers.get("x-real-ip");
  return real ?? undefined;
}

// ─── Helpers internes ────────────────────────────────────────────────────────

type ResolvedAccount = {
  account: AdAccountInfo;
  customerId: string;
  conversionActionId: string;
};

/** Résout l'AdAccount Google + ConversionAction pour un user donné.
 *  Retourne null si pas d'AdAccount Google CONNECTED ou pas de conversion action de la catégorie demandée. */
async function resolveGoogleAccount(
  userId: string,
  category: "LEAD" | "PURCHASE",
): Promise<ResolvedAccount | null> {
  const adAccount = await prisma.adAccount.findFirst({
    where: {
      userId,
      platform: "GOOGLE_ADS",
      status: "CONNECTED",
    },
    select: {
      id: true,
      platform: true,
      externalId: true,
      accessToken: true,
      refreshToken: true,
      tokenExpiresAt: true,
      meta: true,
    },
  });
  if (!adAccount) return null;

  const customerId = (adAccount.meta as Record<string, unknown> | null)?.customerId as
    | string
    | undefined;
  if (!customerId) return null;

  const accountInfo: AdAccountInfo = {
    externalId: adAccount.externalId,
    accessToken: decrypt(adAccount.accessToken),
    refreshToken: adAccount.refreshToken ? decrypt(adAccount.refreshToken) : undefined,
    tokenExpiresAt: adAccount.tokenExpiresAt ?? undefined,
    meta: (adAccount.meta as Record<string, unknown>) ?? {},
  };

  // Liste les ConversionActions et prend la 1ère ENABLED de la category demandée
  try {
    const actions = await googleAdsConnector.listConversionActions!(accountInfo);
    const match = actions.find(
      (a) => a.category === category && (a.status === "ENABLED" || a.status === ""),
    );
    if (!match) return null;
    return { account: accountInfo, customerId, conversionActionId: match.id };
  } catch (e) {
    console.warn(`[ec-pipeline] resolveGoogleAccount listConversionActions failed: ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

/** Résout le userId à partir d'un siteSlug — via GeneratedSite ou Shop. */
async function resolveUserIdFromSiteSlug(siteSlug: string): Promise<string | null> {
  // GeneratedSite (landing pages)
  const site = await prisma.generatedSite.findFirst({
    where: {
      OR: [
        { slug: siteSlug },
        { meta: { path: "$.siteSlug", equals: siteSlug } },
      ],
    },
    select: { userId: true },
  });
  if (site) return site.userId;

  // Shop (e-commerce sites)
  const shop = await prisma.shop.findUnique({
    where: { siteSlug },
    select: { userId: true },
  });
  return shop?.userId ?? null;
}

// ─── Trigger pour Lead (FormSubmission) ──────────────────────────────────────

/** Trigger Enhanced Conversion pour une FormSubmission. Fire-and-forget.
 *  Met à jour FormSubmission.ecStatus à la fin (SENT/FAILED/SKIPPED). */
export async function triggerLeadConversionForFormSubmission(
  submissionId: string,
): Promise<void> {
  const submission = await prisma.formSubmission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      siteSlug: true,
      email: true,
      data: true,
      gclid: true,
      gbraid: true,
      wbraid: true,
      createdAt: true,
    },
  });
  if (!submission) return;

  // Pas de click identifier → pas d'enhanced conversion possible côté Google
  // (les form-submits sans gclid sont déjà comptés via le tag classique GA4)
  if (!submission.gclid && !submission.gbraid && !submission.wbraid && !submission.email) {
    await markFormSubmissionStatus(submissionId, "SKIPPED", "Pas de gclid/gbraid/wbraid ni email");
    return;
  }

  const userId = await resolveUserIdFromSiteSlug(submission.siteSlug);
  if (!userId) {
    await markFormSubmissionStatus(submissionId, "SKIPPED", `siteSlug "${submission.siteSlug}" sans user résolu`);
    return;
  }

  const resolved = await resolveGoogleAccount(userId, "LEAD");
  if (!resolved) {
    await markFormSubmissionStatus(submissionId, "SKIPPED", "Pas de Google AdAccount CONNECTED + ConversionAction LEAD");
    return;
  }

  // Extrait PII depuis le payload de form pour Enhanced Conversions (PII hashée côté lib)
  const data = (submission.data as Record<string, unknown>) ?? {};
  const phone = (data.phone ?? data.tel ?? data.telephone) as string | undefined;
  const firstName = (data.firstName ?? data.first_name ?? data.prenom) as string | undefined;
  const lastName = (data.lastName ?? data.last_name ?? data.nom) as string | undefined;

  try {
    const result = await uploadConversionEvents(
      resolved.account,
      resolved.customerId,
      resolved.conversionActionId,
      [
        {
          eventTimestamp: submission.createdAt.toISOString(),
          transactionId: `form_${submission.id}`,
          eventSource: "WEB",
          gclid: submission.gclid ?? undefined,
          gbraid: submission.gbraid ?? undefined,
          wbraid: submission.wbraid ?? undefined,
          user: {
            email: submission.email ?? undefined,
            phone: typeof phone === "string" ? phone : undefined,
            firstName: typeof firstName === "string" ? firstName : undefined,
            lastName: typeof lastName === "string" ? lastName : undefined,
          },
        },
      ],
    );
    if (result.ok) {
      await markFormSubmissionStatus(submissionId, "SENT");
    } else {
      const err = result.errors?.[0]?.message ?? "Erreur partielle Data Manager";
      await markFormSubmissionStatus(submissionId, "FAILED", err);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await markFormSubmissionStatus(submissionId, "FAILED", msg.slice(0, 500));
  }
}

async function markFormSubmissionStatus(
  id: string,
  status: "SENT" | "FAILED" | "SKIPPED",
  error?: string,
): Promise<void> {
  await prisma.formSubmission.update({
    where: { id },
    data: {
      ecStatus: status,
      ecSentAt: status === "SENT" ? new Date() : null,
      ecError: error?.slice(0, 1000) ?? null,
    },
  });
}

// ─── LinkedIn CAPI : auto-résolution conversion rule + stream ────────────────

type LinkedInResolved = {
  account: AdAccountInfo;
  conversionUrn: string;
  adAccountDbId: string;
};

/** Résout (ou crée) la conversion rule LinkedIn appropriée pour un user + type.
 *  Cache l'URN dans AdAccount.meta.linkedinConversionRules[type] pour réutilisation.
 *  Retourne null si pas d'AdAccount LinkedIn CONNECTED. */
async function resolveLinkedInAccount(
  userId: string,
  conversionType: LinkedInConversionType,
): Promise<LinkedInResolved | null> {
  const adAccount = await prisma.adAccount.findFirst({
    where: { userId, platform: "LINKEDIN_ADS", status: "CONNECTED" },
    select: {
      id: true,
      externalId: true,
      accessToken: true,
      refreshToken: true,
      tokenExpiresAt: true,
      meta: true,
    },
  });
  if (!adAccount) return null;

  const accountInfo: AdAccountInfo = {
    externalId: adAccount.externalId,
    accessToken: decrypt(adAccount.accessToken),
    refreshToken: adAccount.refreshToken ? decrypt(adAccount.refreshToken) : undefined,
    tokenExpiresAt: adAccount.tokenExpiresAt ?? undefined,
    meta: (adAccount.meta as Record<string, unknown>) ?? {},
  };

  // Cache local : meta.linkedinConversionRules = { LEAD: "urn:lla:...", PURCHASE: "urn:lla:..." }
  const meta = (adAccount.meta as Record<string, unknown>) ?? {};
  const cached = (meta.linkedinConversionRules as Record<string, string> | undefined) ?? {};
  const cachedUrn = cached[conversionType];
  if (cachedUrn) {
    return { account: accountInfo, conversionUrn: cachedUrn, adAccountDbId: adAccount.id };
  }

  // Auto-création : 1 rule par type, associée à toutes les campagnes actives
  try {
    const rule = await createConversionRule(accountInfo, {
      name: `WanaPush ${conversionType} (auto)`,
      accountUrn: adAccount.externalId, // déjà au format urn:li:sponsoredAccount:...
      type: conversionType,
      postClickAttributionWindowSize: 90,
      viewThroughAttributionWindowSize: 30,
      autoAssociateAllCampaigns: true,
    });
    // Met à jour le cache dans AdAccount.meta
    const newCached = { ...cached, [conversionType]: rule.urn };
    await prisma.adAccount.update({
      where: { id: adAccount.id },
      data: { meta: { ...meta, linkedinConversionRules: newCached } as never },
    });
    return { account: accountInfo, conversionUrn: rule.urn, adAccountDbId: adAccount.id };
  } catch (e) {
    console.warn(`[ec-pipeline] LinkedIn createConversionRule failed: ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

async function markFormSubmissionLinkedIn(
  id: string,
  status: "SENT" | "FAILED" | "SKIPPED",
  error?: string,
): Promise<void> {
  await prisma.formSubmission.update({
    where: { id },
    data: {
      liStatus: status,
      liSentAt: status === "SENT" ? new Date() : null,
      liError: error?.slice(0, 1000) ?? null,
    },
  });
}

/** Trigger LinkedIn conversion pour une FormSubmission (parallèle à Google EC).
 *  Fire-and-forget — met à jour FormSubmission.liStatus à la fin. */
export async function triggerLinkedInLeadForFormSubmission(
  submissionId: string,
): Promise<void> {
  const submission = await prisma.formSubmission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      siteSlug: true,
      email: true,
      data: true,
      liFatId: true,
      createdAt: true,
    },
  });
  if (!submission) return;

  // Pas de match identifier suffisant → skip (LinkedIn rejette sans SHA256_EMAIL/liFatId/IP/name)
  if (!submission.email && !submission.liFatId) {
    await markFormSubmissionLinkedIn(submissionId, "SKIPPED", "Ni email ni liFatId");
    return;
  }

  const userId = await resolveUserIdFromSiteSlug(submission.siteSlug);
  if (!userId) {
    await markFormSubmissionLinkedIn(submissionId, "SKIPPED", `siteSlug "${submission.siteSlug}" sans user résolu`);
    return;
  }

  const resolved = await resolveLinkedInAccount(userId, "LEAD");
  if (!resolved) {
    await markFormSubmissionLinkedIn(submissionId, "SKIPPED", "Pas d'AdAccount LinkedIn CONNECTED ou création rule échouée");
    return;
  }

  const data = (submission.data as Record<string, unknown>) ?? {};
  const firstName = (data.firstName ?? data.first_name ?? data.prenom) as string | undefined;
  const lastName = (data.lastName ?? data.last_name ?? data.nom) as string | undefined;
  const companyName = (data.company ?? data.companyName ?? data.entreprise) as string | undefined;
  const title = (data.title ?? data.jobTitle ?? data.poste) as string | undefined;

  try {
    const result = await streamConversionEvent(resolved.account, resolved.conversionUrn, {
      conversionHappenedAt: submission.createdAt.getTime(),
      eventId: `form_${submission.id}`,
      user: {
        email: submission.email ?? undefined,
        liFatId: submission.liFatId ?? undefined,
        firstName: typeof firstName === "string" ? firstName : undefined,
        lastName: typeof lastName === "string" ? lastName : undefined,
        companyName: typeof companyName === "string" ? companyName : undefined,
        title: typeof title === "string" ? title : undefined,
        externalId: submission.id,
      },
    });
    if (result.ok) {
      await markFormSubmissionLinkedIn(submissionId, "SENT");
    } else {
      await markFormSubmissionLinkedIn(submissionId, "FAILED", result.error);
    }
  } catch (e) {
    await markFormSubmissionLinkedIn(submissionId, "FAILED", (e instanceof Error ? e.message : String(e)).slice(0, 500));
  }
}

async function markOrderLinkedIn(
  id: string,
  status: "SENT" | "FAILED" | "SKIPPED",
  error?: string,
): Promise<void> {
  await prisma.order.update({
    where: { id },
    data: {
      liStatus: status,
      liSentAt: status === "SENT" ? new Date() : null,
      liError: error?.slice(0, 1000) ?? null,
    },
  });
}

/** Trigger LinkedIn conversion pour une Order Stripe payée. Fire-and-forget. */
export async function triggerLinkedInSaleForOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      customerEmail: true,
      liFatId: true,
      total: true,
      currency: true,
      paidAt: true,
      createdAt: true,
      shop: { select: { userId: true } },
    },
  });
  if (!order) return;

  if (!order.customerEmail && !order.liFatId) {
    await markOrderLinkedIn(orderId, "SKIPPED", "Ni customerEmail ni liFatId");
    return;
  }

  const resolved = await resolveLinkedInAccount(order.shop.userId, "PURCHASE");
  if (!resolved) {
    await markOrderLinkedIn(orderId, "SKIPPED", "Pas d'AdAccount LinkedIn CONNECTED ou création rule échouée");
    return;
  }

  try {
    const result = await streamConversionEvent(resolved.account, resolved.conversionUrn, {
      conversionHappenedAt: (order.paidAt ?? order.createdAt).getTime(),
      eventId: `order_${order.id}`,
      value: { amount: Number(order.total), currencyCode: order.currency },
      user: {
        email: order.customerEmail || undefined,
        liFatId: order.liFatId ?? undefined,
        externalId: order.id,
      },
    });
    if (result.ok) {
      await markOrderLinkedIn(orderId, "SENT");
    } else {
      await markOrderLinkedIn(orderId, "FAILED", result.error);
    }
  } catch (e) {
    await markOrderLinkedIn(orderId, "FAILED", (e instanceof Error ? e.message : String(e)).slice(0, 500));
  }
}

// ─── Trigger pour Sale (Order Stripe payé) ──────────────────────────────────

/** Trigger Enhanced Conversion pour une Order Stripe payée. Fire-and-forget. */
export async function triggerSaleConversionForOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      shopId: true,
      customerEmail: true,
      customerPhone: true,
      gclid: true,
      gbraid: true,
      wbraid: true,
      total: true,
      currency: true,
      paidAt: true,
      createdAt: true,
      shop: { select: { userId: true, siteSlug: true } },
    },
  });
  if (!order) return;

  if (!order.gclid && !order.gbraid && !order.wbraid && !order.customerEmail) {
    await markOrderStatus(orderId, "SKIPPED", "Pas de gclid/gbraid/wbraid ni email");
    return;
  }

  const resolved = await resolveGoogleAccount(order.shop.userId, "PURCHASE");
  if (!resolved) {
    await markOrderStatus(orderId, "SKIPPED", "Pas de Google AdAccount CONNECTED + ConversionAction PURCHASE");
    return;
  }

  try {
    const result = await uploadConversionEvents(
      resolved.account,
      resolved.customerId,
      resolved.conversionActionId,
      [
        {
          eventTimestamp: (order.paidAt ?? order.createdAt).toISOString(),
          transactionId: `order_${order.id}`,
          eventSource: "WEB",
          conversionValue: Number(order.total),
          currency: order.currency,
          gclid: order.gclid ?? undefined,
          gbraid: order.gbraid ?? undefined,
          wbraid: order.wbraid ?? undefined,
          user: {
            email: order.customerEmail || undefined,
            phone: order.customerPhone || undefined,
          },
        },
      ],
    );
    if (result.ok) {
      await markOrderStatus(orderId, "SENT");
    } else {
      const err = result.errors?.[0]?.message ?? "Erreur partielle Data Manager";
      await markOrderStatus(orderId, "FAILED", err);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await markOrderStatus(orderId, "FAILED", msg.slice(0, 500));
  }
}

async function markOrderStatus(
  id: string,
  status: "SENT" | "FAILED" | "SKIPPED",
  error?: string,
): Promise<void> {
  await prisma.order.update({
    where: { id },
    data: {
      ecStatus: status,
      ecSentAt: status === "SENT" ? new Date() : null,
      ecError: error?.slice(0, 1000) ?? null,
    },
  });
}
