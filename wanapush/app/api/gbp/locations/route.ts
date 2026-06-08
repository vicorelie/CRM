// GET /api/gbp/locations : liste les locations DB du user
// POST /api/gbp/locations : trigger sync (refresh locations + reviews depuis Google)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncGbpAccount } from "@/lib/gbp";

export const runtime = "nodejs";
export const maxDuration = 300;

async function getUserId(email: string): Promise<string | null> {
  const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return u?.id ?? null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const userId = await getUserId(session.user.email);
  if (!userId) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

  const locations = await prisma.gbpLocation.findMany({
    where: { account: { userId } },
    select: {
      id: true, title: true, address: true, phoneNumber: true, websiteUri: true,
      primaryCategory: true, reviewsCount: true, averageRating: true,
      auditScore: true, lastSyncAt: true,
      account: { select: { id: true, accountName: true } },
    },
    orderBy: { lastSyncAt: "desc" },
  });
  return NextResponse.json({ locations });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const userId = await getUserId(session.user.email);
  if (!userId) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

  const accounts = await prisma.gbpAccount.findMany({
    where: { userId, status: "CONNECTED" },
    select: { id: true },
  });
  if (accounts.length === 0) {
    return NextResponse.json({ error: "Aucun compte GBP connecté — connecte-toi via /api/gbp/oauth/google/start" }, { status: 422 });
  }

  const results = [];
  for (const a of accounts) {
    try {
      const r = await syncGbpAccount(a.id);
      results.push({ accountId: a.id, ...r });
    } catch (e) {
      results.push({ accountId: a.id, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return NextResponse.json({ results });
}
