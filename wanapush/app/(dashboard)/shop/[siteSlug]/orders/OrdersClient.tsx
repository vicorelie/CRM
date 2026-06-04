"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Order = {
  id: string;
  orderNumber: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  financialStatus: "PENDING" | "AUTHORIZED" | "PAID" | "PARTIALLY_REFUNDED" | "REFUNDED" | "FAILED";
  fulfillmentStatus: "UNFULFILLED" | "PARTIAL" | "FULFILLED";
  customerEmail: string;
  customerName: string | null;
  currency: string;
  total: string;
  createdAt: string;
  _count: { items: number };
};

const FIN_STYLE: Record<Order["financialStatus"], string> = {
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-500/30",
  PENDING: "bg-amber-50 text-amber-800 border-amber-500/30",
  AUTHORIZED: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  PARTIALLY_REFUNDED: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  REFUNDED: "bg-zinc-200/40 text-zinc-500 border-zinc-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
};

const FUL_STYLE: Record<Order["fulfillmentStatus"], string> = {
  UNFULFILLED: "bg-zinc-200/40 text-zinc-700 border-zinc-200",
  PARTIAL: "bg-amber-50 text-amber-800 border-amber-500/30",
  FULFILLED: "bg-emerald-50 text-emerald-700 border-emerald-500/30",
};

export function OrdersClient({ siteSlug, currency, locale }: { siteSlug: string; currency: string; locale: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [financial, setFinancial] = useState("");

  const fmt = useCallback(
    (val: number | string) => new Intl.NumberFormat(locale, { style: "currency", currency }).format(typeof val === "string" ? parseFloat(val) : val),
    [locale, currency],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL(`/api/shop/${siteSlug}/orders`, window.location.origin);
      if (q) url.searchParams.set("q", q);
      if (financial) url.searchParams.set("financial", financial);
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders ?? []);
      }
    } finally { setLoading(false); }
  }, [siteSlug, q, financial]);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-500/30 text-emerald-700 text-xs font-medium uppercase tracking-widest">
          Ventes
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Commandes</h1>
      </header>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher (n° commande, email…)"
            className="w-full px-3 py-2 rounded-lg bg-white/60 border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <select value={financial} onChange={(e) => setFinancial(e.target.value)} className="px-3 py-2 rounded-lg bg-white/60 border border-zinc-200 text-sm text-zinc-900">
          <option value="">Tous paiements</option>
          <option value="PAID">Payées</option>
          <option value="PENDING">En attente</option>
          <option value="REFUNDED">Remboursées</option>
          <option value="FAILED">Échouées</option>
        </select>
      </div>

      {loading ? (
        <div className="text-sm text-zinc-500">Chargement…</div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white/40 p-10 text-center space-y-4">
          <div className="text-5xl">📨</div>
          <p className="text-zinc-700">{q || financial ? "Aucune commande ne correspond." : "Pas encore de commande."}</p>
          {!q && !financial && (
            <p className="text-xs text-zinc-400">Les commandes apparaîtront ici dès que des clients passeront commande sur votre site.</p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white/40 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/60 border-b border-zinc-200">
              <tr className="text-left text-xs uppercase tracking-widest text-zinc-400">
                <th className="px-4 py-3 font-semibold">N°</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Paiement</th>
                <th className="px-4 py-3 font-semibold">Livraison</th>
                <th className="px-4 py-3 font-semibold">Articles</th>
                <th className="px-4 py-3 font-semibold text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-zinc-200/60 last:border-0 hover:bg-white/40">
                  <td className="px-4 py-3 font-bold text-zinc-900">
                    <Link href={`/shop/${siteSlug}/orders/${o.id}`} className="hover:text-emerald-700">
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">
                    {new Date(o.createdAt).toLocaleString(locale, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    <div className="font-medium text-zinc-900">{o.customerName || o.customerEmail}</div>
                    {o.customerName && <div className="text-xs text-zinc-400">{o.customerEmail}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border ${FIN_STYLE[o.financialStatus]}`}>
                      {o.financialStatus.replace("_", " ").toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border ${FUL_STYLE[o.fulfillmentStatus]}`}>
                      {o.fulfillmentStatus.toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{o._count.items}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-zinc-900">{fmt(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
