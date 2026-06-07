// Client HTTP vers Meta Conversions API (CAPI).
//
// Endpoint : POST https://graph.facebook.com/v25.0/<pixelId>/events
// Auth : access_token query param OU header (on utilise query param comme la doc Meta)
// Body : { data: ServerEvent[], test_event_code?, partner_agent? }
//
// Retry strategy : 3 tentatives avec backoff exponentiel (1s, 2s, 4s) sur erreurs
// transitoires (5xx, network). Pas de retry sur 4xx (erreurs logiques).
//
// Doc officielle : https://developers.facebook.com/docs/marketing-api/conversions-api

import type { CapiPayload, CapiResponse, ServerEvent } from "./types";

const META_GRAPH_VERSION = "v25.0";
const META_GRAPH_BASE = "https://graph.facebook.com";

/** Identifiant partenaire envoyé à Meta — utile pour le support et reporting. */
const PARTNER_AGENT = "wanapush-saas-1.0";

/** Configuration du retry. */
const RETRY = {
  maxAttempts: 3,
  baseDelayMs: 1000, // 1s, 2s, 4s
  maxDelayMs: 10000,
};

/**
 * Catégorise les erreurs Meta pour décider du retry et de la sévérité.
 */
export type CapiError = {
  category: "transient" | "auth" | "validation" | "rate_limit" | "unknown";
  retryable: boolean;
  message: string;
  status?: number;
  metaCode?: number;
  metaSubcode?: number;
  fbtraceId?: string;
};

/**
 * Résultat de l'envoi d'un batch d'events. Soit `ok: true` avec
 * `eventsReceived`, soit `ok: false` avec `error`.
 */
export type CapiSendResult =
  | {
      ok: true;
      eventsReceived: number;
      messages: string[];
      fbtraceId: string;
      attempts: number;
    }
  | {
      ok: false;
      error: CapiError;
      attempts: number;
    };

/**
 * Construit l'URL d'envoi events pour un Pixel donné.
 */
function buildEventsUrl(pixelId: string, accessToken: string): string {
  const url = new URL(`${META_GRAPH_BASE}/${META_GRAPH_VERSION}/${pixelId}/events`);
  url.searchParams.set("access_token", accessToken);
  return url.toString();
}

/**
 * Parse une réponse Meta (success ou error) en CapiError standardisée.
 */
function parseMetaError(status: number, body: unknown): CapiError {
  // Meta renvoie une structure standard {error: {message, type, code, error_subcode, fbtrace_id}}
  const errBody = (body as { error?: { message?: string; type?: string; code?: number; error_subcode?: number; fbtrace_id?: string } })?.error;

  if (errBody) {
    const code = errBody.code ?? 0;
    const subcode = errBody.error_subcode;

    // Codes Meta connus :
    //   190 = token invalide/expiré
    //   200/210 = permissions insuffisantes
    //   100 = paramètre invalide (validation)
    //   4 / 17 / 32 / 613 = rate limit
    //   1 / 2 = erreur transitoire serveur Meta
    let category: CapiError["category"] = "unknown";
    let retryable = false;

    if (code === 190 || code === 200 || code === 210) {
      category = "auth";
    } else if (code === 100 || (code >= 1500 && code <= 1599)) {
      category = "validation";
    } else if (code === 4 || code === 17 || code === 32 || code === 613) {
      category = "rate_limit";
      retryable = true;
    } else if (code === 1 || code === 2 || status >= 500) {
      category = "transient";
      retryable = true;
    }

    return {
      category,
      retryable,
      message: errBody.message ?? `Erreur Meta (code ${code})`,
      status,
      metaCode: code,
      metaSubcode: subcode,
      fbtraceId: errBody.fbtrace_id,
    };
  }

  // Pas de structure d'erreur Meta → 5xx ou crash
  if (status >= 500) {
    return {
      category: "transient",
      retryable: true,
      message: `Erreur serveur Meta (HTTP ${status})`,
      status,
    };
  }

  return {
    category: "unknown",
    retryable: false,
    message: `Erreur inconnue (HTTP ${status})`,
    status,
  };
}

