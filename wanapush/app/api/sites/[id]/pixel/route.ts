// CRUD configuration Pixel/CAPI pour un GeneratedSite.
//
// GET    /api/sites/[id]/pixel  → retourne la config actuelle (ou 404 si pas configuré)
// PUT    /api/sites/[id]/pixel  → upsert config { adAccountId, pixelId, capiAccessToken, events, ... }
// DELETE /api/sites/[id]/pixel  → désactive le tracking (delete cascade ne touche pas les events log)
//
// Sécurité :
//   - NextAuth requis
//   - L'utilisateur doit posséder le GeneratedSite (via userId)
//   - L'AdAccount lié doit appartenir au même utilisateur
//   - capiAccessToken chiffré via lib/crypto avant stockage

import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { STANDARD_EVENTS } from "@/lib/capi/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ────────────────────────────────────────────────────────────────────────────
// Schema validation
// ────────────────────────────────────────────────────────────────────────────

const StandardEventEnum = z.enum([...STANDARD_EVENTS] as [string, ...string[]]);

const PutBodySchema = z
  .object({
    adAccountId: z.string().min(1),
    pixelId: z.string().regex(/^\d{6,30}$/, "Pixel ID doit être numérique (6-30 chars)"),
    pixelName: z.string().max(200).optional(),
    capiAccessToken: z.string().min(1).max(500),
    testEventCode: z
      .string()
      .regex(/^TEST\d+$/, "Format TEST + chiffres (ex: TEST12345)")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    enabled: z.boolean().default(true),
    events: z.array(StandardEventEnum).min(1, "Au moins 1 event activé"),
    consentRequired: z.boolean().default(false),
  })
  .strict();

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

async function ensureSiteOwnership(siteId: string, userEmail: string) {
  const site = await prisma.generatedSite.findFirst({
    where: { id: siteId, user: { email: userEmail } },
    select: { id: true, slug: true },
  });
  if (!site) return null;
  return site;
}

async function ensureAdAccountOwnership(adAccountId: string, userEmail: string) {
  const adAccount = await prisma.adAccount.findFirst({
    where: { id: adAccountId, user: { email: userEmail }, platform: "META_ADS" },
    select: { id: true, status: true, name: true },
  });
  return adAccount;
}

// ────────────────────────────────────────────────────────────────────────────
// GET — retourne la config actuelle
// ────────────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const site = await ensureSiteOwnership(params.id, session.user.email);
  if (!site) return NextResponse.json({ error: "site introuvable" }, { status: 404 });

  const pixel = await prisma.sitePixel.findUnique({
    where: { generatedSiteId: site.id },
    select: {
      id: true,
      adAccountId: true,
      pixelId: true,
      pixelName: true,
      testEventCode: true,
      enabled: true,
      events: true,
      consentRequired: true,
      lastEventAt: true,
      lastErrorAt: true,
      lastError: true,
      createdAt: true,
      updatedAt: true,
      // capiAccessToken : volontairement NON exposé (sensible)
    },
  });

  return NextResponse.json({
    site: { id: site.id, slug: site.slug },
    pixel: pixel ?? null,
  });
}

// ────────────────────────────────────────────────────────────────────────────
// PUT — upsert la config
// ────────────────────────────────────────────────────────────────────────────

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const site = await ensureSiteOwnership(params.id, session.user.email);
  if (!site) return NextResponse.json({ error: "site introuvable" }, { status: 404 });
  if (!site.slug) {
    return NextResponse.json(
      { error: "Le site n'a pas de slug — impossible de configurer le tracking. Régénérez le site." },
      { status: 409 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "body JSON invalide" }, { status: 400 });
  }

  const result = PutBodySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "validation", details: z.treeifyError(result.error) }, { status: 400 });
  }
  const data = result.data;

  const adAccount = await ensureAdAccountOwnership(data.adAccountId, session.user.email);
  if (!adAccount) return NextResponse.json({ error: "AdAccount introuvable" }, { status: 404 });
  if (adAccount.status !== "CONNECTED") {
    return NextResponse.json(
      { error: `AdAccount en statut ${adAccount.status} — reconnectez-vous` },
      { status: 409 },
    );
  }

  const encryptedToken = encrypt(data.capiAccessToken);

  const pixel = await prisma.sitePixel.upsert({
    where: { generatedSiteId: site.id },
    create: {
      generatedSiteId: site.id,
      adAccountId: adAccount.id,
      pixelId: data.pixelId,
      pixelName: data.pixelName,
      capiAccessToken: encryptedToken,
      testEventCode: data.testEventCode,
      enabled: data.enabled,
      events: data.events as unknown as Prisma.InputJsonValue,
      consentRequired: data.consentRequired,
    },
    update: {
      adAccountId: adAccount.id,
      pixelId: data.pixelId,
      pixelName: data.pixelName,
      capiAccessToken: encryptedToken,
      testEventCode: data.testEventCode,
      enabled: data.enabled,
      events: data.events as unknown as Prisma.InputJsonValue,
      consentRequired: data.consentRequired,
    },
    select: {
      id: true,
      adAccountId: true,
      pixelId: true,
      pixelName: true,
      testEventCode: true,
      enabled: true,
      events: true,
      consentRequired: true,
      lastEventAt: true,
      lastErrorAt: true,
      lastError: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ pixel });
}

// ────────────────────────────────────────────────────────────────────────────
// DELETE — supprime la config (les CapiEvent log restent, cascade delete)
// ────────────────────────────────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const site = await ensureSiteOwnership(params.id, session.user.email);
  if (!site) return NextResponse.json({ error: "site introuvable" }, { status: 404 });

  await prisma.sitePixel.deleteMany({ where: { generatedSiteId: site.id } });
  return NextResponse.json({ ok: true });
}
