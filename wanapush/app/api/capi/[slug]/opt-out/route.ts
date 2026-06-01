// POST /api/capi/[slug]/opt-out
//
// Pose un cookie `wp-no-track=1` (expire dans 1 an) pour bloquer le tracking
// CAPI server-side ET client-side (le snippet JS respecte aussi ce cookie).
//
// Aussi disponible en GET pour les liens dans les emails / pied de page de site
// (`<a href="/api/capi/slug/opt-out?redirect=/sites/slug">Refuser le tracking</a>`).
//
// Réponse :
//   - GET avec ?redirect=<path>  → 302 redirect vers le path après pose du cookie
//   - GET sans redirect           → 200 JSON
//   - POST                        → 204 No Content

import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/** Construit le Set-Cookie header pour opt-out (1 an, SameSite=Lax, path=/) */
function optOutCookieHeader(): string {
  const oneYear = 60 * 60 * 24 * 365;
  return `wp-no-track=1; Max-Age=${oneYear}; Path=/; SameSite=Lax`;
}

/** Validation simple du redirect path : doit être un chemin relatif sécurisé. */
function safeRedirect(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  if (raw.includes("://")) return null;
  if (raw.length > 2048) return null;
  return raw;
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(
  _req: NextRequest,
  _ctx: { params: { slug: string } },
): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: { ...CORS_HEADERS, "Set-Cookie": optOutCookieHeader() },
  });
}

export async function GET(
  req: NextRequest,
  _ctx: { params: { slug: string } },
): Promise<NextResponse> {
  const redirect = safeRedirect(req.nextUrl.searchParams.get("redirect"));

  if (redirect) {
    const url = new URL(redirect, req.nextUrl.origin);
    return NextResponse.redirect(url, {
      status: 302,
      headers: { "Set-Cookie": optOutCookieHeader() },
    });
  }

  return NextResponse.json(
    { ok: true, message: "Tracking désactivé pour 1 an sur ce navigateur." },
    {
      status: 200,
      headers: { ...CORS_HEADERS, "Set-Cookie": optOutCookieHeader() },
    },
  );
}
