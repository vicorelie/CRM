// GET /api/ads/meta/pixels?adAccountId=<id>
//
// Liste les Pixels Meta disponibles pour un AdAccount donné de l'utilisateur
// connecté. Utilisé par l'UI de configuration SitePixel.

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
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const adAccountId = req.nextUrl.searchParams.get("adAccountId");
  if (!adAccountId) {
    return NextResponse.json({ error: "adAccountId requis" }, { status: 400 });
  }

  const adAccount = await prisma.adAccount.findFirst({
    where: {
      id: adAccountId,
      platform: "META_ADS",
      user: { email: session.user.email },
    },
    select: { id: true, externalId: true, accessToken: true, status: true },
  });

  if (!adAccount) {
    return NextResponse.json({ error: "AdAccount introuvable ou non autorisé" }, { status: 404 });
  }

  if (adAccount.status !== "CONNECTED") {
    return NextResponse.json(
      { error: `AdAccount en statut ${adAccount.status} — reconnectez-vous depuis /ads/setup` },
      { status: 409 },
    );
  }

  let accessToken: string;
  try {
    accessToken = decrypt(adAccount.accessToken);
  } catch {
    return NextResponse.json({ error: "Échec déchiffrement du token Meta" }, { status: 500 });
  }

  const result = await fetchPixelsForAdAccount(adAccount.externalId, accessToken);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, metaCode: result.metaCode, metaSubcode: result.metaSubcode },
      { status: 502 },
    );
  }

  return NextResponse.json({ pixels: result.pixels });
}
