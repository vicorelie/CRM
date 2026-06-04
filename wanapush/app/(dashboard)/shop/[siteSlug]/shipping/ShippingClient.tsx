"use client";

import { useCallback, useEffect, useState } from "react";

type ShippingType = "FLAT" | "WEIGHT_BASED" | "PRICE_BASED" | "FREE" | "PICKUP";

type Method = {
  id: string;
  zoneId: string;
  name: string;
  type: ShippingType;
  description: string | null;
  carrier: string | null;
  flatRate: string | null;
  rules: unknown;
  freeAboveAmount: string | null;
  estimatedDays: string | null;
  enabled: boolean;
};
type Zone = {
  id: string;
  name: string;
  countries: string[];
  position: number;
  methods: Method[];
};

const TYPE_LABEL: Record<ShippingType, string> = {
  FLAT: "Tarif fixe",
  WEIGHT_BASED: "Selon le poids",
  PRICE_BASED: "Selon le total panier",
  FREE: "Gratuit",
  PICKUP: "Retrait / Point relais",
};

const COMMON_COUNTRIES = [
  { code: "FR", name: "France" }, { code: "BE", name: "Belgique" }, { code: "CH", name: "Suisse" },
  { code: "LU", name: "Luxembourg" }, { code: "DE", name: "Allemagne" }, { code: "ES", name: "Espagne" },
  { code: "IT", name: "Italie" }, { code: "PT", name: "Portugal" }, { code: "NL", name: "Pays-Bas" },
  { code: "GB", name: "Royaume-Uni" }, { code: "US", name: "États-Unis" }, { code: "CA", name: "Canada" },
];

export function ShippingClient({ siteSlug, currency, weightUnit }: { siteSlug: string; currency: string; weightUnit: string }) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoneModal, setZoneModal] = useState<Zone | "new" | null>(null);
  const [methodModal, setMethodModal] = useState<{ zoneId: string; method?: Method } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/shop/${siteSlug}/shipping/zones`);
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? "Erreur"); return; }
      // countries vient en Json — peut être un objet ou array
      const z = (json.zones ?? []).map((zz: Zone & { countries: unknown }) => ({
        ...zz,
        countries: Array.isArray(zz.countries) ? zz.countries : [],
      }));
      setZones(z);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, [siteSlug]);

  useEffect(() => { refresh(); }, [refresh]);

  async function deleteZone(z: Zone) {
    if (!confirm(`Supprimer la zone "${z.name}" et ses ${z.methods.length} méthode(s) ?`)) return;
    const res = await fetch(`/api/shop/${siteSlug}/shipping/zones/${z.id}`, { method: "DELETE" });
    if (!res.ok) { alert("Erreur"); return; }
    refresh();
  }
  async function deleteMethod(m: Method) {
    if (!confirm(`Supprimer "${m.name}" ?`)) return;
    const res = await fetch(`/api/shop/${siteSlug}/shipping/zones/${m.zoneId}/methods/${m.id}`, { method: "DELETE" });
    if (!res.ok) { alert("Erreur"); return; }
    refresh();
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-500/30 text-emerald-700 text-xs font-medium uppercase tracking-widest">
            Logistique
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Livraison</h1>
          <p className="text-sm text-zinc-500">Zones par pays + méthodes (tarif fixe, par poids, gratuit…).</p>
        </div>
        <button
          onClick={() => setZoneModal("new")}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm"
        >
          + Nouvelle zone
        </button>
      </header>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">⚠ {error}</div>}

      {loading ? (
        <div className="text-sm text-zinc-500">Chargement…</div>
      ) : zones.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white/40 p-10 text-center space-y-4">
          <div className="text-5xl">🚚</div>
          <p className="text-zinc-700">Pas encore de zone de livraison.</p>
          <button onClick={() => setZoneModal("new")} className="inline-block rounded-lg bg-emerald-500 hover:bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-white">
            + Créer ma première zone
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {zones.map((z) => (
            <div key={z.id} className="rounded-2xl border border-zinc-200 bg-white/40 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-zinc-200">
                <div>
                  <div className="font-bold text-base text-zinc-900">{z.name}</div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    {z.countries.length === 0 ? "Aucun pays" : z.countries.map((c) => {
                      const o = COMMON_COUNTRIES.find((x) => x.code === c);
                      return o ? o.name : c;
                    }).join(" · ")}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setZoneModal(z)} className="text-xs text-zinc-500 hover:text-zinc-900 px-2 py-1">Modifier</button>
                  <button onClick={() => deleteZone(z)} className="text-xs text-red-700 hover:text-red-700 px-2 py-1">Supprimer</button>
                </div>
              </div>
              <div className="p-2">
                {z.methods.length === 0 ? (
                  <p className="text-sm text-zinc-400 text-center py-4">Aucune méthode pour cette zone.</p>
                ) : (
                  z.methods.map((m) => (
                    <div key={m.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-zinc-100/40">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-900">{m.name}</span>
                          {!m.enabled && <span className="text-[10px] uppercase tracking-widest bg-zinc-200/40 text-zinc-500 px-1.5 py-0.5 rounded">Désactivé</span>}
                        </div>
                        <div className="text-xs text-zinc-400 mt-0.5">
                          {TYPE_LABEL[m.type]}
                          {m.flatRate && ` · ${m.flatRate} ${currency}`}
                          {m.freeAboveAmount && ` · gratuit au-dessus de ${m.freeAboveAmount} ${currency}`}
                          {m.estimatedDays && ` · ${m.estimatedDays}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setMethodModal({ zoneId: z.id, method: m })} className="text-xs text-zinc-500 hover:text-zinc-900 px-2 py-1">Modifier</button>
                        <button onClick={() => deleteMethod(m)} className="text-xs text-red-700 hover:text-red-700 px-2 py-1">×</button>
                      </div>
                    </div>
                  ))
                )}
                <button
                  onClick={() => setMethodModal({ zoneId: z.id })}
                  className="w-full mt-2 px-3 py-2.5 rounded-lg border border-dashed border-zinc-200 hover:border-emerald-500 text-sm text-zinc-500 hover:text-emerald-700 transition-colors"
                >
                  + Ajouter une méthode
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {zoneModal && (
        <ZoneModal
          siteSlug={siteSlug}
          zone={zoneModal === "new" ? null : zoneModal}
          onClose={() => setZoneModal(null)}
          onSaved={() => { setZoneModal(null); refresh(); }}
        />
      )}
      {methodModal && (
        <MethodModal
          siteSlug={siteSlug}
          zoneId={methodModal.zoneId}
          currency={currency}
          weightUnit={weightUnit}
          method={methodModal.method}
          onClose={() => setMethodModal(null)}
          onSaved={() => { setMethodModal(null); refresh(); }}
        />
      )}
    </div>
  );
}

