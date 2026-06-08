// GET  /api/leads/webhooks : list user's webhooks
// POST /api/leads/webhooks : créer un webhook (URL + secret)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

export const runtime = "nodejs";

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url().max(500),
  secret: z.string().min(8).max(512),
  siteSlug: z.string().max(80).optional(),
  minTemperature: z.enum(["COLD", "WARM", "HOT"]).optional(),
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

  const webhooks = await prisma.leadWebhook.findMany({
    where: { userId },
    select: {
      id: true, name: true, url: true, siteSlug: true, minTemperature: true,
      enabled: true, totalFires: true, totalFails: true, lastFiredAt: true, lastError: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ webhooks });
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

  const webhook = await prisma.leadWebhook.create({
    data: {
      userId,
      name: parsed.data.name,
      url: parsed.data.url,
      secret: encrypt(parsed.data.secret),
      siteSlug: parsed.data.siteSlug,
      minTemperature: parsed.data.minTemperature,
    },
    select: { id: true, name: true, url: true },
  });
  return NextResponse.json({ webhook });
}
