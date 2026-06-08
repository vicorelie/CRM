// POST /api/leads/rescore/[id]
// Force le re-scoring d'un lead (utile après mise à jour de message ou correction)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scoreLead } from "@/lib/leads/scoring";

export const runtime = "nodejs";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;

  // Ownership : le siteSlug doit appartenir à un GeneratedSite du user
  const submission = await prisma.formSubmission.findUnique({
    where: { id },
    select: { id: true, siteSlug: true, email: true, data: true, type: true },
  });
  if (!submission) return NextResponse.json({ error: "Lead introuvable" }, { status: 404 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

  const site = await prisma.generatedSite.findFirst({
    where: {
      userId: user.id,
      OR: [
        { slug: submission.siteSlug },
        { meta: { path: "$.siteSlug", equals: submission.siteSlug } },
      ],
    },
    select: { id: true },
  });
  if (!site) return NextResponse.json({ error: "Lead non autorisé" }, { status: 403 });

  const data = (submission.data as Record<string, unknown>) ?? {};
  const result = await scoreLead(submission.email, { ...data, type: submission.type });
  await prisma.formSubmission.update({
    where: { id: submission.id },
    data: {
      leadScore: result.score,
      leadTemperature: result.temperature,
      leadScoreReason: result.reason,
    },
  });

  return NextResponse.json(result);
}
