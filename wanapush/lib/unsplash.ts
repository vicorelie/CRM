// Wrapper Unsplash API officielle (50 req/h gratuit avec clé) + fallback loremflickr.
// Doc : https://unsplash.com/documentation

type UnsplashPhoto = {
  url: string;
  alt: string;
  author?: string;
  authorUrl?: string;
  /** URL Unsplash de la photo originale (pour attribution) */
  unsplashUrl?: string;
};

// Cache mémoire simple pour économiser les requêtes pendant la génération
const cache = new Map<string, { photo: UnsplashPhoto; expires: number }>();
const TTL = 30 * 60 * 1000; // 30 min

/**
 * Cherche une photo Unsplash pour les keywords donnés.
 * Si UNSPLASH_ACCESS_KEY pas définie → fallback loremflickr.
 */
export async function searchPhoto(
  keywords: string,
  width = 1200,
  height = 800,
  seed?: string,
): Promise<UnsplashPhoto> {
  // Unsplash returns 0 results for long comma-separated queries → keep first 3 words only
  const cleanKw = keywords
    .trim()
    .toLowerCase()
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 3)
    .join(" ");
  const cacheKey = `${cleanKw}:${width}x${height}:${seed ?? ""}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.photo;

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  let photo: UnsplashPhoto;
  if (accessKey) {
    try {
      // Unsplash search retourne plusieurs photos, on prend une au "hasard"
      // grâce au seed pour garder le même résultat sur la même clé
      const seedHash = hashString(seed ?? cleanKw) % 10;
      const params = new URLSearchParams({
        query: cleanKw,
        per_page: "10",
        orientation: width >= height ? "landscape" : "portrait",
      });
      const res = await fetch(
        `https://api.unsplash.com/search/photos?${params}`,
        {
          headers: { Authorization: `Client-ID ${accessKey}` },
          signal: AbortSignal.timeout(8000),
        },
      );
      if (res.ok) {
        const data = await res.json();
        const results = (data.results ?? []) as Array<{
          urls: { regular: string; small: string; raw: string };
          alt_description?: string;
          description?: string;
          user?: { name: string; links: { html: string } };
          links: { html: string };
        }>;
        if (results.length > 0) {
          const idx = seedHash % results.length;
          const p = results[idx];
          // URL avec dimensions custom via raw + crop params
          const url = `${p.urls.raw}&w=${width}&h=${height}&fit=crop&crop=entropy&auto=format&q=80`;
          photo = {
            url,
            alt: p.alt_description ?? p.description ?? cleanKw,
            author: p.user?.name,
            authorUrl: p.user?.links.html,
            unsplashUrl: p.links.html,
          };
          cache.set(cacheKey, { photo, expires: Date.now() + TTL });
          return photo;
        }
      }
    } catch (err) {
      console.warn("[unsplash] search failed, falling back", err);
    }
  }

  // Fallback : loremflickr (gratuit, pas de clé, photos thématiques)
  const tags = cleanKw.replace(/\s+/g, ",").replace(/[^a-z,]/g, "");
  const lock = seed ? Math.abs(hashString(seed)) % 10000 : Math.floor(Math.random() * 10000);
  photo = {
    url: `https://loremflickr.com/${width}/${height}/${tags}?lock=${lock}`,
    alt: cleanKw,
  };
  cache.set(cacheKey, { photo, expires: Date.now() + TTL });
  return photo;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Récupère plusieurs photos en parallèle (utile pour la gallery).
 */
export async function searchPhotos(
  queries: { keywords: string; width?: number; height?: number; seed?: string }[],
): Promise<UnsplashPhoto[]> {
  return Promise.all(
    queries.map((q) => searchPhoto(q.keywords, q.width, q.height, q.seed)),
  );
}
