// POST /api/email/campaigns/[id]/send : déclenche l'envoi d'une campaign
// (synchrone si <500 contacts, fire-and-forget sinon)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendCampaign } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

  const campaign = await prisma.emailCampaign.findFirst({
    where: { id, userId: user.id },
    select: { id: true, status: true },
  });
  if (!campaign) return NextResponse.json({ error: "Campaign introuvable" }, { status: 404 });
  if (campaign.status === "SENT" || campaign.status === "SENDING") {
    return NextResponse.json({ error: `Campaign déjà ${campaign.status}` }, { status: 409 });
  }

  try {
    const result = await sendCampaign(id);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
