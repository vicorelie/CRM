"use client";

import { useState } from "react";
import type { Platform } from "./types";

type Props = {
  caption: string;
  onChange: (v: string) => void;
  platforms: Platform[];
};

export function CaptionEditor({ caption, onChange, platforms }: Props) {
  const [aiOpen, setAiOpen] = useState(false);
  const [aiBrief, setAiBrief] = useState("");
  const [aiTone, setAiTone] = useState<"pro" | "fun" | "punchy" | "neutral">("punchy");
  const [aiBusy, setAiBusy] = useState(false);
  const [variants, setVariants] = useState<Array<{ platform: string; text: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (aiBrief.trim().length < 3) {
      setError("Brief trop court");
      return;
    }
    if (platforms.length === 0) {
      setError("Sélectionne au moins une plateforme cible");
      return;
    }
    setError(null);
    setAiBusy(true);
    try {
      const r = await fetch("/api/social/ai-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: aiBrief,
          platforms,
          tone: aiTone,
          lang: "fr",
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Erreur IA");
      setVariants(j.captions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur IA");
    } finally {
      setAiBusy(false);
    }
  }

  function applyVariant(text: string) {
    onChange(text);
    setAiOpen(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-700">Texte du post</label>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400">{caption.length} car.</span>
          <button
            type="button"
            onClick={() => setAiOpen((v) => !v)}
            className="text-xs rounded-lg bg-brand-100 hover:bg-brand-200 border border-brand-300 text-brand-700 px-3 py-1"
          >
            ✨ {aiOpen ? "Fermer IA" : "Générer texte IA"}
          </button>
        </div>
      </div>

      <textarea
        value={caption}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        placeholder="Écris ton message ici…"
        className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none resize-y"
      />

      {aiOpen && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 space-y-3">
          <textarea
            value={aiBrief}
            onChange={(e) => setAiBrief(e.target.value)}
            rows={3}
            placeholder="Brief : 'Annoncer le lancement de notre nouvelle gamme de cosmétiques bio destinée aux 25-40 ans'"
            className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-brand-500 focus:outline-none"
          />
          <div className="flex items-center gap-3">
            <select
              value={aiTone}
              onChange={(e) => setAiTone(e.target.value as typeof aiTone)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs"
            >
              <option value="punchy">Ton punchy</option>
              <option value="pro">Ton pro / expert</option>
              <option value="fun">Ton fun / décalé</option>
              <option value="neutral">Ton neutre</option>
            </select>
            <button
              type="button"
              onClick={generate}
              disabled={aiBusy}
              className="ml-auto rounded-lg bg-brand-500 hover:bg-brand-400 disabled:opacity-50 px-4 py-1.5 text-xs font-semibold text-white"
            >
              {aiBusy ? "Génération…" : "Générer par plateforme"}
            </button>
          </div>

          {error && <div className="text-xs text-red-700">⚠ {error}</div>}

          {variants.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-brand-200">
              <p className="text-xs text-brand-700">
                Choisis une variante (clic = remplace ton texte) :
              </p>
              {variants.map((v, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyVariant(v.text)}
                  className="w-full text-left rounded-lg border border-zinc-200 hover:border-brand-400 bg-white/40 p-3 transition-colors"
                >
                  <div className="text-[10px] uppercase font-mono text-brand-700 mb-1">
                    {v.platform}
                  </div>
                  <p className="text-xs text-zinc-800 whitespace-pre-wrap line-clamp-4">
                    {v.text}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
