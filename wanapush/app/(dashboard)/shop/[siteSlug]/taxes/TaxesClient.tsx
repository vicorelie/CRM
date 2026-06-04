"use client";

import { useCallback, useEffect, useState } from "react";

type TaxRate = {
  id: string;
  name: string;
  rate: string;
  country: string;
  region: string | null;
  appliesToShipping: boolean;
  enabled: boolean;
  position: number;
};

const PRESETS = [
  { name: "TVA France 20%", rate: 20, country: "FR" },
  { name: "TVA France réduit 10%", rate: 10, country: "FR" },
  { name: "TVA France super-réduit 5,5%", rate: 5.5, country: "FR" },
  { name: "TVA Belgique 21%", rate: 21, country: "BE" },
  { name: "TVA Suisse 8,1%", rate: 8.1, country: "CH" },
  { name: "TVA Espagne 21%", rate: 21, country: "ES" },
  { name: "TVA Allemagne 19%", rate: 19, country: "DE" },
  { name: "TVA Italie 22%", rate: 22, country: "IT" },
  { name: "TVA Royaume-Uni 20%", rate: 20, country: "GB" },
];

export function TaxesClient({ siteSlug }: { siteSlug: string }) {
  const [taxes, setTaxes] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<TaxRate | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/shop/${siteSlug}/taxes`);
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? "Erreur"); return; }
      setTaxes(json.taxes ?? []);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, [siteSlug]);
  useEffect(() => { refresh(); }, [refresh]);

  async function remove(t: TaxRate) {
    if (!confirm(`Supprimer "${t.name}" ?`)) return;
    const res = await fetch(`/api/shop/${siteSlug}/taxes/${t.id}`, { method: "DELETE" });
    if (!res.ok) { alert("Erreur"); return; }
    refresh();
  }
  async function toggle(t: TaxRate) {
    const res = await fetch(`/api/shop/${siteSlug}/taxes/${t.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !t.enabled }),
    });
    if (res.ok) refresh();
  }
  async function quickCreate(p: typeof PRESETS[number]) {
    const res = await fetch(`/api/shop/${siteSlug}/taxes`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: p.name, rate: p.rate, country: p.country, appliesToShipping: false }),
    });
    if (res.ok) refresh();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-500/30 text-emerald-700 text-xs font-medium uppercase tracking-widest">
            Fiscalité
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Taxes</h1>
          <p className="text-sm text-zinc-500">TVA / sales tax appliquée au checkout selon l&apos;adresse de livraison.</p>
        </div>
        <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm">
          + Nouveau taux
        </button>
      </header>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">⚠ {error}</div>}

      {!loading && taxes.length === 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white/40 p-6 space-y-4">
          <h2 className="font-bold text-base text-zinc-900">Démarrer rapidement</h2>
          <p className="text-sm text-zinc-500">Choisis un taux préconfiguré pour commencer :</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p.name} onClick={() => quickCreate(p)} className="text-sm px-3 py-2 rounded-lg bg-zinc-100 hover:bg-emerald-500 hover:text-white transition-colors">
                + {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && taxes.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white/40 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/60 border-b border-zinc-200">
              <tr className="text-left text-xs uppercase tracking-widest text-zinc-400">
                <th className="px-4 py-3 font-semibold">Nom</th>
                <th className="px-4 py-3 font-semibold">Pays</th>
                <th className="px-4 py-3 font-semibold">Taux</th>
                <th className="px-4 py-3 font-semibold">Sur livraison</th>
                <th className="px-4 py-3 font-semibold">Actif</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {taxes.map((t) => (
                <tr key={t.id} className="border-b border-zinc-200/60 last:border-0 hover:bg-white/40">
                  <td className="px-4 py-3 font-semibold text-zinc-900">{t.name}</td>
                  <td className="px-4 py-3 text-zinc-700 font-mono">{t.country}{t.region ? ` · ${t.region}` : ""}</td>
                  <td className="px-4 py-3 text-zinc-900 font-mono">{Number(t.rate)} %</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{t.appliesToShipping ? "Oui" : "Non"}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggle(t)} className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border ${t.enabled ? "bg-emerald-50 text-emerald-700 border-emerald-500/30" : "bg-zinc-200/40 text-zinc-500 border-zinc-200"}`}>
                      {t.enabled ? "Activé" : "Désactivé"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setEditing(t)} className="text-xs text-zinc-500 hover:text-zinc-900 px-2 py-1">Modifier</button>
                    <button onClick={() => remove(t)} className="text-xs text-red-700 hover:text-red-700 px-2 py-1">Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) && (
        <TaxModal
          siteSlug={siteSlug}
          tax={editing ?? undefined}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}

function TaxModal({ siteSlug, tax, onClose, onSaved }: { siteSlug: string; tax?: TaxRate; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(tax?.name ?? "");
  const [rate, setRate] = useState(tax?.rate ?? "20");
  const [country, setCountry] = useState(tax?.country ?? "FR");
  const [region, setRegion] = useState(tax?.region ?? "");
  const [appliesToShipping, setAppliesToShipping] = useState(tax?.appliesToShipping ?? false);
  const [enabled, setEnabled] = useState(tax?.enabled ?? true);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const url = tax
        ? `/api/shop/${siteSlug}/taxes/${tax.id}`
        : `/api/shop/${siteSlug}/taxes`;
      const res = await fetch(url, {
        method: tax ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, rate: parseFloat(String(rate)), country: country.toUpperCase(),
          region: region || null, appliesToShipping, enabled,
        }),
      });
      if (!res.ok) { alert("Erreur"); return; }
      onSaved();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 w-full max-w-lg space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold">{tax ? "Modifier le taux" : "Nouveau taux de taxe"}</h2>
        <Field label="Nom"><input className={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: TVA France 20%" autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Taux %"><input type="number" step="0.01" className={inp} value={rate} onChange={(e) => setRate(e.target.value)} /></Field>
          <Field label="Pays (ISO 2)"><input className={`${inp} uppercase`} maxLength={2} value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} /></Field>
        </div>
        <Field label="Région (optionnel, pour US states / CA provinces)"><input className={inp} value={region} onChange={(e) => setRegion(e.target.value)} /></Field>
        <label className="flex items-center gap-2"><input type="checkbox" checked={appliesToShipping} onChange={(e) => setAppliesToShipping(e.target.checked)} className="w-4 h-4 accent-emerald-500" /><span className="text-sm text-zinc-700">S&apos;applique aussi aux frais de port</span></label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="w-4 h-4 accent-emerald-500" /><span className="text-sm text-zinc-700">Activé</span></label>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-zinc-100 text-sm">Annuler</button>
          <button onClick={save} disabled={saving || !name.trim()} className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-sm font-semibold text-white">{saving ? "…" : "Enregistrer"}</button>
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
