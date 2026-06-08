// POST /api/integrations/slack/[id]/test
// Envoie un message test "✅ Intégration WanaPush testée avec succès" pour
// valider que l'URL fonctionne après création.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pingSlackIntegration } from "@/lib/notifications/slack";

export const runtime = "nodejs";
export const maxDuration = 30;

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.slackIntegration.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Intégration introuvable" }, { status: 404 });

  const result = await pingSlackIntegration(id);
  if (result.ok) {
    await prisma.slackIntegration.update({
      where: { id },
      data: { totalSent: { increment: 1 }, lastSentAt: new Date(), lastError: null },
    });
    return NextResponse.json({ ok: true });
  }
  await prisma.slackIntegration.update({
    where: { id },
    data: {
      totalSent: { increment: 1 },
      totalFails: { increment: 1 },
      lastSentAt: new Date(),
      lastError: result.error?.slice(0, 1000),
    },
  });
  return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
}
