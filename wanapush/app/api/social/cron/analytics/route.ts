// Cron : récupère les métriques pour tous les posts publiés au cours des 30 derniers jours.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureFreshAccount, getConnector, toConnectorAccount } from "@/lib/social";

export const runtime = "nodejs";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");
  return got === secret;
}

async function tick() {
  const targets = await prisma.scheduledPostTarget.findMany({
    where: {
      status: "PUBLISHED",
      externalId: { not: null },
      publishedAt: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
    },
    include: { account: true },
    take: 200,
  });
  const results: Array<{ targetId: string; ok: boolean; error?: string }> = [];
  for (const t of targets) {
    if (!t.externalId) continue;
    try {
      const fresh = await ensureFreshAccount(t.account);
      const conn = getConnector(t.platform);
      if (!conn.fetchMetrics) continue;
      const m = await conn.fetchMetrics(toConnectorAccount(fresh), t.externalId);
      await prisma.postAnalytics.create({
        data: {
          accountId: t.accountId,
          platform: t.platform,
          externalId: t.externalId,
          metrics: m as never,
        },
      });
      results.push({ targetId: t.id, ok: true });
    } catch (e) {
      results.push({ targetId: t.id, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return results;
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ results: await tick() });
}
export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ results: await tick() });
}
