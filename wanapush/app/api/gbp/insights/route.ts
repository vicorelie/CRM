// GET /api/gbp/insights?locationId=...&days=30
// Fetch les insights Performance API v1 sur N derniers jours pour une location.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getValidAccessToken, fetchInsights } from "@/lib/gbp";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

  const url = new URL(req.url);
  const locationId = url.searchParams.get("locationId");
  const days = Math.min(180, Math.max(1, Number(url.searchParams.get("days") ?? "30")));

  if (!locationId) return NextResponse.json({ error: "locationId requis" }, { status: 400 });

  const location = await prisma.gbpLocation.findFirst({
    where: { id: locationId, account: { userId: user.id } },
    select: { id: true, googleLocationId: true, account: { select: { id: true } } },
  });
  if (!location) return NextResponse.json({ error: "Location introuvable" }, { status: 404 });

  try {
    const accessToken = await getValidAccessToken(location.account.id);
    const end = new Date();
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const daily = await fetchInsights(accessToken, location.googleLocationId, start, end);

    // Cache en DB (upsert par date)
    for (const d of daily) {
      const date = new Date(d.date);
      const m = d.metrics;
      const impressions =
        (m.BUSINESS_IMPRESSIONS_DESKTOP_MAPS ?? 0) +
        (m.BUSINESS_IMPRESSIONS_DESKTOP_SEARCH ?? 0) +
        (m.BUSINESS_IMPRESSIONS_MOBILE_MAPS ?? 0) +
        (m.BUSINESS_IMPRESSIONS_MOBILE_SEARCH ?? 0);
      await prisma.gbpInsight.upsert({
        where: { locationId_date: { locationId: location.id, date } },
        create: {
          locationId: location.id,
          date,
          impressions,
          websiteClicks: m.WEBSITE_CLICKS ?? 0,
          callClicks: m.CALL_CLICKS ?? 0,
          directionClicks: m.BUSINESS_DIRECTION_REQUESTS ?? 0,
          bookings: m.BUSINESS_BOOKINGS ?? 0,
          raw: m as never,
        },
        update: {
          impressions,
          websiteClicks: m.WEBSITE_CLICKS ?? 0,
          callClicks: m.CALL_CLICKS ?? 0,
          directionClicks: m.BUSINESS_DIRECTION_REQUESTS ?? 0,
          bookings: m.BUSINESS_BOOKINGS ?? 0,
          raw: m as never,
        },
      });
    }

    return NextResponse.json({ daily, count: daily.length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
