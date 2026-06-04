// GET  /api/shop/[siteSlug]/options       → liste les options de la boutique
// POST /api/shop/[siteSlug]/options       → crée une nouvelle option { name, values[] }

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShopForUser } from "@/lib/shop";
import { z } from "zod";

export const runtime = "nodejs";

type Params = { params: Promise<{ siteSlug: string }> };

// Value peut être un simple string OU un objet { value, color?, imageUrl? }
const valueSchema = z.union([
  z.string().min(1).max(80),
  z.object({
    value: z.string().min(1).max(80),
    color: z.string().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
  }),
]);
const createSchema = z.object({
  name: z.string().min(1).max(80),
  values: z.array(valueSchema).min(1).max(50),
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

export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { siteSlug } = await params;
  const shop = await getShopForUser(session.user.email, siteSlug);
  if (!shop) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });

  const options = await prisma.shopOption.findMany({
    where: { shopId: shop.id },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({
    options: options.map((o) => ({
      id: o.id,
      name: o.name,
      values: Array.isArray(o.values)
        ? (o.values as unknown[]).map((v) => typeof v === "string"
            ? { value: v, color: null, imageUrl: null }
            : v as { value: string; color: string | null; imageUrl: string | null })
        : [],
      position: o.position,
    })),
  });
}

export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { siteSlug } = await params;
  const shop = await getShopForUser(session.user.email, siteSlug);
  if (!shop) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const existing = await prisma.shopOption.findFirst({ where: { shopId: shop.id, name: parsed.data.name } });
  if (existing) return NextResponse.json({ error: `Une option "${parsed.data.name}" existe déjà.` }, { status: 409 });

  const lastPos = await prisma.shopOption.findFirst({
    where: { shopId: shop.id },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const normalized = normalizeValues(parsed.data.values);
  if (normalized.length === 0) return NextResponse.json({ error: "Aucune valeur valide" }, { status: 400 });

  const option = await prisma.shopOption.create({
    data: {
      shopId: shop.id,
      name: parsed.data.name.trim(),
      values: normalized,
      position: (lastPos?.position ?? -1) + 1,
    },
  });
  revalidatePath(`/shop/${siteSlug}/options`);
  return NextResponse.json({
    option: {
      id: option.id,
      name: option.name,
      values: normalized,
      position: option.position,
    },
  });
}
