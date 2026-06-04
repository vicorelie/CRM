"use client";

import { useCallback, useEffect, useState } from "react";

type OptionValue = { value: string; color: string | null; imageUrl: string | null };
type ShopOption = { id: string; name: string; values: OptionValue[]; position: number };

function readFileAsDataURL(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export function OptionsClient({ siteSlug }: { siteSlug: string }) {
  const [options, setOptions] = useState<ShopOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newValues, setNewValues] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shop/${siteSlug}/options`);
      if (res.ok) {
        const data = await res.json();
        setOptions(data.options ?? []);
      }
    } finally { setLoading(false); }
  }, [siteSlug]);

  useEffect(() => { refresh(); }, [refresh]);

  async function create() {
    setError(null);
    const values = newValues.split(/[,;\n]+/).map((v) => v.trim()).filter(Boolean);
    if (!newName.trim()) { setError("Donne un nom à cette option (ex. Taille)"); return; }
    if (values.length === 0) { setError("Ajoute au moins une valeur (ex. S, M, L)"); return; }
    setCreating(true);
    try {
      const res = await fetch(`/api/shop/${siteSlug}/options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), values }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error ?? "Erreur"); return; }
      setNewName(""); setNewValues("");
      refresh();
    } finally { setCreating(false); }
  }

  async function update(id: string, patch: { name?: string; values?: OptionValue[] }) {
    const res = await fetch(`/api/shop/${siteSlug}/options/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) refresh();
  }

  async function remove(opt: ShopOption) {
    if (!confirm(`Supprimer l'option "${opt.name}" ?\n\nLes produits qui l'utilisent garderont leurs variantes existantes.`)) return;
    await fetch(`/api/shop/${siteSlug}/options/${opt.id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-500/30 text-emerald-700 text-xs font-medium uppercase tracking-widest">
          Catalogue
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Options & variantes</h1>
        <p className="text-sm text-zinc-500 max-w-2xl">
          Définis ici les options réutilisables de ta boutique (Taille, Couleur, Matière…).
          Pour chaque valeur, tu peux associer une <strong>couleur</strong> ou une <strong>image</strong> qui s&apos;affichera comme swatch sur la page produit.
        </p>
      </header>

      {/* Création */}
      <section className="rounded-2xl border border-zinc-200 bg-white/40 p-5 space-y-4">
        <h2 className="font-bold text-zinc-900">+ Créer une nouvelle option</h2>
        <div className="grid sm:grid-cols-[1fr_2fr_auto] gap-3 items-start">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nom (ex. Taille)"
            className="px-3 py-2 rounded-lg bg-white border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:border-emerald-500"
          />
          <input
            type="text"
            value={newValues}
            onChange={(e) => setNewValues(e.target.value)}
            placeholder="Valeurs séparées par virgules (ex. XS, S, M, L, XL)"
            className="px-3 py-2 rounded-lg bg-white border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:border-emerald-500"
            onKeyDown={(e) => { if (e.key === "Enter") create(); }}
          />
          <button
            onClick={create}
            disabled={creating}
            className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm font-bold"
          >
            {creating ? "…" : "Créer"}
          </button>
        </div>
        <p className="text-[10px] text-zinc-400">
          Tu pourras ajouter couleur ou image à chaque valeur après création, en cliquant sur <strong>Modifier</strong>.
        </p>
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">⚠ {error}</div>
        )}
      </section>

      {/* Liste */}
      {loading ? (
        <div className="text-sm text-zinc-500">Chargement…</div>
      ) : options.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white/40 p-10 text-center space-y-3">
          <div className="text-5xl">🎨</div>
          <p className="text-zinc-700">Aucune option pour le moment.</p>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Commence par créer une option <strong>Taille</strong> (XS, S, M, L, XL) ou <strong>Couleur</strong> (Noir, Blanc, Rouge…).
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {options.map((opt) => (
            <OptionRow key={opt.id} option={opt} onUpdate={update} onRemove={() => remove(opt)} />
          ))}
        </div>
      )}
    </div>
  );
}

