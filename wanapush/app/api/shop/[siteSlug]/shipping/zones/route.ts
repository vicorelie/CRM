// GET  /api/shop/[siteSlug]/shipping/zones  → liste zones avec methods
// POST /api/shop/[siteSlug]/shipping/zones  → crée une zone

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShopForUser } from "@/lib/shop";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  countries: z.array(z.string().trim().length(2)).max(250).default([]),
});

type Params = { params: Promise<{ siteSlug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { siteSlug } = await params;
  const shop = await getShopForUser(session.user.email, siteSlug);
  if (!shop) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
  const zones = await prisma.shippingZone.findMany({
    where: { shopId: shop.id },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: { methods: { orderBy: [{ position: "asc" }, { name: "asc" }] } },
  });
  return NextResponse.json({ zones });
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
  const { name, countries } = parsed.data;

  const zone = await prisma.shippingZone.create({
    data: {
      shopId: shop.id,
      name,
      countries: countries.map((c) => c.toUpperCase()),
    },
    include: { methods: true },
  });
  return NextResponse.json({ zone });
}
