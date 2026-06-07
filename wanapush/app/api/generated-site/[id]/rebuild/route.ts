import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseSiteBrief, parseSiteMeta } from "@/lib/generated-site-schema";
import { extractAndBuildSite, isSiteBuilt, slugify } from "@/lib/site-extraction";
import { injectPixelIntoBuiltSite } from "@/lib/capi/inject-built-site";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * POST /api/generated-site/{id}/rebuild
 * Ré-extrait et rebuild le site React. Bloque jusqu'à la fin du build.
 * Renvoie l'URL du preview une fois prêt.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const site = await prisma.generatedSite.findFirst({
    where: { id, user: { email: session.user.email } },
    select: { id: true, brief: true, meta: true },
  });
  if (!site) {
    return NextResponse.json({ error: "Site introuvable" }, { status: 404 });
  }

  const brief = parseSiteBrief(site.brief);
  const meta = parseSiteMeta(site.meta);

  const framework = meta.framework ?? brief.framework ?? "html";
  if (framework !== "react") {
    return NextResponse.json({ error: "Ce site n'est pas un site React" }, { status: 400 });
  }

  if (!meta.reactFiles || Object.keys(meta.reactFiles).length === 0) {
    return NextResponse.json({ error: "Fichiers React manquants pour ce site" }, { status: 400 });
  }

  const siteSlug = meta.siteSlug ?? (brief.brandName ? slugify(brief.brandName) : null);
  if (!siteSlug) {
    return NextResponse.json({ error: "Slug du site introuvable" }, { status: 400 });
  }

  const result = await extractAndBuildSite(siteSlug, meta.reactFiles, { waitForBuild: true });
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Build échoué" }, { status: 500 });
  }

  // Mettre à jour le meta + slug si changé ou manquant
  const previewUrl = `https://wanapush.com/preview/${siteSlug}/`;
  const needsDbUpdate = meta.siteSlug !== siteSlug || meta.previewUrl !== previewUrl;
  const currentSlug = (await prisma.generatedSite.findUnique({ where: { id: site.id }, select: { slug: true } }))?.slug;
  if (needsDbUpdate || currentSlug !== siteSlug) {
    await prisma.generatedSite.update({
      where: { id: site.id },
      data: {
        slug: siteSlug,
        meta: { ...meta, siteSlug, previewUrl } as never,
      },
    });
  }

  // Ré-injecter le Pixel + CAPI si configuré (le build Vite écrase dist/index.html)
  const injectResult = await injectPixelIntoBuiltSite(site.id, siteSlug);
  if (!injectResult.ok) {
    console.error(`[rebuild] pixel inject failed for site ${site.id}:`, injectResult.reason);
  }

  revalidatePath("/generated-sites");
  return NextResponse.json({
    ok: true,
    siteSlug,
    previewUrl,
    alreadyBuilt: await isSiteBuilt(siteSlug),
    pixelInjected: injectResult.ok && injectResult.injected,
  });
}
