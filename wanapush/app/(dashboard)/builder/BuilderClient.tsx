"use client";

import { useEffect, useState } from "react";
import SectionThumb from "./SectionThumb";
import LayoutPreview from "./LayoutPreview";
import SectionEditor, { type SectionData } from "./SectionEditor";

type ComponentMeta = {
  id: string;
  category: "header" | "section" | "footer" | "nav";
  label: string;
  description: string;
  acceptsPhoto: boolean;
  multiItem: boolean;
  dataShape: string;
};

type BuildResult = {
  id: string;
  previewUrl: string | null;
  siteSlug: string | null;
};

export type BuilderInitialState = {
  brief?: { brandName?: string; description?: string; tagline?: string; logoUrl?: string };
  composition?: { header: string; sections: string[] };
  theme?: { mode: "light" | "dark"; primaryColor: string; secondaryColor: string; colorMode: "gradient" | "bicolor" | "mono" };
  siteType?: "vitrine" | "ecommerce";
};

type BuilderClientProps = {
  initialState?: BuilderInitialState;
  /** Bannière à afficher au-dessus du titre (ex: récap du prompt). */
  topBanner?: React.ReactNode;
  /** Override du titre/sous-titre en haut. */
  headerTitle?: string;
  headerSubtitle?: string;
};

