// LinkedIn Conversions API — server-side conversion streaming (équivalent CAPI Meta/TikTok).
//
// Permet d'envoyer les conversions B2B à LinkedIn côté serveur pour optimiser
// le delivery sur les leads convertissants (cookieless + iOS Safari ITP) et
// débloquer optimizationTargetType=MAX_QUALIFIED_LEAD (depuis 202602) qui
// pousse le budget vers les leads que le CRM marque comme qualifiés.
//
// Doc officielle :
// - https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads-reporting/conversions-api
// - Postman : https://www.postman.com/linkedin-developer-apis/linkedin-marketing-solutions-versioned-apis
//
// Workflow :
//   1. createConversionRule(account, accountUrn, { name, type }) → conversion URN (à cacher en DB)
//   2. streamConversionEvent(account, conversionUrn, event) → un par un, ou
//      streamConversionEventsBatch(account, conversionUrn, events) → jusqu'à 5000
//
// Rate limits : 600 req/min, 500k/jour par token. Fenêtre 90 jours (rejeté si plus vieux).
// Identifiants supportés (envoyer tous ceux disponibles pour maximiser match rate) :
//   - SHA256_EMAIL (recommandé)
//   - LINKEDIN_FIRST_PARTY_ADS_TRACKING_UUID (cookie `li_fat_id` déposé par Insight Tag)
//   - PLAINTEXT_IP_ADDRESS
//   - GOOGLE_AID / IDFA (pour apps)
//   - + userInfo { firstName, lastName, title, companyName, countryCode } pour match enrichi

import { createHash } from "crypto";
import type { AdAccountInfo } from "./types";

const API = "https://api.linkedin.com";
const LI_VERSION = "202605";

// ─── Types publics ───────────────────────────────────────────────────────────

/** Type de conversion supporté par LinkedIn CAPI.
 *  Lecture LinkedIn : https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads-reporting/conversions-api-schema */
export type LinkedInConversionType =
  | "ADD_TO_CART"
  | "DOWNLOAD"
  | "INSTALL"
  | "KEY_PAGE_VIEW"
  | "LEAD"
  | "MARKETING_QUALIFIED_LEAD" // depuis 202602
  | "PURCHASE"
  | "QUALIFIED_LEAD" // depuis 202602 — utilisé avec MAX_QUALIFIED_LEAD optimization
  | "SALES_QUALIFIED_LEAD" // depuis 202602
  | "SIGN_UP"
  | "VIEW_CONTENT"
  | "OTHER";

export type LinkedInUser = {
  /** Email en clair (sera lowercase + trim + SHA-256 HEX) */
  email?: string;
  /** Cookie `li_fat_id` déposé par le LinkedIn Insight Tag (UUID v4) — pas hashé */
  liFatId?: string;
  /** IP en clair — pas hashée (transmise telle quelle pour PLAINTEXT_IP_ADDRESS) */
  ipAddress?: string;
  /** Mobile ad IDs (rare pour WanaPush — SaaS web) */
  googleAdId?: string;
  idfa?: string;
  /** ID externe (CRM ID, identifiant interne) — match secondaire */
  externalId?: string;
  /** Infos contextuelles — boost le match rate quand les identifiants principaux manquent */
  firstName?: string;
  lastName?: string;
  title?: string;
  companyName?: string;
  countryCode?: string;
};

export type LinkedInConversionEvent = {
  /** Timestamp ms du moment de la conversion (Date.now() côté caller) */
  conversionHappenedAt: number;
  /** ID unique pour dédup avec Insight Tag browser (utiliser même ID que le tag) */
  eventId: string;
  /** Valeur monétaire (optionnelle mais requise pour PURCHASE/ROAS) */
  value?: { amount: number; currencyCode: string };
  /** Identifiants user — envoyer le maximum disponible */
  user: LinkedInUser;
};

