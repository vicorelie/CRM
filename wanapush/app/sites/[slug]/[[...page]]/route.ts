// Route PUBLIQUE qui sert les sites générés par WanaPush.
//
// URL : https://wanapush.com/sites/<slug>/[page.html]
//   - /sites/my-site/                 → index.html
//   - /sites/my-site/services.html    → services.html
//   - /sites/my-site/contact          → contact.html (auto suffixe)
//
// Pas d'auth — sites destinés à être ciblés par les campagnes Meta Ads.
//
// Si un SitePixel est configuré et activé pour ce slug, on injecte
// dynamiquement le snippet Pixel + CAPI bridge dans le <head> à la volée
// (sans modifier le HTML stocké en DB — toggle instantané).
//
// Cache : `no-store` car le contenu peut changer (toggle pixel) — la perf
// reste correcte car le HTML est en JSON Prisma et l'injection est ~1ms.

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { injectPixelIntoHtml } from "@/lib/capi/pixel-script";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GeneratedPage = {
  path: string;
  title: string;
  html: string;
};

type Params = { params: { slug: string; page?: string[] } };

const SAFE_SLUG = /^[a-zA-Z0-9_-]{1,200}$/;
const SAFE_PAGE_PART = /^[a-zA-Z0-9._-]{1,200}$/;

function notFound(): NextResponse {
  return new NextResponse("Site introuvable", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function GET(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  const slug = params.slug;
  if (!slug || !SAFE_SLUG.test(slug)) return notFound();

  // Validation des segments de path (anti-traversal)
  const pageParts = params.page ?? [];
  for (const part of pageParts) {
    if (!SAFE_PAGE_PART.test(part)) return notFound();
  }

  // Lookup le site par slug + son éventuel SitePixel
  const site = await prisma.generatedSite.findUnique({
    where: { slug },
    select: {
      pages: true,
      sitePixel: {
        select: {
          enabled: true,
          pixelId: true,
          events: true,
          consentRequired: true,
        },
      },
    },
  });

  if (!site) return notFound();

  const pages = site.pages as unknown as GeneratedPage[];
  if (!Array.isArray(pages) || pages.length === 0) return notFound();

  // Résolution du chemin demandé
  // - / ou /index → index.html
  // - /services → services.html
  // - /services.html → services.html
  const requestedPath = pageParts.length > 0 ? pageParts.join("/") : "index.html";
  const normalizedPath = /\.[a-z0-9]{2,5}$/i.test(requestedPath)
    ? requestedPath
    : `${requestedPath}.html`;

  const page = pages.find((p) => p.path === normalizedPath);
  if (!page) {
    // Si pas trouvé en .html, on tente sans extension comme dossier (ex: /a/b/index.html)
    const fallback = pages.find((p) => p.path === `${requestedPath}/index.html`);
    if (!fallback) return notFound();
    return serveHtml(fallback.html, site.sitePixel, slug);
  }

  return serveHtml(page.html, site.sitePixel, slug);
}

function serveHtml(
  html: string,
  sitePixel: {
    enabled: boolean;
    pixelId: string;
    events: unknown;
    consentRequired: boolean;
  } | null,
  slug: string,
): NextResponse {
  let finalHtml = html;

  if (sitePixel && sitePixel.enabled) {
    const events = Array.isArray(sitePixel.events) ? (sitePixel.events as string[]) : [];
    try {
      finalHtml = injectPixelIntoHtml(html, {
        pixelId: sitePixel.pixelId,
        slug,
        events,
        consentRequired: sitePixel.consentRequired,
      });
    } catch (e) {
      // Si injection échoue (pixelId mal formé, slug invalide), on sert le HTML
      // brut sans bloquer le site. L'erreur est loguée pour debug.
      console.error("[sites/[slug]] failed to inject pixel", { slug, error: e });
    }
  }

  return new NextResponse(finalHtml, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, must-revalidate",
      // Robots : on laisse indexer (le client peut overrider via meta robots dans son HTML)
      "X-Robots-Tag": "all",
    },
  });
}
