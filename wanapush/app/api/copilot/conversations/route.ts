// GET /api/copilot/conversations : liste les conversations du user
// (paginé via cursor, ordre updatedAt desc)

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
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? "20")));
  const cursor = url.searchParams.get("cursor") ?? undefined;

  const conversations = await prisma.copilotConversation.findMany({
    where: { userId: user.id },
    select: { id: true, title: true, messageCount: true, lastMessageAt: true, createdAt: true },
    orderBy: { updatedAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = conversations.length > limit;
  const items = hasMore ? conversations.slice(0, limit) : conversations;
  return NextResponse.json({
    conversations: items,
    nextCursor: hasMore ? items[items.length - 1].id : null,
  });
}
