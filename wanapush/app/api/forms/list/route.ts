import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseSiteBrief, parseSiteMeta } from "@/lib/generated-site-schema";

export const runtime = "nodejs";

// GET /api/forms/list?siteSlug=xxx  → toutes les soumissions du site (auth check)
// GET /api/forms/list               → toutes les soumissions des sites de l'utilisateur connecté
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const requestedSlug = searchParams.get("siteSlug")?.trim();

  // Récupère tous les siteSlug appartenant à l'utilisateur connecté
  const userSites = await prisma.generatedSite.findMany({
    where: { user: { email: session.user.email } },
    select: { id: true, brief: true, meta: true },
  });

  // Map siteSlug → { siteId, brandName } pour les sites possédés par l'utilisateur
  const ownedSlugs = new Map<string, { siteId: string; brandName: string }>();
  for (const s of userSites) {
    const meta = parseSiteMeta(s.meta);
    const brief = parseSiteBrief(s.brief);
    if (meta.siteSlug) {
      ownedSlugs.set(meta.siteSlug, { siteId: s.id, brandName: brief.brandName ?? "Sans nom" });
    }
  }

  if (ownedSlugs.size === 0) {
    return NextResponse.json({ submissions: [], sites: [] });
  }

  // Si un slug spécifique est demandé, vérifier qu'il appartient à l'utilisateur
  let slugsToFetch: string[];
  if (requestedSlug) {
    if (!ownedSlugs.has(requestedSlug)) {
      return NextResponse.json({ error: "Site introuvable ou non autorisé" }, { status: 403 });
    }
    slugsToFetch = [requestedSlug];
  } else {
    slugsToFetch = Array.from(ownedSlugs.keys());
  }

  const submissions = await prisma.formSubmission.findMany({
    where: { siteSlug: { in: slugsToFetch } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const enriched = submissions.map((s) => ({
    id: s.id,
    siteSlug: s.siteSlug,
    brandName: ownedSlugs.get(s.siteSlug)?.brandName ?? s.siteSlug,
    type: s.type,
    data: s.data,
    email: s.email,
    pageUrl: s.pageUrl,
    read: s.read,
    createdAt: s.createdAt,
  }));

  const sites = Array.from(ownedSlugs.entries()).map(([slug, info]) => ({
    siteSlug: slug,
    brandName: info.brandName,
  }));

  return NextResponse.json({ submissions: enriched, sites });
}
