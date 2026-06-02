// GET /api/ads/meta/geo-search?adAccountId=<id>&q=<query>&types=country,city,...
//
// Recherche géographique Meta — proxy de l'endpoint Graph `/search?type=adgeolocation`.
// Renvoie countries / regions / cities / zips / subcities pour autocomplétion UI.
// Doc : https://developers.facebook.com/docs/marketing-api/audiences/reference/targeting-search

import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const META_GRAPH = "https://graph.facebook.com/v22.0";

type GeoItem = {
  key: string;
  name: string;
  type: string;
  country_code?: string;
  country_name?: string;
  region?: string;
  region_id?: number;
  supports_region?: boolean;
  supports_city?: boolean;
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const adAccountId = req.nextUrl.searchParams.get("adAccountId");
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const types =
    req.nextUrl.searchParams.get("types") ?? "country,region,city,zip,subcity";

  if (!adAccountId)
    return NextResponse.json({ error: "adAccountId requis" }, { status: 400 });
  if (!q || q.length < 2)
    return NextResponse.json({ error: "Tape au moins 2 caractères" }, { status: 400 });

  const adAccount = await prisma.adAccount.findFirst({
    where: {
      id: adAccountId,
      platform: "META_ADS",
      user: { email: session.user.email },
    },
    select: { accessToken: true, status: true },
  });

  if (!adAccount)
    return NextResponse.json({ error: "AdAccount introuvable" }, { status: 404 });

  let accessToken: string;
  try {
    accessToken = decrypt(adAccount.accessToken);
  } catch {
    return NextResponse.json({ error: "Échec déchiffrement token" }, { status: 500 });
  }

  // Meta exige location_types comme array dans le query string : ["country","region","city","zip"]
  const locationTypes = JSON.stringify(types.split(",").map((t) => t.trim()).filter(Boolean));
  const url = new URL(`${META_GRAPH}/search`);
  url.searchParams.set("type", "adgeolocation");
  url.searchParams.set("q", q);
  url.searchParams.set("location_types", locationTypes);
  url.searchParams.set("limit", "30");
  url.searchParams.set("access_token", accessToken);

  try {
    const r = await fetch(url.toString());
    const j = (await r.json()) as { data?: GeoItem[]; error?: { message?: string } };
    if (!r.ok) {
      return NextResponse.json(
        { error: j.error?.message ?? `Meta HTTP ${r.status}` },
        { status: 502 },
      );
    }
    return NextResponse.json({ results: j.data ?? [] });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur réseau Meta" },
      { status: 502 },
    );
  }
}
