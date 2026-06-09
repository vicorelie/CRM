// Cron : publie tous les ScheduledPost dont scheduledAt <= now et status=SCHEDULED.
// Auth : header X-Cron-Secret = process.env.CRON_SECRET (à définir).
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runScheduledPost } from "@/lib/social/publisher";

export const runtime = "nodejs";
export const maxDuration = 300;

// Auth cron à temps constant (audit H10 : `===` = timing oracle sur le secret).
// Pattern de référence à répliquer sur les autres routes app/api/*/cron/*.
// On privilégie le header ; la query-string `?secret=` reste tolérée en fallback
// mais elle atterrit dans les logs nginx → préférer le header X-Cron-Secret.
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");
  if (!got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function tick() {
  const due = await prisma.scheduledPost.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
    select: { id: true },
    take: 25,
    orderBy: { scheduledAt: "asc" },
  });
  const results = [];
  for (const p of due) {
    try {
      results.push({ id: p.id, ...(await runScheduledPost(p.id)) });
    } catch (e) {
      results.push({ id: p.id, error: e instanceof Error ? e.message : String(e) });
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