export type StreamResult = {
  ok: boolean;
  /** Nombre d'events acceptés (en batch, le partial failure n'est PAS supporté côté LinkedIn :
   *  un record invalide fait échouer toute la requête → resubmit nécessaire) */
  uploaded: number;
  /** Status HTTP (201 si OK) */
  status?: number;
  /** Détail erreur si !ok */
  error?: string;
};

// ─── Helpers normalisation + hash ────────────────────────────────────────────

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** LinkedIn attend l'email lowercase + trim, hashé SHA-256 HEX. Pas de Gmail
 *  dot-stripping ici (différent de Google EC — LinkedIn ne le documente pas). */
export function normalizeEmailForLinkedIn(email: string): string {
  return email.trim().toLowerCase();
}

/** Convertit un LinkedInUser en `user.userIds[]` + `user.userInfo` pour le payload */
function buildUserPayload(user: LinkedInUser): Record<string, unknown> {
  const userIds: Array<{ idType: string; idValue: string }> = [];
  if (user.email) {
    userIds.push({
      idType: "SHA256_EMAIL",
      idValue: sha256Hex(normalizeEmailForLinkedIn(user.email)),
    });
  }
  if (user.liFatId) {
    userIds.push({
      idType: "LINKEDIN_FIRST_PARTY_ADS_TRACKING_UUID",
      idValue: user.liFatId,
    });
  }
  if (user.ipAddress) {
    userIds.push({ idType: "PLAINTEXT_IP_ADDRESS", idValue: user.ipAddress });
  }
  if (user.googleAdId) {
    userIds.push({ idType: "GOOGLE_AID", idValue: user.googleAdId });
  }
  if (user.idfa) {
    userIds.push({ idType: "IDFA", idValue: user.idfa });
  }

  const userPayload: Record<string, unknown> = { userIds };

  const userInfo: Record<string, string> = {};
  if (user.firstName) userInfo.firstName = user.firstName.trim();
  if (user.lastName) userInfo.lastName = user.lastName.trim();
  if (user.title) userInfo.title = user.title.trim();
  if (user.companyName) userInfo.companyName = user.companyName.trim();
  if (user.countryCode) userInfo.countryCode = user.countryCode.trim().toUpperCase().slice(0, 2);
  if (Object.keys(userInfo).length > 0) userPayload.userInfo = userInfo;

  if (user.externalId) userPayload.externalIds = [user.externalId];

  return userPayload;
}

// ─── Headers communs ────────────────────────────────────────────────────────

function liHeaders(accessToken: string, batchMethod?: "BATCH_CREATE" | "BATCH_UPDATE"): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
    "Linkedin-Version": LI_VERSION,
  };
  if (batchMethod) h["X-RestLi-Method"] = batchMethod;
  return h;
}

// ─── Create Conversion Rule ─────────────────────────────────────────────────

export type CreateConversionRuleInput = {
  name: string;
  /** URN du compte pub : "urn:li:sponsoredAccount:5123456" (= account.externalId chez nous) */
  accountUrn: string;
  type: LinkedInConversionType;
  /** Fenêtre attribution post-click (jours). Défaut 90. Pour LEAD/PURCHASE/QUALIFIED_LEAD/SUBMIT_APPLICATION/ADD_TO_CART, 365 est aussi accepté. */
  postClickAttributionWindowSize?: 1 | 7 | 28 | 30 | 90 | 365;
  /** Fenêtre attribution view-through (jours). Défaut 30. */
  viewThroughAttributionWindowSize?: 1 | 7 | 30;
  /** Association auto aux 200 premières campagnes actives du compte */
  autoAssociateAllCampaigns?: boolean;
};

/** Crée une conversion rule + retourne l'URN au format `urn:lla:llaPartnerConversion:{id}`.
 *  À cacher en DB (AdAccount.meta.linkedinConversionRules) pour réutilisation. */
