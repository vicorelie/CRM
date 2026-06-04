import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { crawl, scoreAudit } from "@/lib/seo-audit";
import { discoverPages } from "@/lib/sitemap";

export const runtime = "nodejs";
export const maxDuration = 120;

const inputSchema = z.object({
  rootUrl: z.string().trim().url(),
  maxPages: z.number().int().min(3).max(50).optional().default(15),
});

export type SiteHealth = {
  rootUrl: string;
  pagesAudited: number;
  /** Pages éditables (hors archives WP) */
  editablePagesCount: number;
  /** Archives WP (catégories, tags, auteurs) — comptées séparément */
  archivePagesCount: number;
  /** Score moyen calculé UNIQUEMENT sur les pages éditables */
  avgScore: number;
  scoreDistribution: { excellent: number; good: number; needsWork: number; poor: number };
  /** Pourcentages calculés sur les pages éditables seulement */
  systemicIssues: { category: string; count: number; pctPages: number }[];
  verdict: "excellent" | "good" | "needs-work" | "critical";
  recommendRebuild: boolean;
  rebuildReasons: string[];
  summary: string;
};

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

  // 1. Découverte
  const pages = await discoverPages(parsed.data.rootUrl, parsed.data.maxPages);
  if (pages.length === 0) {
    return NextResponse.json(
      { error: "Aucune page trouvée — site inaccessible ou structure inhabituelle" },
      { status: 404 },
    );
  }

  // 2. Audit batch (on garde la trace du kind page/archive)
  type AuditWithKind = Awaited<ReturnType<typeof crawl>> & { kind: "page" | "archive" };
  const audits: Array<AuditWithKind | null> = [];
  const BATCH = 5;
  for (let i = 0; i < pages.length; i += BATCH) {
    const batch = pages.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async (p) => {
        try {
          const a = await crawl(p.url);
          scoreAudit(a, null);
          return { ...a, kind: p.kind } as AuditWithKind;
        } catch {
          return null;
        }
      }),
    );
    audits.push(...results);
  }

  const successes = audits.filter((a): a is AuditWithKind => a !== null);
  if (successes.length === 0) {
    return NextResponse.json(
      { error: "Aucune page n'a pu être auditée" },
      { status: 502 },
    );
  }

  // ── Sépare pages éditables vs archives WP : les archives ne doivent PAS
  //    polluer le score moyen ni les % des issues systémiques (elles ne
  //    peuvent pas être corrigées par WanaPush) ──
  const editablePages = successes.filter((a) => a.kind !== "archive");
  const archivePages = successes.filter((a) => a.kind === "archive");
  const statsBase = editablePages.length > 0 ? editablePages : successes;

  // 3. Statistiques (sur pages éditables seulement)
  const avgScore = Math.round(
    statsBase.reduce((s, a) => s + a.score, 0) / statsBase.length,
  );

  const scoreDistribution = {
    excellent: statsBase.filter((a) => a.score >= 90).length,
    good: statsBase.filter((a) => a.score >= 70 && a.score < 90).length,
    needsWork: statsBase.filter((a) => a.score >= 50 && a.score < 70).length,
    poor: statsBase.filter((a) => a.score < 50).length,
  };

  // Issues systémiques sur les pages éditables uniquement
  const issueCount: Record<string, number> = {};
  for (const a of statsBase) {
    const seen = new Set<string>();
    for (const i of a.issues) {
      if (!seen.has(i.category)) {
        seen.add(i.category);
        issueCount[i.category] = (issueCount[i.category] ?? 0) + 1;
      }
    }
  }
  const systemicIssues = Object.entries(issueCount)
    .map(([category, count]) => ({
      category,
      count,
      pctPages: Math.round((count / statsBase.length) * 100),
    }))
    .filter((s) => s.pctPages >= 30)
    .sort((a, b) => b.count - a.count);

  // 4. Verdict
  let verdict: SiteHealth["verdict"];
  if (avgScore >= 85) verdict = "excellent";
  else if (avgScore >= 65) verdict = "good";
  else if (avgScore >= 40) verdict = "needs-work";
  else verdict = "critical";

  // 5. Recommandation refonte (basée sur signaux de site "endommagé") — éditables seulement
  const rebuildReasons: string[] = [];
  const noHttps = statsBase.filter((a) => !a.hasHttps).length;
  const noViewport = statsBase.filter((a) => !a.viewport).length;
  const thinContent = statsBase.filter((a) => a.wordCount < 100).length;
  const noTitleAtAll = statsBase.filter((a) => !a.title.value).length;
  const allBroken = statsBase.filter((a) => a.score < 30).length;
  const noLang = statsBase.filter((a) => !a.lang).length;

  if (noHttps / statsBase.length > 0.5) {
    rebuildReasons.push(`${noHttps}/${statsBase.length} pages sans HTTPS — site non sécurisé`);
  }
  if (noViewport / statsBase.length > 0.5) {
    rebuildReasons.push(
      `${noViewport}/${statsBase.length} pages sans meta viewport — pas mobile-friendly`,
    );
  }
  if (thinContent / statsBase.length > 0.5) {
    rebuildReasons.push(
      `${thinContent}/${statsBase.length} pages avec moins de 100 mots — contenu très pauvre`,
    );
  }
  if (noTitleAtAll / statsBase.length > 0.3) {
    rebuildReasons.push(
      `${noTitleAtAll}/${statsBase.length} pages sans aucun <title> — structure HTML cassée`,
    );
  }
  if (allBroken / statsBase.length > 0.5) {
    rebuildReasons.push(
      `${allBroken}/${statsBase.length} pages avec un score < 30/100`,
    );
  }
  if (noLang / statsBase.length > 0.7) {
    rebuildReasons.push("Aucun attribut lang sur la majorité des pages");
  }

  const recommendRebuild = rebuildReasons.length >= 2 || verdict === "critical";

  // 6. Résumé textuel
  let summary = "";
  if (verdict === "excellent") {
    summary = `Site en excellente santé SEO (${avgScore}/100). Quelques optimisations peuvent encore être faites mais le travail principal est fait.`;
  } else if (verdict === "good") {
    summary = `Site avec une bonne base SEO (${avgScore}/100). L'optimisation page par page apporterait un gain significatif.`;
  } else if (verdict === "needs-work") {
    summary = `Site avec des problèmes SEO importants (${avgScore}/100). Recommandation : optimiser chaque page systématiquement, en commençant par les critiques.`;
  } else {
    summary = `Site en très mauvaise santé SEO (${avgScore}/100). Beaucoup de pages ont des problèmes structurels — une refonte complète serait plus efficace que des corrections page par page.`;
  }

  const result: SiteHealth = {
    rootUrl: parsed.data.rootUrl,
    pagesAudited: successes.length,
    editablePagesCount: editablePages.length,
    archivePagesCount: archivePages.length,
    avgScore,
    scoreDistribution,
    systemicIssues,
    verdict,
    recommendRebuild,
    rebuildReasons,
    summary,
  };

  // Inclut aussi les détails par page (avec le kind)
  return NextResponse.json({
    health: result,
    pages: successes.map((a) => ({
      url: a.url,
      score: a.score,
      issues: a.issues.length,
      title: a.title.value,
      h1: a.h1.values[0] ?? null,
      wordCount: a.wordCount,
      kind: a.kind,
    })),
  });
}
