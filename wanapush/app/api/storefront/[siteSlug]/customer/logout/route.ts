// POST /api/storefront/[siteSlug]/customer/logout

import { NextResponse } from "next/server";
import { clearCookieHeader } from "@/lib/customer-auth";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", clearCookieHeader());
  return res;
}
