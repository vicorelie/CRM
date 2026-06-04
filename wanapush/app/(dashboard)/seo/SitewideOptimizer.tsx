"use client";

import { useState } from "react";
import { EnrichContentModal } from "./EnrichContentModal";

type SiteHealth = {
  rootUrl: string;
  pagesAudited: number;
  editablePagesCount: number;
  archivePagesCount: number;
  avgScore: number;
  scoreDistribution: { excellent: number; good: number; needsWork: number; poor: number };
  systemicIssues: { category: string; count: number; pctPages: number }[];
  verdict: "excellent" | "good" | "needs-work" | "critical";
  recommendRebuild: boolean;
  rebuildReasons: string[];
  summary: string;
};

type PageRow = {
  url: string;
  score: number;
  issues: number;
  title: string | null;
  h1: string | null;
  wordCount: number;
  /** "page" = éditable, "archive" = catégorie/tag/auteur (non éditable) */
  kind?: "page" | "archive";
  // Local optimization state
  optimizing?: boolean;
  optimizeResult?: {
    scoreBefore: number;
    scoreAfter: number;
    delta: number;
    targetKeyword?: string;
    applied: { fixId: string; ok: boolean; message: string }[];
    remainingIssues?: {
      severity: "critical" | "warning" | "info";
      message: string;
      category: string;
      autoFixable: boolean;
    }[];
  };
  optimizeError?: string;
};

const VERDICT_STYLE: Record<SiteHealth["verdict"], { color: string; label: string; emoji: string }> =
  {
    excellent: { color: "text-emerald-700 border-emerald-500/40 bg-emerald-50", label: "Excellent", emoji: "🏆" },
    good: { color: "text-brand-700 border-brand/40 bg-brand/10", label: "Bon", emoji: "👍" },
    "needs-work": { color: "text-amber-800 border-amber-500/40 bg-amber-50", label: "À améliorer", emoji: "⚠️" },
    critical: { color: "text-red-700 border-red-200 bg-red-50", label: "Critique", emoji: "🚨" },
  };

const ISSUE_CATEGORY_LABEL: Record<string, string> = {
  title: "Title manquant ou non optimal",
  meta: "Meta description manquante ou non optimale",
  h1: "H1 manquant ou multiple",
  alt: "Images sans attribut alt",
  https: "Pas de HTTPS",
  viewport: "Pas mobile-friendly",
  canonical: "Pas de canonical",
  og: "Open Graph incomplet",
  lang: "Attribut lang manquant",
  content: "Contenu trop maigre",
  schema: "Pas de schema.org",
  eeat: "Auteur/dates manquants (E-E-A-T)",
  cwv: "Core Web Vitals dégradés",
};

