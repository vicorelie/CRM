// POST /api/shop/[siteSlug]/shipping/zones/[zoneId]/methods → crée une méthode

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShopForUser } from "@/lib/shop";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.enum(["FLAT", "WEIGHT_BASED", "PRICE_BASED", "FREE", "PICKUP"]),
  description: z.string().trim().max(500).optional(),
  carrier: z.string().trim().max(120).optional(),
  flatRate: z.coerce.number().min(0).optional(),
  rules: z.unknown().optional(),
  freeAboveAmount: z.coerce.number().min(0).optional(),
  estimatedDays: z.string().trim().max(40).optional(),
  enabled: z.boolean().optional(),
});

type Params = { params: Promise<{ siteSlug: string; zoneId: string }> };

export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { siteSlug, zoneId } = await params;
  const shop = await getShopForUser(session.user.email, siteSlug);
  if (!shop) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
  const zone = await prisma.shippingZone.findFirst({ where: { id: zoneId, shopId: shop.id } });
  if (!zone) return NextResponse.json({ error: "Zone introuvable" }, { status: 404 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalide" },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const method = await prisma.shippingMethod.create({
    data: {
      zoneId: zone.id,
      name: input.name,
      type: input.type,
      description: input.description ?? null,
      carrier: input.carrier ?? null,
      flatRate: input.flatRate ?? null,
      rules: (input.rules as never) ?? undefined,
      freeAboveAmount: input.freeAboveAmount ?? null,
      estimatedDays: input.estimatedDays ?? null,
      enabled: input.enabled !== false,
    },
  });
  return NextResponse.json({ method });
}
