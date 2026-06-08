// GET /api/analytics/overview?days=30
// Dashboard founder unifié : KPIs cross-modules (Leads + Email + Ads + Shop +
// GBP + Unit Economics). Charge tout en parallèle.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOverview, defaultRange } from "@/lib/analytics/aggregators";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

  const url = new URL(req.url);
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days") ?? "30")));
  const range = defaultRange(days);

  try {
    const overview = await getOverview(user.id, range);
    return NextResponse.json(overview);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
