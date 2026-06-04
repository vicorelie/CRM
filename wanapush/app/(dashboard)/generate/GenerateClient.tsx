"use client";

// /generate — version combinée : un step prompt qui appelle l'IA pour pré-remplir
// le builder (sections + thème + brief), puis le builder lui-même où l'utilisateur
// peut tout ajuster avant le build final. Réutilise BuilderClient avec des props
// initiales : aucun code dupliqué.

import { useState } from "react";
import BuilderClient, { type BuilderInitialState } from "../builder/BuilderClient";

type SiteType = "vitrine" | "ecommerce";

type Suggestion = BuilderInitialState & {
  rationale?: string | null;
  provider?: string;
  model?: string;
};

export function GenerateClient() {
  const [siteType, setSiteType] = useState<SiteType | null>(null);
  const [prompt, setPrompt] = useState("");
  const [brandName, setBrandName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  async function onSuggest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (prompt.trim().length < 10) {
      setError("Décris ton projet en au moins quelques phrases (10 caractères min).");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/generate-site/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          brandName: brandName.trim() || undefined,
          siteType: siteType ?? "vitrine",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur IA");
      setSuggestion({
        brief: data.brief,
        composition: data.composition,
        theme: data.theme,
        siteType: siteType ?? "vitrine",
        rationale: data.rationale ?? null,
        provider: data.provider,
        model: data.model,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  // ─── STEP 0 — Choix Vitrine / E-commerce ────────────────────────────────
  if (!siteType) {
    return (
      <div className="max-w-4xl mx-auto p-6 lg:p-10 text-zinc-900">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-white mb-3">Quel type de site veux-tu créer ?</h1>
          <p className="text-zinc-500">Tu pourras ajuster tout le reste après. Ce choix conditionne l&apos;architecture du site.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <button
            type="button"
            onClick={() => setSiteType("vitrine")}
            className="group text-left rounded-2xl border border-zinc-200 hover:border-brand/60 bg-white/60 hover:bg-zinc-50 transition-all p-7 space-y-3"
          >
            <div className="text-5xl">🎨</div>
            <h2 className="text-2xl font-bold text-zinc-900 group-hover:text-brand-700 transition-colors">Site vitrine</h2>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Présenter une activité, des services, un portfolio. Hero, présentation, services, témoignages, contact.
              <br /><strong className="text-zinc-700">1 page</strong> orientée conversion.
            </p>
            <div className="pt-2 text-xs text-brand-700 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              Choisir →
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSiteType("ecommerce")}
            className="group text-left rounded-2xl border border-zinc-200 hover:border-emerald-500/60 bg-white/60 hover:bg-zinc-50 transition-all p-7 space-y-3 relative overflow-hidden"
          >
            <div className="absolute top-3 right-3 text-[10px] uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
              Nouveau
            </div>
            <div className="text-5xl">🛍️</div>
            <h2 className="text-2xl font-bold text-zinc-900 group-hover:text-emerald-700 transition-colors">Site e-commerce</h2>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Vendre en ligne avec panier, paiement Stripe, gestion produits, commandes, remises.
              <br /><strong className="text-zinc-700">Home + page /boutique</strong> dédiée, boutique auto-créée.
            </p>
            <div className="pt-2 text-xs text-emerald-700 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              Choisir →
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (suggestion) {
    const banner = (
      <div className="mb-6 p-4 bg-brand/10 border border-brand/30 rounded-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-widest font-bold bg-brand text-white px-2 py-0.5 rounded">IA pré-remplie</span>
              {suggestion.model && (
                <span className="text-[10px] text-zinc-400">via {suggestion.provider}/{suggestion.model}</span>
              )}
            </div>
            {suggestion.rationale && (
              <p className="text-sm text-zinc-700 leading-relaxed">{suggestion.rationale}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSuggestion(null)}
            className="text-xs text-brand-700 hover:text-brand-700 underline whitespace-nowrap"
          >
            ← Refaire le prompt
          </button>
        </div>
      </div>
    );
    return (
      <BuilderClient
        initialState={suggestion}
        topBanner={banner}
        headerTitle="Ajuste et génère"
        headerSubtitle="L'IA a pré-rempli sections, thème et brief. Tweake ce que tu veux, puis clique 'Générer mon site'."
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-10 text-zinc-900">
      <button
        type="button"
        onClick={() => setSiteType(null)}
        className="text-xs text-zinc-500 hover:text-brand-700 mb-4 inline-flex items-center gap-1.5"
      >
        ← Changer de type de site
      </button>
      <div className="mb-8 text-center">
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest mb-4 ${
          siteType === "ecommerce"
            ? "bg-emerald-50 border border-emerald-500/30 text-emerald-700"
            : "bg-brand/10 border border-brand/30 text-brand-700"
        }`}>
          {siteType === "ecommerce" ? "🛍️ E-commerce" : "🎨 Vitrine"}
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">Générer un site avec l&apos;IA</h1>
        <p className="text-zinc-500">
          Décris ton projet — l&apos;IA propose sections, thème et brief.
          Tu pourras tout ajuster ensuite dans le builder avant la génération finale.
          {siteType === "ecommerce" && (
            <span className="block mt-2 text-emerald-700/80">
              Une page <strong>/boutique</strong> dédiée et une boutique gérable seront créées automatiquement.
            </span>
          )}
        </p>
      </div>

      <form onSubmit={onSuggest} className="space-y-5 bg-white/60 border border-zinc-200 rounded-xl p-6">
        <label className="block">
          <span className="block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wider">
            Nom de la marque (optionnel)
          </span>
          <input
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="Polaria"
            className="w-full bg-white/60 border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-brand"
          />
        </label>

        <label className="block">
          <span className="block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wider">
            Décris ton activité, ton public, ce qui te différencie *
          </span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={8}
            placeholder="Ex: Photographe de mariage en région PACA, approche documentaire, prises de vue naturelles, je cherche des couples authentiques qui veulent revivre l'émotion de leur journée. Style sobre, palette terre/ocre, ambiance chaleureuse."
            className="w-full bg-white/60 border border-zinc-200 rounded-lg px-3 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-brand resize-y min-h-[180px] leading-relaxed"
          />
          <div className="text-[10px] text-zinc-400 text-right mt-1">
            {prompt.length} / 2000
          </div>
        </label>

        {error && (
          <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {loading ? "L'IA réfléchit… (10-20s)" : "✨ Pré-remplir avec l'IA →"}
        </button>

        <div className="text-xs text-zinc-400 text-center pt-2 border-t border-zinc-200">
          Tu préfères tout choisir manuellement ?{" "}
          <a href="/builder" className="text-brand-700 hover:text-brand-700 underline">
            Aller au builder vide
          </a>
        </div>
      </form>
    </div>
  );
}
