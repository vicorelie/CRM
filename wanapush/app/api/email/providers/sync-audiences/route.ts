// POST /api/email/providers/sync-audiences
// Pousse les prospects (EmailContact) + clients boutique (Customer) dans des
// listes Brevo dédiées (upsert idempotent).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncAudiencesToBrevo } from "@/lib/email-providers/sync";
import { ProviderError } from "@/lib/email-providers";

export const runtime = "nodejs";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

  try {
    const result = await syncAudiencesToBrevo(user.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof ProviderError ? e.message : e instanceof Error ? e.message : "Erreur de synchronisation.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
