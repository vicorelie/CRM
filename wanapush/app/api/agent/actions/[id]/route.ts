// POST /api/agent/actions/[id]  body: { decision: "approve" | "dismiss" }
// Tranche une action de la file (audit immuable + correction-rate).

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveAction } from "@/lib/agent/actions";

export const runtime = "nodejs";

const BodySchema = z.object({ decision: z.enum(["approve", "dismiss"]) });

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "decision requis (approve|dismiss)" }, { status: 400 });

  const { id } = await params;
  const action = await resolveAction(user.id, id, parsed.data.decision);
  if (!action) return NextResponse.json({ error: "Action introuvable" }, { status: 404 });

  revalidatePath("/cockpit");
  return NextResponse.json({ ok: true, action });
}
