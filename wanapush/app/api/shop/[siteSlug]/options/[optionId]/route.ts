// PATCH /api/shop/[siteSlug]/options/[optionId] → modifie nom / values
// DELETE /api/shop/[siteSlug]/options/[optionId] → supprime l'option

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShopForUser } from "@/lib/shop";
import { z } from "zod";

export const runtime = "nodejs";

type Params = { params: Promise<{ siteSlug: string; optionId: string }> };

const valueSchema = z.union([
  z.string().min(1).max(80),
  z.object({
    value: z.string().min(1).max(80),
    color: z.string().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
  }),
]);
const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  values: z.array(valueSchema).min(1).max(50).optional(),
  position: z.number().int().min(0).optional(),
});

function normalizeValues(raw: Array<string | { value: string; color?: string | null; imageUrl?: string | null }>): Array<{ value: string; color: string | null; imageUrl: string | null }> {
  const out: Array<{ value: string; color: string | null; imageUrl: string | null }> = [];
  const seen = new Set<string>();
  for (const v of raw) {
    const obj = typeof v === "string" ? { value: v, color: null, imageUrl: null } : { value: v.value, color: v.color ?? null, imageUrl: v.imageUrl ?? null };
    const value = obj.value.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push({ value, color: obj.color, imageUrl: obj.imageUrl });
  }
  return out;
}

async function ownership(siteSlug: string, optionId: string, userEmail: string) {
  const shop = await getShopForUser(userEmail, siteSlug);
  if (!shop) return null;
  const option = await prisma.shopOption.findFirst({ where: { id: optionId, shopId: shop.id } });
  return option ? { shop, option } : null;
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { siteSlug, optionId } = await params;
  const owned = await ownership(siteSlug, optionId, session.user.email);
  if (!owned) return NextResponse.json({ error: "Option introuvable" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (parsed.data.name) data.name = parsed.data.name.trim();
  if (parsed.data.values) {
    const normalized = normalizeValues(parsed.data.values);
    if (normalized.length === 0) return NextResponse.json({ error: "Aucune valeur valide" }, { status: 400 });
    data.values = normalized;
  }
  if (parsed.data.position != null) data.position = parsed.data.position;

  const updated = await prisma.shopOption.update({ where: { id: optionId }, data });
  return NextResponse.json({
    option: {
      id: updated.id,
      name: updated.name,
      values: Array.isArray(updated.values)
        ? (updated.values as unknown[]).map((v) => typeof v === "string"
            ? { value: v, color: null, imageUrl: null }
            : v as { value: string; color: string | null; imageUrl: string | null })
        : [],
      position: updated.position,
    },
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { siteSlug, optionId } = await params;
  const owned = await ownership(siteSlug, optionId, session.user.email);
  if (!owned) return NextResponse.json({ error: "Option introuvable" }, { status: 404 });

  await prisma.shopOption.delete({ where: { id: optionId } });
  return NextResponse.json({ ok: true });
}
