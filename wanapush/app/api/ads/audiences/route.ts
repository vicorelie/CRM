// Bibliothèque d'audiences réutilisables (texte libre + tags + estimation taille).
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(3).max(2000),
  size: z.string().trim().max(40).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const audiences = await prisma.adAudience.findMany({
    where: { user: { email: session.user.email } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ audiences });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalide" },
      { status: 400 },
    );
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: session.user.email },
    select: { id: true },
  });
  const audience = await prisma.adAudience.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      description: parsed.data.description,
      size: parsed.data.size,
      tags: (parsed.data.tags as object | undefined) ?? undefined,
    },
  });
  revalidatePath("/ads");
  return NextResponse.json({ audience }, { status: 201 });
}
