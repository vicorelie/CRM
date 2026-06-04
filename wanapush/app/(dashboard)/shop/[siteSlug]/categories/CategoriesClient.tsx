"use client";

import { useCallback, useEffect, useState } from "react";

type Category = {
  id: string;
  parentId: string | null;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  position: number;
  _count: { products: number; children: number };
};

export function CategoriesClient({ siteSlug }: { siteSlug: string }) {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState<{ parentId: string | null } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/shop/${siteSlug}/categories`);
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? "Erreur"); return; }
      setCats(json.categories ?? []);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, [siteSlug]);

  useEffect(() => { refresh(); }, [refresh]);

  async function remove(c: Category) {
    const warn = c._count.children > 0
      ? `Cette catégorie a ${c._count.children} sous-catégorie(s). Elles seront détachées. Continuer ?`
      : c._count.products > 0
      ? `${c._count.products} produit(s) sont liés. Ils ne seront PAS supprimés, juste détachés. Continuer ?`
      : `Supprimer "${c.name}" ?`;
    if (!confirm(warn)) return;
    const res = await fetch(`/api/shop/${siteSlug}/categories/${c.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(`Erreur : ${json?.error ?? res.status}`); return;
    }
    refresh();
  }

  // Construit l'arbre : catégories racines + children récursifs
  const roots = cats.filter((c) => !c.parentId);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-500/30 text-emerald-700 text-xs font-medium uppercase tracking-widest">
            Organisation
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Catégories</h1>
          <p className="text-sm text-zinc-500">Groupe tes produits en familles, sous-familles, etc.</p>
        </div>
        <button
          onClick={() => setCreating({ parentId: null })}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm"
        >
          + Nouvelle catégorie
        </button>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">⚠ {error}</div>
      )}

      {loading ? (
        <div className="text-sm text-zinc-500">Chargement…</div>
      ) : roots.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white/40 p-10 text-center space-y-4">
          <div className="text-5xl">🗂️</div>
          <p className="text-zinc-700">Pas encore de catégorie.</p>
          <button
            onClick={() => setCreating({ parentId: null })}
            className="inline-block rounded-lg bg-emerald-500 hover:bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-white"
          >
            + Créer ma première catégorie
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white/40 overflow-hidden">
          {roots.map((root) => (
            <TreeNode
              key={root.id}
              node={root}
              all={cats}
              depth={0}
              onEdit={setEditing}
              onAddChild={(parentId) => setCreating({ parentId })}
              onDelete={remove}
            />
          ))}
        </div>
      )}

      {(creating || editing) && (
        <CategoryModal
          siteSlug={siteSlug}
          allCats={cats}
          initial={editing ?? undefined}
          parentId={creating?.parentId ?? null}
          onClose={() => { setEditing(null); setCreating(null); }}
          onSaved={() => { setEditing(null); setCreating(null); refresh(); }}
        />
      )}
    </div>
  );
}

function TreeNode({
  node, all, depth, onEdit, onAddChild, onDelete,
}: {
  node: Category;
  all: Category[];
  depth: number;
  onEdit: (c: Category) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (c: Category) => void;
}) {
  const children = all.filter((c) => c.parentId === node.id);
  return (
    <>
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200/60 last:border-0 hover:bg-white/40"
        style={{ paddingLeft: `${16 + depth * 28}px` }}
      >
        {node.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={node.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-zinc-100" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-300">🗂️</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-zinc-900">{node.name}</div>
          <div className="text-xs text-zinc-400 font-mono">/{node.slug}</div>
        </div>
        <div className="text-xs text-zinc-500 font-mono">
          {node._count.products} produit{node._count.products > 1 ? "s" : ""}
        </div>
        <div className="flex items-center gap-1">
          {depth < 2 && (
            <button onClick={() => onAddChild(node.id)} className="text-xs text-zinc-500 hover:text-emerald-700 px-2 py-1" title="Ajouter une sous-catégorie">
              + sous-cat.
            </button>
          )}
          <button onClick={() => onEdit(node)} className="text-xs text-zinc-500 hover:text-zinc-900 px-2 py-1">
            Modifier
          </button>
          <button onClick={() => onDelete(node)} className="text-xs text-red-700 hover:text-red-700 px-2 py-1">
            Supprimer
          </button>
        </div>
      </div>
      {children.map((child) => (
        <TreeNode key={child.id} node={child} all={all} depth={depth + 1} onEdit={onEdit} onAddChild={onAddChild} onDelete={onDelete} />
      ))}
    </>
  );
}

function CategoryModal({
  siteSlug, initial, parentId, allCats, onClose, onSaved,
}: {
  siteSlug: string;
  initial?: Category;
  parentId: string | null;
  allCats: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [parent, setParent] = useState<string | null>(initial?.parentId ?? parentId);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const url = initial
        ? `/api/shop/${siteSlug}/categories/${initial.id}`
        : `/api/shop/${siteSlug}/categories`;
      const res = await fetch(url, {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, imageUrl: imageUrl || undefined, parentId: parent }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alert(`Erreur : ${json?.error ?? res.status}`); return;
      }
      onSaved();
    } finally { setSaving(false); }
  }

  // Liste des parents possibles (exclut la cat éditée + ses descendants)
  function isDescendant(candidate: Category, of: string): boolean {
    let c: Category | undefined = candidate;
    while (c) {
      if (c.id === of) return true;
      if (!c.parentId) return false;
      c = allCats.find((x) => x.id === c?.parentId);
    }
    return false;
  }
  const validParents = allCats.filter((c) => !initial || (c.id !== initial.id && !isDescendant(c, initial.id)));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 w-full max-w-lg space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold">{initial ? "Modifier la catégorie" : "Nouvelle catégorie"}</h2>

        <label className="block">
          <div className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-1.5">Nom *</div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Vêtements"
            className="w-full px-3 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 focus:outline-none focus:border-emerald-500"
            autoFocus
          />
        </label>

        <label className="block">
          <div className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-1.5">Description</div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 focus:outline-none focus:border-emerald-500 resize-y"
          />
        </label>

        <label className="block">
          <div className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-1.5">URL de l&apos;image</div>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…"
            className="w-full px-3 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 focus:outline-none focus:border-emerald-500"
          />
        </label>

        <label className="block">
          <div className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-1.5">Catégorie parente</div>
          <select
            value={parent ?? ""}
            onChange={(e) => setParent(e.target.value || null)}
            className="w-full px-3 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900"
          >
            <option value="">— Aucune (racine)</option>
            {validParents.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-sm">
            Annuler
          </button>
          <button
            onClick={save}
            disabled={saving || !name.trim()}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-sm font-semibold text-white"
          >
            {saving ? "…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
