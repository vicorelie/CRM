import { searchPhotos } from "@/lib/unsplash";

type Section = {
  type: string;
  data: Record<string, unknown>;
};

type Page = {
  path: string;
  sections: Section[];
};

export type PageImage = { url: string; alt: string };
export type PageImageMap = Record<string, PageImage>;

/**
 * Précharge en parallèle toutes les images Unsplash référencées dans les sections,
 * et retourne un Map { "hero-index.html": {url, alt}, "feat-services.html-2": {...}, ... }
 *
 * Clés possibles :
 *   - hero-{pagePath}
 *   - feat-{pagePath}-{i}
 *   - about-{pagePath}
 *   - gal-{pagePath}-{i}
 */
export async function preloadPageImages(pages: Page[]): Promise<PageImageMap> {
  const queries: { keywords: string; width: number; height: number; seed: string }[] = [];

  for (const page of pages) {
    for (const section of page.sections) {
      const d = section.data;
      switch (section.type) {
        case "hero":
          if (d.imageKeywords)
            queries.push({
              keywords: String(d.imageKeywords),
              width: 1200,
              height: 900,
              seed: `hero-${page.path}`,
            });
          break;
        case "features":
          if (Array.isArray(d.items)) {
            for (let i = 0; i < d.items.length; i++) {
              const item = d.items[i] as { imageKeywords?: string };
              if (item.imageKeywords)
                queries.push({
                  keywords: item.imageKeywords,
                  width: 600,
                  height: 400,
                  seed: `feat-${page.path}-${i}`,
                });
            }
          }
          break;
        case "about":
          if (d.imageKeywords)
            queries.push({
              keywords: String(d.imageKeywords),
              width: 800,
              height: 1000,
              seed: `about-${page.path}`,
            });
          break;
        case "process":
          if (d.imageKeywords)
            queries.push({
              keywords: String(d.imageKeywords),
              width: 600,
              height: 750,
              seed: `process-${page.path}`,
            });
          break;
        case "gallery":
          if (Array.isArray(d.imageKeywords)) {
            (d.imageKeywords as string[]).forEach((kw, i) =>
              queries.push({
                keywords: String(kw),
                width: 600,
                height: 800,
                seed: `gal-${page.path}-${i}`,
              }),
            );
          }
          break;
      }
    }
  }

  const unique = Array.from(new Map(queries.map((q) => [q.seed, q])).values());
  const photos = await searchPhotos(unique);
  const map: PageImageMap = {};
  unique.forEach((q, i) => {
    map[q.seed] = { url: photos[i].url, alt: photos[i].alt };
  });
  return map;
}
