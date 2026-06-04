import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseSiteMeta } from "@/lib/generated-site-schema";

export const runtime = "nodejs";

const patchSchema = z.object({
  read: z.boolean().optional(),
});

async function checkOwnership(submissionId: string, userEmail: string) {
  const submission = await prisma.formSubmission.findUnique({ where: { id: submissionId } });
  if (!submission) return null;

  // Vérifier que le siteSlug appartient à l'utilisateur connecté
  const sites = await prisma.generatedSite.findMany({
    where: { user: { email: userEmail } },
    select: { meta: true },
  });
  const slugs = sites.map((s) => parseSiteMeta(s.meta).siteSlug).filter(Boolean);
  if (!slugs.includes(submission.siteSlug)) return null;
  return submission;
}

// PATCH /api/forms/{id}  → marquer comme lu
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const submission = await checkOwnership(id, session.user.email);
  if (!submission) {
    return NextResponse.json({ error: "Soumission introuvable" }, { status: 404 });
  }
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalide" },
      { status: 400 },
    );
  }
  const updated = await prisma.formSubmission.update({
    where: { id },
    data: { read: parsed.data.read ?? true },
  });
  revalidatePath("/leads");
  return NextResponse.json({ ok: true, read: updated.read });
}

// DELETE /api/forms/{id}
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const submission = await checkOwnership(id, session.user.email);
  if (!submission) {
    return NextResponse.json({ error: "Soumission introuvable" }, { status: 404 });
  }
  await prisma.formSubmission.delete({ where: { id } });
  revalidatePath("/leads");
  return NextResponse.json({ ok: true });
}
