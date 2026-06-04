// GET /api/storefront/[siteSlug]/sitemap → sitemap.xml dynamique
// Référence l'accueil + chaque produit ACTIF + chaque catégorie.
// Le site généré peut redirect /sitemap.xml vers cet endpoint via nginx.

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Params = { params: Promise<{ siteSlug: string }> };

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
}

export async function GET(_req: Request, { params }: Params) {
  const { siteSlug } = await params;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://wanatest.com";
  const siteUrl = `${base}/preview/${siteSlug}`;

  const shop = await prisma.shop.findUnique({ where: { siteSlug } });
  const urls: Array<{ loc: string; lastmod?: string; changefreq?: string; priority?: number }> = [
    { loc: siteUrl + "/", changefreq: "daily", priority: 1.0 },
  ];

  if (shop) {
    const products = await prisma.product.findMany({
      where: { shopId: shop.id, status: "ACTIVE" },
      select: { slug: true, updatedAt: true },
      take: 5000,
    });
    for (const p of products) {
      urls.push({
        loc: `${siteUrl}/produit/${p.slug}`,
        lastmod: p.updatedAt.toISOString().slice(0, 10),
        changefreq: "weekly",
        priority: 0.8,
      });
    }
    const categories = await prisma.category.findMany({
      where: { shopId: shop.id },
      select: { slug: true },
      take: 500,
    });
    for (const c of categories) {
      urls.push({
        loc: `${siteUrl}/categorie/${c.slug}`,
        changefreq: "weekly",
        priority: 0.6,
      });
    }
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url>\n` +
          `    <loc>${escapeXml(u.loc)}</loc>\n` +
          (u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : "") +
          (u.changefreq ? `    <changefreq>${u.changefreq}</changefreq>\n` : "") +
          (u.priority != null ? `    <priority>${u.priority.toFixed(1)}</priority>\n` : "") +
          `  </url>`,
      )
      .join("\n") +
    `\n</urlset>\n`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}
