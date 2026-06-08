// POST /api/ads/audience-sync/leads
// Sync tous les emails FormSubmission d'un site comme Custom Audience LEADS
// cross-platform (Meta + LinkedIn + TikTok). Crée/met à jour en parallèle.
// Optionnel : créer aussi une LLA Meta depuis ce seed.
//
// Body : { siteSlug: string, lookalike?: { ratio?, countryCode? } }
// Response : { syncId, results: [...], lookalike? }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  syncSiteLeadsToAudiences,
  createMetaLookalikeFromSeed,
} from "@/lib/ads/audience-sync";

export const runtime = "nodejs";
export const maxDuration = 120;

const BodySchema = z.object({
  siteSlug: z.string().min(1).max(80),
  lookalike: z
    .object({
      ratio: z.number().min(0.01).max(0.2).optional(),
      countryCode: z.string().length(2).optional(),
    })
    .optional(),
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
    return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // Résolution userId via siteSlug (GeneratedSite OU Shop)
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

  // Vérif que le siteSlug appartient bien à ce user
  const site = await prisma.generatedSite.findFirst({
    where: {
      userId: user.id,
      OR: [
        { slug: parsed.data.siteSlug },
        { meta: { path: "$.siteSlug", equals: parsed.data.siteSlug } },
      ],
    },
    select: { id: true },
  });
  const shop = site
    ? null
    : await prisma.shop.findFirst({
        where: { userId: user.id, siteSlug: parsed.data.siteSlug },
        select: { id: true },
      });
  if (!site && !shop) {
    return NextResponse.json({ error: "Site non autorisé" }, { status: 404 });
  }

  try {
    const sync = await syncSiteLeadsToAudiences(parsed.data.siteSlug, user.id);
    let lookalike = undefined;
    if (parsed.data.lookalike && sync.syncId) {
      lookalike = await createMetaLookalikeFromSeed(
        sync.syncId,
        parsed.data.lookalike.countryCode ?? "FR",
        parsed.data.lookalike.ratio ?? 0.01,
      );
    }
    return NextResponse.json({ syncId: sync.syncId, results: sync.results, lookalike });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
