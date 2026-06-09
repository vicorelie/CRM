// POST /api/ads/tiktok/events
//
// Proxy serveur vers l'Events API TikTok (équivalent de /api/capi/event pour Meta).
// Permet aux sites WanaPush et landing pages d'envoyer des événements TikTok
// côté serveur pour améliorer l'attribution (+19% événements capturés, -15% CPA).
//
// Déduplication : passer le même event_id dans le Pixel browser ET dans cet endpoint.
//
// Body : {
//   pixelCode: string           — pixel TikTok (depuis AdAccount.meta.pixelCode)
//   adAccountId?: string        — ID du compte pub WanaPush (pour résoudre le token)
//   eventName: TikTokStandardEvent
//   eventId: string             — UUID unique pour dédup
//   pageUrl: string
//   referrer?: string
//   ip?: string
//   userAgent?: string
//   email?: string              — EN CLAIR, hashé SHA-256 côté serveur
//   phone?: string              — EN CLAIR, hashé SHA-256 côté serveur
//   ttclid?: string
//   value?: number
//   currency?: string
//   contentType?: string
//   contentId?: string
//   quantity?: number
// }

import { NextResponse } from "next/server";
import { z } from "zod";
import { trackTikTokEvent, type TikTokStandardEvent } from "@/lib/ads/tiktok-events";

export const runtime = "nodejs";
export const maxDuration = 15;

const TikTokEventSchema = z.object({
  pixelCode: z.string().min(1),
  adAccountId: z.string().optional(),
  eventName: z.string().min(1) as z.ZodType<TikTokStandardEvent>,
  eventId: z.string().min(1),
  pageUrl: z.string().url(),
  referrer: z.string().optional(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  ttclid: z.string().optional(),
  value: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  contentType: z.string().optional(),
  contentId: z.string().optional(),
  quantity: z.number().int().positive().optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = TikTokEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // ⚠️ DÉPRÉCIÉ (audit C2) — utiliser /api/ads/tiktok/[slug]/events.
  // L'ancien comportement (résoudre le token depuis `adAccountId` du body) était
  // une faille BOLA : un appelant anonyme pouvait utiliser le token TikTok de
  // N'IMPORTE QUEL marchand. On NE résout plus de token par body : seul le token
  // d'environnement (non lié à un marchand) est accepté ici. `adAccountId` est ignoré.
  const accessToken = process.env.TIKTOK_EVENTS_ACCESS_TOKEN ?? "";

  if (!accessToken) {
    return NextResponse.json(
      {
        error:
          "Endpoint déprécié. Utiliser POST /api/ads/tiktok/[slug]/events (token résolu server-side via le propriétaire du site).",
      },
      { status: 410 },
    );
  }

  // Enrichir avec l'IP et User-Agent de la requête entrante si non fournis
  const clientIp = data.ip
    ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? undefined;
  const clientUa = data.userAgent
    ?? req.headers.get("user-agent")
    ?? undefined;

  const result = await trackTikTokEvent({
    pixelCode: data.pixelCode,
    accessToken,
    eventName: data.eventName,
    eventId: data.eventId,
    pageUrl: data.pageUrl,
    referrer: data.referrer,
    ip: clientIp,
    userAgent: clientUa,
    email: data.email,
    phone: data.phone,
    ttclid: data.ttclid,
    value: data.value,
    currency: data.currency,
    contentType: data.contentType,
    contentId: data.contentId,
    quantity: data.quantity,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.message ?? "Erreur TikTok Events API", code: result.code },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