function OptionRow({
  option,
  onUpdate,
  onRemove,
}: {
  option: ShopOption;
  onUpdate: (id: string, patch: { name?: string; values?: OptionValue[] }) => void;
  onRemove: () => void;
}) {
  const [name, setName] = useState(option.name);
  const [values, setValues] = useState<OptionValue[]>(option.values);
  const [editing, setEditing] = useState(false);
  const [newValueLabel, setNewValueLabel] = useState("");

  useEffect(() => { setName(option.name); setValues(option.values); }, [option]);

  function save() {
    onUpdate(option.id, { name: name.trim(), values });
    setEditing(false);
  }

  function addValue() {
    const v = newValueLabel.trim();
    if (!v || values.some((x) => x.value.toLowerCase() === v.toLowerCase())) {
      setNewValueLabel("");
      return;
    }
    setValues([...values, { value: v, color: null, imageUrl: null }]);
    setNewValueLabel("");
  }

  function updateValue(i: number, patch: Partial<OptionValue>) {
    setValues(values.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  }
  function removeValue(i: number) {
    setValues(values.filter((_, idx) => idx !== i));
  }
  async function uploadImage(i: number, file: File) {
    const dataUrl = await readFileAsDataURL(file);
    if (dataUrl) updateValue(i, { imageUrl: dataUrl });
  }

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white/40 p-5">
      {editing ? (
        <div className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:border-emerald-500 font-semibold"
          />

          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-semibold text-zinc-400">Valeurs</div>
            {values.length === 0 && <div className="text-xs text-zinc-400 italic">Aucune valeur. Ajoute-en une ci-dessous.</div>}
            {values.map((v, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-white border border-zinc-200 px-3 py-2">
                <input
                  type="text"
                  value={v.value}
                  onChange={(e) => updateValue(i, { value: e.target.value })}
                  className="flex-1 min-w-[8rem] bg-transparent text-sm text-zinc-900 focus:outline-none font-semibold"
                />
                {/* Color picker */}
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-[10px] uppercase tracking-widest text-zinc-400 hover:text-zinc-700">
                  <span>Couleur</span>
                  <input
                    type="color"
                    value={v.color ?? "#000000"}
                    onChange={(e) => updateValue(i, { color: e.target.value })}
                    className="w-8 h-8 rounded border border-zinc-200 cursor-pointer bg-transparent"
                  />
                  {v.color && (
                    <button type="button" onClick={() => updateValue(i, { color: null })} className="text-zinc-400 hover:text-red-700">×</button>
                  )}
                </label>
                {/* Image */}
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-[10px] uppercase tracking-widest text-zinc-400 hover:text-zinc-700">
                  <span>Image</span>
                  {v.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.imageUrl} alt="" className="w-8 h-8 rounded border border-zinc-200 object-cover" />
                  ) : (
                    <span className="w-8 h-8 rounded border border-dashed border-zinc-200 flex items-center justify-center text-zinc-300">+</span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { if (e.target.files?.[0]) uploadImage(i, e.target.files[0]); }}
                  />
                  {v.imageUrl && (
                    <button type="button" onClick={() => updateValue(i, { imageUrl: null })} className="text-zinc-400 hover:text-red-700">×</button>
                  )}
                </label>
                <button type="button" onClick={() => removeValue(i)} className="text-red-700 hover:text-red-700 text-xs ml-auto">Supprimer</button>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newValueLabel}
                onChange={(e) => setNewValueLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addValue(); } }}
                placeholder="Nouvelle valeur (ex. Rouge)"
                className="flex-1 px-3 py-2 rounded-lg bg-white border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:border-emerald-500"
              />
              <button type="button" onClick={addValue} className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold">+ Ajouter</button>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-zinc-200">
            <button onClick={save} className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold">Enregistrer</button>
            <button onClick={() => { setName(option.name); setValues(option.values); setEditing(false); }} className="px-4 py-1.5 rounded-lg bg-zinc-100 text-zinc-700 text-xs">Annuler</button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-zinc-900">{option.name}</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              {option.values.map((v) => (
                <span key={v.value} className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 border border-emerald-500/30 text-emerald-200 pl-1.5 pr-2 py-0.5 rounded-full">
                  {v.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.imageUrl} alt="" className="w-4 h-4 rounded-full object-cover" />
                  ) : v.color ? (
                    <span className="w-4 h-4 rounded-full border border-zinc-200" style={{ backgroundColor: v.color }} />
                  ) : null}
                  {v.value}
                </span>
              ))}
            </div>
            <div className="text-[10px] text-zinc-400 mt-2 uppercase tracking-widest">{option.values.length} valeur{option.values.length > 1 ? "s" : ""}</div>
          </div>
          <div className="flex flex-col gap-1.5">
            <button onClick={() => setEditing(true)} className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold">Modifier</button>
            <button onClick={onRemove} className="px-3 py-1.5 rounded-lg text-red-700 hover:text-red-700 text-xs">Supprimer</button>
          </div>
        </div>
      )}
    </article>
  );
}
