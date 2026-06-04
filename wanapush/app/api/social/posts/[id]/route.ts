import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runScheduledPost } from "@/lib/social/publisher";

export const runtime = "nodejs";
export const maxDuration = 120;

type Params = { params: { id: string } };

async function ownedPost(email: string, id: string) {
  return prisma.scheduledPost.findFirst({
    where: { id, user: { email } },
    include: { targets: true },
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const post = await ownedPost(session.user.email, params.id);
  if (!post) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  // Empêcher la suppression si déjà publié sur certaines cibles
  await prisma.scheduledPost.delete({ where: { id: post.id } });
  revalidatePath("/social");
  return NextResponse.json({ ok: true });
}

// POST /api/social/posts/[id] → publication immédiate (manuelle)
export async function POST(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const post = await ownedPost(session.user.email, params.id);
  if (!post) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const result = await runScheduledPost(post.id);
  revalidatePath("/social");
  return NextResponse.json({ result });
}
