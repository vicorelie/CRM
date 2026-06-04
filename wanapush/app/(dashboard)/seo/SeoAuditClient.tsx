"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SiteSummary = {
  id: string;
  url: string;
  label: string | null;
  platform: string;
  status: string;
};

type Issue = {
  severity: "critical" | "warning" | "info";
  message: string;
  category?: string;
};
type CoreWebVitalMetric = {
  value: number;
  unit: "ms" | "score";
  rating: "good" | "needs-improvement" | "poor" | null;
} | null;
type CoreWebVitals = {
  source: "field" | "lab" | "none";
  lcp: CoreWebVitalMetric;
  inp: CoreWebVitalMetric;
  cls: CoreWebVitalMetric;
  fcp: CoreWebVitalMetric;
  ttfb: CoreWebVitalMetric;
  lighthouseScore: number | null;
  allGood: boolean | null;
} | null;

type Audit = {
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
  h1: { count: number; values: string[]; ok: boolean };
  h2Count: number;
  h3Count: number;
  firstParagraph: string | null;
  images: {
    total: number;
    withAlt: number;
    missingAlt: number;
    missingAltUrls: string[];
  };
  links: { internal: number; external: number };
  wordCount: number;
  openGraph: { title: string | null; description: string | null; image: string | null };
  schemaOrg: {
    total: number;
    byType: Record<string, number>;
    hasArticle: boolean;
    hasFaq: boolean;
    hasOrganization: boolean;
    hasBreadcrumb: boolean;
    hasProduct: boolean;
  };
  eeat: {
    author: string | null;
    authorSource: "meta" | "schema" | "byline" | null;
    datePublished: string | null;
    dateModified: string | null;
    authorUrl: string | null;
  };
  coreWebVitals: CoreWebVitals;
  hasFavicon: boolean;
  hasHttps: boolean;
  score: number;
  issues: Issue[];
};

type AiPayload = { text: string; provider: "openai" | "anthropic"; model: string };
type PsiPayload = {
  opportunities: { id: string; title: string; description: string; savingsMs: number }[];
  lighthouseScore: number | null;
  source: "field" | "lab" | "none";
  error: string | null;
};
type Result = { audit: Audit; ai: AiPayload | null; pageSpeed: PsiPayload | null };

const SEVERITY_STYLE: Record<Issue["severity"], string> = {
  critical: "border-red-200 bg-red-50 text-red-200",
  warning: "border-amber-500/40 bg-amber-50 text-amber-200",
  info: "border-zinc-300/30 bg-zinc-100 text-zinc-700",
};

const SEVERITY_LABEL: Record<Issue["severity"], string> = {
  critical: "Critique",
  warning: "Attention",
  info: "Info",
};

