"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type ProductRow = {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  productType: string;
  featured: boolean;
  updatedAt: string;
  images: Array<{ url: string; alt: string | null }>;
  variants: Array<{ id: string; price: string | number; sku: string | null }>;
  _count: { variants: number };
};

const STATUS_COLORS = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-500/30",
  DRAFT: "bg-amber-50 text-amber-800 border-amber-500/30",
  ARCHIVED: "bg-zinc-200/40 text-zinc-500 border-zinc-200",
};

export function ProductsListClient({
  siteSlug,
  currency,
  locale,
}: {
  siteSlug: string;
  currency: string;
  locale: string;
}) {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | "DRAFT" | "ACTIVE" | "ARCHIVED">("");
  const [error, setError] = useState<string | null>(null);

  const fmt = useCallback(
    (val: number | string) =>
      new Intl.NumberFormat(locale, { style: "currency", currency }).format(
        typeof val === "string" ? parseFloat(val) : val,
      ),
    [locale, currency],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(`/api/shop/${siteSlug}/products`, window.location.origin);
      if (q) url.searchParams.set("q", q);
      if (status) url.searchParams.set("status", status);
      const res = await fetch(url.toString());
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? "Erreur"); return; }
      setProducts(json.products ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [siteSlug, q, status]);

  useEffect(() => { refresh(); }, [refresh]);

  async function remove(p: ProductRow) {
    if (!confirm(`Supprimer "${p.title}" ? Cette action est irréversible.`)) return;
    const res = await fetch(`/api/shop/${siteSlug}/products/${p.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(`Erreur : ${json?.error ?? res.status}`);
      return;
    }
    setProducts((prev) => prev.filter((x) => x.id !== p.id));
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-500/30 text-emerald-700 text-xs font-medium uppercase tracking-widest">
            Catalogue
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Produits</h1>
        </div>
        <Link
          href={`/shop/${siteSlug}/products/new`}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm"
        >
          + Nouveau produit
        </Link>
      </header>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un produit…"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/60 border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "" | "DRAFT" | "ACTIVE" | "ARCHIVED")}
          className="px-3 py-2 rounded-lg bg-white/60 border border-zinc-200 text-sm text-zinc-900"
        >
          <option value="">Tous statuts</option>
          <option value="ACTIVE">Actifs</option>
          <option value="DRAFT">Brouillons</option>
          <option value="ARCHIVED">Archivés</option>
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">⚠ {error}</div>
      )}

      {loading ? (
        <div className="text-sm text-zinc-500">Chargement…</div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white/40 p-10 text-center space-y-4">
          <div className="text-5xl">📦</div>
          <p className="text-zinc-700">{q || status ? "Aucun produit ne correspond aux filtres." : "Pas encore de produit."}</p>
          {!(q || status) && (
            <Link
              href={`/shop/${siteSlug}/products/new`}
              className="inline-block rounded-lg bg-emerald-500 hover:bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-white"
            >
              + Ajouter un produit
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white/40 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/60 border-b border-zinc-200">
              <tr className="text-left text-xs uppercase tracking-widest text-zinc-400">
                <th className="px-4 py-3 font-semibold">Produit</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Variantes</th>
                <th className="px-4 py-3 font-semibold">Prix</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const minPrice = p.variants.length ? Math.min(...p.variants.map((v) => Number(v.price))) : 0;
                const maxPrice = p.variants.length ? Math.max(...p.variants.map((v) => Number(v.price))) : 0;
                const priceLabel =
                  minPrice === maxPrice ? fmt(minPrice) : `${fmt(minPrice)} – ${fmt(maxPrice)}`;
                return (
                  <tr key={p.id} className="border-b border-zinc-200/60 last:border-0 hover:bg-white/40">
                    <td className="px-4 py-3">
                      <Link href={`/shop/${siteSlug}/products/${p.id}`} className="flex items-center gap-3 group">
                        <div className="w-12 h-12 rounded-lg bg-zinc-100 overflow-hidden flex-shrink-0">
                          {p.images[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.images[0].url} alt={p.images[0].alt ?? ""} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-300 text-xl">📷</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-zinc-900 group-hover:text-emerald-700 transition-colors truncate">
                            {p.title}
                          </div>
                          <div className="text-xs text-zinc-400 font-mono truncate">/{p.slug}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border ${STATUS_COLORS[p.status]}`}>
                        {p.status === "ACTIVE" ? "Actif" : p.status === "DRAFT" ? "Brouillon" : "Archivé"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs uppercase tracking-widest">{p.productType}</td>
                    <td className="px-4 py-3 text-zinc-700">{p._count.variants}</td>
                    <td className="px-4 py-3 font-mono text-zinc-900">{priceLabel}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => remove(p)}
                        className="text-xs text-red-700 hover:text-red-700 px-2 py-1"
                        title="Supprimer"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
