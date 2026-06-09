// POST /api/ads/tiktok/[slug]/events
//
// Endpoint public slug-scoped pour l'Events API TikTok — équivalent de
// /api/capi/[slug]/event (Meta). Remplace l'ancien /api/ads/tiktok/events qui
// résolvait le token depuis un `adAccountId` fourni par le BODY (faille BOLA :
// audit C2 — n'importe qui pouvait utiliser le token d'un marchand arbitraire).
//
// Sécurité (modèle CAPI) :
//   - Le token TikTok est résolu SERVER-SIDE depuis le PROPRIÉTAIRE du site
//     (slug → GeneratedSite.userId → AdAccount TIKTOK_ADS du user). Jamais du body.
//   - Rate limit en mémoire (100/min/slug, 50/min/(slug,ip)), partagé avec la CAPI.
//   - pixelCode = donnée publique (pas un secret) : accepté du body ou de AdAccount.meta.
//   - PII (email/phone) en clair en entrée, hashées SHA-256 dans le connecteur.
//
// Dédup : passer le même event_id dans le Pixel browser ET ici.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { checkAndIncrement } from "@/lib/capi/rate-limit";
import { trackTikTokEvent, type TikTokStandardEvent } from "@/lib/ads/tiktok-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const TikTokEventSchema = z.object({
  // pixelCode = id public du pixel (pas un secret) → ok depuis le body ou AdAccount.meta.
  pixelCode: z.string().min(1).optional(),
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

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(
  req: Request,
  { params }: { params: { slug: string } },
): Promise<NextResponse> {
  const slug = params.slug;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400, headers: CORS_HEADERS });
  }

  const parsed = TikTokEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
      { status: 400, headers: CORS_HEADERS },
    );
  }
  const data = parsed.data;

  const clientIp = data.ip
    ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";

  // Rate limit (partagé avec la CAPI : sliding window par slug et par (slug, ip)).
  const rl = checkAndIncrement(`ttk:${slug}`, clientIp);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit" },
      { status: 429, headers: { ...CORS_HEADERS, "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  // Résolution OWNERSHIP : le token est lié au propriétaire du site, pas au body.
  const site = await prisma.generatedSite.findUnique({
    where: { slug },
    select: { userId: true },
  });
  if (!site) {
    // Disclosure minimale : on ne distingue pas "site inconnu" d'autre chose côté client.
    return NextResponse.json({ error: "Introuvable" }, { status: 404, headers: CORS_HEADERS });
  }

  const account = await prisma.adAccount.findFirst({
    where: { userId: site.userId, platform: "TIKTOK_ADS" },
    select: { accessToken: true, meta: true },
  });

  const accessToken = account?.accessToken
    ? decrypt(account.accessToken)
    : process.env.TIKTOK_EVENTS_ACCESS_TOKEN ?? "";
  const pixelCode =
    data.pixelCode ?? (account?.meta as { pixelCode?: string } | null)?.pixelCode ?? "";

  if (!accessToken || !pixelCode) {
    return NextResponse.json(
      { error: "TikTok non configuré pour ce site" },
      { status: 422, headers: CORS_HEADERS },
    );
  }

  const result = await trackTikTokEvent({
    pixelCode,
    accessToken,
    eventName: data.eventName,
    eventId: data.eventId,
    pageUrl: data.pageUrl,
    referrer: data.referrer,
    ip: clientIp === "unknown" ? undefined : clientIp,
    userAgent: data.userAgent ?? req.headers.get("user-agent") ?? undefined,
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
      { status: 502, headers: CORS_HEADERS },
    );
  }

  return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
}
