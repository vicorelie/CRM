// GET /api/ads/destination-options?adAccountId=<id>
//
// Liste les options de destination pour une campagne Meta Ads :
// - wanapushSites : sites WanaPush générés par l'user qui ont un SitePixel configuré
//   sur ce AdAccount (cas idéal : Pixel déjà installé, conversion tracking actif)
// - availablePixels : Pixels Meta disponibles sur l'AdAccount (pour Mode B et C)

import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { fetchPixelsForAdAccount } from "@/lib/capi/fetch-pixels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const adAccountId = req.nextUrl.searchParams.get("adAccountId");
  if (!adAccountId)
    return NextResponse.json({ error: "adAccountId requis" }, { status: 400 });

  const adAccount = await prisma.adAccount.findFirst({
    where: {
      id: adAccountId,
      platform: "META_ADS",
      user: { email: session.user.email },
    },
    select: { id: true, externalId: true, accessToken: true, status: true },
  });
  if (!adAccount)
    return NextResponse.json({ error: "AdAccount introuvable" }, { status: 404 });

  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "https://wanapush.com";

  // 1) Sites WanaPush de l'user (avec ou sans SitePixel pour ce AdAccount)
  const sites = await prisma.generatedSite.findMany({
    where: { user: { email: session.user.email } },
    select: {
      id: true,
      slug: true,
      brief: true,
      sitePixel: {
        where: { adAccountId },
        select: {
          pixelId: true,
          pixelName: true,
          events: true,
          enabled: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const wanapushSites = sites
    .filter((s) => s.slug)
    .map((s) => {
      const briefObj = (s.brief ?? {}) as { type?: string; sector?: string };
      const sitePixel = s.sitePixel;
      return {
        siteId: s.id,
        slug: s.slug as string,
        url: `${baseUrl}/preview/${s.slug}/`,
        type: briefObj.type ?? null,
        sector: briefObj.sector ?? null,
        pixelId: sitePixel?.pixelId ?? null,
        pixelName: sitePixel?.pixelName ?? null,
        pixelEnabled: sitePixel?.enabled ?? false,
        events: (sitePixel?.events as string[] | null) ?? [],
      };
    });

  // 2) Pixels disponibles sur l'AdAccount Meta (pour Mode B/C où user fournit l'URL externe)
  let availablePixels: Array<{ id: string; name: string }> = [];
  if (adAccount.status === "CONNECTED") {
    try {
      const accessToken = decrypt(adAccount.accessToken);
      const pxRes = await fetchPixelsForAdAccount(adAccount.externalId, accessToken);
      if (pxRes.ok) {
        availablePixels = pxRes.pixels.map((p) => ({ id: p.id, name: p.name }));
      }
    } catch {
      // silencieux : l'UI peut afficher liste vide
    }
  }

  return NextResponse.json({ wanapushSites, availablePixels });
}
