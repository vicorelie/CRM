import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { crawl, scoreAudit, type Audit } from "@/lib/seo-audit";
import { discoverPages } from "@/lib/sitemap";

export const runtime = "nodejs";
export const maxDuration = 120;

const inputSchema = z.object({
  rootUrl: z.string().trim().url(),
  maxPages: z.number().int().min(1).max(50).optional().default(20),
  /** Liste explicite d'URLs (skip discovery) */
  urls: z.array(z.string().url()).optional(),
});

export type AuditSummary = {
  url: string;
  score: number;
  status: number;
  issuesCount: number;
  criticalCount: number;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  hasSchema: boolean;
  wordCount: number;
  /** Audit complet (pour passer à optimize-page sans re-crawler) */
  audit: Audit;
};

async function auditOne(url: string): Promise<AuditSummary | { url: string; error: string }> {
  try {
    const audit = await crawl(url);
    scoreAudit(audit, null); // pas de PSI en batch (trop lent)
    return {
      url,
      score: audit.score,
      status: audit.status,
      issuesCount: audit.issues.length,
      criticalCount: audit.issues.filter((i) => i.severity === "critical").length,
      title: audit.title.value,
      metaDescription: audit.metaDescription.value,
      h1: audit.h1.values[0] ?? null,
      hasSchema: audit.schemaOrg.total > 0,
      wordCount: audit.wordCount,
      audit,
    };
  } catch (err) {
    return {
      url,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 },
    );
  }

  // 1. Découverte des pages (sauf si fournies)
  let urls: string[];
  if (parsed.data.urls && parsed.data.urls.length > 0) {
    urls = parsed.data.urls.slice(0, parsed.data.maxPages);
  } else {
    const pages = await discoverPages(parsed.data.rootUrl, parsed.data.maxPages);
    urls = pages.map((p) => p.url);
  }

  if (urls.length === 0) {
    return NextResponse.json(
      { error: "Aucune page découverte (pas de sitemap, pas de liens internes)" },
      { status: 404 },
    );
  }

  // 2. Audit en parallèle (par batch de 5 pour limiter la charge)
  const results: (AuditSummary | { url: string; error: string })[] = [];
  const BATCH_SIZE = 5;
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(auditOne));
    results.push(...batchResults);
  }

  // 3. Statistiques agrégées
  const successes = results.filter((r): r is AuditSummary => "score" in r);
  const failures = results.filter((r): r is { url: string; error: string } => "error" in r);
  const avgScore =
    successes.length > 0
      ? Math.round(successes.reduce((s, r) => s + r.score, 0) / successes.length)
      : 0;
  const totalIssues = successes.reduce((s, r) => s + r.issuesCount, 0);
  const totalCritical = successes.reduce((s, r) => s + r.criticalCount, 0);

  return NextResponse.json({
    rootUrl: parsed.data.rootUrl,
    pagesAudited: successes.length,
    pagesFailed: failures.length,
    avgScore,
    totalIssues,
    totalCritical,
    results: successes,
    failures,
  });
}
