// GET /api/storefront/[siteSlug]/paypal/config
// Renvoie la config PayPal publique d'une boutique pour le PayPal JS SDK côté
// storefront. Le `client-id` PayPal est PUBLISHABLE (destiné au navigateur) — il
// est déchiffré ici puis renvoyé ; le `secret` ne sort JAMAIS (il reste serveur).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

export const runtime = "nodejs";

const CORS = { "Access-Control-Allow-Origin": "*" };

type Params = { params: Promise<{ siteSlug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { siteSlug } = await params;
  const shop = await prisma.shop.findUnique({
    where: { siteSlug },
    select: { paypalClientId: true, currency: true },
  });
  if (!shop?.paypalClientId) {
    return NextResponse.json({ enabled: false }, { headers: CORS });
  }
  let clientId: string;
  try {
    clientId = decrypt(shop.paypalClientId);
  } catch {
    return NextResponse.json({ enabled: false }, { headers: CORS });
  }
  return NextResponse.json({ enabled: true, clientId, currency: shop.currency }, { headers: CORS });
}