function ZoneModal({ siteSlug, zone, onClose, onSaved }: {
  siteSlug: string;
  zone: Zone | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(zone?.name ?? "");
  const [countries, setCountries] = useState<string[]>(zone?.countries ?? []);
  const [saving, setSaving] = useState(false);

  function toggle(code: string) {
    setCountries((cs) => cs.includes(code) ? cs.filter((c) => c !== code) : [...cs, code]);
  }
  async function save() {
    setSaving(true);
    try {
      const url = zone
        ? `/api/shop/${siteSlug}/shipping/zones/${zone.id}`
        : `/api/shop/${siteSlug}/shipping/zones`;
      const res = await fetch(url, {
        method: zone ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, countries }),
      });
      if (!res.ok) { alert("Erreur"); return; }
      onSaved();
    } finally { setSaving(false); }
  }

  return (
    <Modal onClose={onClose} title={zone ? "Modifier la zone" : "Nouvelle zone de livraison"}>
      <Field label="Nom de la zone">
        <input className={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: France, Union Européenne…" autoFocus />
      </Field>
      <div>
        <div className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-2">Pays concernés</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {COMMON_COUNTRIES.map((c) => (
            <label key={c.code} className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
              <input type="checkbox" checked={countries.includes(c.code)} onChange={() => toggle(c.code)} className="w-4 h-4 accent-emerald-500" />
              <span>{c.name}</span>
              <span className="text-xs text-zinc-300 font-mono">{c.code}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-zinc-100 text-sm">Annuler</button>
        <button onClick={save} disabled={saving || !name.trim()} className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-sm font-semibold text-white">
          {saving ? "…" : "Enregistrer"}
        </button>
      </div>
    </Modal>
  );
}

