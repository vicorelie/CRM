import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Params = { params: { id: string } };

const patchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().min(3).max(2000).optional(),
  size: z.string().trim().max(40).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});

async function owned(email: string, id: string) {
  return prisma.adAudience.findFirst({
    where: { id, user: { email } },
  });
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const a = await owned(session.user.email, params.id);
  if (!a) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalide" },
      { status: 400 },
    );
  const updated = await prisma.adAudience.update({
    where: { id: a.id },
    data: {
      ...parsed.data,
      tags:
        parsed.data.tags === undefined ? undefined : (parsed.data.tags as object),
    },
  });
  revalidatePath("/ads");
  return NextResponse.json({ audience: updated });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const a = await owned(session.user.email, params.id);
  if (!a) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  await prisma.adAudience.delete({ where: { id: a.id } });
  revalidatePath("/ads");
  return NextResponse.json({ ok: true });
}