export function SeoAuditClient() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sites, setSites] = useState<SiteSummary[] | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");

  // Charge la liste des sites connectés au montage.
  useEffect(() => {
    fetch("/api/sites")
      .then((r) => r.json())
      .then((j) => {
        const list: SiteSummary[] = j.sites ?? [];
        setSites(list);
        const connected = list.find((s) => s.status === "CONNECTED");
        if (connected) {
          setSelectedSiteId(connected.id);
          setUrl(connected.url);
        }
      })
      .catch(() => setSites([]));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch("/api/seo/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Erreur");
      } else {
        setResult(json);
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  const connectedSite = sites?.find((s) => s.id === selectedSiteId && s.status === "CONNECTED");

  return (
    <div className="space-y-6">
      {sites && sites.length === 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-50 p-5 flex items-start gap-4">
          <div className="text-3xl">⚠️</div>
          <div className="space-y-2 flex-1">
            <h3 className="font-semibold text-amber-200">
              Aucun site connecté
            </h3>
            <p className="text-sm text-amber-100/80">
              L'audit ci-dessous est <strong>en lecture seule</strong> : il
              détecte les problèmes mais ne peut pas les corriger. Pour que
              WanaPush <strong>modifie ton site automatiquement</strong>,
              connecte-le d'abord.
            </p>
            <Link
              href="/sites"
              className="inline-block rounded-lg bg-amber-500 hover:bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 mt-1"
            >
              + Connecter mon site
            </Link>
          </div>
        </div>
      )}

      {sites && sites.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white/60 backdrop-blur p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <label className="text-sm text-zinc-500 shrink-0">Site connecté :</label>
          <select
            value={selectedSiteId}
            onChange={(e) => {
              setSelectedSiteId(e.target.value);
              const s = sites.find((x) => x.id === e.target.value);
              if (s) setUrl(s.url);
            }}
            className="flex-1 rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm text-zinc-900"
          >
            <option value="">— Aucun (audit lecture seule) —</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label || s.url} ({s.platform}, {s.status})
              </option>
            ))}
          </select>
          <Link
            href="/sites"
            className="text-xs rounded-lg border border-zinc-200 hover:border-zinc-300 px-3 py-2 text-zinc-700 shrink-0"
          >
            Gérer
          </Link>
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-zinc-200 bg-white/60 backdrop-blur p-4"
      >
        <input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://exemple.com"
          className="flex-1 rounded-lg border border-zinc-200 bg-white/60 px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors px-6 py-2.5 text-sm font-semibold text-white"
        >
          {loading ? "Analyse en cours…" : "Lancer l'audit"}
        </button>
      </form>

      {connectedSite && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-50 px-4 py-2 text-xs text-emerald-700">
          ✓ Site connecté ({connectedSite.platform}) — les fixes pourront être
          appliqués directement (en cours de développement).
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !result && (
        <div className="rounded-2xl border border-zinc-200 bg-white/40 p-6 text-sm text-zinc-500 text-center">
          Téléchargement de la page, parsing du HTML, calcul du score…
        </div>
      )}

      {result && (
        <Results
          result={result}
          siteId={connectedSite?.id ?? null}
          pageUrl={url}
          onReaudit={() => {
            // Re-déclenche l'audit après un fix appliqué pour valider
            setLoading(true);
            fetch("/api/seo/audit", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url }),
            })
              .then((r) => r.json())
              .then((j) => setResult(j))
              .finally(() => setLoading(false));
          }}
        />
      )}
    </div>
  );
}

// Mappe une issue détectée vers un fixId applicable, si possible.
function inferFixId(issue: Issue): string | null {
  // Priorité à la category (set côté serveur) si présente
  const cat = issue.category;
  if (cat) {
    if (cat === "title") return "update-title";
    if (cat === "meta") return "update-meta-description";
    if (cat === "canonical") return "add-canonical";
    if (cat === "og") return "add-og-tags";
    if (cat === "alt") return "fix-image-alts";
    if (cat === "h1") return "fix-h1";
    if (cat === "schema") return "add-schema-article";
  }
  // Fallback texte
  const m = issue.message.toLowerCase();
  if (m.includes("title de") || m.includes("aucun <title>")) return "update-title";
  if (m.includes("meta description")) return "update-meta-description";
  if (m.includes("canonical")) return "add-canonical";
  if (m.includes("open graph") || m.includes("og:")) return "add-og-tags";
  if (m.includes("alt")) return "fix-image-alts";
  if (m.includes("h1")) return "fix-h1";
  if (m.includes("schema.org")) return "add-schema-article";
  return null;
}

