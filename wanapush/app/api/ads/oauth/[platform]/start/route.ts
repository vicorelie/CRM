import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { AdPlatform } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import {
  adPlatformConfigured,
  getAdsConnector,
  SUPPORTED_AD_PLATFORMS,
} from "@/lib/ads";
import { prisma } from "@/lib/prisma";
import { signState, safeReturnTo } from "@/lib/social/state";

export const runtime = "nodejs";

type Params = { params: { platform: string } };

function adsRedirectUri(platform: string): string {
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, "");
  if (!base) throw new Error("NEXTAUTH_URL requis");
  return `${base}/api/ads/oauth/${platform.toLowerCase()}/callback`;
}

export async function GET(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.redirect(
      new URL("/login", process.env.NEXTAUTH_URL ?? "http://localhost"),
    );
  }
  const platform = params.platform.toUpperCase() as AdPlatform;
  if (!SUPPORTED_AD_PLATFORMS.includes(platform)) {
    return NextResponse.json(
      { error: `Plateforme non supportée : ${platform}` },
      { status: 400 },
    );
  }
  if (!adPlatformConfigured(platform)) {
    return NextResponse.json(
      { error: `Plateforme non configurée — ajouter les vars d'env OAuth pour ${platform}.` },
      { status: 400 },
    );
  }
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: session.user.email },
    select: { id: true },
  });
  const returnTo = safeReturnTo(new URL(req.url).searchParams.get("returnTo"));
  const state = signState({ platform: `ADS_${platform}`, userId: user.id, returnTo });
  const url = getAdsConnector(platform).authorizeUrl(state, adsRedirectUri(platform));
  return NextResponse.redirect(url);
}
