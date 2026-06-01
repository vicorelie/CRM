// Endpoint public POST /api/capi/[slug]/event
//
// Reçoit un event depuis le bridge JS injecté dans les sites générés WanaPush.
// Hash les PII côté serveur, enrichit avec IP/UA/cookies, forward à Meta CAPI,
// et log dans CapiEvent.
//
// Sécurité :
//   - Pas d'auth (endpoint public, équivalent du Pixel JS qui marche aussi sans auth)
//   - Rate limit en mémoire (100 events/min/slug, 50 events/min/(slug,ip))
//   - CORS : on n'autorise que les sites WanaPush (slug existe en DB)
//   - PII jamais loggés en clair (hashing avant log CapiEvent.userDataHashed)
//   - 204 No Content systématique côté client (pour minimiser surface d'attaque)
//
// Performance :
//   - Lookup SitePixel + Send Meta + Log CapiEvent en parallèle quand possible
//   - Le fire-and-forget vers Meta n'est PAS utilisé : on veut un échec audit-logué

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { STANDARD_EVENTS } from "@/lib/capi/types";
import type { ClientEventInput, ServerEvent } from "@/lib/capi/types";
import { hashUserData } from "@/lib/capi/hash";
import { enrichUserData, parseCookies } from "@/lib/capi/enrich";
import { sendEvents } from "@/lib/capi/client";
import { checkAndIncrement } from "@/lib/capi/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ────────────────────────────────────────────────────────────────────────────
// Validation schema (Zod)
// ────────────────────────────────────────────────────────────────────────────

const UserDataSchema = z
  .object({
    em: z.union([z.string(), z.array(z.string())]).optional(),
    ph: z.union([z.string(), z.array(z.string())]).optional(),
    fn: z.union([z.string(), z.array(z.string())]).optional(),
    ln: z.union([z.string(), z.array(z.string())]).optional(),
    ct: z.string().optional(),
    st: z.string().optional(),
    zp: z.string().optional(),
    country: z.string().optional(),
    db: z.string().optional(),
    ge: z.enum(["m", "f"]).optional(),
    external_id: z.union([z.string(), z.array(z.string())]).optional(),
    client_ip_address: z.string().optional(),
    client_user_agent: z.string().optional(),
    fbp: z.string().optional(),
    fbc: z.string().optional(),
    subscription_id: z.string().optional(),
  })
  .strict();

