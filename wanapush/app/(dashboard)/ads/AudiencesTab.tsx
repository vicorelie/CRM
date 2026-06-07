"use client";

import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Audience = {
  id: string;
  name: string;
  description: string;
  size: string | null;
  tags: string[] | null;
  type: "MANUAL" | "WEBSITE_TRAFFIC" | "CUSTOMER_LIST" | "LOOKALIKE";
  platform: string | null;
  adAccountId: string | null;
  externalId: string | null;
  metaStatus: string | null;
  estimatedSize: number | null;
  syncedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type AdAccount = {
  id: string;
  platform: string;
  externalId: string;
  name: string;
};

type MetaAudienceType = "WEBSITE_TRAFFIC" | "CUSTOMER_LIST" | "LOOKALIKE";
type GoogleAudienceType = "CUSTOMER_LIST" | "WEBSITE_TRAFFIC";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const styles: Record<string, string> = {
    READY: "bg-emerald-50 border-emerald-400/40 text-emerald-700",
    PROCESSING: "bg-amber-50 border-amber-400/40 text-amber-700",
    FAILED: "bg-red-50 border-red-400/40 text-red-700",
  };
  const labels: Record<string, string> = { READY: "Prête", PROCESSING: "En cours", FAILED: "Erreur" };
  return (
    <span className={`text-[10px] uppercase font-semibold rounded-full border px-2 py-0.5 ${styles[status] ?? "bg-zinc-100 border-zinc-300 text-zinc-600"}`}>
      {labels[status] ?? status}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; className: string }> = {
    WEBSITE_TRAFFIC: { label: "Pixel", className: "bg-blue-50 border-blue-300/50 text-blue-700" },
    CUSTOMER_LIST: { label: "Liste clients", className: "bg-purple-50 border-purple-300/50 text-purple-700" },
    LOOKALIKE: { label: "Lookalike", className: "bg-fuchsia-50 border-fuchsia-300/50 text-fuchsia-700" },
    MANUAL: { label: "Manuel", className: "bg-zinc-50 border-zinc-200 text-zinc-500" },
  };
  const { label, className } = map[type] ?? map.MANUAL;
  return (
    <span className={`text-[10px] uppercase font-semibold rounded-full border px-2 py-0.5 ${className}`}>
      {label}
    </span>
  );
}

