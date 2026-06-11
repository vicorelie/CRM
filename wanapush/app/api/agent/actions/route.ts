// GET /api/agent/actions — régénère + retourne la file d'actions priorisées du user.
// POST sur /api/agent/actions/[id] pour trancher une action.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncActionsForUser } from "@/lib/agent/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

  const actions = await syncActionsForUser(user.id);
  return NextResponse.json({ actions });
}
