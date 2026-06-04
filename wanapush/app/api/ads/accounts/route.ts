import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { adPlatformConfigured, SUPPORTED_AD_PLATFORMS } from "@/lib/ads";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const accounts = await prisma.adAccount.findMany({
    where: { user: { email: session.user.email } },
    select: {
      id: true,
      platform: true,
      externalId: true,
      name: true,
      currency: true,
      timezone: true,
      status: true,
      tokenExpiresAt: true,
      connectedAt: true,
      lastError: true,
      meta: true,
    },
    orderBy: { connectedAt: "desc" },
  });
  const platforms = SUPPORTED_AD_PLATFORMS.map((p) => ({
    platform: p,
    configured: adPlatformConfigured(p),
  }));
  return NextResponse.json({ accounts, platforms });
}
