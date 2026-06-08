// PATCH /api/integrations/mcp/keys/[id] : toggle enabled, rename
// DELETE /api/integrations/mcp/keys/[id] : revoke (delete)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const PatchSchema = z.object({
  name: z.string().max(100).optional(),
  enabled: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

async function getUserId(email: string): Promise<string | null> {
  const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return u?.id ?? null;
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const userId = await getUserId(session.user.email);
  if (!userId) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

  const { id } = await params;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const existing = await prisma.mcpApiKey.findFirst({ where: { id, userId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Clé introuvable" }, { status: 404 });

  await prisma.mcpApiKey.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const userId = await getUserId(session.user.email);
  if (!userId) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.mcpApiKey.findFirst({ where: { id, userId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Clé introuvable" }, { status: 404 });

  await prisma.mcpApiKey.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
