// GET  /api/integrations/slack : list user's Slack integrations
// POST /api/integrations/slack : add a new incoming webhook integration

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

export const runtime = "nodejs";

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  webhookUrl: z.string().url().regex(/^https:\/\/hooks\.slack\.com\/services\//, "URL Slack incoming webhook attendue (https://hooks.slack.com/services/...)"),
  channelName: z.string().max(100).optional(),
  receiveAnomalyAlerts: z.boolean().optional(),
  receiveWeeklyDigest: z.boolean().optional(),
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

  const integrations = await prisma.slackIntegration.findMany({
    where: { userId },
    select: {
      id: true, name: true, channelName: true,
      receiveAnomalyAlerts: true, receiveWeeklyDigest: true, enabled: true,
      totalSent: true, totalFails: true, lastSentAt: true, lastError: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ integrations });
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

  const integration = await prisma.slackIntegration.create({
    data: {
      userId,
      name: parsed.data.name,
      webhookUrl: encrypt(parsed.data.webhookUrl),
      channelName: parsed.data.channelName,
      receiveAnomalyAlerts: parsed.data.receiveAnomalyAlerts ?? true,
      receiveWeeklyDigest: parsed.data.receiveWeeklyDigest ?? true,
    },
    select: { id: true, name: true, channelName: true },
  });
  return NextResponse.json({ integration });
}
