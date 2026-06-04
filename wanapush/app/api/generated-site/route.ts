import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseSiteBrief, parseSiteMeta } from "@/lib/generated-site-schema";

export const runtime = "nodejs";

type GeneratedPage = {
  path: string;
  title: string;
  html: string;
};

// GET /api/generated-site → liste des sites générés par l'utilisateur connecté
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const sites = await prisma.generatedSite.findMany({
    where: { user: { email: session.user.email } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      brief: true,
      meta: true,
      pages: true,
    },
  });

  const items = sites.map((s) => {
    const brief = parseSiteBrief(s.brief);
    const meta = parseSiteMeta(s.meta);
    const pages = (s.pages ?? []) as GeneratedPage[];
    const home = pages.find((p) => p.path === "index.html") ?? pages[0];
    return {
      id: s.id,
      createdAt: s.createdAt,
      brandName: brief.brandName ?? "Sans nom",
      sector: brief.sector ?? "",
      type: brief.type ?? "LANDING",
      framework: meta.framework ?? brief.framework ?? "html",
      primaryColor: brief.primaryColor ?? null,
      secondaryColor: brief.secondaryColor ?? null,
      designProfile: meta.designProfile ?? null,
      pageCount: pages.length,
      homeTitle: home?.title ?? "",
      siteSlug: meta.siteSlug ?? null,
      previewUrl: meta.previewUrl ?? null,
    };
  });

  return NextResponse.json({ sites: items });
}
