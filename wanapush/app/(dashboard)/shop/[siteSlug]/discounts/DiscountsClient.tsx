"use client";

import { useCallback, useEffect, useState } from "react";

type Discount = {
  id: string;
  code: string;
  description: string | null;
  type: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING" | "BUY_X_GET_Y";
  value: string;
  minSubtotal: string | null;
  usageLimit: number | null;
  usageCount: number;
  startsAt: string | null;
  endsAt: string | null;
  firstOrderOnly: boolean;
  oncePerCustomer: boolean;
  enabled: boolean;
  createdAt: string;
};

export function DiscountsClient({ siteSlug, currency }: { siteSlug: string; currency: string }) {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Discount | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shop/${siteSlug}/discounts`);
      if (res.ok) {
        const data = await res.json();
        setDiscounts(data.discounts ?? []);
      }
    } finally { setLoading(false); }
  }, [siteSlug]);

  useEffect(() => { refresh(); }, [refresh]);

  async function toggle(d: Discount) {
    await fetch(`/api/shop/${siteSlug}/discounts/${d.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !d.enabled }),
    });
    refresh();
  }
  async function remove(d: Discount) {
    if (!confirm(`Supprimer le code "${d.code}" ?`)) return;
    await fetch(`/api/shop/${siteSlug}/discounts/${d.id}`, { method: "DELETE" });
    refresh();
  }

  function formatValue(d: Discount) {
    if (d.type === "PERCENTAGE") return `-${Number(d.value)}%`;
    if (d.type === "FIXED_AMOUNT") return `-${Number(d.value)} ${currency}`;
    if (d.type === "FREE_SHIPPING") return "Livraison offerte";
    return d.value;
  }
  function isActiveNow(d: Discount) {
    const now = Date.now();
    if (d.startsAt && new Date(d.startsAt).getTime() > now) return false;
    if (d.endsAt && new Date(d.endsAt).getTime() < now) return false;
    if (d.usageLimit && d.usageCount >= d.usageLimit) return false;
    return d.enabled;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-500/30 text-emerald-700 text-xs font-medium uppercase tracking-widest">
            Marketing
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Codes promo</h1>
          <p className="text-sm text-zinc-500">Crée des remises (% ou €) à appliquer au panier de tes clients.</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm"
        >
          + Nouveau code
        </button>
      </header>

      {loading ? (
        <div className="text-sm text-zinc-500">Chargement…</div>
      ) : discounts.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white/40 p-10 text-center space-y-4">
          <div className="text-5xl">🏷️</div>
          <p className="text-zinc-700">Pas encore de code promo.</p>
          <button
            onClick={() => setCreating(true)}
            className="inline-block rounded-lg bg-emerald-500 hover:bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-white"
          >
            + Créer mon premier code
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white/40 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/60 border-b border-zinc-200">
              <tr className="text-left text-xs uppercase tracking-widest text-zinc-400">
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Réduction</th>
                <th className="px-4 py-3 font-semibold">Usage</th>
                <th className="px-4 py-3 font-semibold">Période</th>
                <th className="px-4 py-3 font-semibold">État</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {discounts.map((d) => {
                const active = isActiveNow(d);
                return (
                  <tr key={d.id} className="border-b border-zinc-200/60 last:border-0 hover:bg-white/40">
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-zinc-900">{d.code}</div>
                      {d.description && <div className="text-xs text-zinc-400 mt-0.5">{d.description}</div>}
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-700">{formatValue(d)}</td>
                    <td className="px-4 py-3 text-zinc-700 text-xs">
                      {d.usageCount}
                      {d.usageLimit ? ` / ${d.usageLimit}` : " / ∞"}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {d.startsAt && `dès ${new Date(d.startsAt).toLocaleDateString("fr-FR")}`}
                      {d.endsAt && ` → ${new Date(d.endsAt).toLocaleDateString("fr-FR")}`}
                      {!d.startsAt && !d.endsAt && "Permanent"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggle(d)}
                        className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                          active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-500/30"
                            : "bg-zinc-200/40 text-zinc-500 border-zinc-200"
                        }`}
                      >
                        {active ? "Actif" : "Désactivé"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setEditing(d)} className="text-xs text-zinc-500 hover:text-zinc-900 px-2 py-1">Modifier</button>
                      <button onClick={() => remove(d)} className="text-xs text-red-700 hover:text-red-700 px-2 py-1">Supprimer</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) && (
        <DiscountModal
          siteSlug={siteSlug}
          currency={currency}
          discount={editing ?? undefined}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}

function DiscountModal({
  siteSlug, currency, discount, onClose, onSaved,
}: {
  siteSlug: string;
  currency: string;
  discount?: Discount;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [code, setCode] = useState(discount?.code ?? "");
  const [description, setDescription] = useState(discount?.description ?? "");
  const [type, setType] = useState<Discount["type"]>(discount?.type ?? "PERCENTAGE");
  const [value, setValue] = useState(discount?.value ?? "10");
  const [minSubtotal, setMinSubtotal] = useState(discount?.minSubtotal ?? "");
  const [usageLimit, setUsageLimit] = useState(discount?.usageLimit?.toString() ?? "");
  const [startsAt, setStartsAt] = useState(discount?.startsAt ? discount.startsAt.slice(0, 10) : "");
  const [endsAt, setEndsAt] = useState(discount?.endsAt ? discount.endsAt.slice(0, 10) : "");
  const [firstOrderOnly, setFirstOrderOnly] = useState(discount?.firstOrderOnly ?? false);
  const [oncePerCustomer, setOncePerCustomer] = useState(discount?.oncePerCustomer ?? false);
  const [enabled, setEnabled] = useState(discount?.enabled ?? true);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const payload = {
        code, description, type,
        value: parseFloat(value),
        minSubtotal: minSubtotal ? parseFloat(minSubtotal) : undefined,
        usageLimit: usageLimit ? parseInt(usageLimit, 10) : undefined,
        startsAt: startsAt || undefined,
        endsAt: endsAt || undefined,
        firstOrderOnly, oncePerCustomer, enabled,
      };
      const url = discount
        ? `/api/shop/${siteSlug}/discounts/${discount.id}`
        : `/api/shop/${siteSlug}/discounts`;
      const res = await fetch(url, {
        method: discount ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alert(`Erreur : ${json?.error ?? res.status}`);
        return;
      }
      onSaved();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold">{discount ? "Modifier le code" : "Nouveau code promo"}</h2>

        <Field label="Code (saisi par le client)">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="SUMMER20"
            className={`${inp} uppercase font-mono`}
            disabled={!!discount}
            autoFocus
          />
        </Field>

        <Field label="Description (interne)">
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Code été 20% sur tout" className={inp} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Type de réduction">
            <select value={type} onChange={(e) => setType(e.target.value as Discount["type"])} className={inp}>
              <option value="PERCENTAGE">Pourcentage (%)</option>
              <option value="FIXED_AMOUNT">Montant fixe ({currency})</option>
              <option value="FREE_SHIPPING">Livraison gratuite</option>
            </select>
          </Field>
          {(type === "PERCENTAGE" || type === "FIXED_AMOUNT") && (
            <Field label={type === "PERCENTAGE" ? "Valeur (%)" : `Valeur (${currency})`}>
              <input type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} className={inp} />
            </Field>
          )}
        </div>

        <Field label={`Montant minimum du panier (${currency})`}>
          <input type="number" step="0.01" value={minSubtotal} onChange={(e) => setMinSubtotal(e.target.value)} placeholder="0 = pas de minimum" className={inp} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Limite d'utilisations totales">
            <input type="number" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} placeholder="∞" className={inp} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Valide à partir du">
            <input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inp} />
          </Field>
          <Field label="Expire le">
            <input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inp} />
          </Field>
        </div>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={firstOrderOnly} onChange={(e) => setFirstOrderOnly(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
          <span className="text-sm text-zinc-700">Première commande uniquement</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={oncePerCustomer} onChange={(e) => setOncePerCustomer(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
          <span className="text-sm text-zinc-700">Une seule utilisation par client</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
          <span className="text-sm text-zinc-700">Activé</span>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-zinc-100 text-sm">Annuler</button>
          <button onClick={save} disabled={saving || !code.trim()} className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-sm font-semibold text-white">
            {saving ? "…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-1.5">{label}</div>
      {children}
    </label>
  );
}
const inp = "w-full px-3 py-2 rounded-lg bg-white border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 transition-colors";