/**
 * Sleep avec timer cleaning (compatible test runner).
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calcule le délai exponentiel avec jitter pour le retry n (1-indexed).
 */
function backoffDelay(attempt: number): number {
  const exponential = RETRY.baseDelayMs * Math.pow(2, attempt - 1);
  const capped = Math.min(exponential, RETRY.maxDelayMs);
  // Jitter : ±25% pour éviter le thundering herd
  const jitter = capped * 0.25 * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(capped + jitter));
}

/**
 * Envoie un batch d'events à Meta CAPI avec retry sur erreurs transitoires.
 *
 * @param pixelId     ID du Pixel Meta (numeric string ex: "1234567890")
 * @param accessToken CAPI access token (généré dans Meta Events Manager)
 * @param events      Tableau d'events (typiquement 1, mais Meta accepte jusqu'à 1000)
 * @param options     test_event_code pour tester sans pollution prod
 */
export async function sendEvents(
  pixelId: string,
  accessToken: string,
  events: ServerEvent[],
  options?: { testEventCode?: string; fetchImpl?: typeof fetch },
): Promise<CapiSendResult> {
  if (events.length === 0) {
    return {
      ok: false,
      error: {
        category: "validation",
        retryable: false,
        message: "Aucun event à envoyer (events vide)",
      },
      attempts: 0,
    };
  }

  const fetchFn = options?.fetchImpl ?? fetch;
  const url = buildEventsUrl(pixelId, accessToken);

  const payload: CapiPayload = {
    data: events,
    partner_agent: PARTNER_AGENT,
    ...(options?.testEventCode ? { test_event_code: options.testEventCode } : {}),
  };

  let lastError: CapiError | undefined;

  for (let attempt = 1; attempt <= RETRY.maxAttempts; attempt++) {
    try {
      const res = await fetchFn(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let body: CapiResponse | unknown;
      try {
        body = JSON.parse(text);
      } catch {
        // Réponse non-JSON (rare, mais possible en cas de 502 nginx upstream)
        lastError = {
          category: "transient",
          retryable: true,
          message: `Réponse non-JSON de Meta (HTTP ${res.status})`,
          status: res.status,
        };
        if (attempt < RETRY.maxAttempts) {
          await sleep(backoffDelay(attempt));
          continue;
        }
        return { ok: false, error: lastError, attempts: attempt };
      }

      if (res.ok && "events_received" in (body as object)) {
        const okBody = body as { events_received: number; messages: string[]; fbtrace_id: string };
        return {
          ok: true,
          eventsReceived: okBody.events_received,
          messages: okBody.messages ?? [],
          fbtraceId: okBody.fbtrace_id,
          attempts: attempt,
        };
      }

      const err = parseMetaError(res.status, body);
      lastError = err;

      if (!err.retryable || attempt >= RETRY.maxAttempts) {
        return { ok: false, error: err, attempts: attempt };
      }

      await sleep(backoffDelay(attempt));
    } catch (e) {
      // Erreur réseau (DNS, timeout, ECONNRESET)
      lastError = {
        category: "transient",
        retryable: true,
        message: e instanceof Error ? e.message : "Erreur réseau inconnue",
      };
      if (attempt >= RETRY.maxAttempts) {
        return { ok: false, error: lastError, attempts: attempt };
      }
      await sleep(backoffDelay(attempt));
    }
  }

  return {
    ok: false,
    error: lastError ?? {
      category: "unknown",
      retryable: false,
      message: "Toutes les tentatives ont échoué sans erreur capturée",
    },
    attempts: RETRY.maxAttempts,
  };
}

/** Helpers exportés pour tests. */
export const __testing = { buildEventsUrl, parseMetaError, backoffDelay, RETRY };
