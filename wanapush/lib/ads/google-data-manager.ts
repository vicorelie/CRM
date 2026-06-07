// Google Data Manager API — Enhanced Conversions for Leads (CRITIQUE juin 2026)
//
// ⚠️ DEADLINE 15 JUIN 2026 : à partir de cette date, les uploads via l'ancien
// `customers/{id}/conversionUploadService:uploadClickConversions` échouent pour
// les developer tokens qui n'ont pas envoyé de requête legacy entre janv-juin 2026.
// → Tous les nouveaux comptes WanaPush DOIVENT passer par Data Manager API.
//
// Endpoint : POST https://datamanager.googleapis.com/v1/events:ingest
// Scope OAuth : https://www.googleapis.com/auth/datamanager (SENSITIVE — Google
// OAuth verification requise pour la prod, OK en testing)
// Max 2000 events / requête. Batch via `events: [...]`.
//
// Format hash PII : SHA-256 sur valeur normalisée (lowercase + trim), encoded HEX.
// L'email/téléphone/nom doivent ABSOLUMENT être hashés avant envoi — sinon Google
// rejette la requête (et c'est aussi notre responsabilité GDPR).
//
// Doc :
// - https://developers.google.com/data-manager/api/devguides/events/send-events
// - https://support.google.com/google-ads/answer/15707550 (mise à jour 2026)
// - https://developers.google.com/data-manager/api/reference

import { createHash } from "crypto";
import type { AdAccountInfo } from "./types";

const DATA_MANAGER_API = "https://datamanager.googleapis.com/v1";

// ─── Types publics ───────────────────────────────────────────────────────────

/** Données utilisateur en CLAIR — hashées server-side avant envoi à Google. */
export type EnhancedConversionUser = {
  /** Email en clair (sera lowercase + trim + SHA-256 HEX) */
  email?: string;
  /** Téléphone E.164 en clair (ex: "+33612345678" — sera SHA-256 HEX) */
  phone?: string;
  /** Prénom en clair (sera normalisé : lowercase + sans diacritiques + SHA-256 HEX) */
  firstName?: string;
  /** Nom en clair (idem) */
  lastName?: string;
  /** Code pays ISO 3166-1 alpha-2 (ex: "FR") — PAS hashé */
  regionCode?: string;
  /** Code postal — PAS hashé */
  postalCode?: string;
};

/** Un event de conversion à uploader. Au moins un identifiant requis :
 *  soit `gclid`/`gbraid`/`wbraid` (click identifier), soit `user` (PII hashée). */
export type EnhancedConversionEvent = {
  /** ISO 8601 (ex: "2026-06-07T15:07:01Z") */
  eventTimestamp: string;
  /** ID unique pour dédup (recommandé : ID de la conversion en DB WanaPush) */
  transactionId: string;
  /** Source de l'event — WEB par défaut (CRM, APP_ANDROID, APP_IOS aussi possible) */
  eventSource?: "WEB" | "CRM" | "APP_ANDROID" | "APP_IOS";
  /** Valeur monétaire (ex: 49.99). Optionnel mais requis pour TARGET_ROAS. */
  conversionValue?: number;
  /** Code devise ISO 4217 (ex: "EUR") */
  currency?: string;
  /** Click identifiers Google — un de ces 3 est typique pour Web */
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  /** Données utilisateur en clair (hashées avant envoi) */
  user?: EnhancedConversionUser;
};

export type UploadConversionsResult = {
  ok: boolean;
  uploaded: number;
  /** Si validateOnly: true, c'est le dry-run de Google (validation sans persistance) */
  validateOnly?: boolean;
  /** Erreurs Google par event (si partial failure) */
  errors?: Array<{ index: number; message: string }>;
  /** Réponse brute (debug) */
  raw?: unknown;
};

// ─── Helpers de normalisation + hash ─────────────────────────────────────────
// Règles Google : tous les fields hashés doivent être lowercase + trim AVANT le
// SHA-256. Les noms sans diacritiques (é → e, ñ → n). Les téléphones E.164 sans
// espaces ni séparateurs.

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Email : lowercase + trim. Gmail : retire les "." et "+suffix" (recommandation Google) */
export function normalizeEmail(email: string): string {
  const lower = email.trim().toLowerCase();
  // Pour Gmail, retire les points avant @ et tout ce qui suit "+"
  const match = lower.match(/^([^@]+)@(gmail\.com|googlemail\.com)$/);
  if (match) {
    const local = match[1].replace(/\./g, "").split("+")[0];
    return `${local}@${match[2]}`;
  }
  return lower;
}

/** Téléphone : retire tout sauf chiffres et "+" initial. Doit être E.164 (avec préfixe pays). */
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim().replace(/[^\d+]/g, "");
  // Google exige le "+" initial pour E.164
  return trimmed.startsWith("+") ? trimmed : `+${trimmed}`;
}

/** Nom : lowercase + trim + retire diacritiques (é→e, ñ→n…) + retire chars non-alpha */
export function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // diacritiques
    .replace(/[^a-z]/g, ""); // chiffres, espaces, ponctuation
}

/** Construit le userIdentifier au format Data Manager API depuis les PII en clair. */
export function buildUserIdentifier(user: EnhancedConversionUser): Record<string, unknown> {
  const identifier: Record<string, unknown> = {};
  if (user.email) {
    identifier.emailAddress = sha256Hex(normalizeEmail(user.email));
  }
  if (user.phone) {
    identifier.phoneNumber = sha256Hex(normalizePhone(user.phone));
  }
  // address requires givenName + familyName (hashés) + regionCode + postalCode (en clair)
  if (user.firstName || user.lastName || user.regionCode || user.postalCode) {
    const address: Record<string, unknown> = {};
    if (user.firstName) address.givenName = sha256Hex(normalizeName(user.firstName));
    if (user.lastName) address.familyName = sha256Hex(normalizeName(user.lastName));
    if (user.regionCode) address.regionCode = user.regionCode.toUpperCase().slice(0, 2);
    if (user.postalCode) address.postalCode = user.postalCode.trim();
    identifier.address = address;
  }
  return identifier;
}

