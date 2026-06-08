// GET  /api/integrations/mcp/keys : list user's MCP API keys (sans révéler le token)
// POST /api/integrations/mcp/keys : génère une nouvelle key (retourne le token en clair UNE SEULE FOIS)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { genMcpToken } from "@/lib/mcp/auth";

export const runtime = "nodejs";

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.enum(["read", "read:write"]).optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

async function getUserId(email: string): Promise<string | null> {
  const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return u?.id ?? null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const userId = await getUserId(session.user.email);
  if (!userId) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

  const keys = await prisma.mcpApiKey.findMany({
    where: { userId },
    select: {
      id: true, name: true, tokenPrefix: true, scopes: true, enabled: true,
      totalCalls: true, lastUsedAt: true, lastError: true, expiresAt: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ keys });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const userId = await getUserId(session.user.email);
  if (!userId) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { token, hash, prefix } = genMcpToken();
  const expiresAt = parsed.data.expiresInDays
    ? new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const key = await prisma.mcpApiKey.create({
    data: {
      userId,
      name: parsed.data.name,
      tokenHash: hash,
      tokenPrefix: prefix,
      scopes: parsed.data.scopes ?? "read",
      expiresAt,
    },
    select: { id: true, name: true, tokenPrefix: true, scopes: true, expiresAt: true, createdAt: true },
  });

  // ⚠️ Le token n'est retourné qu'UNE SEULE FOIS (jamais re-affiché ensuite)
  return NextResponse.json({
    key,
    token,
    instructions: {
      note: "Garde ce token dans un endroit sûr. Il ne sera plus jamais affiché.",
      endpoint: `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://wanapush.com"}/api/mcp`,
      authHeader: `Authorization: Bearer ${token}`,
      mcpProtocolVersion: "2025-06-18",
    },
  });
}
