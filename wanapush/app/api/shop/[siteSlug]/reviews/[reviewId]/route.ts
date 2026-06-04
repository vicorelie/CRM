// PATCH  /api/shop/[siteSlug]/reviews/[reviewId] → modère (status, reply)
// DELETE /api/shop/[siteSlug]/reviews/[reviewId] → supprime

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShopForUser } from "@/lib/shop";

export const runtime = "nodejs";

const patchSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  reply: z.string().trim().max(5000).optional(),
});

type Params = { params: Promise<{ siteSlug: string; reviewId: string }> };

async function owned(userEmail: string, siteSlug: string, reviewId: string) {
  const shop = await getShopForUser(userEmail, siteSlug);
  if (!shop) return null;
  const review = await prisma.review.findFirst({ where: { id: reviewId, shopId: shop.id } });
  return review ? { shop, review } : null;
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { siteSlug, reviewId } = await params;
  const o = await owned(session.user.email, siteSlug, reviewId);
  if (!o) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalide" },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const data: Record<string, unknown> = {};
  if (input.status) data.status = input.status;
  if (input.reply !== undefined) {
    data.reply = input.reply || null;
    if (input.reply) data.repliedAt = new Date();
  }
  const review = await prisma.review.update({ where: { id: reviewId }, data });
  return NextResponse.json({ review });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { siteSlug, reviewId } = await params;
  const o = await owned(session.user.email, siteSlug, reviewId);
  if (!o) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  await prisma.review.delete({ where: { id: reviewId } });
  return NextResponse.json({ ok: true });
}
