// GET    /api/email/providers  → statut de connexion (sans clé)
// DELETE /api/email/providers  → déconnecte le fournisseur actif

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

  const conn = await prisma.emailProviderConnection.findFirst({
    where: { userId: user.id, status: "CONNECTED" },
    select: { provider: true, accountEmail: true, accountName: true, plan: true, createdAt: true },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ connected: !!conn, connection: conn });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

  await prisma.emailProviderConnection.deleteMany({ where: { userId: user.id } });
  revalidatePath("/email");
  return NextResponse.json({ ok: true });
}