function MethodModal({ siteSlug, zoneId, currency, weightUnit, method, onClose, onSaved }: {
  siteSlug: string;
  zoneId: string;
  currency: string;
  weightUnit: string;
  method?: Method;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(method?.name ?? "");
  const [type, setType] = useState<ShippingType>(method?.type ?? "FLAT");
  const [carrier, setCarrier] = useState(method?.carrier ?? "");
  const [description, setDescription] = useState(method?.description ?? "");
  const [estimatedDays, setEstimatedDays] = useState(method?.estimatedDays ?? "");
  const [flatRate, setFlatRate] = useState<string>(method?.flatRate ?? "");
  const [freeAbove, setFreeAbove] = useState<string>(method?.freeAboveAmount ?? "");
  const [enabled, setEnabled] = useState(method?.enabled ?? true);
  const [saving, setSaving] = useState(false);

  // Rules pour WEIGHT_BASED / PRICE_BASED : table éditable
  type Rule = { min: number; max: number | null; price: number };
  const initialRules: Rule[] = Array.isArray(method?.rules) ? (method.rules as Rule[]) : [{ min: 0, max: null, price: 0 }];
  const [rules, setRules] = useState<Rule[]>(initialRules);

  async function save() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name, type, description, carrier, estimatedDays, enabled,
        flatRate: type === "FLAT" || type === "PICKUP" ? (parseFloat(flatRate) || 0) : null,
        freeAboveAmount: type === "FREE" && freeAbove ? parseFloat(freeAbove) : null,
        rules: type === "WEIGHT_BASED" || type === "PRICE_BASED" ? rules : null,
      };
      const url = method
        ? `/api/shop/${siteSlug}/shipping/zones/${zoneId}/methods/${method.id}`
        : `/api/shop/${siteSlug}/shipping/zones/${zoneId}/methods`;
      const res = await fetch(url, {
        method: method ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { alert("Erreur"); return; }
      onSaved();
    } finally { setSaving(false); }
  }

  const showRules = type === "WEIGHT_BASED" || type === "PRICE_BASED";
  const showFlatRate = type === "FLAT" || type === "PICKUP";
  const ruleUnit = type === "WEIGHT_BASED" ? weightUnit : currency;

  return (
    <Modal onClose={onClose} title={method ? "Modifier la méthode" : "Nouvelle méthode de livraison"}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nom *">
          <input className={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Colissimo 48h" autoFocus />
        </Field>
        <Field label="Transporteur">
          <input className={inp} value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Ex: Colissimo, DHL, Mondial Relay" />
        </Field>
      </div>
      <Field label="Type de tarification">
        <select className={inp} value={type} onChange={(e) => setType(e.target.value as ShippingType)}>
          <option value="FLAT">Tarif fixe</option>
          <option value="WEIGHT_BASED">Selon le poids</option>
          <option value="PRICE_BASED">Selon le total panier</option>
          <option value="FREE">Gratuit</option>
          <option value="PICKUP">Retrait / Point relais</option>
        </select>
      </Field>

      {showFlatRate && (
        <Field label={`Prix (${currency})`}>
          <input type="number" step="0.01" className={inp} value={flatRate} onChange={(e) => setFlatRate(e.target.value)} placeholder="0.00" />
        </Field>
      )}
      {type === "FREE" && (
        <Field label={`Livraison gratuite à partir de (${currency})`} hint="Laisse vide pour toujours gratuit.">
          <input type="number" step="0.01" className={inp} value={freeAbove} onChange={(e) => setFreeAbove(e.target.value)} placeholder="50.00" />
        </Field>
      )}
      {showRules && (
        <Field label={`Paliers (${type === "WEIGHT_BASED" ? "kg" : currency})`} hint={type === "WEIGHT_BASED" ? "Définis des tranches de poids et le prix correspondant." : "Définis des tranches de total panier."}>
          <div className="space-y-2">
            {rules.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                <input type="number" step="0.01" className={inp} placeholder="Min" value={r.min} onChange={(e) => {
                  const next = [...rules]; next[i] = { ...next[i], min: parseFloat(e.target.value) || 0 }; setRules(next);
                }} />
                <input type="number" step="0.01" className={inp} placeholder="Max (vide = ∞)" value={r.max ?? ""} onChange={(e) => {
                  const next = [...rules]; next[i] = { ...next[i], max: e.target.value === "" ? null : parseFloat(e.target.value) }; setRules(next);
                }} />
                <div className="flex items-center gap-1">
                  <input type="number" step="0.01" className={inp} placeholder="Prix" value={r.price} onChange={(e) => {
                    const next = [...rules]; next[i] = { ...next[i], price: parseFloat(e.target.value) || 0 }; setRules(next);
                  }} />
                  <span className="text-xs text-zinc-400">{currency}</span>
                </div>
                <button onClick={() => setRules(rules.filter((_, idx) => idx !== i))} className="text-red-700 hover:text-red-700 text-xs">×</button>
              </div>
            ))}
            <button onClick={() => setRules([...rules, { min: 0, max: null, price: 0 }])} className="text-xs text-zinc-500 hover:text-emerald-700 mt-1">
              + Ajouter un palier
            </button>
            <p className="text-xs text-zinc-400">Unité min/max : {ruleUnit}</p>
          </div>
        </Field>
      )}

      <Field label="Délai estimé">
        <input className={inp} value={estimatedDays} onChange={(e) => setEstimatedDays(e.target.value)} placeholder="Ex: 2-3 jours ouvrés" />
      </Field>
      <Field label="Description (optionnel)">
        <textarea className={`${inp} resize-y min-h-[60px]`} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
        <span className="text-sm text-zinc-700">Activée (proposée au checkout)</span>
      </label>

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-zinc-100 text-sm">Annuler</button>
        <button onClick={save} disabled={saving || !name.trim()} className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-sm font-semibold text-white">
          {saving ? "…" : "Enregistrer"}
        </button>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-1.5">{label}</div>
      {children}
      {hint && <div className="text-xs text-zinc-400 mt-1">{hint}</div>}
    </label>
  );
}

const inp = "w-full px-3 py-2 rounded-lg bg-white border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 transition-colors";