function Results({
  result,
  siteId,
  pageUrl,
  onReaudit,
}: {
  result: Result;
  siteId: string | null;
  pageUrl: string;
  onReaudit: () => void;
}) {
  const { audit, ai } = result;
  const scoreColor =
    audit.score >= 80
      ? "text-emerald-700"
      : audit.score >= 60
        ? "text-amber-800"
        : "text-red-700";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white/60 backdrop-blur p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
        <div>
          <div className="text-xs text-zinc-400">Score WanaPush</div>
          <div className={`text-6xl font-bold ${scoreColor}`}>
            {audit.score}
            <span className="text-2xl text-zinc-300">/100</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <Stat label="Statut HTTP" value={audit.status.toString()} />
          <Stat label="Temps" value={`${audit.loadMs} ms`} />
          <Stat label="Poids" value={`${(audit.bytes / 1024).toFixed(1)} ko`} />
          <Stat label="Mots" value={audit.wordCount.toString()} />
          <Stat
            label="Liens int. / ext."
            value={`${audit.links.internal} / ${audit.links.external}`}
          />
          <Stat
            label="Images alt"
            value={`${audit.images.withAlt}/${audit.images.total}`}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white/60 backdrop-blur p-6 space-y-4">
        <h2 className="text-lg font-semibold">
          Issues détectées ({audit.issues.length})
        </h2>
        {audit.issues.length === 0 ? (
          <div className="text-sm text-emerald-700">
            ✓ Aucune issue détectée par les règles automatiques.
          </div>
        ) : (
          <ul className="space-y-2">
            {audit.issues.map((issue, i) => {
              const fixId = inferFixId(issue);
              return (
                <IssueRow
                  key={i}
                  issue={issue}
                  fixId={fixId}
                  siteId={siteId}
                  pageUrl={pageUrl}
                  audit={audit}
                  onApplied={onReaudit}
                />
              );
            })}
          </ul>
        )}
      </div>

      {audit.coreWebVitals && audit.coreWebVitals.source !== "none" && (
        <CoreWebVitalsPanel cwv={audit.coreWebVitals} />
      )}

      <SchemaOrgPanel schema={audit.schemaOrg} />

      <EeatPanel eeat={audit.eeat} />

      <div className="rounded-2xl border border-zinc-200 bg-white/60 backdrop-blur p-6 space-y-4">
        <h2 className="text-lg font-semibold">Métadonnées</h2>
        <dl className="grid grid-cols-1 gap-y-2 text-sm">
          <Row
            label="Title"
            value={audit.title.value}
            extra={`${audit.title.length} car.`}
            ok={audit.title.ok}
          />
          <Row
            label="Meta description"
            value={audit.metaDescription.value}
            extra={`${audit.metaDescription.length} car.`}
            ok={audit.metaDescription.ok}
          />
          <Row label="H1" value={audit.h1.values.join(" | ")} extra={`${audit.h1.count} H1`} ok={audit.h1.ok} />
          <Row label="H2 / H3" value={`${audit.h2Count} H2, ${audit.h3Count} H3`} />
          <Row label="Canonical" value={audit.canonical} />
          <Row label="Robots" value={audit.robotsMeta} />
          <Row label="Lang" value={audit.lang} />
          <Row label="Viewport" value={audit.viewport} />
          <Row label="OG title" value={audit.openGraph.title} />
          <Row label="OG description" value={audit.openGraph.description} />
          <Row label="Schema.org (JSON-LD)" value={audit.schemaOrg.total > 0 ? `${audit.schemaOrg.total} bloc(s)` : null} />
        </dl>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white/60 backdrop-blur p-6 space-y-3">
        <h2 className="text-lg font-semibold">
          Recommandations IA{" "}
          {ai && (
            <span className="text-xs font-normal text-zinc-400">
              ({ai.provider} · {ai.model})
            </span>
          )}
        </h2>
        {ai ? (
          <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-zinc-800">
            {ai.text}
          </div>
        ) : (
          <div className="rounded-lg border border-amber-500/30 bg-amber-50 px-4 py-3 text-sm text-amber-200">
            <strong>Aucune clé IA configurée.</strong> Renseigne{" "}
            <code className="font-mono text-xs">OPENAI_API_KEY</code> ou{" "}
            <code className="font-mono text-xs">ANTHROPIC_API_KEY</code> dans{" "}
            <code className="font-mono text-xs">.env.local</code> et redémarre
            le serveur.
          </div>
        )}
      </div>
    </div>
  );
}

