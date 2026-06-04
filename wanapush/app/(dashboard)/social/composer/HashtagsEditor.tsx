"use client";

import { useState } from "react";
import type { Platform } from "./types";

type Props = {
  hashtags: string[];
  onChange: (h: string[]) => void;
  platforms: Platform[];
  brief: string;
};

export function HashtagsEditor({ hashtags, onChange, platforms, brief }: Props) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addFromInput() {
    const tags = input
      .split(/[\s,]+/)
      .map((t) => t.trim().replace(/^#+/, ""))
      .filter(Boolean)
      .map((t) => `#${t}`);
    if (tags.length === 0) return;
    const merged = Array.from(new Set([...hashtags, ...tags]));
    onChange(merged);
    setInput("");
  }

  async function generate() {
    if (brief.trim().length < 3) {
      setError("Écris d'abord un texte ou un brief pour que l'IA comprenne le sujet");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const r = await fetch("/api/social/ai-hashtags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief,
          platforms: platforms.length > 0 ? platforms : undefined,
          count: 15,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Erreur IA");
      const newTags = (j.hashtags ?? []) as string[];
      onChange(Array.from(new Set([...hashtags, ...newTags])));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur IA");
    } finally {
      setBusy(false);
    }
  }

  function remove(tag: string) {
    onChange(hashtags.filter((t) => t !== tag));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-700">Hashtags</label>
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="text-xs rounded-lg bg-brand-100 hover:bg-brand-200 border border-brand-300 text-brand-700 px-3 py-1 disabled:opacity-50"
        >
          ✨ {busy ? "Génération…" : "Générer hashtags IA"}
        </button>
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addFromInput();
            }
          }}
          placeholder="marketing growth saas (espace ou virgule pour séparer)"
          className="flex-1 rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <button
          type="button"
          onClick={addFromInput}
          className="rounded-lg border border-zinc-200 hover:border-zinc-300 px-3 py-2 text-xs"
        >
          + Ajouter
        </button>
      </div>

      {error && <div className="text-xs text-red-700">⚠ {error}</div>}

      {hashtags.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {hashtags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full bg-brand-50 border border-brand-300 text-brand-700 px-2.5 py-0.5 text-xs"
            >
              {t}
              <button
                type="button"
                onClick={() => remove(t)}
                className="text-brand-700 hover:text-red-700"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
