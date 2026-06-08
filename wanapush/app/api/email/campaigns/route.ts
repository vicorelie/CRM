// POST /api/email/campaigns : create campaign (DRAFT)
// GET  /api/email/campaigns : list campaigns

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const CreateSchema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().min(1).max(255),
  preheader: z.string().max(255).optional(),
  fromName: z.string().min(1).max(100),
  fromEmail: z.email().trim().toLowerCase().max(255),
  replyTo: z.email().optional(),
  bodyMarkdown: z.string().min(1).max(200_000),
  segment: z.object({
    tags: z.array(z.string()).optional(),
  }).optional(),
  scheduledAt: z.string().datetime().optional(),
  abVariantSubject: z.string().max(255).optional(),
  abSamplePercent: z.number().int().min(5).max(50).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

  const campaign = await prisma.emailCampaign.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      subject: parsed.data.subject,
      preheader: parsed.data.preheader,
      fromName: parsed.data.fromName,
      fromEmail: parsed.data.fromEmail,
      replyTo: parsed.data.replyTo,
      bodyMarkdown: parsed.data.bodyMarkdown,
      segmentJson: parsed.data.segment ?? {},
      status: parsed.data.scheduledAt ? "SCHEDULED" : "DRAFT",
      scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
      abVariantSubject: parsed.data.abVariantSubject,
      abSamplePercent: parsed.data.abSamplePercent,
    },
  });

  return NextResponse.json({ campaign: { id: campaign.id, status: campaign.status } });
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") as "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | "FAILED" | null;
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "20")));

  const campaigns = await prisma.emailCampaign.findMany({
    where: { userId: user.id, ...(status ? { status } : {}) },
    select: {
      id: true, name: true, subject: true, status: true, scheduledAt: true,
      sentAt: true, stats: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ campaigns });
}
