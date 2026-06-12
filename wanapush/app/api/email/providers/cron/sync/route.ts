// Cron quotidien — pour chaque connexion email active : sync des audiences
// (prospects + clients → Brevo) + snapshot des stats campagnes (30j).
//
// À planifier (ex: 5h, hors trafic) :
//   0 5 * * * curl -sS -H "x-cron-secret: $CRON_SECRET" https://wanapush.com/api/email/providers/cron/sync

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncAudiencesToBrevo } from "@/lib/email-providers/sync";
import { snapshotProviderStats } from "@/lib/email-providers/stats";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = req.headers.get("x-cron-secret") ?? "";
  const a = Buffer.from(got);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const connections = await prisma.emailProviderConnection.findMany({
    where: { status: "CONNECTED" },
    select: { id: true, userId: true },
  });

  let ok = 0;
  let failed = 0;
  for (const conn of connections) {
    try {
      await syncAudiencesToBrevo(conn.userId);
      await snapshotProviderStats(conn.userId);
      ok += 1;
    } catch (e) {
      failed += 1;
      await prisma.emailProviderConnection.update({
        where: { id: conn.id },
        data: { status: "ERROR", lastError: e instanceof Error ? e.message.slice(0, 500) : String(e) },
      });
    }
  }

  return NextResponse.json({ ok: true, processed: connections.length, succeeded: ok, failed });
}
