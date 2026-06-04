import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getConnector, platformConfigured, SUPPORTED_PLATFORMS } from "@/lib/social";
import { oauthRedirectUri } from "@/lib/social/redirect";
import { signState, safeReturnTo } from "@/lib/social/state";

export const runtime = "nodejs";

type Params = { params: { platform: string } };

export async function GET(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL ?? "http://localhost"));
  }

  const platform = params.platform.toUpperCase() as (typeof SUPPORTED_PLATFORMS)[number];
  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: `Plateforme non supportée : ${platform}` }, { status: 400 });
  }
  if (!platformConfigured(platform)) {
    return NextResponse.json(
      {
        error: `Plateforme non configurée. Ajouter les variables d'environnement OAuth pour ${platform}.`,
      },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { email: session.user.email },
    select: { id: true },
  });

  const returnTo = safeReturnTo(new URL(req.url).searchParams.get("returnTo"));
  const state = signState({ platform, userId: user.id, returnTo });
  const redirectUri = oauthRedirectUri(platform);
  const url = getConnector(platform).authorizeUrl(state, redirectUri);
  return NextResponse.redirect(url);
}
