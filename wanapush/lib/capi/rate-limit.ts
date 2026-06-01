// Rate limiting en mémoire pour l'endpoint /api/capi/[slug]/event.
//
// Algorithme : sliding window simple par clé. Pas de Redis pour le MVP — en
// mode Next.js le state survit aux requêtes au sein du même process (un seul
// node dev/prod par instance). Si on scale horizontalement plus tard, migrer
// vers @upstash/redis (déjà dans les deps : ^1.37.0).
//
// Limites par défaut :
//   - 100 events/min par slug (toutes IPs confondues) — protège le site
//   - 50  events/min par (slug, IP)              — protège l'API contre un user agressif

type Bucket = {
  count: number;
  resetAt: number; // Unix ms
};

const BUCKETS = new Map<string, Bucket>();

/** Limites par défaut. Ajustables par appel pour les tests. */
export const RATE_LIMIT_DEFAULTS = {
  windowMs: 60_000, // 1 minute
  maxPerSlug: 100,
  maxPerSlugIp: 50,
};

/**
 * Vérifie si la requête (slug, ip) est autorisée. Si oui, incrémente les
 * compteurs et retourne `{ allowed: true }`. Sinon retourne `{ allowed: false,
 * reason, retryAfterSec }`.
 */
export function checkAndIncrement(
  slug: string,
  ip: string,
  opts: Partial<typeof RATE_LIMIT_DEFAULTS> = {},
): { allowed: true } | { allowed: false; reason: "slug" | "slug_ip"; retryAfterSec: number } {
  const cfg = { ...RATE_LIMIT_DEFAULTS, ...opts };
  const now = Date.now();

  const slugKey = `slug:${slug}`;
  const slugIpKey = `slug:${slug}:ip:${ip}`;

  // Vérifie les 2 buckets sans incrémenter (read-only)
  const slugBucket = BUCKETS.get(slugKey);
  const slugIpBucket = BUCKETS.get(slugIpKey);

  if (slugBucket && slugBucket.resetAt > now && slugBucket.count >= cfg.maxPerSlug) {
    return {
      allowed: false,
      reason: "slug",
      retryAfterSec: Math.ceil((slugBucket.resetAt - now) / 1000),
    };
  }

  if (slugIpBucket && slugIpBucket.resetAt > now && slugIpBucket.count >= cfg.maxPerSlugIp) {
    return {
      allowed: false,
      reason: "slug_ip",
      retryAfterSec: Math.ceil((slugIpBucket.resetAt - now) / 1000),
    };
  }

  // Autorisé → incrémente les 2 buckets
  incrementBucket(slugKey, now, cfg.windowMs);
  incrementBucket(slugIpKey, now, cfg.windowMs);

  return { allowed: true };
}

function incrementBucket(key: string, now: number, windowMs: number): void {
  const existing = BUCKETS.get(key);
  if (!existing || existing.resetAt <= now) {
    BUCKETS.set(key, { count: 1, resetAt: now + windowMs });
  } else {
    existing.count += 1;
  }
}

/** Nettoyage périodique des buckets expirés (cron interne). Call depuis cron route. */
export function gcExpiredBuckets(): number {
  const now = Date.now();
  let removed = 0;
  for (const [key, bucket] of Array.from(BUCKETS.entries())) {
    if (bucket.resetAt <= now) {
      BUCKETS.delete(key);
      removed++;
    }
  }
  return removed;
}

/** Reset complet — utilisé uniquement dans les tests. */
export function __resetRateLimits(): void {
  BUCKETS.clear();
}

/** Inspection — debug only. */
export function __getBuckets(): ReadonlyMap<string, Bucket> {
  return BUCKETS;
}
