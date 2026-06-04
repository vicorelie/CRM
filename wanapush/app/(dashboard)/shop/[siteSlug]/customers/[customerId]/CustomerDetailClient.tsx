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
type Address = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  phone: string | null;
  address1: string;
  address2: string | null;
  city: string;
  postalCode: string;
  province: string | null;
  country: string;
  isDefault: boolean;
};
type Order = {
  id: string;
  orderNumber: string;
  total: number;
  currency: string;
  financialStatus: string;
  fulfillmentStatus: string;
  createdAt: string;
};

export function CustomerDetailClient({
  siteSlug,
  customerId,
  currency,
  locale,
}: {
  siteSlug: string;
  customerId: string;
  currency: string;
  locale: string;
}) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviewsCount, setReviewsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");

  const fmt = (n: number) => new Intl.NumberFormat(locale, { style: "currency", currency }).format(n);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shop/${siteSlug}/customers/${customerId}`);
      if (res.ok) {
        const data = await res.json();
        setCustomer(data.customer);
        setAddresses(data.addresses ?? []);
        setOrders(data.orders ?? []);
        setReviewsCount(data.reviewsCount ?? 0);
        setNotesDraft(data.customer?.notes ?? "");
      }
    } finally { setLoading(false); }
  }, [siteSlug, customerId]);

  useEffect(() => { refresh(); }, [refresh]);

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/shop/${siteSlug}/customers/${customerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) await refresh();
  }

  async function saveNotes() {
    setSavingNotes(true);
    await patch({ notes: notesDraft });
    setSavingNotes(false);
  }

  async function toggleBlock() {
    if (!customer) return;
    if (customer.blocked) {
      await patch({ blocked: false, blockedReason: null });
    } else {
      const reason = prompt("Raison du blocage (optionnel) :") ?? "";
      await patch({ blocked: true, blockedReason: reason || null });
    }
  }

  async function removeCustomer() {
    if (!confirm("Supprimer définitivement ce client ?\n\nLes commandes existantes seront conservées mais détachées.")) return;
    const res = await fetch(`/api/shop/${siteSlug}/customers/${customerId}`, { method: "DELETE" });
    if (res.ok) window.location.href = `/shop/${siteSlug}/customers`;
  }

  if (loading) return <div className="text-sm text-zinc-500">Chargement…</div>;
  if (!customer) return <div className="text-sm text-red-700">Client introuvable.</div>;

  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(" ") || customer.email;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link href={`/shop/${siteSlug}/customers`} className="text-sm text-zinc-500 hover:text-emerald-700 inline-flex items-center gap-1.5">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Tous les clients
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{fullName}</h1>
          <div className="text-sm text-zinc-500">{customer.email}{customer.phone ? ` · ${customer.phone}` : ""}</div>
          <div className="text-xs text-zinc-400">
            Client depuis {new Date(customer.createdAt).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" })}
          </div>
        </div>
        <div className="flex gap-2">
          {customer.marketingConsent && (
            <span className="text-[10px] uppercase tracking-widest bg-brand/15 text-brand-700 border border-brand/30 px-2 py-0.5 rounded-full">
              Opt-in marketing
            </span>
          )}
          {customer.blocked && (
            <span className="text-[10px] uppercase tracking-widest bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
              Bloqué
            </span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Commandes" value={String(customer.ordersCount)} />
        <Kpi label="Total dépensé" value={fmt(customer.totalSpent)} />
        <Kpi label="Panier moyen" value={fmt(customer.ordersCount > 0 ? customer.totalSpent / customer.ordersCount : 0)} />
        <Kpi label="Avis publiés" value={String(reviewsCount)} />
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white/40 p-5 space-y-3">
        <h2 className="font-bold text-base text-zinc-900">Notes internes</h2>
        <textarea
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          rows={4}
          placeholder="Préférences, historique, remarques… (visible uniquement par toi)"
          className="w-full px-3 py-2 rounded-lg bg-white border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:border-emerald-500 resize-y"
        />
        <div className="flex justify-end">
          <button
            onClick={saveNotes}
            disabled={savingNotes || notesDraft === (customer.notes ?? "")}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-xs font-semibold"
          >
            {savingNotes ? "Sauvegarde…" : "Enregistrer"}
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-zinc-200 bg-white/40 p-5 space-y-3">
          <h2 className="font-bold text-base text-zinc-900">Adresses ({addresses.length})</h2>
          {addresses.length === 0 ? (
            <p className="text-sm text-zinc-400">Aucune adresse enregistrée.</p>
          ) : (
            <ul className="space-y-3">
              {addresses.map((a) => (
                <li key={a.id} className="text-sm text-zinc-700 leading-relaxed border-b border-zinc-200/60 last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center gap-2">
                    <strong>{[a.firstName, a.lastName].filter(Boolean).join(" ") || "—"}</strong>
                    {a.isDefault && (
                      <span className="text-[9px] uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
                        Défaut
                      </span>
                    )}
                  </div>
                  {a.company && <div className="text-xs text-zinc-400">{a.company}</div>}
                  <div>{a.address1}</div>
                  {a.address2 && <div>{a.address2}</div>}
                  <div>{a.postalCode} {a.city}{a.province ? `, ${a.province}` : ""}</div>
                  <div className="text-xs text-zinc-400">{a.country}{a.phone ? ` · ${a.phone}` : ""}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white/40 p-5 space-y-3">
          <h2 className="font-bold text-base text-zinc-900">Historique commandes</h2>
          {orders.length === 0 ? (
            <p className="text-sm text-zinc-400">Aucune commande.</p>
          ) : (
            <ul className="space-y-2">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2 border-b border-zinc-200/60 last:border-0">
                  <Link href={`/shop/${siteSlug}/orders/${o.id}`} className="font-semibold text-zinc-900 hover:text-emerald-700">
                    {o.orderNumber}
                  </Link>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-zinc-900">{fmt(o.total)}</div>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-400">{o.financialStatus} · {o.fulfillmentStatus}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white/40 p-5 space-y-3">
        <h2 className="font-bold text-base text-zinc-900">Modération</h2>
        {customer.blocked && customer.blockedReason && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
            Raison : {customer.blockedReason}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={toggleBlock}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              customer.blocked
                ? "bg-emerald-50 hover:bg-emerald-50 text-emerald-700 border-emerald-500/30"
                : "bg-red-50 hover:bg-red-50 text-red-700 border-red-200"
            }`}
          >
            {customer.blocked ? "✓ Débloquer" : "✕ Bloquer"}
          </button>
          <button
            onClick={() => patch({ marketingConsent: !customer.marketingConsent })}
            className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold"
          >
            {customer.marketingConsent ? "Retirer opt-in marketing" : "Marquer opt-in marketing"}
          </button>
          <button
            onClick={removeCustomer}
            className="ml-auto px-3 py-1.5 rounded-lg text-red-700 hover:text-red-700 text-xs"
          >
            Supprimer le client
          </button>
        </div>
      </section>
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
