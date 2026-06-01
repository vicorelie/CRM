// Push une campagne WanaPush DRAFT vers la plateforme native (Google Ads, Meta, etc.)
// Crée la campagne en mode PAUSED par sécurité — l'user l'active manuellement.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { ensureFreshAdAccount, getAdsConnector, toAdAccountInfo } from "@/lib/ads";
import type { PushCampaignInput } from "@/lib/ads/types";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 120;

const inputSchema = z.object({
  dailyBudget: z.coerce.number().positive(),
  campaignType: z.string().optional(),
  biddingStrategy: z.string().optional(),
  biddingTarget: z.coerce.number().positive().optional(),
  finalUrl: z.url().max(2048).optional(),
  countries: z.array(z.string().length(2)).optional(),
  keywords: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(80),
        matchType: z.enum(["BROAD", "PHRASE", "EXACT"]),
      }),
    )
    .max(50)
    .optional(),
  headlines: z.array(z.string().max(30)).max(15).optional(),
  descriptions: z.array(z.string().max(90)).max(4).optional(),
  primaryText: z.string().max(2000).optional(),
  cta: z.string().max(40).optional(),
  audienceDescription: z.string().max(2000).optional(),
  imageUrl: z.url().max(2048).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const campaign = await prisma.campaign.findFirst({
    where: { id: params.id, business: { user: { email: session.user.email } } },
    include: { adAccount: true },
  });
  if (!campaign)
    return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
  if (!campaign.adAccount)
    return NextResponse.json(
      { error: "Cette campagne n'est liée à aucun compte pub" },
      { status: 400 },
    );
  if (campaign.externalId)
    return NextResponse.json(
      { error: `Campagne déjà publiée (id externe ${campaign.externalId})` },
      { status: 400 },
    );

  const parsed = inputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalide" },
      { status: 400 },
    );

  const fresh = await ensureFreshAdAccount(campaign.adAccount);
  const conn = getAdsConnector(fresh.platform);
  if (!conn.pushCampaign)
    return NextResponse.json(
      {
        error: `Le push de campagne n'est pas encore implémenté pour ${fresh.platform}.`,
      },
      { status: 501 },
    );

  const input: PushCampaignInput = {
    name: campaign.name,
    ...parsed.data,
  };
  const result = await conn.pushCampaign(toAdAccountInfo(fresh), input);
  if (!result.ok) {
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: "DRAFT",
        results: {
          ...(campaign.results as object | null),
          lastPushError: result.error,
          lastPushAttempt: new Date().toISOString(),
        } as never,
      },
    });
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  // Persist external link + dailyBudget + targeting
  const updated = await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      externalId: result.externalId,
      status: "PAUSED",
      dailyBudget: parsed.data.dailyBudget,
      objective: parsed.data.campaignType,
      targeting: {
        countries: parsed.data.countries ?? [],
        keywords: parsed.data.keywords ?? [],
        finalUrl: parsed.data.finalUrl,
        biddingStrategy: parsed.data.biddingStrategy,
        biddingTarget: parsed.data.biddingTarget,
        headlines: parsed.data.headlines ?? [],
        descriptions: parsed.data.descriptions ?? [],
      } as never,
      results: {
        ...(campaign.results as object | null),
        pushedAt: new Date().toISOString(),
        externalUrl: result.externalUrl,
        resources: result.resources,
      } as never,
      lastSyncAt: new Date(),
    },
  });

  return NextResponse.json({ campaign: updated, externalUrl: result.externalUrl });
}
