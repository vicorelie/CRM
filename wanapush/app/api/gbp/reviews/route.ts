// GET /api/gbp/reviews : liste les reviews DB (avec filtre status / starRating)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

  const url = new URL(req.url);
  const replyStatus = url.searchParams.get("replyStatus") as "PENDING" | "AUTO_REPLIED" | "MANUAL_REPLIED" | null;
  const minStars = Number(url.searchParams.get("minStars") ?? "1");
  const locationId = url.searchParams.get("locationId");

  const reviews = await prisma.gbpReview.findMany({
    where: {
      location: { account: { userId: user.id } },
      ...(replyStatus ? { replyStatus } : {}),
      ...(minStars > 1 ? { starRating: { gte: minStars } } : {}),
      ...(locationId ? { locationId } : {}),
    },
    select: {
      id: true, reviewerName: true, reviewerPhotoUrl: true, starRating: true,
      comment: true, createTime: true, replyText: true, replyStatus: true,
      replyAiConfidence: true,
      location: { select: { id: true, title: true } },
    },
    orderBy: { createTime: "desc" },
    take: 100,
  });
  return NextResponse.json({ reviews });
}
