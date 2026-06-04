"use client";

import { useEffect, useState } from "react";

type Audience = {
  id: string;
  name: string;
  description: string;
  size: string | null;
  tags: string[] | null;
  createdAt: string;
  updatedAt: string;
};

export function AudiencesTab() {
  const [list, setList] = useState<Audience[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Audience | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const r = await fetch("/api/ads/audiences");
      const j = await r.json();
      setList(j.audiences ?? []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  async function remove(id: string) {
    if (!confirm("Supprimer cette audience ?")) return;
    await fetch(`/api/ads/audiences/${id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Bibliothèque d&apos;audiences{" "}
          <span className="text-sm text-zinc-400">({list.length})</span>
        </h2>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm((v) => !v);
          }}
          className="rounded-lg bg-brand hover:bg-brand-400 px-4 py-2 text-sm font-semibold text-white"
        >
          {showForm ? "Annuler" : "+ Nouvelle audience"}
        </button>
      </div>

      {showForm && (
        <AudienceForm
          initial={editing}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            refresh();
          }}
        />
      )}

      {loading ? (
        <div className="text-sm text-zinc-500">Chargement…</div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white/40 p-6 text-sm text-zinc-500 text-center">
          Aucune audience pour l&apos;instant. Crée une audience pour la réutiliser dans
          plusieurs campagnes.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {list.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-zinc-200 bg-white/60 p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold flex-1">{a.name}</h3>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setEditing(a);
                      setShowForm(true);
                    }}
                    className="text-xs text-zinc-500 hover:text-brand-700 px-2"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => remove(a.id)}
                    className="text-xs text-zinc-500 hover:text-red-700 px-2"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <p className="text-xs text-zinc-700 whitespace-pre-wrap line-clamp-3">
                {a.description}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {a.size && (
                  <span className="text-[10px] uppercase font-mono rounded-full border border-emerald-500/40 bg-emerald-50 text-emerald-700 px-2 py-0.5">
                    {a.size}
                  </span>
                )}
                {(a.tags ?? []).map((t) => (
                  <span
                    key={t}
                    className="text-[10px] rounded-full border border-zinc-200 bg-white/60 text-zinc-500 px-2 py-0.5"
                  >
                    #{t}
                  </span>
                ))}
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(a.description)}
                className="text-[11px] text-zinc-400 hover:text-brand-700"
              >
                📋 Copier la description
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AudienceForm({
  initial,
  onSaved,
}: {
  initial: Audience | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [size, setSize] = useState(initial?.size ?? "");
  const [tagsInput, setTagsInput] = useState((initial?.tags ?? []).join(", "));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2 || description.trim().length < 3) {
      setError("Nom et description requis");
      return;
    }
    setBusy(true);
    const tags = tagsInput
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    const body = { name, description, size: size || undefined, tags };
    const r = await fetch(
      initial
        ? `/api/ads/audiences/${initial.id}`
        : "/api/ads/audiences",
      {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    setBusy(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setError(j.error ?? "Erreur");
      return;
    }
    onSaved();
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-brand/30 bg-brand/5 p-6 space-y-4"
    >
      <h3 className="text-lg font-semibold">
        {initial ? "Modifier l'audience" : "Nouvelle audience"}
      </h3>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-700">Nom</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex : Freelances marketing FR 25-40"
          className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-700">
          Description / ciblage détaillé
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Localisation, âge, intérêts, comportements, mots-clés, exclusions…"
          className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700">
            Taille estimée (optionnel)
          </label>
          <input
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="~150k, 1M+, etc."
            className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700">
            Tags (séparés par virgule)
          </label>
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="b2b, saas, leads"
            className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-brand hover:bg-brand-400 disabled:opacity-50 py-2.5 text-sm font-semibold text-white"
      >
        {busy ? "Sauvegarde…" : initial ? "Mettre à jour" : "Créer l'audience"}
      </button>
    </form>
  );
}
