import * as cheerio from "cheerio";
import type { CoreWebVitals } from "@/lib/pagespeed";
import { safeFetch } from "@/lib/ssrf";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SchemaOrgBreakdown = {
  total: number;
  byType: Record<string, number>;
  hasArticle: boolean;
  hasFaq: boolean;
  hasOrganization: boolean;
  hasBreadcrumb: boolean;
  hasProduct: boolean;
  hasPerson: boolean;
};

export type EeatSignals = {
  author: string | null;
  authorSource: "meta" | "schema" | "byline" | null;
  datePublished: string | null;
  dateModified: string | null;
  authorUrl: string | null;
};

export type Audit = {
  url: string;
  fetchedAt: string;
  status: number;
  loadMs: number;
  bytes: number;
  title: { value: string | null; length: number; ok: boolean };
  metaDescription: { value: string | null; length: number; ok: boolean };
  canonical: string | null;
  robotsMeta: string | null;
  lang: string | null;
  viewport: string | null;
  charset: string | null;
  h1: { count: number; values: string[]; ok: boolean };
  h2Count: number;
  h3Count: number;
  firstParagraph: string | null;
  /** Texte visible nettoyé du body (max 3000 chars) — pour les prompts IA contextuels */
  bodyText: string;
  images: {
    total: number;
    withAlt: number;
    missingAlt: number;
    missingAltUrls: string[];
    /** Toutes les URLs d'images absolues (max 30) avec leur alt — utilisé pour le mode refonte */
    all: { url: string; alt: string }[];
  };
  links: { internal: number; external: number };
  wordCount: number;
  openGraph: { title: string | null; description: string | null; image: string | null };
  twitter: { card: string | null; title: string | null; image: string | null };
  schemaOrg: SchemaOrgBreakdown;
  eeat: EeatSignals;
  coreWebVitals: CoreWebVitals | null;
  hasFavicon: boolean;
  hasHttps: boolean;
  score: number;
  issues: {
    severity: "critical" | "warning" | "info";
    message: string;
    category: string;
  }[];
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

// ─────────────────────────────────────────────────────────────────────────────
// Crawl (HTML fetch + parse)
// ─────────────────────────────────────────────────────────────────────────────

export async function crawl(targetUrl: string): Promise<Audit> {
  const t0 = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  let res: Response;
  try {
    // safeFetch (audit H2) : valide l'URL + chaque hop de redirection contre les
    // IP privées/loopback/metadata avant tout fetch (anti-SSRF).
    res = await safeFetch(targetUrl, {
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; WanaPushBot/1.0; +https://wanapush.com/bot)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
  } finally {
    clearTimeout(timer);
  }

  const html = await res.text();
  const loadMs = Date.now() - t0;
  const bytes = new TextEncoder().encode(html).length;

  const $ = cheerio.load(html);
  const u = new URL(res.url);

  const title = $("head > title").first().text().trim() || null;
  const metaDesc =
    $('meta[name="description"]').attr("content")?.trim() || null;
  const canonical = $('link[rel="canonical"]').attr("href")?.trim() || null;
  const robotsMeta = $('meta[name="robots"]').attr("content")?.trim() || null;
  const lang = $("html").attr("lang")?.trim() || null;
  const viewport = $('meta[name="viewport"]').attr("content")?.trim() || null;
  const charset =
    $("meta[charset]").attr("charset")?.trim() ||
    $('meta[http-equiv="Content-Type"]').attr("content")?.trim() ||
    null;

  const h1Texts = $("h1")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);
  const h2Count = $("h2").length;
  const h3Count = $("h3").length;

  const firstParagraph =
    $("main p, article p, body p")
      .map((_, el) => $(el).text().trim())
      .get()
      .find((t) => t.length > 50) || null;

  const imgs = $("img");
  const withAlt = imgs.filter((_, el) => Boolean($(el).attr("alt")?.trim())).length;
  const missingAltUrls: string[] = [];
  const allImages: { url: string; alt: string }[] = [];
  imgs.each((_, el) => {
    const alt = $(el).attr("alt")?.trim() ?? "";
    const src = $(el).attr("src");
    if (!src) return;
    let abs: string;
    try {
      abs = new URL(src, u).toString();
    } catch {
      return;
    }
    // Skip data: et SVG inline
    if (abs.startsWith("data:")) return;
    if (!alt) missingAltUrls.push(abs);
    if (allImages.length < 30) allImages.push({ url: abs, alt });
  });

  let internal = 0;
  let external = 0;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (
      !href ||
      href.startsWith("#") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:")
    )
      return;
    try {
      const linkUrl = new URL(href, u);
      if (linkUrl.hostname === u.hostname) internal++;
      else external++;
    } catch {
      /* ignore */
    }
  });

  const schemaOrg = parseSchemaOrg($);
  const eeat = extractEeat($);

  $("script, style, noscript").remove();
  // Texte visible : préfère le contenu de <main>/<article> si disponible, sinon body entier
  const contentRoot = $("main").first().length
    ? $("main").first()
    : $("article").first().length
      ? $("article").first()
      : $("body");
  const text = contentRoot.text().replace(/\s+/g, " ").trim();
  const wordCount = text ? text.split(" ").length : 0;
  const bodyText = text.slice(0, 3000);

  const og = {
    title: $('meta[property="og:title"]').attr("content")?.trim() || null,
    description: $('meta[property="og:description"]').attr("content")?.trim() || null,
    image: $('meta[property="og:image"]').attr("content")?.trim() || null,
  };
  const twitter = {
    card: $('meta[name="twitter:card"]').attr("content")?.trim() || null,
    title: $('meta[name="twitter:title"]').attr("content")?.trim() || null,
    image: $('meta[name="twitter:image"]').attr("content")?.trim() || null,
  };

  const hasFavicon =
    $('link[rel="icon"], link[rel="shortcut icon"]').length > 0;
  const hasHttps = u.protocol === "https:";

  return {
    url: res.url,
    fetchedAt: new Date().toISOString(),
    status: res.status,
    loadMs,
    bytes,
    title: {
      value: title,
      length: title?.length ?? 0,
      ok: !!title && title.length >= 30 && title.length <= 60,
    },
    metaDescription: {
      value: metaDesc,
      length: metaDesc?.length ?? 0,
      ok: !!metaDesc && metaDesc.length >= 120 && metaDesc.length <= 160,
    },
    canonical,
    robotsMeta,
    lang,
    viewport,
    charset,
    h1: { count: h1Texts.length, values: h1Texts.slice(0, 5), ok: h1Texts.length === 1 },
    h2Count,
    h3Count,
    firstParagraph,
    bodyText,
    images: {
      total: imgs.length,
      withAlt,
      missingAlt: imgs.length - withAlt,
      missingAltUrls: missingAltUrls.slice(0, 20),
      all: allImages,
    },
    links: { internal, external },
    wordCount,
    openGraph: og,
    twitter,
    schemaOrg,
    eeat,
    coreWebVitals: null,
    hasFavicon,
    hasHttps,
    score: 0,
    issues: [],
  };
}