export default function BuilderClient({ initialState, topBanner, headerTitle, headerSubtitle }: BuilderClientProps = {}) {
  const [registry, setRegistry] = useState<ComponentMeta[]>([]);
  const [registryLoaded, setRegistryLoaded] = useState(false);

  // Brand
  const [brandName, setBrandName] = useState(initialState?.brief?.brandName ?? "");
  const [tagline, setTagline] = useState(initialState?.brief?.tagline ?? "");
  const [logoUrl, setLogoUrl] = useState(initialState?.brief?.logoUrl ?? "");
  const [description, setDescription] = useState(initialState?.brief?.description ?? "");

  // Theme
  const [mode, setMode] = useState<"light" | "dark">(initialState?.theme?.mode ?? "light");
  const [primaryColor, setPrimaryColor] = useState(initialState?.theme?.primaryColor ?? "#6366f1");
  const [secondaryColor, setSecondaryColor] = useState(initialState?.theme?.secondaryColor ?? "#ec4899");
  const [colorMode, setColorMode] = useState<"gradient" | "bicolor" | "mono">(initialState?.theme?.colorMode ?? "gradient");

  // Type de site (vitrine / ecommerce) — vient du step 0 de /generate ou laissé vitrine en mode builder direct
  const siteType: "vitrine" | "ecommerce" = initialState?.siteType ?? "vitrine";

  // Composition
  const defaultSectionIds = ["logos_bar", "feature_split", "stats", "cta", "contact"];
  const initialSectionIds = initialState?.composition?.sections ?? defaultSectionIds;
  const [headerId, setHeaderId] = useState<string>(initialState?.composition?.header ?? "hero_split");
  const [sectionIds, setSectionIds] = useState<string[]>(initialSectionIds);
  const [showAddPanel, setShowAddPanel] = useState(false);

  // Contenu éditable par section (overrides de l'IA)
  const [headerContent, setHeaderContent] = useState<SectionData>({});
  const [sectionContents, setSectionContents] = useState<SectionData[]>(() =>
    Array(initialSectionIds.length).fill({}),
  );
  const [editingTarget, setEditingTarget] = useState<
    { kind: "header" } | { kind: "section"; index: number } | null
  >(null);

  // Generation state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BuildResult | null>(null);

  useEffect(() => {
    fetch("/api/generate-site/build", { method: "GET" })
      .then((r) => r.json())
      .then((d) => {
        setRegistry(d.registry ?? []);
        setRegistryLoaded(true);
      })
      .catch(() => setRegistryLoaded(true));
  }, []);

  const headers = registry.filter((c) => c.category === "header");
  const sections = registry.filter((c) => c.category === "section");

  const moveSection = (index: number, dir: -1 | 1) => {
    const newIdx = index + dir;
    if (newIdx < 0 || newIdx >= sectionIds.length) return;
    const nextIds = [...sectionIds];
    [nextIds[index], nextIds[newIdx]] = [nextIds[newIdx], nextIds[index]];
    setSectionIds(nextIds);
    // Garde le contenu aligné avec la nouvelle position
    const nextContents = [...sectionContents];
    [nextContents[index], nextContents[newIdx]] = [nextContents[newIdx], nextContents[index]];
    setSectionContents(nextContents);
  };

  const removeSection = (index: number) => {
    setSectionIds(sectionIds.filter((_, i) => i !== index));
    setSectionContents(sectionContents.filter((_, i) => i !== index));
  };

  const addSection = (id: string) => {
    setSectionIds([...sectionIds, id]);
    setSectionContents([...sectionContents, {}]);
    setShowAddPanel(false);
  };

  const updateEditingContent = (data: SectionData) => {
    if (!editingTarget) return;
    if (editingTarget.kind === "header") {
      setHeaderContent(data);
    } else {
      const next = [...sectionContents];
      next[editingTarget.index] = data;
      setSectionContents(next);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setResult(null);
    if (brandName.trim().length < 2) {
      setError("Renseigne au moins le nom de marque.");
      return;
    }
    if (description.trim().length < 20) {
      setError("Décris ton activité (minimum 20 caractères).");
      return;
    }
    if (sectionIds.length === 0) {
      setError("Ajoute au moins une section.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/generate-site/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: {
            brandName: brandName.trim(),
            description: description.trim(),
            tagline: tagline.trim() || undefined,
            logoUrl: logoUrl.trim() || undefined,
          },
          composition: {
            header: headerId,
            sections: sectionIds,
          },
          // Overrides utilisateur : ces champs prennent priorité sur ce que l'IA va générer
          overrides: {
            header: headerContent,
            sections: sectionContents,
          },
          theme: {
            mode,
            primaryColor,
            secondaryColor,
            colorMode,
          },
          framework: "react",
          siteType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur de génération");
      } else {
        setResult({
          id: data.id,
          previewUrl: data.previewUrl,
          siteSlug: data.siteSlug,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!registryLoaded) {
    return <div className="p-8 text-zinc-500">Chargement du catalogue…</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-10 text-zinc-900">
      {topBanner}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">{headerTitle ?? "Composer mon site"}</h1>
        <p className="text-zinc-500 text-sm">
          {headerSubtitle ?? "Choisis ton header, tes sections et ton style. L'IA écrit le contenu — tu gardes la main sur le design."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ─── COLONNE GAUCHE : Brand + Style ───────────────────────── */}
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-white/60 border border-zinc-200 rounded-xl p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4">
              1. Marque
            </h2>
            <Label text="Nom de la marque *">
              <input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Polaria"
                className="input"
              />
            </Label>
            <Label text="Slogan (optionnel)">
              <input
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Le paiement pensé pour les freelances"
                className="input"
              />
            </Label>
            <Label text="URL du logo (optionnel)">
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://…/logo.png"
                className="input"
              />
            </Label>
          </section>

          <section className="bg-white/60 border border-zinc-200 rounded-xl p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4">
              2. Style
            </h2>
            <Label text="Thème">
              <div className="flex gap-2">
                {(["light", "dark"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                      mode === m
                        ? "bg-brand border-brand text-white"
                        : "bg-white/60 border-zinc-200 text-zinc-700 hover:border-zinc-300"
                    }`}
                  >
                    {m === "light" ? "Clair" : "Sombre"}
                  </button>
                ))}
              </div>
            </Label>
            <Label text="Couleur primaire">
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-12 h-9 rounded border border-zinc-200 cursor-pointer bg-transparent"
                />
                <input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="input flex-1 font-mono text-xs"
                />
              </div>
            </Label>
            <Label text="Couleur secondaire">
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-12 h-9 rounded border border-zinc-200 cursor-pointer bg-transparent"
                />
                <input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="input flex-1 font-mono text-xs"
                />
              </div>
            </Label>
            <Label text="Dispatch des couleurs">
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { id: "gradient", label: "Dégradé", hint: "transition primaire→secondaire" },
                  { id: "bicolor", label: "Bicolore", hint: "split 50/50, deux bandes" },
                  { id: "mono", label: "Mono", hint: "primaire seule" },
                ] as const).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setColorMode(opt.id)}
                    title={opt.hint}
                    className={`py-2 rounded-lg border text-[11px] font-semibold transition-colors ${
                      colorMode === opt.id
                        ? "bg-brand border-brand text-white"
                        : "bg-white/60 border-zinc-200 text-zinc-700 hover:border-zinc-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Label>
          </section>

          <section className="bg-white/60 border border-zinc-200 rounded-xl p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4">
              3. Description
            </h2>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={9}
              placeholder="Décris ton activité, ton public cible, tes services, tes différenciateurs, ton ton. Plus tu donnes de détails, plus le copywriting IA sera juste."
              className="input resize-y min-h-[200px]"
            />
            <div className="text-[10px] text-zinc-400 text-right mt-1">
              {description.length} / 5000
            </div>
          </section>
        </div>

        {/* ─── COLONNE DROITE : Composition ─────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white/60 border border-zinc-200 rounded-xl p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4">
              4. Header (haut de page)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {headers.map((h) => (
                <div
                  key={h.id}
                  className={`text-left rounded-lg border transition-colors overflow-hidden ${
                    headerId === h.id
                      ? "bg-brand/15 border-brand ring-1 ring-brand/40"
                      : "bg-white/60 border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setHeaderId(h.id)}
                    className="block w-full text-left"
                  >
                    <SectionThumb id={h.id} theme={mode} primaryColor={primaryColor} secondaryColor={secondaryColor} colorMode={colorMode} />
                    <div className="p-3 pb-1">
                      <div className="font-semibold text-white text-sm mb-0.5">{h.label}</div>
                      <div className="text-[11px] text-zinc-500 leading-snug line-clamp-2">{h.description}</div>
                    </div>
                  </button>
                  {headerId === h.id && (
                    <button
                      type="button"
                      onClick={() => setEditingTarget({ kind: "header" })}
                      className="w-full text-[11px] text-brand-700 hover:text-brand-700 py-2 border-t border-brand/30"
                    >
                      ✎ Modifier le contenu
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white/60 border border-zinc-200 rounded-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
                5. Sections du site (ordre)
              </h2>
              <button
                type="button"
                onClick={() => setShowAddPanel(!showAddPanel)}
                className="text-xs bg-brand hover:bg-brand-600 text-white px-3 py-1.5 rounded-md font-semibold"
              >
                + Ajouter
              </button>
            </div>

            {showAddPanel && (
              <div className="mb-4 p-3 bg-white/60 rounded-lg border border-zinc-200 max-h-[480px] overflow-y-auto">
                <div className="text-xs text-zinc-500 mb-3">Sections disponibles — clique sur une mini pour ajouter :</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {sections.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => addSection(s.id)}
                      className="text-left rounded-md border border-zinc-200 hover:border-brand hover:bg-zinc-50 transition-colors overflow-hidden group"
                    >
                      <SectionThumb id={s.id} theme={mode} primaryColor={primaryColor} secondaryColor={secondaryColor} colorMode={colorMode} />
                      <div className="p-2">
                        <div className="font-semibold text-white text-[11px] mb-0.5 group-hover:text-brand-700 transition-colors">{s.label}</div>
                        <div className="text-[10px] text-zinc-400 leading-snug line-clamp-2">{s.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sectionIds.length === 0 ? (
              <div className="text-center py-8 text-zinc-400 text-sm border border-dashed border-zinc-200 rounded-lg">
                Aucune section — clique sur <strong>+ Ajouter</strong> pour commencer.
              </div>
            ) : (
              <ul className="space-y-2">
                {sectionIds.map((id, i) => {
                  const meta = registry.find((c) => c.id === id);
                  return (
                    <li
                      key={`${id}-${i}`}
                      className="flex items-center gap-3 p-2.5 bg-white/60 border border-zinc-200 rounded-lg hover:border-brand/40 transition-colors cursor-pointer"
                      onClick={() => setEditingTarget({ kind: "section", index: i })}
                      title="Cliquer pour éditer le contenu"
                    >
                      <span className="text-xs text-zinc-400 font-mono w-5 text-right shrink-0">{i + 1}.</span>
                      <div className="w-20 shrink-0 rounded overflow-hidden">
                        <SectionThumb id={id} theme={mode} primaryColor={primaryColor} secondaryColor={secondaryColor} colorMode={colorMode} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white text-sm flex items-center gap-2">
                          {meta?.label ?? id}
                          {(sectionContents[i] && Object.keys(sectionContents[i]).length > 0) && (
                            <span className="text-[9px] bg-brand/20 text-brand-700 px-1.5 py-0.5 rounded font-normal">édité</span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400 line-clamp-1">{meta?.description}</div>
                      </div>
                      <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); moveSection(i, -1); }}
                          disabled={i === 0}
                          className="px-2 py-1 text-xs rounded bg-zinc-100 hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-700"
                          aria-label="Monter"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); moveSection(i, 1); }}
                          disabled={i === sectionIds.length - 1}
                          className="px-2 py-1 text-xs rounded bg-zinc-100 hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-700"
                          aria-label="Descendre"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeSection(i); }}
                          className="px-2 py-1 text-xs rounded bg-red-50 hover:bg-red-50 text-red-700"
                          aria-label="Retirer"
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* ─── Submit ──────────────────────────────────────────────── */}
          <section className="bg-white/60 border border-zinc-200 rounded-xl p-5">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-brand hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {submitting ? "Génération en cours… (peut prendre 30-90s)" : "Générer mon site"}
            </button>
            {error && (
              <div className="mt-3 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}
            {result && (
              <div className="mt-3 p-4 rounded bg-emerald-50 border border-emerald-500/30 text-emerald-200 text-sm">
                <div className="font-semibold mb-2">Site généré.</div>
                {result.previewUrl && (
                  <a
                    href={result.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-md font-semibold"
                  >
                    Ouvrir le site →
                  </a>
                )}
              </div>
            )}
          </section>
        </div>

        {/* ─── COLONNE DROITE : Aperçu du layout (sticky) ───────────── */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
              Aperçu du layout
            </h2>
            <LayoutPreview
              headerId={headerId}
              sectionIds={sectionIds}
              theme={mode}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              colorMode={colorMode}
              brandName={brandName || undefined}
              onEditHeader={() => setEditingTarget({ kind: "header" })}
              onEditSection={(i) => setEditingTarget({ kind: "section", index: i })}
            />
          </div>
        </div>
      </div>

      {/* ─── Modal d'édition de section ─── */}
      {editingTarget && (() => {
        const isHeader = editingTarget.kind === "header";
        const sectionType = isHeader ? headerId : sectionIds[editingTarget.index];
        const meta = registry.find((c) => c.id === sectionType);
        const data = isHeader ? headerContent : (sectionContents[editingTarget.index] ?? {});
        return (
          <SectionEditor
            sectionType={sectionType}
            sectionLabel={meta?.label ?? sectionType}
            index={isHeader ? 0 : editingTarget.index + 1}
            data={data}
            onChange={updateEditingContent}
            onClose={() => setEditingTarget(null)}
          />
        );
      })()}

      <style jsx>{`
        :global(.input) {
          width: 100%;
          background: rgb(2 6 23 / 0.6);
          border: 1px solid rgb(51 65 85);
          color: rgb(241 245 249);
          font-size: 0.875rem;
          padding: 0.5rem 0.75rem;
          border-radius: 0.5rem;
        }
        :global(.input:focus) {
          outline: none;
          border-color: rgb(99 102 241);
        }
        :global(.input::placeholder) {
          color: rgb(100 116 139);
        }
      `}</style>
    </div>
  );
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="block mb-3 last:mb-0">
      <span className="block text-xs font-semibold text-zinc-700 mb-1.5">{text}</span>
      {children}
    </label>
  );
}
