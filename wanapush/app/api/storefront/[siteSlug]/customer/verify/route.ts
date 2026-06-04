// GET /api/storefront/[siteSlug]/customer/verify?token=...
// Vérifie le token magic link, set le cookie session 30j, redirect vers le site.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyCustomerToken, signCustomerToken, cookieHeader, COOKIE_TTL_DAYS,
} from "@/lib/customer-auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ siteSlug: string }> };

export async function GET(req: Request, { params }: Params) {
  const { siteSlug } = await params;
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://wanatest.com";
  const fallback = `${base}/preview/${siteSlug}/?login=failed`;
  if (!token) return NextResponse.redirect(fallback);

  const data = verifyCustomerToken(token);
  if (!data) return NextResponse.redirect(fallback);

  // Vérifie que le shop correspond bien
  const shop = await prisma.shop.findUnique({ where: { siteSlug } });
  if (!shop || shop.id !== data.shopId) return NextResponse.redirect(fallback);

  // Vérifie que le customer existe encore
  const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
  if (!customer || customer.blocked) return NextResponse.redirect(fallback);

  // Re-signe un token longue durée pour la session
  const sessionToken = signCustomerToken(
    { customerId: customer.id, shopId: shop.id },
    COOKIE_TTL_DAYS * 86400,
  );

  const successUrl = `${base}/preview/${siteSlug}/?account=ok`;
  const res = NextResponse.redirect(successUrl);
  res.headers.set("Set-Cookie", cookieHeader(sessionToken));
  return res;
}