export async function createConversionRule(
  account: AdAccountInfo,
  input: CreateConversionRuleInput,
): Promise<{ id: number; urn: string }> {
  const url = input.autoAssociateAllCampaigns
    ? `${API}/rest/conversions?autoAssociationType=ALL_CAMPAIGNS`
    : `${API}/rest/conversions`;

  const body = {
    name: input.name,
    account: input.accountUrn,
    conversionMethod: "CONVERSIONS_API",
    postClickAttributionWindowSize: input.postClickAttributionWindowSize ?? 90,
    viewThroughAttributionWindowSize: input.viewThroughAttributionWindowSize ?? 30,
    attributionType: "LAST_TOUCH_BY_CAMPAIGN",
    type: input.type,
  };

  const r = await fetch(url, {
    method: "POST",
    headers: liHeaders(account.accessToken),
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) {
    throw new Error(`LinkedIn createConversionRule ${r.status}: ${text.slice(0, 400)}`);
  }
  // L'ID est retourné soit dans le header x-restli-id (parfois)
  // soit dans le body JSON `{ id }`. On gère les deux.
  let id: number | undefined;
  const restliId = r.headers.get("x-restli-id");
  if (restliId) id = Number(restliId);
  if (!id) {
    try {
      const j = JSON.parse(text) as { id?: number };
      id = j.id;
    } catch {
      // fallthrough
    }
  }
  if (!id) {
    throw new Error(`LinkedIn createConversionRule : impossible d'extraire l'ID (status ${r.status}, body : ${text.slice(0, 200)})`);
  }
  return { id, urn: `urn:lla:llaPartnerConversion:${id}` };
}

// ─── Stream single Conversion Event ─────────────────────────────────────────

/** Envoie UN event vers LinkedIn. Pour des volumes >1, préférer streamConversionEventsBatch. */
export async function streamConversionEvent(
  account: AdAccountInfo,
  conversionUrn: string,
  event: LinkedInConversionEvent,
): Promise<StreamResult> {
  const body: Record<string, unknown> = {
    conversion: conversionUrn,
    conversionHappenedAt: event.conversionHappenedAt,
    eventId: event.eventId,
    user: buildUserPayload(event.user),
  };
  if (event.value) {
    body.conversionValue = {
      currencyCode: event.value.currencyCode,
      amount: String(event.value.amount), // LinkedIn attend amount en string
    };
  }

  const r = await fetch(`${API}/rest/conversionEvents`, {
    method: "POST",
    headers: liHeaders(account.accessToken),
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) {
    return { ok: false, uploaded: 0, status: r.status, error: text.slice(0, 500) };
  }
  return { ok: true, uploaded: 1, status: r.status };
}

// ─── Stream Batch Conversion Events (max 5000) ──────────────────────────────

/** Envoie jusqu'à 5000 events en BATCH_CREATE. Tout-ou-rien : si UN record invalide,
 *  toute la batch est rejetée → resubmit après correction. */
export async function streamConversionEventsBatch(
  account: AdAccountInfo,
  conversionUrn: string,
  events: LinkedInConversionEvent[],
): Promise<StreamResult> {
  if (events.length === 0) return { ok: true, uploaded: 0 };
  if (events.length > 5000) {
    throw new Error(
      `LinkedIn BATCH_CREATE : max 5000 events/req (reçu ${events.length}). Batche côté caller.`,
    );
  }

  const elements = events.map((event) => {
    const el: Record<string, unknown> = {
      conversion: conversionUrn,
      conversionHappenedAt: event.conversionHappenedAt,
      eventId: event.eventId,
      user: buildUserPayload(event.user),
    };
    if (event.value) {
      el.conversionValue = {
        currencyCode: event.value.currencyCode,
        amount: String(event.value.amount),
      };
    }
    return el;
  });

  const r = await fetch(`${API}/rest/conversionEvents`, {
    method: "POST",
    headers: liHeaders(account.accessToken, "BATCH_CREATE"),
    body: JSON.stringify({ elements }),
  });
  const text = await r.text();
  if (!r.ok) {
    return { ok: false, uploaded: 0, status: r.status, error: text.slice(0, 500) };
  }
  return { ok: true, uploaded: events.length, status: r.status };
}
