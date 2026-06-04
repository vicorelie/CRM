// GET  /api/shop          → liste des boutiques de l'utilisateur
// POST /api/shop          → crée une boutique pour un GeneratedSite donné

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureShopForSite } from "@/lib/shop";

export const runtime = "nodejs";

const createShopSchema = z.object({
  siteSlug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "siteSlug invalide"),
  name: z.string().trim().max(120).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const shops = await prisma.shop.findMany({
    where: { user: { email: session.user.email } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      siteSlug: true,
      name: true,
      currency: true,
      setupCompleted: true,
      setupStep: true,
      createdAt: true,
      _count: { select: { products: true, orders: true } },
    },
  });

  // Liste également les GeneratedSite qui n'ont PAS encore de Shop (= activables)
  const generatedSites = await prisma.generatedSite.findMany({
    where: { user: { email: session.user.email } },
    orderBy: { createdAt: "desc" },
    select: { id: true, brief: true, meta: true, createdAt: true },
  });

  const shopsBySlug = new Set(shops.map((s) => s.siteSlug));
  const activableSites = generatedSites
    .map((g) => {
      const meta = (g.meta ?? {}) as { siteSlug?: string; brandName?: string };
      const brief = (g.brief ?? {}) as { brandName?: string };
      const slug = meta.siteSlug;
      if (!slug || shopsBySlug.has(slug)) return null;
      return {
        siteSlug: slug,
        brandName: meta.brandName ?? brief.brandName ?? slug,
        createdAt: g.createdAt,
      };
    })
    .filter((x): x is { siteSlug: string; brandName: string; createdAt: Date } => x !== null);

  return NextResponse.json({ shops, activableSites });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const parsed = createShopSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalide" },
      { status: 400 },
    );
  }
  const { siteSlug, name } = parsed.data;

  // Note Phase 1 : on ne vérifie pas strictement le mapping siteSlug → GeneratedSite
  // (le slug vit dans meta JSON). Auth + format valide suffisent ici.

  const shop = await ensureShopForSite(session.user.email, siteSlug, name);

  revalidatePath("/shop");
  revalidatePath(`/shop/${siteSlug}`);
  return NextResponse.json({ shop });
}