export function SitewideOptimizer({
  rootUrl,
  siteId,
}: {
  rootUrl: string;
  siteId: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<SiteHealth | null>(null);
  const [pages, setPages] = useState<PageRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [optimizingAll, setOptimizingAll] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  async function runHealthCheck() {
    setError(null);
    setLoading(true);
    setHealth(null);
    setPages([]);
    try {
      const res = await fetch("/api/seo/site-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rootUrl, maxPages: 15 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Erreur");
      setHealth(json.health);
      setPages(json.pages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function optimizeOne(idx: number) {
    if (!siteId) return;
    const page = pages[idx];
    if (!page) return;

    setPages((curr) => {
      const next = [...curr];
      next[idx] = { ...next[idx], optimizing: true, optimizeError: undefined };
      return next;
    });

    try {
      const res = await fetch("/api/seo/optimize-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, pageUrl: page.url }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Erreur");
      setPages((curr) => {
        const next = [...curr];
        next[idx] = {
          ...next[idx],
          optimizing: false,
          score: json.scoreAfter,
          issues: json.issuesAfter,
          // Update aussi wordCount + title + h1 pour refléter l'état réel après optim
          wordCount: typeof json.wordCountAfter === "number" ? json.wordCountAfter : next[idx].wordCount,
          title: json.titleAfter ?? next[idx].title,
          h1: json.h1After ?? next[idx].h1,
          optimizeResult: {
            scoreBefore: json.scoreBefore,
            scoreAfter: json.scoreAfter,
            delta: json.delta,
            targetKeyword: json.targetKeyword,
            applied: json.applied,
            remainingIssues: json.remainingIssues,
          },
        };
        return next;
      });
    } catch (e) {
      setPages((curr) => {
        const next = [...curr];
        next[idx] = {
          ...next[idx],
          optimizing: false,
          optimizeError: e instanceof Error ? e.message : "Erreur",
        };
        return next;
      });
    }
  }

  async function optimizeAll() {
    if (!siteId) return;
    setOptimizingAll(true);
    // Skip archives ET pages déjà parfaites (score >= 95 et 0 issue)
    const optimizable = pages
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.kind !== "archive" && !(p.score >= 95 && p.issues === 0));
    setProgress({ done: 0, total: optimizable.length });
    for (let n = 0; n < optimizable.length; n++) {
      await optimizeOne(optimizable[n].i);
      setProgress({ done: n + 1, total: optimizable.length });
    }
    setOptimizingAll(false);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white/60 backdrop-blur p-5 flex items-center justify-between gap-4">
        <div>
          <div className="text-sm text-zinc-500">
            Audite jusqu'à 15 pages du site, calcule un verdict global et te
            permet d'optimiser tout en un clic.
          </div>
          <div className="text-xs text-zinc-400 mt-1">
            Cible : <span className="font-mono">{rootUrl}</span>
          </div>
        </div>
        <button
          onClick={runHealthCheck}
          disabled={loading}
          className="rounded-lg bg-brand hover:bg-brand-400 disabled:opacity-50 px-5 py-2.5 text-sm font-semibold text-white shrink-0"
        >
          {loading ? "Audit en cours…" : "Lancer l'audit du site"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-zinc-200 bg-white/40 p-8 text-center text-sm text-zinc-500">
          Découverte des pages, audit batch (5 en parallèle), agrégation… Peut prendre 30-60s.
        </div>
      )}

      {health && <HealthVerdict health={health} />}

      {pages.length > 0 && (
        <PagesTable
          pages={pages}
          siteId={siteId}
          onOptimizeOne={optimizeOne}
          onOptimizeAll={optimizeAll}
          optimizingAll={optimizingAll}
          progress={progress}
        />
      )}
    </div>
  );
}

function HealthVerdict({ health }: { health: SiteHealth }) {
  const v = VERDICT_STYLE[health.verdict];
  return (
    <div className={`rounded-2xl border p-6 space-y-4 ${v.color}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-mono opacity-70 mb-1">Verdict</div>
          <div className="text-3xl font-bold">
            {v.emoji} {v.label} — {health.avgScore}/100
          </div>
          <div className="text-sm opacity-90 mt-2 max-w-2xl">{health.summary}</div>
        </div>
        <div className="text-right text-sm opacity-90 shrink-0">
          <div>
            {health.editablePagesCount} pages éditables
            {health.archivePagesCount > 0 && (
              <span className="text-zinc-400 text-xs">
                {" "}+ {health.archivePagesCount} archive(s) WP
              </span>
            )}
          </div>
          <div className="text-xs mt-1">
            <span className="text-emerald-700">{health.scoreDistribution.excellent}</span> ≥90 ·{" "}
            <span className="text-brand-700">{health.scoreDistribution.good}</span> 70-89 ·{" "}
            <span className="text-amber-800">{health.scoreDistribution.needsWork}</span> 50-69 ·{" "}
            <span className="text-red-700">{health.scoreDistribution.poor}</span> &lt;50
          </div>
          {health.archivePagesCount > 0 && (
            <div className="text-[10px] text-zinc-400 mt-1 italic">
              (Score et stats calculés hors archives WP)
            </div>
          )}
        </div>
      </div>

      {health.systemicIssues.length > 0 && (
        <div>
          <div className="text-xs uppercase font-mono opacity-70 mb-2">
            Issues systémiques (≥30% des pages)
          </div>
          <div className="flex flex-wrap gap-2">
            {health.systemicIssues.map((s) => (
              <span
                key={s.category}
                className="rounded-full bg-black/20 text-xs px-3 py-1 font-mono"
              >
                {ISSUE_CATEGORY_LABEL[s.category] ?? s.category} · {s.pctPages}%
              </span>
            ))}
          </div>
        </div>
      )}

      {health.recommendRebuild && (
        <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4 mt-4">
          <div className="font-bold text-red-200 text-base mb-2">
            🔥 Refonte du site recommandée
          </div>
          <div className="text-sm text-red-100/90 mb-3">
            Le site présente des problèmes structurels qui rendent les
            corrections page-par-page peu efficaces. Une refonte complète
            (nouveau site avec contenu repris et amélioré) serait plus rentable.
          </div>
          <ul className="text-xs text-red-100/80 list-disc list-inside space-y-1">
            {health.rebuildReasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          <div className="mt-3 text-xs text-red-200/70 italic">
            Cette fonctionnalité (génération de site) sera disponible
            prochainement. En attendant, contactez-nous pour devis.
          </div>
        </div>
      )}
    </div>
  );
}

function PagesTable({
  pages,
  siteId,
  onOptimizeOne,
  onOptimizeAll,
  optimizingAll,
  progress,
}: {
  pages: PageRow[];
  siteId: string | null;
  onOptimizeOne: (idx: number) => void;
  onOptimizeAll: () => void;
  optimizingAll: boolean;
  progress: { done: number; total: number };
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/60 backdrop-blur overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-zinc-200">
        <h2 className="text-lg font-semibold">
          Pages auditées ({pages.length})
        </h2>
        {siteId ? (
          <button
            onClick={onOptimizeAll}
            disabled={optimizingAll}
            className="rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white"
          >
            {optimizingAll
              ? `Optimisation ${progress.done}/${progress.total}…`
              : "✨ Tout optimiser (auto)"}
          </button>
        ) : (
          <span className="text-xs text-zinc-400 italic">
            Site non connecté → optimisation indisponible
          </span>
        )}
      </div>

      <div className="divide-y divide-zinc-800">
        {pages.map((page, idx) => (
          <PageRowItem
            key={page.url}
            page={page}
            idx={idx}
            siteId={siteId}
            onOptimize={onOptimizeOne}
          />
        ))}
      </div>
    </div>
  );
}

function PageRowItem({
  page,
  idx,
  siteId,
  onOptimize,
}: {
  page: PageRow;
  idx: number;
  siteId: string | null;
  onOptimize: (idx: number) => void;
}) {
  const scoreColor =
    page.score >= 80 ? "text-emerald-700" : page.score >= 60 ? "text-amber-800" : "text-red-700";

  const isArchive = page.kind === "archive";

  // Détecte si la page a une issue "contenu maigre" restante (après optimisation OU dans l'audit initial)
  const hasContentIssue = page.optimizeResult?.remainingIssues?.some(
    (i) => i.category === "content",
  );
  const [enrichOpen, setEnrichOpen] = useState(false);

  return (
    <div className={`p-4 space-y-2 ${isArchive ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-4">
        <div className={`text-2xl font-bold w-16 text-center ${scoreColor}`}>{page.score}</div>
        {/* Thumbnail de la page (mshots WordPress.com) */}
        <a
          href={page.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 hidden sm:block w-24 h-16 rounded border border-zinc-200 overflow-hidden bg-white hover:border-brand transition-colors"
          title="Ouvrir la page"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://s0.wp.com/mshots/v1/${encodeURIComponent(page.url)}?w=240&h=160`}
            alt=""
            className="w-full h-full object-cover object-top"
            loading="lazy"
          />
        </a>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <a
              href={page.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-brand-700 hover:text-brand-700 truncate"
            >
              {page.url}
            </a>
            {isArchive && (
              <span
                title="Page d'archive WordPress (catégorie / tag / auteur). Non éditable directement."
                className="text-[10px] font-mono uppercase rounded-full border border-zinc-300 bg-zinc-100 px-2 py-0.5 text-zinc-500 shrink-0"
              >
                ARCHIVE WP
              </span>
            )}
          </div>
          <div className="text-xs text-zinc-400 truncate">
            {page.title ?? "(sans title)"} · {page.issues} issue(s) ·{" "}
            {page.wordCount} mots
          </div>
        </div>
        {siteId && !isArchive && page.score >= 95 && page.issues === 0 && (
          <span className="text-[10px] text-emerald-700 font-semibold shrink-0">
            ✓ Parfait
          </span>
        )}
        {siteId && !isArchive && !(page.score >= 95 && page.issues === 0) && (
          <button
            onClick={() => onOptimize(idx)}
            disabled={page.optimizing}
            className="rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 shrink-0"
          >
            {page.optimizing ? "…" : "Optimiser"}
          </button>
        )}
        {siteId && isArchive && (
          <span className="text-[10px] text-zinc-400 italic shrink-0 max-w-[160px] text-right">
            Archive WP — gérer via plugin SEO (Yoast/RankMath)
          </span>
        )}
      </div>

      {page.optimizeResult && (
        <div className="ml-20 rounded-lg border border-emerald-500/30 bg-emerald-50 p-3 text-xs space-y-2">
          <div className="font-semibold text-emerald-700">
            ✓ Score : {page.optimizeResult.scoreBefore} → {page.optimizeResult.scoreAfter} (
            {page.optimizeResult.delta >= 0 ? "+" : ""}
            {page.optimizeResult.delta})
          </div>
          {page.optimizeResult.targetKeyword && (
            <div className="text-zinc-700">
              Mot-clé cible :{" "}
              <span className="text-brand-700 font-semibold">
                {page.optimizeResult.targetKeyword}
              </span>
            </div>
          )}
          {page.optimizeResult.applied.length > 0 && (
            <div>
              <div className="text-zinc-500 font-mono text-[10px] uppercase mb-1">
                Fixes appliqués
              </div>
              <ul className="space-y-1">
                {page.optimizeResult.applied.map((a, i) => (
                  <li
                    key={i}
                    className={a.ok ? "text-emerald-200" : "text-amber-800"}
                  >
                    {a.ok ? "✓" : "⚠"} {a.fixId} : {a.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {page.optimizeResult.remainingIssues &&
            page.optimizeResult.remainingIssues.length > 0 && (
              <div className="pt-2 border-t border-emerald-500/20 space-y-2">
                <div className="text-zinc-500 font-mono text-[10px] uppercase mb-1">
                  Issues restantes
                </div>
                <ul className="space-y-1">
                  {page.optimizeResult.remainingIssues.map((i, idx) => (
                    <li
                      key={idx}
                      className={
                        i.autoFixable ? "text-amber-800" : "text-zinc-500"
                      }
                    >
                      {i.autoFixable ? "⚠" : "🔒"} {i.message}
                      {!i.autoFixable && i.category !== "content" && (
                        <span className="text-[10px] text-zinc-400 ml-1">
                          (action manuelle requise)
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {hasContentIssue && siteId && (
                  <button
                    onClick={() => setEnrichOpen(true)}
                    className="w-full rounded-md bg-brand hover:bg-brand-400 text-white text-xs font-semibold py-2 mt-2"
                  >
                    ✨ Enrichir le contenu (validation requise)
                  </button>
                )}
              </div>
            )}
        </div>
      )}

      {enrichOpen && siteId && (
        <EnrichContentModal
          siteId={siteId}
          pageUrl={page.url}
          targetKeyword={page.optimizeResult?.targetKeyword}
          onClose={() => setEnrichOpen(false)}
          onApplied={() => {
            setEnrichOpen(false);
            // Re-trigger une optimisation pour ré-auditer
            setTimeout(() => onOptimize(idx), 500);
          }}
        />
      )}

      {page.optimizeError && (
        <div className="ml-20 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {page.optimizeError}
        </div>
      )}
    </div>
  );
}
