import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const mediaSchema = z.object({
  url: z.string().url(),
  type: z.enum(["image", "video"]),
  alt: z.string().optional(),
});

const postSchema = z.object({
  caption: z.string().min(1).max(5000),
  media: z.array(mediaSchema).max(10).default([]),
  scheduledAt: z.string().datetime().or(z.string().min(1)),
  accountIds: z.array(z.string()).min(1, "Sélectionne au moins un compte"),
  options: z
    .object({
      firstComment: z.string().optional(),
      title: z.string().optional(),
      privacy: z.enum(["public", "unlisted", "private"]).optional(),
      hashtags: z.array(z.string()).optional(),
    })
    .optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const fromStr = url.searchParams.get("fromMs");
  const toStr = url.searchParams.get("toMs");
  const where: Record<string, unknown> = { user: { email: session.user.email } };
  if (status) where.status = status;
  if (fromStr && toStr) {
    const fromMs = Number(fromStr);
    const toMs = Number(toStr);
    if (Number.isFinite(fromMs) && Number.isFinite(toMs)) {
      where.scheduledAt = { gte: new Date(fromMs), lte: new Date(toMs) };
    }
  }
  const posts = await prisma.scheduledPost.findMany({
    where,
    include: {
      targets: {
        include: { account: { select: { id: true, platform: true, username: true, displayName: true, avatarUrl: true } } },
      },
    },
    orderBy: { scheduledAt: "asc" },
    take: 200,
  });
  return NextResponse.json({ posts });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: session.user.email },
    select: { id: true },
  });
  const accounts = await prisma.socialAccount.findMany({
    where: { id: { in: data.accountIds }, userId: user.id },
    select: { id: true, platform: true },
  });
  if (accounts.length !== data.accountIds.length) {
    return NextResponse.json({ error: "Compte invalide ou non possédé" }, { status: 400 });
  }

  const post = await prisma.scheduledPost.create({
    data: {
      userId: user.id,
      caption: data.caption,
      mediaUrls: data.media as never,
      scheduledAt: new Date(data.scheduledAt),
      options: (data.options as object | undefined) ?? undefined,
      status: "SCHEDULED",
      targets: {
        create: accounts.map((a) => ({
          accountId: a.id,
          platform: a.platform,
          status: "SCHEDULED",
        })),
      },
    },
    include: { targets: true },
  });
  revalidatePath("/social");
  return NextResponse.json({ post }, { status: 201 });
}