function fmtSize(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} k`;
  return String(n);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AudiencesTab() {
  const [list, setList] = useState<Audience[]>([]);
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<"library" | "meta" | "google">("library");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Audience | null>(null);
  const [showMetaForm, setShowMetaForm] = useState(false);
  const [showGoogleForm, setShowGoogleForm] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [autoSetupBusy, setAutoSetupBusy] = useState(false);
  const [autoSetupResult, setAutoSetupResult] = useState<{ created: number; skipped: number; errors: number } | null>(null);

  const metaAccounts = accounts.filter((a) => a.platform === "META_ADS");
  const googleAccounts = accounts.filter((a) => a.platform === "GOOGLE_ADS");
  const manualList = list.filter((a) => a.platform === null || a.type === "MANUAL");
  const metaList = list.filter((a) => a.platform === "META_ADS");
  const googleList = list.filter((a) => a.platform === "GOOGLE_ADS");

  async function refresh() {
    setLoading(true);
    try {
      const [audRes, accRes] = await Promise.all([
        fetch("/api/ads/audiences"),
        fetch("/api/ads/accounts"),
      ]);
      const [audJ, accJ] = await Promise.all([audRes.json(), accRes.json()]);
      setList(audJ.audiences ?? []);
      setAccounts(accJ.accounts ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function remove(id: string) {
    if (!confirm("Supprimer cette audience ?")) return;
    await fetch(`/api/ads/audiences/${id}`, { method: "DELETE" });
    refresh();
  }

  async function syncAudience(id: string) {
    setSyncing(id);
    try {
      await fetch(`/api/ads/audiences/${id}/sync`, { method: "POST" });
      refresh();
    } finally {
      setSyncing(null);
    }
  }

  async function runAutoSetup() {
    setAutoSetupBusy(true);
    setAutoSetupResult(null);
    try {
      const r = await fetch("/api/ads/audiences/auto-setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const j = await r.json() as { created: number; skipped: number; errors: number };
      setAutoSetupResult(j);
      if (j.created > 0) refresh();
    } finally {
      setAutoSetupBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ─── Section tabs ─── */}
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-0">
        {(["library", "meta", "google"] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setSection(s); setShowForm(false); setShowMetaForm(false); setShowGoogleForm(false); }}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              section === s
                ? "border-brand text-brand"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {s === "library"
              ? `Bibliothèque (${manualList.length})`
              : s === "meta"
              ? `Meta Audiences (${metaList.length})`
              : `Google Audiences (${googleList.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-zinc-500">Chargement…</div>
      ) : section === "library" ? (
        /* ─── Bibliothèque texte ─── */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">Audiences texte réutilisables dans vos campagnes.</p>
            <button
              onClick={() => { setEditing(null); setShowForm((v) => !v); }}
              className="rounded-lg bg-brand hover:bg-brand-400 px-4 py-2 text-sm font-semibold text-white"
            >
              {showForm ? "Annuler" : "+ Nouvelle audience"}
            </button>
          </div>

          {showForm && (
            <AudienceForm
              initial={editing}
              onSaved={() => { setShowForm(false); setEditing(null); refresh(); }}
            />
          )}

          {manualList.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white/40 p-6 text-sm text-zinc-500 text-center">
              Aucune audience. Crée une audience pour la réutiliser dans plusieurs campagnes.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {manualList.map((a) => (
                <div key={a.id} className="rounded-xl border border-zinc-200 bg-white/60 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold flex-1">{a.name}</h3>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setEditing(a); setShowForm(true); }} className="text-xs text-zinc-500 hover:text-brand-700 px-2">✎</button>
                      <button onClick={() => remove(a.id)} className="text-xs text-zinc-500 hover:text-red-700 px-2">✕</button>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-700 whitespace-pre-wrap line-clamp-3">{a.description}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {a.size && (
                      <span className="text-[10px] uppercase font-mono rounded-full border border-emerald-500/40 bg-emerald-50 text-emerald-700 px-2 py-0.5">{a.size}</span>
                    )}
                    {(a.tags ?? []).map((t) => (
                      <span key={t} className="text-[10px] rounded-full border border-zinc-200 bg-white/60 text-zinc-500 px-2 py-0.5">#{t}</span>
                    ))}
                  </div>
                  <button onClick={() => navigator.clipboard.writeText(a.description)} className="text-[11px] text-zinc-400 hover:text-brand-700">
                    📋 Copier la description
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : section === "meta" ? (
        /* ─── Meta Custom Audiences ─── */
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-zinc-500 pt-1">
              Audiences créées dans vos comptes Meta Ads — pixel, listes clients, lookalike.
            </p>
            {metaAccounts.length > 0 && (
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={runAutoSetup}
                  disabled={autoSetupBusy}
                  title="Crée automatiquement une audience de retargeting pour chaque pixel Meta configuré sur vos sites"
                  className="rounded-lg border border-brand/40 bg-brand/5 hover:bg-brand/10 disabled:opacity-50 px-3 py-2 text-sm font-semibold text-brand-700 flex items-center gap-1.5"
                >
                  {autoSetupBusy ? "…" : "⚡"} Auto-setup pixels
                </button>
                <button
                  onClick={() => setShowMetaForm((v) => !v)}
                  className="rounded-lg bg-brand hover:bg-brand-400 px-4 py-2 text-sm font-semibold text-white"
                >
                  {showMetaForm ? "Annuler" : "+ Créer"}
                </button>
              </div>
            )}
          </div>

          {autoSetupResult && (
            <div className={`rounded-xl border px-4 py-3 text-sm ${autoSetupResult.errors > 0 ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
              {autoSetupResult.created > 0 && <span className="font-semibold">{autoSetupResult.created} audience{autoSetupResult.created > 1 ? "s" : ""} créée{autoSetupResult.created > 1 ? "s" : ""}</span>}
              {autoSetupResult.skipped > 0 && <span className="ml-2 text-zinc-500">{autoSetupResult.skipped} déjà existante{autoSetupResult.skipped > 1 ? "s" : ""}</span>}
              {autoSetupResult.errors > 0 && <span className="ml-2">{autoSetupResult.errors} erreur{autoSetupResult.errors > 1 ? "s" : ""}</span>}
              {autoSetupResult.created === 0 && autoSetupResult.errors === 0 && <span>Toutes les audiences sont déjà à jour.</span>}
            </div>
          )}

          {metaAccounts.length === 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Connecte d&apos;abord un compte Meta Ads dans l&apos;onglet <strong>Comptes</strong>.
            </div>
          )}

          {showMetaForm && metaAccounts.length > 0 && (
            <MetaAudienceForm
              accounts={metaAccounts}
              existingMetaAudiences={metaList}
              onSaved={() => { setShowMetaForm(false); refresh(); }}
            />
          )}

          <AudienceCardList audiences={metaList} syncing={syncing} onSync={syncAudience} onRemove={remove} emptyLabel="Aucune audience Meta Custom pour l'instant." />
        </div>
      ) : (
        /* ─── Google Ads Audiences ─── */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">
              Audiences Google Ads — Customer Match (emails) et Remarketing (événements tag).
            </p>
            {googleAccounts.length > 0 && (
              <button
                onClick={() => setShowGoogleForm((v) => !v)}
                className="rounded-lg bg-brand hover:bg-brand-400 px-4 py-2 text-sm font-semibold text-white"
              >
                {showGoogleForm ? "Annuler" : "+ Créer une audience Google"}
              </button>
            )}
          </div>

          {googleAccounts.length === 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Connecte d&apos;abord un compte Google Ads dans l&apos;onglet <strong>Comptes</strong>.
            </div>
          )}

          {showGoogleForm && googleAccounts.length > 0 && (
            <GoogleAudienceForm
              accounts={googleAccounts}
              onSaved={() => { setShowGoogleForm(false); refresh(); }}
            />
          )}

          <AudienceCardList audiences={googleList} syncing={syncing} onSync={syncAudience} onRemove={remove} emptyLabel="Aucune audience Google Ads pour l'instant." />
        </div>
      )}
    </div>
  );
}

// ─── Shared audience card list ───────────────────────────────────────────────

function AudienceCardList({
  audiences,
  syncing,
  onSync,
  onRemove,
  emptyLabel,
}: {
  audiences: Audience[];
  syncing: string | null;
  onSync: (id: string) => void;
  onRemove: (id: string) => void;
  emptyLabel: string;
}) {
  if (audiences.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white/40 p-6 text-sm text-zinc-500 text-center">
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {audiences.map((a) => (
        <div key={a.id} className="rounded-xl border border-zinc-200 bg-white/60 p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{a.name}</h3>
              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                <TypeBadge type={a.type} />
                <StatusBadge status={a.metaStatus} />
                {a.estimatedSize !== null && a.estimatedSize > 0 && (
                  <span className="text-[10px] text-zinc-500 font-mono">~{fmtSize(a.estimatedSize)} personnes</span>
                )}
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => onSync(a.id)}
                disabled={syncing === a.id}
                title="Rafraîchir le statut"
                className="text-xs text-zinc-400 hover:text-brand-700 disabled:opacity-40 px-1"
              >
                {syncing === a.id ? "…" : "↻"}
              </button>
              <button onClick={() => onRemove(a.id)} className="text-xs text-zinc-500 hover:text-red-700 px-1">✕</button>
            </div>
          </div>
          {a.description && <p className="text-xs text-zinc-600 line-clamp-2">{a.description}</p>}
          <div className="flex items-center gap-2 text-[10px] text-zinc-400">
            {a.adAccountId && <span>{a.adAccountId}</span>}
            {a.externalId && <span className="truncate max-w-[160px]">{a.externalId}</span>}
            {a.syncedAt && <span>Sync: {new Date(a.syncedAt).toLocaleDateString("fr-FR")}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Bibliothèque texte — formulaire ─────────────────────────────────────────

function AudienceForm({ initial, onSaved }: { initial: Audience | null; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [size, setSize] = useState(initial?.size ?? "");
  const [tagsInput, setTagsInput] = useState((initial?.tags ?? []).join(", "));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2 || description.trim().length < 3) { setError("Nom et description requis"); return; }
    setBusy(true);
    const tags = tagsInput.split(/[\s,]+/).map((t) => t.trim()).filter(Boolean);
    const r = await fetch(initial ? `/api/ads/audiences/${initial.id}` : "/api/ads/audiences", {
      method: initial ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, size: size || undefined, tags }),
    });
    setBusy(false);
    if (!r.ok) { setError((await r.json().catch(() => ({}))).error ?? "Erreur"); return; }
    onSaved();
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-brand/30 bg-brand/5 p-6 space-y-4">
      <h3 className="text-lg font-semibold">{initial ? "Modifier l'audience" : "Nouvelle audience"}</h3>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-700">Nom</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Freelances marketing FR 25-40" className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm" />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-700">Description / ciblage détaillé</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Localisation, âge, intérêts, comportements, mots-clés, exclusions…" className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700">Taille estimée (optionnel)</label>
          <input value={size} onChange={(e) => setSize(e.target.value)} placeholder="~150k, 1M+, etc." className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700">Tags (séparés par virgule)</label>
          <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="b2b, saas, leads" className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm" />
        </div>
      </div>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <button type="submit" disabled={busy} className="w-full rounded-lg bg-brand hover:bg-brand-400 disabled:opacity-50 py-2.5 text-sm font-semibold text-white">
        {busy ? "Sauvegarde…" : initial ? "Mettre à jour" : "Créer l'audience"}
      </button>
    </form>
  );
}

// ─── Meta Custom Audience — formulaire ───────────────────────────────────────

const META_EVENTS = ["PageView", "ViewContent", "AddToCart", "Purchase", "Lead", "CompleteRegistration", "InitiateCheckout"];

function MetaAudienceForm({
  accounts,
  existingMetaAudiences,
  onSaved,
}: {
  accounts: AdAccount[];
  existingMetaAudiences: Audience[];
  onSaved: () => void;
}) {
  const [adAccountId, setAdAccountId] = useState(accounts[0]?.externalId ?? "");
  const [type, setType] = useState<MetaAudienceType>("WEBSITE_TRAFFIC");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  // WEBSITE_TRAFFIC
  const [pixelId, setPixelId] = useState("");
  const [retentionDays, setRetentionDays] = useState(30);
  const [event, setEvent] = useState("PageView");
  const [urlFilter, setUrlFilter] = useState("");
  // CUSTOMER_LIST
  const [emailsText, setEmailsText] = useState("");
  // LOOKALIKE
  const [sourceId, setSourceId] = useState(existingMetaAudiences[0]?.externalId ?? "");
  const [country, setCountry] = useState("FR");
  const [ratio, setRatio] = useState(0.02);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputCls = "w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm";
  const labelCls = "text-sm font-medium text-zinc-700";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) { setError("Nom requis (min 2 caractères)"); return; }

    let config: unknown;
    if (type === "WEBSITE_TRAFFIC") {
      if (!pixelId.trim()) { setError("Pixel ID requis"); return; }
      config = { pixelId: pixelId.trim(), retentionDays, rules: [{ event, urlFilter: urlFilter.trim() || undefined }] };
    } else if (type === "CUSTOMER_LIST") {
      const emails = emailsText.split(/[\n,;]+/).map((e) => e.trim()).filter(Boolean);
      if (emails.length === 0) { setError("Au moins un email requis"); return; }
      config = { emails };
    } else {
      if (!sourceId) { setError("Audience source requise"); return; }
      config = { sourceAudienceId: sourceId, country: country.toUpperCase(), ratio };
    }

    setBusy(true);
    const r = await fetch("/api/ads/audiences/meta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, adAccountId, name: name.trim(), description: description.trim(), config }),
    });
    setBusy(false);
    if (!r.ok) { setError((await r.json().catch(() => ({}))).error ?? "Erreur API Meta"); return; }
    onSaved();
  }

  const typeOptions: { value: MetaAudienceType; label: string; desc: string }[] = [
    { value: "WEBSITE_TRAFFIC", label: "Pixel / Site", desc: "Visiteurs de votre site via le Pixel Meta" },
    { value: "CUSTOMER_LIST", label: "Liste clients", desc: "Upload d'emails — hashés SHA-256 avant envoi" },
    { value: "LOOKALIKE", label: "Lookalike", desc: "Profils similaires à une audience existante" },
  ];

  return (
    <form onSubmit={submit} className="rounded-2xl border border-brand/30 bg-brand/5 p-6 space-y-5">
      <h3 className="text-lg font-semibold">Créer une Meta Custom Audience</h3>

      {/* Compte + type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className={labelCls}>Compte Meta Ads</label>
          <select value={adAccountId} onChange={(e) => setAdAccountId(e.target.value)} className={inputCls}>
            {accounts.map((a) => (
              <option key={a.externalId} value={a.externalId}>{a.name} ({a.externalId})</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Nom de l&apos;audience</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Visiteurs 30j panier abandonné" className={inputCls} />
        </div>
      </div>

      {/* Type selector */}
      <div className="space-y-1.5">
        <label className={labelCls}>Type</label>
        <div className="grid grid-cols-3 gap-2">
          {typeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(opt.value)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                type === opt.value
                  ? "border-brand bg-brand/10 text-brand-700"
                  : "border-zinc-200 bg-white/60 hover:border-zinc-300 text-zinc-700"
              }`}
            >
              <div className="text-xs font-semibold">{opt.label}</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className={labelCls}>Description (optionnel)</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Notes internes sur cette audience" className={inputCls} />
      </div>

      {/* Champs par type */}
      {type === "WEBSITE_TRAFFIC" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={labelCls}>Pixel ID</label>
            <input value={pixelId} onChange={(e) => setPixelId(e.target.value)} placeholder="123456789012345" className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Fenêtre de rétention (jours)</label>
            <select value={retentionDays} onChange={(e) => setRetentionDays(Number(e.target.value))} className={inputCls}>
              {[7, 14, 30, 60, 90, 180].map((d) => <option key={d} value={d}>{d} jours</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Événement pixel</label>
            <select value={event} onChange={(e) => setEvent(e.target.value)} className={inputCls}>
              {META_EVENTS.map((ev) => <option key={ev} value={ev}>{ev}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Filtre URL (optionnel)</label>
            <input value={urlFilter} onChange={(e) => setUrlFilter(e.target.value)} placeholder="/panier, /merci, etc." className={inputCls} />
          </div>
        </div>
      )}

      {type === "CUSTOMER_LIST" && (
        <div className="space-y-1.5">
          <label className={labelCls}>Emails clients (un par ligne)</label>
          <textarea
            value={emailsText}
            onChange={(e) => setEmailsText(e.target.value)}
            rows={6}
            placeholder={"client@exemple.com\nautrecontact@exemple.com"}
            className={inputCls + " font-mono text-xs"}
          />
          <p className="text-[11px] text-zinc-400">
            Les emails sont hashés SHA-256 côté serveur avant envoi à Meta. Jamais stockés en clair.
          </p>
        </div>
      )}

      {type === "LOOKALIKE" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5 sm:col-span-3">
            <label className={labelCls}>Audience source (Meta Custom Audience existante)</label>
            {existingMetaAudiences.length === 0 ? (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Crée d&apos;abord une audience Pixel ou Liste clients pour utiliser comme source Lookalike.
              </p>
            ) : (
              <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} className={inputCls}>
                {existingMetaAudiences.filter((a) => a.externalId).map((a) => (
                  <option key={a.id} value={a.externalId!}>{a.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Pays cible</label>
            <input value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} maxLength={2} placeholder="FR" className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Ratio ({Math.round(ratio * 100)} %)</label>
            <input type="range" min={1} max={20} step={1} value={Math.round(ratio * 100)} onChange={(e) => setRatio(Number(e.target.value) / 100)} className="w-full mt-2" />
          </div>
        </div>
      )}

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <button type="submit" disabled={busy || (type === "LOOKALIKE" && existingMetaAudiences.length === 0)} className="w-full rounded-lg bg-brand hover:bg-brand-400 disabled:opacity-50 py-2.5 text-sm font-semibold text-white">
        {busy ? "Création en cours…" : "Créer l'audience sur Meta"}
      </button>
    </form>
  );
}

// ─── Google Ads Audience — formulaire ────────────────────────────────────────

function GoogleAudienceForm({
  accounts,
  onSaved,
}: {
  accounts: AdAccount[];
  onSaved: () => void;
}) {
  const [adAccountId, setAdAccountId] = useState(accounts[0]?.externalId ?? "");
  const [type, setType] = useState<GoogleAudienceType>("CUSTOMER_LIST");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  // CUSTOMER_LIST
  const [emailsText, setEmailsText] = useState("");
  // WEBSITE_TRAFFIC
  const [membershipLifeSpan, setMembershipLifeSpan] = useState(30);
  const [conversionActionId, setConversionActionId] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputCls = "w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm";
  const labelCls = "text-sm font-medium text-zinc-700";

  const typeOptions: { value: GoogleAudienceType; label: string; desc: string }[] = [
    { value: "CUSTOMER_LIST", label: "Customer Match", desc: "Upload emails — hashés SHA-256 avant envoi" },
    { value: "WEBSITE_TRAFFIC", label: "Remarketing", desc: "Visiteurs de votre site via Google Tag" },
  ];

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) { setError("Nom requis"); return; }

    let config: unknown;
    if (type === "CUSTOMER_LIST") {
      const emails = emailsText.split(/[\n,;]+/).map((e) => e.trim()).filter(Boolean);
      if (emails.length === 0) { setError("Au moins un email requis"); return; }
      config = { emails };
    } else {
      config = { membershipLifeSpan, conversionActionId: conversionActionId.trim() || undefined };
    }

    setBusy(true);
    const r = await fetch("/api/ads/audiences/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, adAccountId, name: name.trim(), description: description.trim(), config }),
    });
    setBusy(false);
    if (!r.ok) { setError((await r.json().catch(() => ({}))).error ?? "Erreur API Google"); return; }
    onSaved();
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-brand/30 bg-brand/5 p-6 space-y-5">
      <h3 className="text-lg font-semibold">Créer une Google Ads Audience</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className={labelCls}>Compte Google Ads</label>
          <select value={adAccountId} onChange={(e) => setAdAccountId(e.target.value)} className={inputCls}>
            {accounts.map((a) => (
              <option key={a.externalId} value={a.externalId}>{a.name} ({a.externalId})</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Nom de l&apos;audience</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Clients actifs — Customer Match" className={inputCls} />
        </div>
      </div>

      {/* Type */}
      <div className="space-y-1.5">
        <label className={labelCls}>Type</label>
        <div className="grid grid-cols-2 gap-2">
          {typeOptions.map((opt) => (
            <button key={opt.value} type="button" onClick={() => setType(opt.value)}
              className={`rounded-xl border p-3 text-left transition-colors ${type === opt.value ? "border-brand bg-brand/10 text-brand-700" : "border-zinc-200 bg-white/60 hover:border-zinc-300 text-zinc-700"}`}
            >
              <div className="text-xs font-semibold">{opt.label}</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={labelCls}>Description (optionnel)</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Notes internes" className={inputCls} />
      </div>

      {type === "CUSTOMER_LIST" && (
        <div className="space-y-1.5">
          <label className={labelCls}>Emails clients (un par ligne)</label>
          <textarea value={emailsText} onChange={(e) => setEmailsText(e.target.value)} rows={6}
            placeholder={"client@exemple.com\nautrecontact@exemple.com"} className={inputCls + " font-mono text-xs"} />
          <p className="text-[11px] text-zinc-400">Emails hashés SHA-256 côté serveur avant upload vers Google. Jamais stockés en clair.</p>
        </div>
      )}

      {type === "WEBSITE_TRAFFIC" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={labelCls}>Durée de membership (jours)</label>
            <select value={membershipLifeSpan} onChange={(e) => setMembershipLifeSpan(Number(e.target.value))} className={inputCls}>
              {[7, 14, 30, 60, 90, 180, 365, 540].map((d) => <option key={d} value={d}>{d} jours</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>ID action de conversion (optionnel)</label>
            <input value={conversionActionId} onChange={(e) => setConversionActionId(e.target.value)}
              placeholder="customers/XXX/conversionActions/YYY" className={inputCls} />
            <p className="text-[10px] text-zinc-400">Laissez vide pour cibler tous les visiteurs.</p>
          </div>
        </div>
      )}

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <button type="submit" disabled={busy} className="w-full rounded-lg bg-brand hover:bg-brand-400 disabled:opacity-50 py-2.5 text-sm font-semibold text-white">
        {busy ? "Création en cours…" : "Créer l'audience sur Google Ads"}
      </button>
    </form>
  );
}
