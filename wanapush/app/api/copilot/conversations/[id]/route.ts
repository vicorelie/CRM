// GET    /api/copilot/conversations/[id] : full transcript de la conversation
// DELETE /api/copilot/conversations/[id] : supprime conversation + messages (cascade)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

async function getUserId(email: string): Promise<string | null> {
  const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return u?.id ?? null;
}

export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const userId = await getUserId(session.user.email);
  if (!userId) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

  const { id } = await params;
  const conv = await prisma.copilotConversation.findFirst({
    where: { id, userId },
    select: {
      id: true, title: true, messageCount: true, createdAt: true, updatedAt: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, role: true, content: true, toolUse: true, toolResult: true, createdAt: true },
      },
    },
  });
  if (!conv) return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  return NextResponse.json(conv);
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const userId = await getUserId(session.user.email);
  if (!userId) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

  const { id } = await params;
  const conv = await prisma.copilotConversation.findFirst({ where: { id, userId }, select: { id: true } });
  if (!conv) return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  await prisma.copilotConversation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
