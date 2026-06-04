// Découverte des pages d'un site via sitemap.xml (avec fallback crawl).

export type DiscoveredPage = {
  url: string;
  priority?: number;
  lastmod?: string;
  /** Source : "sitemap" ou "crawl" */
  source: "sitemap" | "crawl";
  /** Type WordPress : "page" (éditable) ou "archive" (catégorie/tag/auteur, non éditable directement) */
  kind: "page" | "archive";
};

/**
 * Détecte les URLs d'archives WordPress (catégories, tags, auteurs, dates, pagination).
 * Ces pages sont générées dynamiquement par WP, pas éditables via /wp/v2/pages ou /wp/v2/posts.
 */
export function isWordPressArchive(url: string): boolean {
  try {
    const path = new URL(url).pathname;
    return /\/(category|categorie|tag|author|auteur|date|page)\/[^/]+\/?$/i.test(path)
      || /\/(category|tag|author)\//i.test(path)
      || /\/\d{4}\/\d{2}\/?$/.test(path) // /2026/05/ (date archive)
      || /\/\d{4}\/?$/.test(path)         // /2026/ (year archive)
      || /\/page\/\d+\/?$/i.test(path);   // pagination
  } catch {
    return false;
  }
}

const COMMON_SITEMAPS = [
  "/sitemap.xml",
  "/sitemap_index.xml",
  "/wp-sitemap.xml",
  "/sitemap-index.xml",
  "/sitemap1.xml",
];

const UA = "Mozilla/5.0 (compatible; WanaPushBot/1.0)";

async function fetchText(url: string, timeout = 8000): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "*/*" },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function parseSitemapXml(xml: string): { urls: string[]; sitemaps: string[] } {
  const urls: string[] = [];
  const sitemaps: string[] = [];
  // Support sitemap-index AND urlset
  const locRegex = /<loc>\s*([^<]+?)\s*<\/loc>/gi;
  const isIndex = /<sitemapindex/i.test(xml);
  let match: RegExpExecArray | null;
  while ((match = locRegex.exec(xml)) !== null) {
    const url = match[1].trim();
    if (isIndex) sitemaps.push(url);
    else urls.push(url);
  }
  return { urls, sitemaps };
}

/**
 * Découvre toutes les URLs du site via sitemap, jusqu'à `maxPages`.
 * Si pas de sitemap trouvé, fait un BFS depuis rootUrl en suivant les liens internes.
 */
export async function discoverPages(
  rootUrl: string,
  maxPages = 30,
): Promise<DiscoveredPage[]> {
  const root = new URL(rootUrl);
  const origin = root.origin;

  // 1. Tentative robots.txt → Sitemap directives
  const customSitemaps: string[] = [];
  const robots = await fetchText(`${origin}/robots.txt`, 4000);
  if (robots) {
    for (const line of robots.split("\n")) {
      const m = line.match(/^sitemap\s*:\s*(\S+)/i);
      if (m) customSitemaps.push(m[1].trim());
    }
  }

  // 2. Liste des candidats sitemap : robots.txt + paths communs
  const candidates = [...customSitemaps, ...COMMON_SITEMAPS.map((p) => origin + p)];

  // 3. Récupère et parse récursivement (1 niveau d'index)
  const collected: Map<string, DiscoveredPage> = new Map();

  async function ingest(sitemapUrl: string, depth: number) {
    if (collected.size >= maxPages || depth > 2) return;
    const xml = await fetchText(sitemapUrl);
    if (!xml) return;
    const { urls, sitemaps } = parseSitemapXml(xml);
    for (const url of urls) {
      if (collected.size >= maxPages) break;
      try {
        const u = new URL(url);
        if (u.origin === origin && !collected.has(u.toString())) {
          collected.set(u.toString(), {
            url: u.toString(),
            source: "sitemap",
            kind: isWordPressArchive(u.toString()) ? "archive" : "page",
          });
        }
      } catch {
        /* skip */
      }
    }
    // Sitemap index → fetch chaque sub-sitemap (jusqu'à 5 pour éviter explosion)
    for (const sub of sitemaps.slice(0, 5)) {
      if (collected.size >= maxPages) break;
      await ingest(sub, depth + 1);
    }
  }

  for (const c of candidates) {
    if (collected.size >= maxPages) break;
    await ingest(c, 0);
  }

  // 4. Si rien trouvé, fallback crawl BFS (suit les liens internes)
  if (collected.size === 0) {
    await crawlFallback(rootUrl, origin, collected, maxPages);
  } else {
    // Toujours s'assurer que la racine est incluse
    const rootStr = root.toString();
    if (!collected.has(rootStr)) {
      collected.set(rootStr, { url: rootStr, source: "sitemap", kind: "page" });
    }
  }

  return Array.from(collected.values()).slice(0, maxPages);
}

async function crawlFallback(
  startUrl: string,
  origin: string,
  collected: Map<string, DiscoveredPage>,
  maxPages: number,
): Promise<void> {
  const queue: string[] = [startUrl];
  const visited = new Set<string>();

  while (queue.length > 0 && collected.size < maxPages) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);

    const html = await fetchText(url, 6000);
    if (!html) continue;

    if (!collected.has(url)) {
      collected.set(url, {
        url,
        source: "crawl",
        kind: isWordPressArchive(url) ? "archive" : "page",
      });
    }

    // Extrait tous les <a href="..."> internes
    const linkRegex = /<a\s+[^>]*href=["']([^"'#]+?)["']/gi;
    let m: RegExpExecArray | null;
    while ((m = linkRegex.exec(html)) !== null) {
      try {
        const linkUrl = new URL(m[1], url);
        if (linkUrl.origin !== origin) continue;
        // Ignore les non-pages (PDF, images, etc.)
        if (/\.(pdf|jpg|jpeg|png|gif|svg|webp|zip|mp4|css|js)$/i.test(linkUrl.pathname)) continue;
        const cleanUrl = linkUrl.origin + linkUrl.pathname;
        if (!visited.has(cleanUrl) && !queue.includes(cleanUrl)) {
          queue.push(cleanUrl);
        }
      } catch {
        /* ignore malformed URL */
      }
    }
  }
}
