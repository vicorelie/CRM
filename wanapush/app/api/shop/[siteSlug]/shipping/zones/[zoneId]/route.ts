// PATCH  /api/shop/[siteSlug]/shipping/zones/[zoneId]
// DELETE /api/shop/[siteSlug]/shipping/zones/[zoneId]

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShopForUser } from "@/lib/shop";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  countries: z.array(z.string().trim().length(2)).max(250).optional(),
  position: z.coerce.number().int().min(0).optional(),
});

type Params = { params: Promise<{ siteSlug: string; zoneId: string }> };

async function getOwned(userEmail: string, siteSlug: string, zoneId: string) {
  const shop = await getShopForUser(userEmail, siteSlug);
  if (!shop) return null;
  const zone = await prisma.shippingZone.findFirst({ where: { id: zoneId, shopId: shop.id } });
  if (!zone) return null;
  return { shop, zone };
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { siteSlug, zoneId } = await params;
  const owned = await getOwned(session.user.email, siteSlug, zoneId);
  if (!owned) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalide" },
      { status: 400 },
    );
  }
  const data: Record<string, unknown> = { ...parsed.data };
  if (Array.isArray(data.countries)) {
    data.countries = (data.countries as string[]).map((c) => c.toUpperCase());
  }
  const zone = await prisma.shippingZone.update({ where: { id: zoneId }, data });
  return NextResponse.json({ zone });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { siteSlug, zoneId } = await params;
  const owned = await getOwned(session.user.email, siteSlug, zoneId);
  if (!owned) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  await prisma.shippingZone.delete({ where: { id: zoneId } });
  return NextResponse.json({ ok: true });
}