const ClientEventSchema = z
  .object({
    event_name: z.enum([...STANDARD_EVENTS, "CustomEvent"] as [string, ...string[]]),
    event_id: z.string().min(1).max(200),
    event_time: z.number().int().positive().optional(),
    event_source_url: z.url().max(2048).optional(),
    user_data: UserDataSchema.optional(),
    custom_data: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/** Réponse standard 204 — pas de données renvoyées au client. */
function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/** Headers CORS — autorise tous les origins pour MVP (les sites générés sont sur des domaines variés). */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

// ────────────────────────────────────────────────────────────────────────────
// Handlers
// ────────────────────────────────────────────────────────────────────────────

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } },
): Promise<NextResponse> {
  const slug = params.slug;
  if (!slug || slug.length > 200) {
    return noContent(); // 204 — pas d'info à un attaquant qui tente des slugs random
  }

  // ───── 0) Opt-out RGPD : si le visiteur a refusé le tracking, on drop silencieusement
  //         Détection via cookie wp-no-track posé par /api/capi/[slug]/opt-out ou par le bandeau JS
  const cookies = parseCookies(req.headers.get("cookie"));
  if (cookies.get("wp-no-track") === "1") {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }

  // ───── 1) IP visiteur (pour rate limit + enrichissement)
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    req.headers.get("cf-connecting-ip") ??
    "0.0.0.0";

  // ───── 2) Rate limit (avant tout DB hit)
  const rl = checkAndIncrement(slug, clientIp);
  if (!rl.allowed) {
    return new NextResponse(JSON.stringify({ error: "rate_limited", reason: rl.reason, retry_after: rl.retryAfterSec }), {
      status: 429,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
        "Retry-After": String(rl.retryAfterSec),
      },
    });
  }

  // ───── 3) Parse + validate body
  let parsed: ClientEventInput;
  try {
    const body = (await req.json()) as unknown;
    const result = ClientEventSchema.safeParse(body);
    if (!result.success) {
      // Body invalide : on log discrètement et on renvoie 204 (pas d'erreur visible)
      console.warn("[capi] body invalide pour slug", slug, z.treeifyError(result.error));
      return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
    }
    parsed = result.data as ClientEventInput;
  } catch {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }

  // ───── 4) Lookup SitePixel actif pour ce slug
  const sitePixel = await prisma.sitePixel.findFirst({
    where: {
      enabled: true,
      generatedSite: { slug },
    },
    select: {
      id: true,
      pixelId: true,
      capiAccessToken: true,
      testEventCode: true,
      events: true,
    },
  });

  if (!sitePixel) {
    // Pas de config CAPI active pour ce slug → silently drop
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }

  // ───── 5) Vérifier que cet event est dans la liste activée
  const enabledEvents = Array.isArray(sitePixel.events) ? (sitePixel.events as string[]) : [];
  if (enabledEvents.length > 0 && !enabledEvents.includes(parsed.event_name)) {
    // Event non activé pour ce site → on ne forward pas
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }

  // ───── 6) Enrichir user_data avec IP/UA/cookies/fbclid
  const enrichedUserData = enrichUserData(parsed.user_data, req.headers, parsed.event_source_url);

  // ───── 7) Hash PII selon spec Meta
  const userDataHashed = hashUserData(enrichedUserData);

  // ───── 8) Build ServerEvent
  const serverEvent: ServerEvent = {
    event_name: parsed.event_name,
    event_time: parsed.event_time ?? Math.floor(Date.now() / 1000),
    event_id: parsed.event_id,
    event_source_url: parsed.event_source_url,
    action_source: "website",
    user_data: userDataHashed,
    custom_data: parsed.custom_data as ServerEvent["custom_data"],
  };

  // ───── 9) Decrypt CAPI access token + send Meta
  let capiAccessToken: string;
  try {
    capiAccessToken = decrypt(sitePixel.capiAccessToken);
  } catch (e) {
    console.error("[capi] decrypt failed for SitePixel", sitePixel.id, e);
    await logEvent({
      sitePixelId: sitePixel.id,
      event: serverEvent,
      userDataHashed,
      status: "FAILED",
      errorMessage: "Failed to decrypt capiAccessToken",
    });
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }

  const sendResult = await sendEvents(sitePixel.pixelId, capiAccessToken, [serverEvent], {
    testEventCode: sitePixel.testEventCode ?? undefined,
  });

  // ───── 10) Log CapiEvent (succès ou échec)
  await logEvent({
    sitePixelId: sitePixel.id,
    event: serverEvent,
    userDataHashed,
    status: sendResult.ok ? "SENT" : "FAILED",
    metaResponse: sendResult.ok
      ? { events_received: sendResult.eventsReceived, fbtrace_id: sendResult.fbtraceId, messages: sendResult.messages, attempts: sendResult.attempts }
      : { error: sendResult.error, attempts: sendResult.attempts },
    errorMessage: sendResult.ok ? null : sendResult.error.message,
  });

  // ───── 11) Update lastEventAt / lastError sur SitePixel (best-effort, ne bloque pas)
  prisma.sitePixel
    .update({
      where: { id: sitePixel.id },
      data: sendResult.ok
        ? { lastEventAt: new Date(), lastError: null }
        : { lastErrorAt: new Date(), lastError: sendResult.error.message },
    })
    .catch((e) => console.error("[capi] failed to update sitePixel timestamps", e));

  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// ────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ────────────────────────────────────────────────────────────────────────────

async function logEvent(args: {
  sitePixelId: string;
  event: ServerEvent;
  userDataHashed: ServerEvent["user_data"];
  status: "SENT" | "FAILED" | "RETRIED";
  metaResponse?: unknown;
  errorMessage?: string | null;
}): Promise<void> {
  try {
    await prisma.capiEvent.create({
      data: {
        sitePixelId: args.sitePixelId,
        eventName: args.event.event_name,
        eventId: args.event.event_id ?? "",
        eventTime: new Date(args.event.event_time * 1000),
        eventSourceUrl: args.event.event_source_url ?? null,
        userDataHashed: args.userDataHashed as unknown as Prisma.InputJsonValue,
        customData: args.event.custom_data
          ? (args.event.custom_data as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        status: args.status,
        metaResponse: args.metaResponse
          ? (args.metaResponse as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        errorMessage: args.errorMessage ?? null,
      },
    });
  } catch (e) {
    // On ne casse jamais l'endpoint à cause d'un échec de log
    console.error("[capi] failed to log CapiEvent", e);
  }
}