function parseSchemaOrg($: cheerio.CheerioAPI): SchemaOrgBreakdown {
  const byType: Record<string, number> = {};

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).text();
      const data = JSON.parse(raw);
      const items = Array.isArray(data) ? data : data["@graph"] ?? [data];
      for (const item of items) {
        if (item && typeof item === "object" && item["@type"]) {
          const types = Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]];
          for (const t of types) {
            if (typeof t === "string") {
              byType[t] = (byType[t] ?? 0) + 1;
            }
          }
        }
      }
    } catch {
      /* JSON-LD invalide */
    }
  });

  const has = (t: string) =>
    Object.keys(byType).some((k) => k.toLowerCase().includes(t.toLowerCase()));

  return {
    total: Object.values(byType).reduce((s, n) => s + n, 0),
    byType,
    hasArticle: has("Article") || has("BlogPosting") || has("NewsArticle"),
    hasFaq: has("FAQPage"),
    hasOrganization: has("Organization") || has("LocalBusiness"),
    hasBreadcrumb: has("BreadcrumbList"),
    hasProduct: has("Product"),
    hasPerson: has("Person"),
  };
}

function extractEeat($: cheerio.CheerioAPI): EeatSignals {
  const result: EeatSignals = {
    author: null,
    authorSource: null,
    datePublished: null,
    dateModified: null,
    authorUrl: null,
  };

  const metaAuthor = $('meta[name="author"]').attr("content")?.trim();
  if (metaAuthor) {
    result.author = metaAuthor;
    result.authorSource = "meta";
  }

  const ogPublished = $('meta[property="article:published_time"]').attr("content")?.trim();
  if (ogPublished) result.datePublished = ogPublished;
  const ogModified = $('meta[property="article:modified_time"]').attr("content")?.trim();
  if (ogModified) result.dateModified = ogModified;

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).text());
      const items = Array.isArray(data) ? data : data["@graph"] ?? [data];
      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        if (item.author && !result.author) {
          const a = Array.isArray(item.author) ? item.author[0] : item.author;
          if (typeof a === "string") {
            result.author = a;
            result.authorSource = "schema";
          } else if (a && typeof a === "object") {
            result.author = a.name ?? null;
            result.authorUrl = a.url ?? null;
            result.authorSource = "schema";
          }
        }
        if (item.datePublished && !result.datePublished) result.datePublished = item.datePublished;
        if (item.dateModified && !result.dateModified) result.dateModified = item.dateModified;
      }
    } catch {
      /* ignore */
    }
  });

  if (!result.datePublished) {
    const t = $("article time[datetime], time[datetime]").first().attr("datetime");
    if (t) result.datePublished = t;
  }

  if (!result.author) {
    const html = $("body").html() ?? "";
    const m =
      html.match(/(?:By|Par|Auteur\s*:?\s*)\s*<[^>]+rel=["']author["'][^>]*>([^<]+)</i) ||
      html.match(/<[^>]+class=["'][^"']*author[^"']*["'][^>]*>([^<]{2,80})</i);
    if (m) {
      result.author = m[1].trim();
      result.authorSource = "byline";
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring 2026
// ─────────────────────────────────────────────────────────────────────────────

export function scoreAudit(audit: Audit, cwv: CoreWebVitals | null): void {
  const issues: Audit["issues"] = [];
  let score = 100;

  if (!audit.title.value) {
    issues.push({ severity: "critical", message: "Aucun <title>", category: "title" });
    score -= 15;
  } else if (audit.title.length < 30 || audit.title.length > 60) {
    issues.push({
      severity: "warning",
      message: `Title de ${audit.title.length} caractères (idéal : 30-60)`,
      category: "title",
    });
    score -= 5;
  }

  if (!audit.metaDescription.value) {
    issues.push({ severity: "critical", message: "Aucune meta description", category: "meta" });
    score -= 12;
  } else if (audit.metaDescription.length < 120 || audit.metaDescription.length > 160) {
    issues.push({
      severity: "warning",
      message: `Meta description de ${audit.metaDescription.length} caractères (idéal : 120-160)`,
      category: "meta",
    });
    score -= 5;
  }

  if (audit.h1.count === 0) {
    issues.push({ severity: "critical", message: "Aucun H1", category: "h1" });
    score -= 10;
  } else if (audit.h1.count > 1) {
    issues.push({
      severity: "warning",
      message: `${audit.h1.count} H1 trouvés (un seul recommandé)`,
      category: "h1",
    });
    score -= 4;
  }

  if (audit.images.total > 0 && audit.images.missingAlt > 0) {
    const lostPts = clamp(audit.images.missingAlt, 0, 10);
    issues.push({
      severity: audit.images.missingAlt > 5 ? "warning" : "info",
      message: `${audit.images.missingAlt} image(s) sans attribut alt sur ${audit.images.total}`,
      category: "alt",
    });
    score -= lostPts;
  }

  if (!audit.hasHttps) {
    issues.push({ severity: "critical", message: "Site non HTTPS", category: "https" });
    score -= 15;
  }

  if (!audit.viewport) {
    issues.push({
      severity: "warning",
      message: "Pas de meta viewport (essentiel mobile-first)",
      category: "viewport",
    });
    score -= 5;
  }

  if (!audit.canonical) {
    issues.push({
      severity: "info",
      message: "Pas de balise canonical",
      category: "canonical",
    });
    score -= 3;
  }

  if (!audit.openGraph.title || !audit.openGraph.description) {
    issues.push({
      severity: "info",
      message: "Open Graph incomplet (partage social peu attractif)",
      category: "og",
    });
    score -= 3;
  }

  if (!audit.lang) {
    issues.push({
      severity: "info",
      message: "Attribut lang manquant sur <html>",
      category: "lang",
    });
    score -= 2;
  }

  if (audit.wordCount < 300) {
    issues.push({
      severity: "warning",
      message: `Contenu maigre : ${audit.wordCount} mots (300+ recommandé)`,
      category: "content",
    });
    score -= 8;
  }

  if (audit.schemaOrg.total === 0) {
    issues.push({
      severity: "warning",
      message: "Aucun schema.org (JSON-LD) — critique pour AI Overviews / SGE",
      category: "schema",
    });
    score -= 8;
  } else if (
    !audit.schemaOrg.hasArticle &&
    !audit.schemaOrg.hasOrganization &&
    !audit.schemaOrg.hasProduct
  ) {
    issues.push({
      severity: "info",
      message: `Schema.org présent mais sans Article/Organization/Product (types principaux pour AI Overviews)`,
      category: "schema",
    });
    score -= 3;
  }

  if (!audit.eeat.author) {
    issues.push({
      severity: "warning",
      message: "Aucun auteur identifié — signal E-E-A-T critique en 2026",
      category: "eeat",
    });
    score -= 5;
  }

  if (!audit.eeat.datePublished) {
    issues.push({
      severity: "info",
      message: "Aucune date de publication détectée",
      category: "eeat",
    });
    score -= 3;
  }

  if (cwv) {
    audit.coreWebVitals = cwv;
    if (cwv.lcp?.rating === "poor") {
      issues.push({
        severity: "critical",
        message: `LCP médiocre : ${cwv.lcp.value}ms (seuil Google : <2500ms)`,
        category: "cwv",
      });
      score -= 10;
    } else if (cwv.lcp?.rating === "needs-improvement") {
      issues.push({
        severity: "warning",
        message: `LCP à améliorer : ${cwv.lcp.value}ms`,
        category: "cwv",
      });
      score -= 5;
    }
    if (cwv.inp?.rating === "poor") {
      issues.push({
        severity: "critical",
        message: `INP médiocre : ${cwv.inp.value}ms (seuil Google : <200ms)`,
        category: "cwv",
      });
      score -= 10;
    } else if (cwv.inp?.rating === "needs-improvement") {
      issues.push({
        severity: "warning",
        message: `INP à améliorer : ${cwv.inp.value}ms`,
        category: "cwv",
      });
      score -= 4;
    }
    if (cwv.cls?.rating === "poor") {
      issues.push({
        severity: "critical",
        message: `CLS médiocre : ${cwv.cls.value.toFixed(3)} (seuil Google : <0.1)`,
        category: "cwv",
      });
      score -= 8;
    } else if (cwv.cls?.rating === "needs-improvement") {
      issues.push({
        severity: "warning",
        message: `CLS à améliorer : ${cwv.cls.value.toFixed(3)}`,
        category: "cwv",
      });
      score -= 3;
    }
  }

  audit.score = clamp(score, 0, 100);
  audit.issues = issues;
}
