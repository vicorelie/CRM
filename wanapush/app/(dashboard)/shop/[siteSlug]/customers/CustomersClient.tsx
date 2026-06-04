"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Customer = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  marketingConsent: boolean;
  totalSpent: number;
  ordersCount: number;
  lastOrderAt: string | null;
  blocked: boolean;
  blockedReason: string | null;
  notes: string | null;
  createdAt: string;
};

type Stats = { total: number; totalSpent: number; totalOrders: number };

export function CustomersClient({ siteSlug, currency, locale }: { siteSlug: string; currency: string; locale: string }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"" | "blocked" | "marketing">("");
  const [loading, setLoading] = useState(true);

  const fmt = (n: number) => new Intl.NumberFormat(locale, { style: "currency", currency }).format(n);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL(`/api/shop/${siteSlug}/customers`, window.location.origin);
      if (q) url.searchParams.set("q", q);
      if (filter === "blocked") url.searchParams.set("blocked", "1");
      if (filter === "marketing") url.searchParams.set("marketing", "1");
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers ?? []);
        setStats(data.stats ?? null);
      }
    } finally { setLoading(false); }
  }, [siteSlug, q, filter]);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-500/30 text-emerald-700 text-xs font-medium uppercase tracking-widest">
          Carnet
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
      </header>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Kpi label="Clients" value={String(stats.total)} />
          <Kpi label="CA cumulé" value={fmt(stats.totalSpent)} />
          <Kpi label="Commandes" value={String(stats.totalOrders)} />
        </div>
      )}

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
            placeholder="Rechercher email, nom, téléphone…"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/60 border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as "" | "blocked" | "marketing")}
          className="px-3 py-2 rounded-lg bg-white/60 border border-zinc-200 text-sm text-zinc-900"
        >
          <option value="">Tous</option>
          <option value="marketing">Opt-in marketing</option>
          <option value="blocked">Bloqués</option>
        </select>
      </div>

      {loading ? (
        <div className="text-sm text-zinc-500">Chargement…</div>
      ) : customers.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white/40 p-10 text-center space-y-3">
          <div className="text-5xl">👥</div>
          <p className="text-zinc-700">Aucun client pour le moment.</p>
          <p className="text-xs text-zinc-400">Les clients sont créés automatiquement lors de leur première commande ou inscription.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white/40 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/60 border-b border-zinc-200">
              <tr className="text-left text-xs uppercase tracking-widest text-zinc-400">
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Commandes</th>
                <th className="px-4 py-3 font-semibold">Total dépensé</th>
                <th className="px-4 py-3 font-semibold">Dernière commande</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const fullName = [c.firstName, c.lastName].filter(Boolean).join(" ");
                return (
                  <tr key={c.id} className="border-b border-zinc-200/60 last:border-0 hover:bg-white/40">
                    <td className="px-4 py-3">
                      <Link href={`/shop/${siteSlug}/customers/${c.id}`} className="flex flex-col group">
                        <span className="font-semibold text-zinc-900 group-hover:text-emerald-700 transition-colors">{fullName || c.email}</span>
                        {fullName && <span className="text-xs text-zinc-400">{c.email}</span>}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{c.ordersCount}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-zinc-900">{fmt(c.totalSpent)}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.blocked && (
                          <span className="text-[10px] uppercase tracking-widest bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
                            Bloqué
                          </span>
                        )}
                        {c.marketingConsent && (
                          <span className="text-[10px] uppercase tracking-widest bg-brand/15 text-brand-700 border border-brand/30 px-2 py-0.5 rounded-full">
                            Marketing
                          </span>
                        )}
                        {!c.blocked && !c.marketingConsent && <span className="text-xs text-zinc-300">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/shop/${siteSlug}/customers/${c.id}`} className="text-xs text-emerald-700 hover:text-emerald-200">
                        Voir →
                      </Link>
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

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/40 p-5">
      <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-1">{label}</div>
      <div className="text-2xl font-bold text-zinc-900">{value}</div>
    </div>
  );
}
