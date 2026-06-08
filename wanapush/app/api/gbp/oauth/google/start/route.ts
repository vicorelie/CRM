// GET /api/gbp/oauth/google/start
// Démarre le flow OAuth Google Business Profile.
// Redirige vers Google consent screen avec scope business.manage.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { signState } from "@/lib/social/state";
import { buildAuthorizeUrl } from "@/lib/gbp";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

  const url = new URL(req.url);
  const returnTo = url.searchParams.get("returnTo") ?? "/gbp";
  const state = signState({ platform: "gbp", userId: user.id, returnTo });

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? `${url.protocol}//${url.host}`;
  const redirectUri = `${base}/api/gbp/oauth/google/callback`;

  return NextResponse.redirect(buildAuthorizeUrl(state, redirectUri));
}
