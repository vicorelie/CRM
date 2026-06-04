// Agrège les analytics pour le dashboard : par compte / plateforme / période.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RawMetrics = {
  impressions?: number;
  reach?: number;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
};

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const url = new URL(req.url);
  const days = Number(url.searchParams.get("days") ?? 30);
  const since = new Date(Date.now() - days * 24 * 3600 * 1000);

  const accounts = await prisma.socialAccount.findMany({
    where: { user: { email: session.user.email } },
    select: { id: true, platform: true, username: true, displayName: true, avatarUrl: true },
  });
  const ids = accounts.map((a) => a.id);
  if (ids.length === 0) return NextResponse.json({ totals: {}, byPlatform: [], byAccount: [] });

  // Pour chaque (account, externalId), prendre la dernière analytics
  const rows = await prisma.postAnalytics.findMany({
    where: { accountId: { in: ids }, fetchedAt: { gte: since } },
    orderBy: { fetchedAt: "desc" },
  });
  // dedupe par (accountId, externalId), garder le dernier
  const latestByPost = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const k = `${r.accountId}:${r.externalId}`;
    if (!latestByPost.has(k)) latestByPost.set(k, r);
  }

  const zero = () => ({
    impressions: 0,
    reach: 0,
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    posts: 0,
  });
  const totals = zero();
  const byPlatform: Record<string, ReturnType<typeof zero>> = {};
  const byAccount: Record<string, ReturnType<typeof zero>> = {};

  for (const r of Array.from(latestByPost.values())) {
    const m = (r.metrics as RawMetrics) ?? {};
    const platform = r.platform;
    if (!byPlatform[platform]) byPlatform[platform] = zero();
    if (!byAccount[r.accountId]) byAccount[r.accountId] = zero();
    for (const k of ["impressions", "reach", "views", "likes", "comments", "shares", "saves"] as const) {
      const v = Number(m[k] ?? 0);
      totals[k] += v;
      byPlatform[platform][k] += v;
      byAccount[r.accountId][k] += v;
    }
    totals.posts += 1;
    byPlatform[platform].posts += 1;
    byAccount[r.accountId].posts += 1;
  }

  return NextResponse.json({
    totals,
    byPlatform: Object.entries(byPlatform).map(([platform, m]) => ({ platform, ...m })),
    byAccount: accounts.map((a) => ({
      ...a,
      ...(byAccount[a.id] ?? zero()),
    })),
  });
}
