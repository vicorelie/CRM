// POST /api/ads/google/enhanced-conversions/upload
//
// Upload des Enhanced Conversions / Offline Conversions vers Google Data Manager API.
// Remplace l'ancien `customers/{id}/conversionUploadService:uploadClickConversions`
// qui est bloqué depuis le 15 juin 2026 pour les nouveaux developer tokens.
//
// Cas d'usage typiques :
//  - Lead form WanaPush : on stocke gclid à l'arrivée, puis on upload la conversion
//    quand le lead devient "qualifié" / "client" en CRM (offline conversion).
//  - E-commerce : on enrichit la conversion server-side avec PII hashée pour
//    booster l'attribution post-cookie (+5-15% conversions mesurées, -8-12% CPA).
//
// Body : {
//   adAccountId: string                   — AdAccount Google côté WanaPush
//   conversionActionId: string            — numeric ID de la ConversionAction Google
//   events: Array<{
//     eventTimestamp: string              — ISO 8601
//     transactionId: string               — unique pour dédup
//     eventSource?: "WEB" | "CRM" | "APP_ANDROID" | "APP_IOS"
//     conversionValue?: number
//     currency?: string
//     gclid?: string                       — au moins un identifiant requis
//     gbraid?: string
//     wbraid?: string
//     user?: {                             — PII EN CLAIR, hashée server-side
//       email?: string
//       phone?: string
//       firstName?: string
//       lastName?: string
//       regionCode?: string                — ISO alpha-2 (pas hashé)
//       postalCode?: string                — pas hashé
//     }
//   }>
//   validateOnly?: boolean                — dry-run Google (validation sans persistance)
// }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { uploadConversionEvents } from "@/lib/ads/google-data-manager";
import type { AdAccountInfo } from "@/lib/ads/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const EventSchema = z.object({
  eventTimestamp: z.string().min(1),
  transactionId: z.string().min(1).max(128),
  eventSource: z.enum(["WEB", "CRM", "APP_ANDROID", "APP_IOS"]).optional(),
  conversionValue: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  gclid: z.string().optional(),
  gbraid: z.string().optional(),
  wbraid: z.string().optional(),
  user: z
    .object({
      email: z.string().optional(),
      phone: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      regionCode: z.string().length(2).optional(),
      postalCode: z.string().optional(),
    })
    .optional(),
});

const BodySchema = z.object({
  adAccountId: z.string().min(1),
  conversionActionId: z.string().min(1),
  events: z.array(EventSchema).min(1).max(2000),
  validateOnly: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // Validation : chaque event doit avoir au moins un identifiant (gclid OU PII)
  const orphanIdx = data.events.findIndex((e) => {
    const hasClickId = !!(e.gclid ?? e.gbraid ?? e.wbraid);
    const hasUser =
      !!e.user &&
      !!(e.user.email ?? e.user.phone ?? e.user.firstName ?? e.user.lastName);
    return !hasClickId && !hasUser;
  });
  if (orphanIdx >= 0) {
    return NextResponse.json(
      {
        error: `Event #${orphanIdx} sans identifiant : il faut au moins gclid/gbraid/wbraid OU des PII (email/phone/name).`,
      },
      { status: 400 },
    );
  }

  // Charge l'AdAccount Google avec tokens chiffrés + customerId
  const adAccount = await prisma.adAccount.findFirst({
    where: {
      id: data.adAccountId,
      platform: "GOOGLE_ADS",
      user: { email: session.user.email },
    },
    select: {
      id: true,
      platform: true,
      accessToken: true,
      refreshToken: true,
      tokenExpiresAt: true,
      meta: true,
      currency: true,
      status: true,
    },
  });
  if (!adAccount) {
    return NextResponse.json(
      { error: "Compte Google Ads introuvable ou non autorisé" },
      { status: 404 },
    );
  }

  const customerId = (adAccount.meta as Record<string, unknown> | null)?.customerId as
    | string
    | undefined;
  if (!customerId) {
    return NextResponse.json(
      { error: "customerId manquant dans AdAccount.meta — re-synchroniser le compte" },
      { status: 422 },
    );
  }

  const accountInfo: AdAccountInfo = {
    externalId: `customers/${customerId}`,
    accessToken: decrypt(adAccount.accessToken),
    refreshToken: adAccount.refreshToken ? decrypt(adAccount.refreshToken) : undefined,
    tokenExpiresAt: adAccount.tokenExpiresAt ?? undefined,
    meta: (adAccount.meta as Record<string, unknown>) ?? {},
  };

  try {
    const result = await uploadConversionEvents(
      accountInfo,
      customerId,
      data.conversionActionId,
      data.events,
      { validateOnly: data.validateOnly },
    );
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Erreurs typiques :
    //  - 403 ACCESS_TOKEN_SCOPE_INSUFFICIENT : le compte n'a pas le scope datamanager
    //    → user doit re-OAuth (redirige vers /api/ads/oauth/google/start)
    //  - 400 INVALID_ARGUMENT : payload mal formé / event timestamp futur
    //  - 404 NOT_FOUND : conversionActionId inexistant pour ce customerId
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
