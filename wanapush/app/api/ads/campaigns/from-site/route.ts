// POST /api/ads/campaigns/from-site
// Crée une campagne WanaPush en DB et la pousse immédiatement sur la plateforme
// à partir d'un site généré. Combine en 1 requête ce qui nécessite normalement
// POST /campaigns + POST /campaigns/:id/push.
//
// Payload :
//   siteId       — id du GeneratedSite source
//   adAccountId  — externalId du compte pub (act_XXX pour Meta, customers/XXX pour Google)
//   platform     — "META_ADS" | "GOOGLE_ADS"
//   objective    — "TRAFFIC" | "LEADS" | "CONVERSIONS" | "AWARENESS"
//   dailyBudget  — budget journalier en €
//   copyVariants — variantes copy IA (au moins 1)
//   countries    — codes pays ISO (défaut ["FR"])
//
// Retourne : { campaignId, externalId, externalUrl, resources }

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureFreshAdAccount, getAdsConnector, toAdAccountInfo } from "@/lib/ads";
import { parseSiteBrief, parseSiteMeta } from "@/lib/generated-site-schema";
import type { PushCampaignInput } from "@/lib/ads/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  siteId: z.string().min(1),
  adAccountId: z.string().min(3),
  platform: z.enum(["META_ADS", "GOOGLE_ADS"]),
  objective: z.enum(["TRAFFIC", "LEADS", "CONVERSIONS", "AWARENESS"]).default("TRAFFIC"),
  dailyBudget: z.coerce.number().positive().max(10_000),
  copyVariants: z
    .array(
      z.object({
        primaryText: z.string().max(125).optional(),
        headline: z.string().max(40).optional(),
        description: z.string().max(30).optional(),
        cta: z.string().max(40).optional(),
      }),
    )
    .min(1)
    .max(5),
  countries: z.array(z.string().length(2)).max(30).default(["FR"]),
  pixelId: z.string().max(64).optional(),
  imageUrl: z.string().url().max(2048).optional(),
});

// Mappe nos objectifs internes vers les codes natifs plateformes
const META_OBJECTIVE_MAP: Record<string, string> = {
  TRAFFIC: "LINK_CLICKS",
  LEADS: "LEAD_GENERATION",
  CONVERSIONS: "OUTCOME_SALES",
  AWARENESS: "REACH",
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalide" }, { status: 400 });

  const { siteId, adAccountId, platform, objective, dailyBudget, copyVariants, countries, pixelId, imageUrl } = parsed.data;

  // 1. Charger le site + pixel
  const site = await prisma.generatedSite.findFirst({
    where: { id: siteId, user: { email: session.user.email } },
    select: { id: true, brief: true, meta: true, sitePixel: { select: { pixelId: true } } },
  });
  if (!site) return NextResponse.json({ error: "Site introuvable" }, { status: 404 });

  const brief = parseSiteBrief(site.brief);
  const meta = parseSiteMeta(site.meta);
  const siteSlug = meta.siteSlug;
  const brandName = brief.brandName ?? "Campagne";
  const effectivePixelId = pixelId ?? site.sitePixel?.pixelId;

  // URL de destination : preview publique du site
  const baseUrl = (process.env.NEXTAUTH_URL ?? "https://wanapush.com").replace(/\/$/, "");
  const finalUrl = siteSlug ? `${baseUrl}/preview/${siteSlug}/` : undefined;

  // 2. Charger le compte pub
  const adAccount = await prisma.adAccount.findFirst({
    where: { externalId: adAccountId, user: { email: session.user.email }, platform },
    select: { id: true, platform: true, externalId: true, accessToken: true, refreshToken: true, tokenExpiresAt: true, scopes: true, meta: true, name: true, currency: true, timezone: true },
  });
  if (!adAccount) return NextResponse.json({ error: "Compte pub introuvable" }, { status: 404 });

  // 3. Business (créer si nécessaire — même logique que /api/ads/campaigns)
  const user = await prisma.user.findUniqueOrThrow({ where: { email: session.user.email }, select: { id: true, name: true } });
  const business = await prisma.business.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "asc" } })
    ?? await prisma.business.create({ data: { userId: user.id, name: user.name ?? session.user.email.split("@")[0] } });

  // 4. Créer la campagne en DB
  const campaignName = `${brandName} — ${platform === "META_ADS" ? "Meta" : "Google"} ${new Date().toLocaleDateString("fr-FR")}`;
  const campaign = await prisma.campaign.create({
    data: {
      businessId: business.id,
      adAccountId: adAccount.id,
      name: campaignName,
      type: platform,
      status: "DRAFT",
      dailyBudget,
      objective: META_OBJECTIVE_MAP[objective] ?? objective,
    },
  });

  // 5. Préparer le push
  const fresh = await ensureFreshAdAccount(adAccount as Parameters<typeof ensureFreshAdAccount>[0]);
  const conn = getAdsConnector(platform);
  if (!conn.pushCampaign) {
    await prisma.campaign.delete({ where: { id: campaign.id } });
    return NextResponse.json({ error: `Push non supporté pour ${platform}` }, { status: 501 });
  }

  const input: PushCampaignInput = {
    name: campaignName,
    dailyBudget,
    campaignType: META_OBJECTIVE_MAP[objective] ?? objective,
    finalUrl,
    countries,
    copyVariants,
    primaryText: copyVariants[0]?.primaryText,
    headlines: copyVariants[0]?.headline ? [copyVariants[0].headline] : undefined,
    descriptions: copyVariants[0]?.description ? [copyVariants[0].description] : undefined,
    cta: copyVariants[0]?.cta,
    pixelId: effectivePixelId,
    imageUrl,
    audienceDescription: (brief as Record<string, unknown>).audience as string | undefined,
    advantageAudience: true,
    advantageCreative: true,
  };

  const result = await conn.pushCampaign(toAdAccountInfo(fresh), input);

  if (!result.ok) {
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: "DRAFT", results: { lastPushError: result.error } as never },
    });
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  // 6. Persister l'externalId
  await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      externalId: result.externalId,
      status: "PAUSED",
      results: { pushedAt: new Date().toISOString(), siteId, resources: result.resources } as never,
    },
  });

  revalidatePath("/ads");
  revalidatePath("/generated-sites");

  return NextResponse.json({
    campaignId: campaign.id,
    externalId: result.externalId,
    externalUrl: result.externalUrl,
    resources: result.resources,
  }, { status: 201 });
}
