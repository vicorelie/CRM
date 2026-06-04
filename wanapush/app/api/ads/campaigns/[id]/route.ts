import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"]).optional(),
  budget: z.coerce.number().nonnegative().optional(),
  results: z.unknown().optional(),
});

async function findOwnedCampaign(id: string, userEmail: string) {
  return prisma.campaign.findFirst({
    where: { id, business: { user: { email: userEmail } } },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const owned = await findOwnedCampaign(params.id, session.user.email);
  if (!owned) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 },
    );
  }

  const { results, ...rest } = parsed.data;
  const updated = await prisma.campaign.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(results !== undefined ? { results: results as never } : {}),
    },
  });

  revalidatePath("/ads");
  return NextResponse.json({ campaign: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const owned = await findOwnedCampaign(params.id, session.user.email);
  if (!owned) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await prisma.campaign.delete({ where: { id: params.id } });
  revalidatePath("/ads");
  return NextResponse.json({ ok: true });
}

// POST /api/ads/campaigns/[id] → duplique la campagne en DRAFT (sans externalId/lastSyncAt/metrics)
export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const owned = await findOwnedCampaign(params.id, session.user.email);
  if (!owned) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const dup = await prisma.campaign.create({
    data: {
      businessId: owned.businessId,
      name: `${owned.name} (copie)`,
      type: owned.type,
      status: "DRAFT",
      budget: owned.budget,
      dailyBudget: owned.dailyBudget,
      lifetimeBudget: owned.lifetimeBudget,
      objective: owned.objective,
      targeting: (owned.targeting as object | null) ?? undefined,
      results: (owned.results as object | null) ?? undefined,
    },
  });
  revalidatePath("/ads");
  return NextResponse.json({ campaign: dup }, { status: 201 });
}
