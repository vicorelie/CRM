// Cron : sync tous les comptes pub (CONNECTED) toutes les heures.
import { NextResponse } from "next/server";
import { syncAccount } from "@/lib/ads/sync";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 600;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");
  return got === secret;
}

async function tick() {
  // ⚠️ Pas de `select` ici : syncAccount() consomme l'objet complet (accessToken,
  // refreshToken, tokenExpiresAt, meta, ...). Endpoint cron protégé par CRON_SECRET,
  // la réponse ne contient que { accountId, platform, ... } — jamais les tokens.
  const accounts = await prisma.adAccount.findMany({
    where: { status: "CONNECTED" },
    take: 50,
  });
  const results: Array<Record<string, unknown>> = [];
  for (const acc of accounts) {
    try {
      results.push({
        accountId: acc.id,
        platform: acc.platform,
        ...(await syncAccount(acc, 7)),
      });
    } catch (e) {
      results.push({
        accountId: acc.id,
        platform: acc.platform,
        error: e instanceof Error ? e.message : String(e),
      });
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
