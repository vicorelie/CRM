"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Section = {
  title: string;
  paragraphs: string[];
  rationale: string;
};

type Suggestion = {
  pageUrl: string;
  currentWordCount: number;
  targetKeyword: string;
  sections: Section[];
  provider: string;
  model: string;
};

type Rewrite = {
  id: number;
  type: "p" | "h2" | "h3";
  original: string;
  suggested: string;
  reason: string;
  selected?: boolean;
  edited?: string;
};

type Mode = "rewrite" | "enrich";

type Props = {
  siteId: string;
  pageUrl: string;
  targetKeyword?: string;
  onClose: () => void;
  onApplied: () => void;
};

type DesignScan = {
  containerClass: string;
  sectionClass: string;
  h2Class: string;
  h3Class: string;
  pClass: string;
  articleClass: string;
  hasDesignSignals: boolean;
  detectedFramework: string;
};

const FRAMEWORK_LABELS: Record<string, { label: string; color: string }> = {
  bootstrap: { label: "Bootstrap", color: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
  tailwind: { label: "Tailwind CSS", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" },
  elementor: { label: "Elementor", color: "bg-pink-500/20 text-pink-300 border-pink-500/40" },
  divi: { label: "Divi", color: "bg-orange-500/20 text-orange-300 border-orange-500/40" },
  "wp-blocks": { label: "WordPress Blocks", color: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
  custom: { label: "CSS custom", color: "bg-zinc-100 text-zinc-700 border-zinc-300/40" },
  unknown: { label: "Aucun design détecté", color: "bg-amber-50 text-amber-800 border-amber-500/40" },
};

export function EnrichContentModal({
  siteId,
  pageUrl,
  targetKeyword,
  onClose,
  onApplied,
}: Props) {
  // Mode par défaut : "rewrite" (préserve le design)
  const [mode, setMode] = useState<Mode>("rewrite");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [sections, setSections] = useState<(Section & { selected: boolean })[]>([]);
  const [rewrites, setRewrites] = useState<Rewrite[]>([]);
  const [applying, setApplying] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [design, setDesign] = useState<DesignScan | null>(null);
  const [scanLoading, setScanLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // État de l'aperçu "avec modifications" (preview avant apply)
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Mount portal côté client uniquement (SSR safety)
  useEffect(() => setMounted(true), []);

  // Cleanup blob URL à la fermeture
  useEffect(() => {
    return () => {
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    };
  }, [previewBlobUrl]);

  async function generatePreview() {
    const html = buildHtmlPayload();
    if (!html) {
      setPreviewError("Aucune section sélectionnée");
      return;
    }
    setPreviewError(null);
    setPreviewLoading(true);
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }
    try {
      const res = await fetch("/api/seo/preview-enrichment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageUrl, htmlToInject: html }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      setPreviewBlobUrl(URL.createObjectURL(blob));
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setPreviewLoading(false);
    }
  }

  // Scan design une seule fois (utile aux 2 modes)
  useEffect(() => {
    fetch("/api/seo/scan-design", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageUrl }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (j?.design) setDesign(j.design);
      })
      .catch(() => {})
      .finally(() => setScanLoading(false));
  }, [pageUrl]);

  // Charge les suggestions IA selon le mode actif
  useEffect(() => {
    setLoading(true);
    setError(null);

    const endpoint =
      mode === "rewrite"
        ? "/api/seo/suggest-rewrite"
        : "/api/seo/suggest-content";

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageUrl, targetKeyword }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (j?.error) {
          setError(j.error);
        } else if (mode === "rewrite") {
          setRewrites(
            (j.rewrites ?? []).map((r: Rewrite) => ({
              ...r,
              selected: !!r.suggested,
              edited: r.suggested,
            })),
          );
          setSuggestion({
            pageUrl: j.pageUrl,
            currentWordCount: j.blocksFound ?? 0,
            targetKeyword: j.targetKeyword,
            sections: [],
            provider: j.provider,
            model: j.model,
          });
        } else {
          setSuggestion(j);
          setSections(j.sections.map((s: Section) => ({ ...s, selected: true })));
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }, [pageUrl, targetKeyword, mode]);

  function buildHtmlPayload(): string {
    const selected = sections.filter((s) => s.selected);
    if (selected.length === 0) return "";
    return selected
      .map(
        (s) => `<section class="wanapush-extra">
  <h2>${escapeHtml(s.title)}</h2>
  ${s.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n  ")}
</section>`,
      )
      .join("\n");
  }

  async function applyEnrichment() {
    setApplying(true);
    setError(null);
    try {
      let payload: { fixId: string; data: Record<string, string> };
      if (mode === "rewrite") {
        const pairs = rewrites
          .filter((r) => r.selected && (r.edited ?? r.suggested).trim() && r.original)
          .map((r) => ({
            original: r.original,
            replacement: (r.edited ?? r.suggested).trim(),
          }));
        if (pairs.length === 0) {
          throw new Error("Aucune réécriture sélectionnée");
        }
        payload = {
          fixId: "rewrite-content",
          data: { rewrites: JSON.stringify(pairs) },
        };
      } else {
        const html = buildHtmlPayload();
        if (!html) throw new Error("Aucune section sélectionnée");
        payload = { fixId: "enrich-content", data: { html } };
      }
      const res = await fetch("/api/seo/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, pageUrl, ...payload }),
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
      setApplying(false);
    }
  }

  const totalWordsAdded = sections
    .filter((s) => s.selected)
    .reduce((n, s) => n + s.paragraphs.join(" ").split(/\s+/).length, 0);

  const selectedRewrites = rewrites.filter(
    (r) => r.selected && (r.edited ?? r.suggested).trim() && r.original,
  );
  const canApply =
    mode === "enrich" ? totalWordsAdded > 0 : selectedRewrites.length > 0;

  if (!mounted) return null;

  // Rendu via Portal dans document.body pour échapper aux containing blocks
  // créés par les backdrop-filter / transform / filter des parents (sinon
  // position: fixed n'est pas relatif au viewport et la modal est tronquée).
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-50 border border-zinc-200 rounded-2xl max-w-3xl w-full h-[95vh] sm:h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — shrink-0 pour ne jamais être réduit */}
        <div className="shrink-0 border-b border-zinc-200 p-4 sm:p-5 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-zinc-900">
              ✨ Enrichir le contenu
            </h2>
            <p className="text-xs text-zinc-500 mt-1 truncate">
              {pageUrl}
            </p>
            {suggestion && (
              <p className="text-xs text-brand-700 mt-1">
                Mot-clé cible : <strong>{suggestion.targetKeyword}</strong> ·{" "}
                Contenu actuel : {suggestion.currentWordCount} mots
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-800 text-2xl leading-none shrink-0"
          >
            ×
          </button>
        </div>

        {/* Tabs Mode (rewrite / enrich) */}
        <div className="shrink-0 flex border-b border-zinc-200 bg-white/40">
          <button
            onClick={() => setMode("rewrite")}
            className={`flex-1 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              mode === "rewrite"
                ? "border-brand text-brand-700 bg-brand/10"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            ✏️ Réécrire les textes existants
            <div className="text-[10px] font-normal opacity-70">
              Préserve le design 100%
            </div>
          </button>
          <button
            onClick={() => setMode("enrich")}
            className={`flex-1 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              mode === "enrich"
                ? "border-brand text-brand-700 bg-brand/10"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            ➕ Enrichir (ajouter du contenu)
            <div className="text-[10px] font-normal opacity-70">
              Ajoute des sections en bas
            </div>
          </button>
        </div>

        {/* Body — flex-1 + min-h-0 critique pour activer overflow-y-auto en flex */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Aperçu visuel de la page */}
          <PagePreviewImage url={pageUrl} />

          {/* Panneau Scan Design */}
          <DesignScanPanel design={design} loading={scanLoading} />

          {loading && (
            <div className="text-center text-sm text-zinc-500 py-8">
              L'IA analyse le contexte et génère 3 sections additionnelles…
            </div>
          )}

          {error && !loading && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && mode === "enrich" && sections.length > 0 && (
            <>
              <div className="rounded-lg border border-amber-500/30 bg-amber-50 p-3 text-xs text-amber-200">
                ⚠️ <strong>Vérifie chaque section</strong> avant d'appliquer.
                L'IA ne connaît pas les détails spécifiques à ton produit
                (prix, fonctionnalités exactes, témoignages). Édite ou
                désélectionne ce qui n'est pas exact.
              </div>

              {sections.map((section, idx) => (
                <SectionEditor
                  key={idx}
                  section={section}
                  onChange={(updated) =>
                    setSections((curr) =>
                      curr.map((s, i) => (i === idx ? updated : s)),
                    )
                  }
                />
              ))}
            </>
          )}

          {!loading && mode === "rewrite" && (
            <>
              <div className="rounded-lg border border-brand/30 bg-brand/5 p-3 text-xs text-brand-700">
                ✏️ <strong>Mode réécriture</strong> — l'IA propose une version
                améliorée de chaque paragraphe/titre existant. Coche ce que tu
                veux remplacer, édite si besoin. Le texte EXACT trouvé sur la
                page sera remplacé in-place (préserve le design).
              </div>

              {rewrites.length === 0 && !error && (
                <div className="text-center text-sm text-zinc-500 py-8">
                  Aucun bloc trouvé à réécrire sur cette page.
                </div>
              )}

              {rewrites.map((rw, idx) => (
                <RewriteEditor
                  key={rw.id}
                  rewrite={rw}
                  onChange={(updated) =>
                    setRewrites((curr) => curr.map((r, i) => (i === idx ? updated : r)))
                  }
                />
              ))}
            </>
          )}

          {success && (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-50 p-3 text-sm text-emerald-700">
              ✓ {success}
            </div>
          )}
        </div>

        {/* Footer — shrink-0 + sticky visuellement (toujours visible en bas) */}
        {!loading && (sections.length > 0 || rewrites.length > 0) && !success && (
          <div className="shrink-0 border-t border-zinc-200 p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/40">
            <div className="text-xs text-zinc-500">
              {mode === "enrich" ? (
                <>
                  {sections.filter((s) => s.selected).length}/{sections.length} section(s)
                  sélectionnée(s) ·{" "}
                  <span className="text-emerald-700 font-semibold">
                    +{totalWordsAdded} mots
                  </span>
                </>
              ) : (
                <>
                  {selectedRewrites.length}/{rewrites.length} bloc(s) à réécrire
                </>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={onClose}
                className="rounded-md border border-zinc-200 hover:border-zinc-300 text-zinc-700 text-sm px-4 py-2"
              >
                Annuler
              </button>
              {mode === "enrich" && (
                <button
                  onClick={generatePreview}
                  disabled={previewLoading || !canApply}
                  className="rounded-md border border-brand/60 hover:bg-brand/10 disabled:opacity-50 text-brand-700 text-sm font-semibold px-4 py-2"
                >
                  {previewLoading ? "Génération…" : "👁 Voir l'aperçu"}
                </button>
              )}
              <button
                onClick={applyEnrichment}
                disabled={applying || !canApply}
                className="rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2"
              >
                {applying ? "Application…" : "✓ Appliquer sur le site"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Overlay PREVIEW (z-index supérieur à la modal) */}
      {(previewLoading || previewBlobUrl || previewError) && (
        <div
          className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur flex flex-col p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setPreviewBlobUrl(null);
              setPreviewError(null);
            }
          }}
        >
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl flex flex-col h-full max-w-5xl w-full mx-auto overflow-hidden shadow-2xl">
            <div className="shrink-0 border-b border-zinc-200 p-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-zinc-900">
                  👁 Aperçu de la page avec les modifications
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Le bloc encadré indigo = ce qui sera ajouté. Rien n'est encore
                  écrit sur ton site.
                </p>
              </div>
              <button
                onClick={() => {
                  setPreviewBlobUrl(null);
                  setPreviewError(null);
                }}
                className="text-zinc-400 hover:text-zinc-800 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto bg-white">
              {previewLoading && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-500">
                  <div className="size-10 rounded-full border-4 border-brand border-t-transparent animate-spin" />
                  <p className="text-sm">
                    Génération de l'aperçu… (5-30s selon la taille de la page)
                  </p>
                </div>
              )}
              {previewError && !previewLoading && (
                <div className="flex items-center justify-center h-full p-8">
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 max-w-md text-center">
                    ⚠️ {previewError}
                  </div>
                </div>
              )}
              {previewBlobUrl && !previewLoading && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewBlobUrl}
                  alt="Aperçu de la page avec les modifications"
                  className="w-full block"
                />
              )}
            </div>
            {previewBlobUrl && (
              <div className="shrink-0 border-t border-zinc-200 p-3 flex items-center justify-between gap-3 bg-white/40">
                <span className="text-xs text-zinc-500">
                  Tu vois exactement ce que le visiteur verra. Si OK, valide
                  avec le bouton vert.
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={generatePreview}
                    className="text-xs rounded border border-zinc-200 hover:border-zinc-300 text-zinc-700 px-3 py-1.5"
                  >
                    ↻ Re-générer
                  </button>
                  <button
                    onClick={() => {
                      setPreviewBlobUrl(null);
                      setPreviewError(null);
                    }}
                    className="text-xs rounded border border-zinc-200 hover:border-zinc-300 text-zinc-700 px-3 py-1.5"
                  >
                    Fermer l'aperçu
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}

function PagePreviewImage({ url }: { url: string }) {
  const [mode, setMode] = useState<"fullpage" | "viewport">("fullpage");
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // 2 modes :
  // - fullpage : notre endpoint /api/seo/screenshot (Puppeteer côté serveur, fiable)
  // - viewport : mshots WordPress.com (rapide pour aperçu rapide above-the-fold)
  const screenshotSrc =
    mode === "fullpage"
      ? `/api/seo/screenshot?url=${encodeURIComponent(url)}&fullPage=1&width=1024${retry > 0 ? `&refresh=1&t=${retry}` : ""}`
      : `https://s0.wp.com/mshots/v1/${encodeURIComponent(url)}?w=800&h=600${retry > 0 ? `&t=${retry}` : ""}`;

  useEffect(() => {
    setLoading(true);
    setFailed(false);
  }, [mode, retry]);

  // Auto-retry une fois pour mshots (peut renvoyer un placeholder au 1er coup)
  useEffect(() => {
    if (mode === "viewport" && loading && retry === 0 && !failed) {
      const timer = setTimeout(() => setRetry(1), 8000);
      return () => clearTimeout(timer);
    }
  }, [mode, loading, retry, failed]);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white/40 overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 text-xs flex-wrap gap-2">
        <span className="text-zinc-500 font-mono uppercase">📸 Aperçu visuel</span>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle mode */}
          <div className="flex border border-zinc-200 rounded overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setMode("fullpage");
                setRetry(0);
              }}
              className={`px-2 py-0.5 text-[10px] font-mono ${mode === "fullpage" ? "bg-brand text-white" : "text-zinc-500 hover:bg-zinc-100"}`}
            >
              Page entière
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("viewport");
                setRetry(0);
              }}
              className={`px-2 py-0.5 text-[10px] font-mono ${mode === "viewport" ? "bg-brand text-white" : "text-zinc-500 hover:bg-zinc-100"}`}
            >
              Au-dessus du fold
            </button>
          </div>
          {loading && (
            <span className="text-cyan-300 flex items-center gap-1">
              <span className="size-2 rounded-full bg-cyan-400 animate-pulse" />
              Capture…
            </span>
          )}
          <button
            type="button"
            onClick={() => setRetry((r) => r + 1)}
            className="text-zinc-400 hover:text-brand-700 underline"
          >
            ↻
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-brand-700 underline"
          >
            Ouvrir ↗
          </a>
        </div>
      </div>
      {/* Container scrollable : max-h-96 pour la fullpage qui peut être très haute */}
      <div className="relative bg-white max-h-96 overflow-y-auto">
        {failed && (
          <div className="flex items-center justify-center text-xs text-amber-800 text-center p-6 h-48">
            ⚠️ Aperçu indisponible. Clique sur "Ouvrir ↗" pour voir la page.
          </div>
        )}
        {!failed && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${mode}-${retry}`}
            src={screenshotSrc}
            alt={`Aperçu de ${url}`}
            className={`w-full transition-opacity ${loading ? "opacity-30" : "opacity-100"}`}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setFailed(true);
            }}
          />
        )}
      </div>
      <div className="text-[10px] text-zinc-300 px-3 py-1.5 border-t border-zinc-200">
        {mode === "fullpage"
          ? "Page entière (scroll dans l'aperçu) · capture serveur Puppeteer"
          : "Au-dessus de la ligne de flottaison · service mshots"}
      </div>
    </div>
  );
}

function DesignScanPanel({
  design,
  loading,
}: {
  design: DesignScan | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 px-3 py-2 text-xs text-cyan-200 flex items-center gap-2">
        <div className="size-3 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
        🎨 Scan du design de la page en cours…
      </div>
    );
  }
  if (!design) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-50 px-3 py-2 text-xs text-amber-200">
        ⚠️ Scan du design impossible (page inaccessible). Wrapper neutre utilisé.
      </div>
    );
  }

  const fw = FRAMEWORK_LABELS[design.detectedFramework] ?? FRAMEWORK_LABELS.unknown;
  const noSignals = !design.hasDesignSignals;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white/40 p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-zinc-400 font-mono uppercase">Scan design</span>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-mono ${fw.color}`}>
          {fw.label}
        </span>
        {noSignals && (
          <span className="text-amber-800 text-[10px] italic">
            (utilisera un wrapper neutre)
          </span>
        )}
        {!noSignals && (
          <span className="text-emerald-700 text-[10px]">
            ✓ Classes du thème reprises automatiquement
          </span>
        )}
      </div>

      {!noSignals && (
        <details className="text-[10px] text-zinc-500">
          <summary className="cursor-pointer hover:text-zinc-800">
            Voir les classes détectées
          </summary>
          <div className="mt-2 space-y-1 font-mono">
            {design.containerClass && (
              <div>
                <span className="text-zinc-400">container :</span>{" "}
                <code className="text-cyan-300">{design.containerClass}</code>
              </div>
            )}
            {design.sectionClass && (
              <div>
                <span className="text-zinc-400">section :</span>{" "}
                <code className="text-cyan-300">{design.sectionClass}</code>
              </div>
            )}
            {design.h2Class && (
              <div>
                <span className="text-zinc-400">h2 :</span>{" "}
                <code className="text-cyan-300">{design.h2Class}</code>
              </div>
            )}
            {design.h3Class && (
              <div>
                <span className="text-zinc-400">h3 :</span>{" "}
                <code className="text-cyan-300">{design.h3Class}</code>
              </div>
            )}
            {design.pClass && (
              <div>
                <span className="text-zinc-400">p :</span>{" "}
                <code className="text-cyan-300">{design.pClass}</code>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}

function RewriteEditor({
  rewrite,
  onChange,
}: {
  rewrite: Rewrite;
  onChange: (r: Rewrite) => void;
}) {
  const hasSuggestion = !!rewrite.suggested.trim();
  const isSelected = rewrite.selected ?? false;
  const editedText = rewrite.edited ?? rewrite.suggested;

  return (
    <div
      className={`rounded-lg border transition-colors ${
        !hasSuggestion
          ? "border-zinc-200 bg-white/40 opacity-60"
          : isSelected
            ? "border-emerald-500/40 bg-emerald-50"
            : "border-zinc-200 bg-white/40"
      }`}
    >
      <div className="flex items-start gap-3 p-3 border-b border-zinc-200">
        <input
          type="checkbox"
          disabled={!hasSuggestion}
          checked={isSelected}
          onChange={(e) => onChange({ ...rewrite, selected: e.target.checked })}
          className="mt-0.5 h-5 w-5 rounded text-emerald-500 disabled:opacity-50"
        />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase">
            <span className="text-zinc-400">{rewrite.type}</span>
            {!hasSuggestion && (
              <span className="text-zinc-300 italic normal-case">
                Pas de suggestion (déjà bon ou impossible à améliorer sans risque)
              </span>
            )}
          </div>
          {rewrite.reason && (
            <div className="text-[11px] text-zinc-500 italic">{rewrite.reason}</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 divide-x divide-zinc-800">
        <div className="p-3 space-y-1">
          <div className="text-[10px] font-mono uppercase text-zinc-400">Avant</div>
          <div className="text-xs text-zinc-700 max-h-32 overflow-y-auto whitespace-pre-wrap">
            {rewrite.original}
          </div>
          <div className="text-[10px] text-zinc-300">
            {rewrite.original.split(/\s+/).filter(Boolean).length} mots
          </div>
        </div>
        <div className="p-3 space-y-1 bg-emerald-500/[0.02]">
          <div className="text-[10px] font-mono uppercase text-emerald-700">Après (éditable)</div>
          {hasSuggestion ? (
            <>
              <textarea
                value={editedText}
                onChange={(e) => onChange({ ...rewrite, edited: e.target.value })}
                rows={Math.max(3, Math.ceil(editedText.length / 80))}
                className="w-full bg-white/60 border border-zinc-200 rounded-md px-2 py-1.5 text-xs text-zinc-900 focus:border-emerald-500 focus:outline-none resize-y"
              />
              <div className="text-[10px] text-emerald-700">
                {editedText.split(/\s+/).filter(Boolean).length} mots
              </div>
            </>
          ) : (
            <div className="text-xs text-zinc-300 italic">— inchangé —</div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionEditor({
  section,
  onChange,
}: {
  section: Section & { selected: boolean };
  onChange: (s: Section & { selected: boolean }) => void;
}) {
  return (
    <div
      className={`rounded-lg border p-4 space-y-3 transition-colors ${
        section.selected
          ? "border-brand/40 bg-brand/5"
          : "border-zinc-200 bg-white/40 opacity-60"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={section.selected}
          onChange={(e) => onChange({ ...section, selected: e.target.checked })}
          className="mt-1.5 h-5 w-5 rounded text-brand"
        />
        <input
          type="text"
          value={section.title}
          onChange={(e) => onChange({ ...section, title: e.target.value })}
          placeholder="Titre H2"
          className="flex-1 bg-transparent border-0 border-b border-zinc-200 text-zinc-900 font-semibold text-base focus:outline-none focus:border-brand py-1"
        />
      </div>

      <div className="text-[10px] text-zinc-400 italic ml-8">
        {section.rationale}
      </div>

      <div className="space-y-2 ml-8">
        {section.paragraphs.map((p, i) => (
          <textarea
            key={i}
            value={p}
            onChange={(e) => {
              const newParas = [...section.paragraphs];
              newParas[i] = e.target.value;
              onChange({ ...section, paragraphs: newParas });
            }}
            rows={4}
            className="w-full bg-white/60 border border-zinc-200 rounded-md px-3 py-2 text-sm text-zinc-800 focus:border-brand focus:outline-none resize-y"
          />
        ))}
        <div className="text-[10px] text-zinc-400 text-right">
          {section.paragraphs.join(" ").split(/\s+/).filter(Boolean).length} mots
        </div>
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
