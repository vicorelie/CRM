"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Shop = {
  id: string;
  siteSlug: string;
  name: string;
  currency: string;
  setupCompleted: boolean;
  createdAt: string;
  _count: { products: number; orders: number };
};
type Activable = { siteSlug: string; brandName: string; createdAt: string };

export function ShopListClient() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [activable, setActivable] = useState<Activable[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/shop");
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? "Erreur"); return; }
      setShops(json.shops ?? []);
      setActivable(json.activableSites ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { refresh(); }, []);

  async function activate(siteSlug: string, brandName: string) {
    setCreating(siteSlug);
    try {
      const res = await fetch("/api/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteSlug, name: brandName }),
      });
      const json = await res.json();
      if (!res.ok) { alert(json?.error ?? "Erreur"); return; }
      window.location.href = `/shop/${siteSlug}`;
    } finally {
      setCreating(null);
    }
  }

  if (loading) return <div className="text-sm text-zinc-500">Chargement…</div>;
  if (error) return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      ⚠ {error}
    </div>
  );

  return (
    <div className="space-y-10">
      {shops.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm uppercase tracking-widest text-zinc-500 font-semibold">
            Boutiques actives ({shops.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shops.map((s) => (
              <Link
                key={s.id}
                href={`/shop/${s.siteSlug}`}
                className="rounded-2xl border border-zinc-200 bg-white/60 hover:border-emerald-500/60 hover:bg-zinc-50 transition-all p-5 space-y-3 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-base text-zinc-900 group-hover:text-emerald-700 transition-colors">
                      {s.name}
                    </div>
                    <div className="text-xs text-zinc-400 font-mono mt-0.5">/{s.siteSlug}</div>
                  </div>
                  {!s.setupCompleted && (
                    <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-50 border border-amber-500/30 text-amber-800">
                      Setup
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-zinc-200">
                  <Stat label="Produits" value={s._count.products} />
                  <Stat label="Commandes" value={s._count.orders} />
                  <Stat label="Devise" value={s.currency} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {activable.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm uppercase tracking-widest text-zinc-500 font-semibold">
            Sites sans boutique ({activable.length})
          </h2>
          <p className="text-xs text-zinc-400">
            Active l&apos;e-commerce sur l&apos;un de tes sites générés pour démarrer une boutique.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activable.map((a) => (
              <div
                key={a.siteSlug}
                className="rounded-2xl border border-zinc-200 bg-white/40 p-5 space-y-3"
              >
                <div>
                  <div className="font-semibold text-base text-zinc-900">{a.brandName}</div>
                  <div className="text-xs text-zinc-400 font-mono mt-0.5">/{a.siteSlug}</div>
                </div>
                <button
                  onClick={() => activate(a.siteSlug, a.brandName)}
                  disabled={creating === a.siteSlug}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 transition-colors px-4 py-2 text-sm font-semibold text-white"
                >
                  {creating === a.siteSlug ? "Activation…" : "+ Activer l’e-commerce"}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {shops.length === 0 && activable.length === 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white/40 p-10 text-center space-y-3">
          <div className="text-5xl">🛍️</div>
          <p className="text-zinc-700">Pas encore de site disponible pour activer une boutique.</p>
          <Link
            href="/generate"
            className="inline-block rounded-lg bg-brand hover:bg-brand-400 transition-colors px-5 py-2.5 text-sm font-semibold text-white"
          >
            Générer un site
          </Link>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-base font-semibold text-zinc-900">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-zinc-400">{label}</div>
    </div>
  );
}
