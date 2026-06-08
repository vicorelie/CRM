// POST /api/email/contacts : create un contact (consent via API direct = "manual")
// GET  /api/email/contacts  : list (paginé)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const CreateSchema = z.object({
  email: z.email().trim().toLowerCase().max(255),
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  source: z.string().max(255).optional(),
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

  const contact = await prisma.emailContact.upsert({
    where: { userId_email: { userId: user.id, email: parsed.data.email } },
    create: {
      userId: user.id,
      email: parsed.data.email,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      tags: parsed.data.tags ?? [],
      attributes: parsed.data.attributes ?? {},
      source: parsed.data.source ?? "manual",
      status: "ACTIVE",
      consentedAt: new Date(),
    },
    update: {
      firstName: parsed.data.firstName ?? undefined,
      lastName: parsed.data.lastName ?? undefined,
      tags: parsed.data.tags ?? undefined,
      attributes: parsed.data.attributes ?? undefined,
    },
  });

  return NextResponse.json({ contact: { id: contact.id, email: contact.email, status: contact.status } });
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") as "ACTIVE" | "UNSUBSCRIBED" | "BOUNCED" | "COMPLAINED" | "PENDING" | null;
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "50")));
  const cursor = url.searchParams.get("cursor") ?? undefined;

  const contacts = await prisma.emailContact.findMany({
    where: { userId: user.id, ...(status ? { status } : {}) },
    select: { id: true, email: true, firstName: true, lastName: true, tags: true, status: true, source: true, lastEngagedAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = contacts.length > limit;
  const items = hasMore ? contacts.slice(0, limit) : contacts;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return NextResponse.json({ contacts: items, nextCursor });
}