function IssueRow({
  issue,
  fixId,
  siteId,
  pageUrl,
  audit,
  onApplied,
}: {
  issue: Issue;
  fixId: string | null;
  siteId: string | null;
  pageUrl: string;
  audit: Audit;
  onApplied: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<"suggest" | "apply" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<Record<string, string> | null>(null);

  async function getSuggestion() {
    setError(null);
    setLoading("suggest");
    try {
      const res = await fetch("/api/seo/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixId, pageUrl, audit }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Erreur");
      setSuggestion(json.suggestion);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(null);
    }
  }

  async function applyFix() {
    if (!suggestion || !siteId) return;
    setError(null);
    setSuccess(null);
    setLoading("apply");
    try {
      const res = await fetch("/api/seo/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, pageUrl, fixId, data: suggestion }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json?.message ?? json?.error ?? "Erreur");
      }
      setSuccess(json.message);
      setTimeout(() => onApplied(), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(null);
    }
  }

  const canFix = fixId && siteId;

  return (
    <li
      className={`rounded-lg border ${SEVERITY_STYLE[issue.severity]} ${open ? "p-3" : "px-3 py-2"} text-sm`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <span className="font-mono text-[10px] uppercase mr-2 opacity-70">
            {SEVERITY_LABEL[issue.severity]}
          </span>
          {issue.message}
        </div>
        {canFix && (
          <button
            onClick={() => {
              setOpen(!open);
              if (!open && !suggestion) getSuggestion();
            }}
            className="shrink-0 text-xs rounded-md bg-emerald-500 hover:bg-emerald-400 text-white px-3 py-1 font-semibold"
          >
            {open ? "✕" : "Corriger"}
          </button>
        )}
        {fixId && !siteId && (
          <span className="shrink-0 text-[10px] text-zinc-400 italic">
            Site non connecté
          </span>
        )}
      </div>

      {open && canFix && (
        <div className="mt-3 pt-3 border-t border-current/20 space-y-3">
          {loading === "suggest" && (
            <div className="text-xs text-zinc-500">L'IA réfléchit…</div>
          )}

          {suggestion && (
            <>
              <div className="text-xs text-zinc-500">
                Suggestion IA — modifie si besoin avant d'appliquer :
              </div>
              {Object.entries(suggestion).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-zinc-400">
                    {key} ({value.length} car.)
                  </label>
                  <textarea
                    value={value}
                    onChange={(e) =>
                      setSuggestion({ ...suggestion, [key]: e.target.value })
                    }
                    rows={key === "description" || key === "ogDescription" ? 3 : 2}
                    className="w-full rounded border border-zinc-200 bg-white/80 px-2 py-1.5 text-sm text-zinc-900 font-normal"
                  />
                </div>
              ))}
              <div className="flex gap-2">
                <button
                  onClick={applyFix}
                  disabled={loading === "apply"}
                  className="flex-1 rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm py-2 font-semibold"
                >
                  {loading === "apply" ? "Application…" : "Appliquer sur le site"}
                </button>
                <button
                  onClick={getSuggestion}
                  disabled={loading !== null}
                  className="rounded-md border border-zinc-200 hover:border-zinc-300 text-zinc-700 text-sm px-3"
                >
                  ↻ Re-suggérer
                </button>
              </div>
            </>
          )}

          {error && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded border border-emerald-500/40 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              ✓ {success} — re-audit dans 1.5s…
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function CoreWebVitalsPanel({ cwv }: { cwv: NonNullable<CoreWebVitals> }) {
  const RATING_COLOR: Record<string, string> = {
    good: "text-emerald-700 border-emerald-500/40 bg-emerald-50",
    "needs-improvement": "text-amber-800 border-amber-500/40 bg-amber-50",
    poor: "text-red-700 border-red-200 bg-red-50",
  };
  const fmt = (m: CoreWebVitalMetric) => {
    if (!m) return "—";
    if (m.unit === "score") return m.value.toFixed(3);
    return m.value < 1000 ? `${Math.round(m.value)} ms` : `${(m.value / 1000).toFixed(2)} s`;
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/60 backdrop-blur p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Core Web Vitals{" "}
          <span className="text-xs font-normal text-zinc-400">
            ({cwv.source === "field" ? "données réelles utilisateurs Chrome" : "données lab Lighthouse"}
            {cwv.lighthouseScore !== null && ` · score Lighthouse ${cwv.lighthouseScore}/100`})
          </span>
        </h2>
        {cwv.allGood !== null && (
          <span
            className={`text-xs font-mono uppercase rounded-full px-3 py-1 border ${
              cwv.allGood
                ? "text-emerald-700 border-emerald-500/40 bg-emerald-50"
                : "text-amber-800 border-amber-500/40 bg-amber-50"
            }`}
          >
            {cwv.allGood ? "✓ All Good" : "À améliorer"}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {([
          ["LCP", cwv.lcp, "<2.5s"],
          ["INP", cwv.inp, "<200ms"],
          ["CLS", cwv.cls, "<0.1"],
          ["FCP", cwv.fcp, "<1.8s"],
          ["TTFB", cwv.ttfb, "<800ms"],
        ] as const).map(([name, m, target]) => (
          <div
            key={name}
            className={`rounded-lg border p-3 ${m?.rating ? RATING_COLOR[m.rating] : "border-zinc-200 bg-white/40 text-zinc-400"}`}
          >
            <div className="text-[10px] font-mono uppercase opacity-70">{name}</div>
            <div className="text-xl font-bold mt-1">{fmt(m)}</div>
            <div className="text-[10px] opacity-60">cible {target}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SchemaOrgPanel({ schema }: { schema: Audit["schemaOrg"] }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/60 backdrop-blur p-6 space-y-3">
      <h2 className="text-lg font-semibold">
        Schema.org / JSON-LD{" "}
        <span className="text-xs font-normal text-zinc-400">
          (signal AI Overviews critique en 2026)
        </span>
      </h2>
      {schema.total === 0 ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-50 px-4 py-3 text-sm text-amber-200">
          ⚠ Aucun schema.org détecté. 93.8% des sources citées dans les AI
          Overviews ont au moins un type schema implémenté.
        </div>
      ) : (
        <>
          <div className="text-sm text-zinc-700">
            {schema.total} bloc(s) JSON-LD trouvé(s) :
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(schema.byType).map(([type, count]) => (
              <span
                key={type}
                className="rounded-full bg-brand/15 text-brand-700 text-xs font-mono px-2.5 py-1 border border-brand/30"
              >
                {type} {count > 1 && `× ${count}`}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 text-xs">
            {[
              ["Article", schema.hasArticle],
              ["FAQPage", schema.hasFaq],
              ["Organization", schema.hasOrganization],
              ["BreadcrumbList", schema.hasBreadcrumb],
              ["Product", schema.hasProduct],
            ].map(([label, ok]) => (
              <div
                key={label as string}
                className={ok ? "text-emerald-700" : "text-zinc-300"}
              >
                {ok ? "✓" : "○"} {label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EeatPanel({ eeat }: { eeat: Audit["eeat"] }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/60 backdrop-blur p-6 space-y-3">
      <h2 className="text-lg font-semibold">
        E-E-A-T{" "}
        <span className="text-xs font-normal text-zinc-400">
          (Experience, Expertise, Authoritativeness, Trust)
        </span>
      </h2>
      <dl className="grid grid-cols-1 gap-2 text-sm">
        <Row
          label="Auteur"
          value={
            eeat.author
              ? `${eeat.author}${eeat.authorSource ? ` (source: ${eeat.authorSource})` : ""}`
              : null
          }
          ok={!!eeat.author}
        />
        <Row
          label="Date publication"
          value={eeat.datePublished}
          ok={!!eeat.datePublished}
        />
        <Row
          label="Date modification"
          value={eeat.dateModified}
          ok={!!eeat.dateModified}
        />
        {eeat.authorUrl && <Row label="Page auteur" value={eeat.authorUrl} ok={true} />}
      </dl>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="text-base font-medium text-zinc-900">{value}</div>
    </div>
  );
}

function Row({
  label,
  value,
  extra,
  ok,
}: {
  label: string;
  value: string | null;
  extra?: string;
  ok?: boolean;
}) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-4 border-b border-zinc-200/60 pb-2">
      <dt className="text-zinc-400">{label}</dt>
      <dd className="flex items-start gap-2">
        <span className={value ? "text-zinc-800" : "text-zinc-300 italic"}>
          {value ?? "—"}
        </span>
        {extra && <span className="text-xs text-zinc-400 shrink-0">{extra}</span>}
        {ok !== undefined && (
          <span
            className={`text-xs shrink-0 ${ok ? "text-emerald-700" : "text-amber-800"}`}
          >
            {ok ? "✓" : "⚠"}
          </span>
        )}
      </dd>
    </div>
  );
}