// ─── Auth Data Manager (scope séparé : datamanager) ──────────────────────────
// Le scope `datamanager` est ajouté au flux OAuth Google existant dans
// lib/ads/google.ts. Si un compte legacy n'a pas le scope, l'API renvoie 403 et
// l'user doit re-OAuth.

function appCreds() {
  const id = process.env.GOOGLE_ADS_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID;
  const secret =
    process.env.GOOGLE_ADS_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error(
      "GOOGLE_ADS_CLIENT_ID/SECRET (ou GOOGLE_CLIENT_ID/SECRET) requis pour Data Manager API",
    );
  }
  return { id, secret };
}

/** Refresh access token si expiré. Réutilise le refresh_token Google standard. */
async function refreshAccessToken(account: AdAccountInfo): Promise<string> {
  if (!account.refreshToken) {
    // Pas de refresh token — on retente avec le token actuel (potentiellement expiré)
    return account.accessToken;
  }
  if (account.tokenExpiresAt && account.tokenExpiresAt > new Date(Date.now() + 60_000)) {
    // Token encore valide pour 60+ secondes
    return account.accessToken;
  }
  const { id, secret } = appCreds();
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: account.refreshToken,
      client_id: id,
      client_secret: secret,
      grant_type: "refresh_token",
    }).toString(),
  });
  const j = (await r.json()) as { access_token?: string };
  return j.access_token ?? account.accessToken;
}

// ─── Upload events (Enhanced Conversions for Leads + Offline Conversions) ────

/** Upload jusqu'à 2000 events vers Google Data Manager API.
 *
 *  Paramètres :
 *  - `account` : AdAccountInfo Google Ads (avec accessToken/refreshToken déchiffrés)
 *  - `customerId` : numeric Google Ads customer ID (ex: "1234567890", PAS "customers/...")
 *  - `conversionActionId` : numeric ID de la ConversionAction (ex: "987654321")
 *  - `events` : liste des conversions à uploader (max 2000)
 *  - `validateOnly` : si true, Google valide sans persister (utile pour debug)
 */
export async function uploadConversionEvents(
  account: AdAccountInfo,
  customerId: string,
  conversionActionId: string,
  events: EnhancedConversionEvent[],
  options: { validateOnly?: boolean } = {},
): Promise<UploadConversionsResult> {
  if (events.length === 0) {
    return { ok: true, uploaded: 0, validateOnly: options.validateOnly };
  }
  if (events.length > 2000) {
    throw new Error(
      `Data Manager API : max 2000 events / requête (reçu ${events.length}). Batche côté caller.`,
    );
  }

  const accessToken = await refreshAccessToken(account);

  // Transforme les events WanaPush → format Data Manager API.
  // Au moins un identifiant requis par event (click identifier OU user data).
  const dmEvents = events.map((e) => {
    const dmEvent: Record<string, unknown> = {
      eventTimestamp: e.eventTimestamp,
      transactionId: e.transactionId,
      eventSource: e.eventSource ?? "WEB",
    };
    if (e.conversionValue !== undefined) {
      dmEvent.conversionValue = e.conversionValue;
    }
    if (e.currency) dmEvent.currency = e.currency;

    // adIdentifiers : un seul des 3 est typique (gclid prioritaire)
    const adIds: Record<string, string> = {};
    if (e.gclid) adIds.gclid = e.gclid;
    if (e.gbraid) adIds.gbraid = e.gbraid;
    if (e.wbraid) adIds.wbraid = e.wbraid;
    if (Object.keys(adIds).length > 0) dmEvent.adIdentifiers = adIds;

    // userData : PII hashée pour Enhanced Conversions
    if (e.user) {
      const userIdent = buildUserIdentifier(e.user);
      if (Object.keys(userIdent).length > 0) {
        dmEvent.userData = { userIdentifiers: [userIdent] };
      }
    }
    return dmEvent;
  });

  const body = {
    destinations: [
      {
        operatingAccount: { accountType: "GOOGLE_ADS", accountId: customerId },
        loginAccount: { accountType: "GOOGLE_ADS", accountId: customerId },
        productDestinationId: conversionActionId,
      },
    ],
    encoding: "HEX",
    events: dmEvents,
    validateOnly: options.validateOnly ?? false,
  };

  const r = await fetch(`${DATA_MANAGER_API}/events:ingest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await r.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }

  if (!r.ok) {
    // Format error Google : { error: { code, message, status, details: [...] } }
    const errObj = parsed as { error?: { message?: string; code?: number } };
    const message = errObj.error?.message ?? text.slice(0, 400);
    throw new Error(
      `Data Manager API events:ingest ${r.status} (${errObj.error?.code ?? "?"}): ${message}`,
    );
  }

  // Partial failure : Google peut accepter la requête mais refuser certains events
  const respObj = parsed as {
    requestId?: string;
    errors?: Array<{ index?: number; message?: string }>;
  };
  const errors = (respObj.errors ?? []).map((e) => ({
    index: e.index ?? -1,
    message: e.message ?? "Erreur sans détail",
  }));

  return {
    ok: errors.length === 0,
    uploaded: dmEvents.length - errors.length,
    validateOnly: options.validateOnly,
    errors: errors.length > 0 ? errors : undefined,
    raw: parsed,
  };
}
