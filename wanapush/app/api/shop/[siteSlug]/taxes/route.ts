// GET  /api/shop/[siteSlug]/taxes
// POST /api/shop/[siteSlug]/taxes

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShopForUser } from "@/lib/shop";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  rate: z.coerce.number().min(0).max(100),
  country: z.string().trim().length(2),
  region: z.string().trim().max(80).optional(),
  appliesToShipping: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

type Params = { params: Promise<{ siteSlug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { siteSlug } = await params;
  const shop = await getShopForUser(session.user.email, siteSlug);
  if (!shop) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
  const taxes = await prisma.taxRate.findMany({
    where: { shopId: shop.id },
    orderBy: [{ position: "asc" }, { country: "asc" }],
  });
  return NextResponse.json({ taxes });
}

export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { siteSlug } = await params;
  const shop = await getShopForUser(session.user.email, siteSlug);
  if (!shop) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalide" },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const tax = await prisma.taxRate.create({
    data: {
      shopId: shop.id,
      name: input.name,
      rate: input.rate,
      country: input.country.toUpperCase(),
      region: input.region ?? null,
      appliesToShipping: input.appliesToShipping ?? false,
      enabled: input.enabled !== false,
    },
  });
  revalidatePath(`/shop/${siteSlug}/taxes`);
  return NextResponse.json({ tax });
}
