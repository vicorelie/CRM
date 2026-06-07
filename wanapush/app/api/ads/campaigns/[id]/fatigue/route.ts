// GET /api/ads/campaigns/:id/fatigue
//
// Analyse la fatigue créative d'une campagne Meta sur les 7 derniers jours.
// Retourne fréquence, CPM, CTR et un niveau LOW/MEDIUM/HIGH/UNKNOWN.
// Réservé aux campagnes META_ADS — retourne 422 pour les autres types.
//
// Response : CreativeFatigueReport (cf. lib/ads/meta.ts)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCreativeFatigue } from "@/lib/ads/meta";
import { decrypt } from "@/lib/crypto";

export const runtime = "nodejs";
export const maxDuration = 20;

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const campaign = await prisma.campaign.findFirst({
    where: {
      id: params.id,
      business: { user: { email: session.user.email } },
    },
    select: {
      id: true,
      externalId: true,
      type: true,
      adAccount: {
        select: {
          id: true,
          platform: true,
          accessToken: true,
          refreshToken: true,
          tokenExpiresAt: true,
          meta: true,
          status: true,
          currency: true,
        },
      },
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
  }

  const platform = campaign.adAccount?.platform ?? campaign.type;
  if (platform !== "META_ADS") {
    return NextResponse.json(
      { error: "Creative Fatigue disponible uniquement pour Meta Ads" },
      { status: 422 },
    );
  }

  if (!campaign.externalId) {
    return NextResponse.json(
      { error: "Campagne non encore poussée sur Meta" },
      { status: 422 },
    );
  }

  if (!campaign.adAccount) {
    return NextResponse.json({ error: "Compte pub introuvable" }, { status: 404 });
  }

  const accountInfo = {
    ...campaign.adAccount,
    accessToken: decrypt(campaign.adAccount.accessToken),
    refreshToken: campaign.adAccount.refreshToken
      ? decrypt(campaign.adAccount.refreshToken)
      : undefined,
  };

  const report = await getCreativeFatigue(accountInfo as never, campaign.externalId);
  return NextResponse.json(report);
}
