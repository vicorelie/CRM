import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().trim().min(2, "Nom requis").max(120),
  type: z.enum(["META_ADS", "GOOGLE_ADS", "TIKTOK_ADS", "LINKEDIN_ADS"]),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"]).default("DRAFT"),
  budget: z.coerce.number().nonnegative().optional(),
  adAccountId: z.string().optional(),
  results: z.unknown().optional(),
});

async function getOrCreateDefaultBusiness(userEmail: string) {
  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!user) throw new Error("Utilisateur introuvable");

  const existing = await prisma.business.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  return prisma.business.create({
    data: {
      userId: user.id,
      name: user.name ?? user.email.split("@")[0],
    },
  });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const campaigns = await prisma.campaign.findMany({
    where: { business: { user: { email: session.user.email } } },
    orderBy: { updatedAt: "desc" },
    include: {
      adAccount: {
        select: { id: true, name: true, currency: true, status: true },
      },
      metrics: {
        select: {
          spend: true,
          impressions: true,
          clicks: true,
          conversions: true,
          revenue: true,
        },
      },
    },
  });

  // Agrège les métriques par campagne (sum sur la période stockée)
  const enriched = campaigns.map((c) => {
    const totals = c.metrics.reduce(
      (acc, m) => ({
        spend: acc.spend + m.spend,
        impressions: acc.impressions + m.impressions,
        clicks: acc.clicks + m.clicks,
        conversions: acc.conversions + m.conversions,
        revenue: acc.revenue + m.revenue,
      }),
      { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
    );
    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : null;
    const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : null;
    const cpa = totals.conversions > 0 ? totals.spend / totals.conversions : null;
    const roas = totals.spend > 0 ? totals.revenue / totals.spend : null;
    const { metrics, ...rest } = c;
    void metrics;
    return { ...rest, totals, ctr, cpc, cpa, roas };
  });

  return NextResponse.json({ campaigns: enriched });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 },
    );
  }

  const business = await getOrCreateDefaultBusiness(session.user.email);

  // Vérifie que l'adAccountId (si fourni) appartient bien à l'user
  let adAccountId: string | null = null;
  if (parsed.data.adAccountId) {
    const owned = await prisma.adAccount.findFirst({
      where: {
        id: parsed.data.adAccountId,
        user: { email: session.user.email },
        platform: parsed.data.type,
      },
      select: { id: true },
    });
    if (!owned)
      return NextResponse.json(
        { error: "Compte pub introuvable ou type incompatible" },
        { status: 400 },
      );
    adAccountId = owned.id;
  }

  const campaign = await prisma.campaign.create({
    data: {
      businessId: business.id,
      adAccountId,
      name: parsed.data.name,
      type: parsed.data.type,
      status: parsed.data.status,
      budget: parsed.data.budget,
      results: parsed.data.results === undefined ? undefined : (parsed.data.results as never),
    },
  });

  revalidatePath("/ads");
  return NextResponse.json({ campaign });
}
