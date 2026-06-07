// TikTok Events API — équivalent serveur de la Meta Conversions API (CAPI).
//
// Endpoint : POST https://business-api.tiktok.com/open_api/v1.3/pixel/track/
// Auth     : Access-Token header (token généré dans Events Manager TikTok)
// Dédup    : event_id identique dans Pixel (browser) + Events API (serveur)
//            → TikTok déduplique sur une fenêtre de 48h
//
// Impact mesuré par TikTok : +19% événements capturés, -15% CPA moyen
// (source : TikTok Business API docs, juin 2026)
//
// Hashing PII : lowercase → trim → SHA-256 hex (même règle que Meta CAPI)

import { createHash } from "crypto";

const EVENTS_API = "https://business-api.tiktok.com/open_api/v1.3/pixel/track/";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TikTokStandardEvent =
  | "ViewContent"
  | "ClickButton"
  | "Search"
  | "AddToWishlist"
  | "AddToCart"
  | "InitiateCheckout"
  | "AddPaymentInfo"
  | "CompletePayment"
  | "PlaceAnOrder"
  | "Subscribe"
  | "Download"
  | "Contact"
  | "SubmitForm"
  | "CompleteRegistration";

export interface TikTokEventInput {
  pixelCode: string;
  /** Token Access-Token de l'Events Manager TikTok (chiffré en DB, déchiffré avant appel) */
  accessToken: string;
  eventName: TikTokStandardEvent;
  /** UUID unique pour déduplication avec le Pixel browser — OBLIGATOIRE */
  eventId: string;
  /** ISO 8601 ou timestamp Unix (secondes). Défaut : maintenant. */
  timestamp?: string | number;
  pageUrl: string;
  referrer?: string;
  /** IP du visiteur (non hashée — TikTok la hashe côté serveur) */
  ip?: string;
  userAgent?: string;
  /** Email EN CLAIR — sera hashé SHA-256 avant envoi */
  email?: string;
  /** Téléphone EN CLAIR (E.164 recommandé, ex: +33612345678) — sera hashé SHA-256 */
  phone?: string;
  /** TikTok Click ID présent dans le paramètre URL `ttclid` */
  ttclid?: string;
  /** Valeur monétaire de l'événement (ex: 49.99) */
  value?: number;
  currency?: string;
  /** Type de contenu pour les événements e-commerce (ex: "product") */
  contentType?: string;
  /** ID de produit ou SKU */
  contentId?: string;
  /** Quantité pour événements e-commerce */
  quantity?: number;
}

export interface TikTokEventsApiResponse {
  ok: boolean;
  code?: number;
  message?: string;
}

// ─── Hash helper ──────────────────────────────────────────────────────────────

function sha256(value: string): string {
  return createHash("sha256").update(value.toLowerCase().trim()).digest("hex");
}

// ─── trackTikTokEvent ─────────────────────────────────────────────────────────
// Envoie un événement serveur à l'Events API TikTok.
// Retourne ok:true si l'API accepte l'événement (code === 0).

export async function trackTikTokEvent(
  input: TikTokEventInput,
): Promise<TikTokEventsApiResponse> {
  // Timestamp : accepte ISO string ou Unix secondes, sinon Now
  let ts: string;
  if (typeof input.timestamp === "number") {
    ts = new Date(input.timestamp * 1000).toISOString();
  } else if (typeof input.timestamp === "string") {
    ts = input.timestamp;
  } else {
    ts = new Date().toISOString();
  }

  // Construction de l'objet user (uniquement les champs présents)
  const user: Record<string, string> = {};
  if (input.email) user.email = sha256(input.email);
  if (input.phone) user.phone_number = sha256(input.phone);
  if (input.ip) user.ip = input.ip;
  if (input.userAgent) user.user_agent = input.userAgent;
  if (input.ttclid) user.ttclid = input.ttclid;

  // Propriétés e-commerce (uniquement si présentes)
  const properties: Record<string, unknown> = {};
  if (input.value !== undefined) properties.value = input.value;
  if (input.currency) properties.currency = input.currency.toUpperCase();
  if (input.contentType) properties.content_type = input.contentType;
  if (input.contentId) properties.content_id = input.contentId;
  if (input.quantity !== undefined) properties.quantity = input.quantity;

  const payload = {
    pixel_code: input.pixelCode,
    event: input.eventName,
    event_id: input.eventId,
    timestamp: ts,
    context: {
      page: {
        url: input.pageUrl,
        ...(input.referrer ? { referrer: input.referrer } : {}),
      },
      ...(Object.keys(user).length > 0 ? { user } : {}),
    },
    ...(Object.keys(properties).length > 0 ? { properties } : {}),
  };

  try {
    const r = await fetch(EVENTS_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Token": input.accessToken,
      },
      body: JSON.stringify(payload),
    });
    const j = (await r.json()) as { code?: number; message?: string };
    if (j.code !== 0) {
      console.warn(`[tiktok-events] code=${j.code} message=${j.message}`);
      return { ok: false, code: j.code, message: j.message };
    }
    return { ok: true, code: 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[tiktok-events] Erreur réseau : ${message}`);
    return { ok: false, message };
  }
}

// ─── batchTrackTikTokEvents ───────────────────────────────────────────────────
// Envoie jusqu'à 1000 événements en une seule requête (limite API TikTok).

export interface TikTokBatchEventInput {
  pixelCode: string;
  accessToken: string;
  events: Array<Omit<TikTokEventInput, "pixelCode" | "accessToken">>;
}

export async function batchTrackTikTokEvents(
  input: TikTokBatchEventInput,
): Promise<TikTokEventsApiResponse> {
  const batch = input.events.slice(0, 1000);

  const dataItems = batch.map((ev) => {
    let ts: string;
    if (typeof ev.timestamp === "number") {
      ts = new Date(ev.timestamp * 1000).toISOString();
    } else if (typeof ev.timestamp === "string") {
      ts = ev.timestamp;
    } else {
      ts = new Date().toISOString();
    }

    const user: Record<string, string> = {};
    if (ev.email) user.email = sha256(ev.email);
    if (ev.phone) user.phone_number = sha256(ev.phone);
    if (ev.ip) user.ip = ev.ip;
    if (ev.userAgent) user.user_agent = ev.userAgent;
    if (ev.ttclid) user.ttclid = ev.ttclid;

    const properties: Record<string, unknown> = {};
    if (ev.value !== undefined) properties.value = ev.value;
    if (ev.currency) properties.currency = ev.currency.toUpperCase();
    if (ev.contentType) properties.content_type = ev.contentType;
    if (ev.contentId) properties.content_id = ev.contentId;
    if (ev.quantity !== undefined) properties.quantity = ev.quantity;

    return {
      pixel_code: input.pixelCode,
      event: ev.eventName,
      event_id: ev.eventId,
      timestamp: ts,
      context: {
        page: { url: ev.pageUrl, ...(ev.referrer ? { referrer: ev.referrer } : {}) },
        ...(Object.keys(user).length > 0 ? { user } : {}),
      },
      ...(Object.keys(properties).length > 0 ? { properties } : {}),
    };
  });

  try {
    const r = await fetch(EVENTS_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Token": input.accessToken,
      },
      body: JSON.stringify({ batch: dataItems }),
    });
    const j = (await r.json()) as { code?: number; message?: string };
    if (j.code !== 0) {
      console.warn(`[tiktok-events/batch] code=${j.code} message=${j.message}`);
      return { ok: false, code: j.code, message: j.message };
    }
    return { ok: true, code: 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[tiktok-events/batch] Erreur réseau : ${message}`);
    return { ok: false, message };
  }
}
