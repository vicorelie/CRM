import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { platformConfigured, SUPPORTED_PLATFORMS } from "@/lib/social";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const accounts = await prisma.socialAccount.findMany({
    where: { user: { email: session.user.email } },
    select: {
      id: true,
      platform: true,
      accountId: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      status: true,
      tokenExpiresAt: true,
      connectedAt: true,
      lastError: true,
      meta: true,
    },
    orderBy: { connectedAt: "desc" },
  });
  const platforms = SUPPORTED_PLATFORMS.map((p) => ({
    platform: p,
    configured: platformConfigured(p),
  }));
  return NextResponse.json({ accounts, platforms });
}
