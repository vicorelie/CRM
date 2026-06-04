"use client";

import { useEffect, useState } from "react";
import { AdPlatform, PLATFORM_META } from "./types";

type Props = { onChange: () => void };

type Account = {
  id: string;
  platform: AdPlatform;
  externalId: string;
  name: string | null;
  currency: string | null;
  timezone: string | null;
  status: "CONNECTED" | "EXPIRED" | "REVOKED" | "ERROR";
  tokenExpiresAt: string | null;
  connectedAt: string;
  lastError: string | null;
};

const STATUS_BADGE: Record<Account["status"], string> = {
  CONNECTED: "border-emerald-500/40 bg-emerald-50 text-emerald-700",
  EXPIRED: "border-amber-500/40 bg-amber-50 text-amber-800",
  REVOKED: "border-red-200 bg-red-50 text-red-700",
  ERROR: "border-red-200 bg-red-50 text-red-700",
};

export function AccountsTab({ onChange }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [keepIds, setKeepIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  function toggleKeep(id: string) {
    setKeepIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function applySelection() {
    const toDelete = accounts.filter((a) => !keepIds.has(a.id));
    if (toDelete.length === 0) {
      alert("Coche au moins un compte à garder, ou tout déjà coché.");
      return;
    }
    if (
      !confirm(
        `Supprimer ${toDelete.length} compte(s) non sélectionné(s) ? (${accounts.length - toDelete.length} gardé(s))`,
      )
    )
      return;
    setBulkBusy(true);
    for (const a of toDelete) {
      await fetch(`/api/ads/accounts/${a.id}`, { method: "DELETE" });
    }
    setBulkBusy(false);
    setSelectMode(false);
    setKeepIds(new Set());
    await refresh();
    onChange();
  }

  async function refresh() {
    setLoading(true);
    try {
      const r = await fetch("/api/ads/accounts");
      const j = await r.json();
      setAccounts(j.accounts ?? []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  async function disconnect(id: string) {
    if (!confirm("Déconnecter ce compte pub ?")) return;
    await fetch(`/api/ads/accounts/${id}`, { method: "DELETE" });
    await refresh();
    onChange();
  }

  async function syncOne(id: string) {
    setSyncing(id);
    setSyncResult(null);
    try {
      const r = await fetch("/api/ads/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: id }),
      });
      const j = await r.json();
      const res = (j.results ?? [])[0] ?? {};
      if (res.error) {
        setSyncResult(`⚠ ${res.error}`);
      } else {
        setSyncResult(
          `✓ ${res.campaignsSynced ?? 0} campagne(s) · ${res.metricsSynced ?? 0} jour(s) de KPI synchronisés`,
        );
      }
      await refresh();
      onChange();
    } finally {
      setSyncing(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Bouton unique pour démarrer la connexion d'un nouveau compte pub */}
      <a
        href="/ads/setup"
        className="flex items-center justify-between gap-4 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/30 p-6 transition-all hover:border-brand-500 hover:bg-brand-50 hover:shadow-lift"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-2xl text-white shadow-brand">
            +
          </div>
          <div>
            <div className="text-base font-semibold text-zinc-950">
              Connecter un compte publicitaire
            </div>
            <div className="text-sm text-zinc-600">
              Meta Ads · Google Ads · TikTok Ads · LinkedIn Ads
            </div>
          </div>
        </div>
        <span className="text-2xl text-brand-500">→</span>
      </a>

      {syncResult && (
        <div className="rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 text-sm text-brand-700">
          {syncResult}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-semibold">
            Comptes connectés{" "}
            <span className="text-sm text-zinc-400">({accounts.length})</span>
          </h2>
          {accounts.length > 1 && (
            <div className="flex items-center gap-2">
              {selectMode ? (
                <>
                  <span className="text-xs text-zinc-500">
                    {keepIds.size} à garder · {accounts.length - keepIds.size} à supprimer
                  </span>
                  <button
                    onClick={() => {
                      setSelectMode(false);
                      setKeepIds(new Set());
                    }}
                    className="text-xs rounded-lg border border-zinc-200 hover:border-zinc-300 px-3 py-1.5"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={applySelection}
                    disabled={bulkBusy || keepIds.size === 0}
                    className="text-xs rounded-lg bg-red-500 hover:bg-red-400 disabled:opacity-50 px-3 py-1.5 font-semibold text-white"
                  >
                    {bulkBusy
                      ? "Suppression…"
                      : `🗑 Ne garder que la sélection (${keepIds.size})`}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setSelectMode(true)}
                  className="text-xs rounded-lg border border-brand/40 hover:border-brand-400 bg-brand/10 text-brand-700 px-3 py-1.5 font-semibold"
                >
                  ☑ Mode sélection (nettoyage en masse)
                </button>
              )}
            </div>
          )}
        </div>
        {loading ? (
          <div className="text-sm text-zinc-500">Chargement…</div>
        ) : accounts.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white/40 p-6 text-sm text-zinc-500 text-center">
            Aucun compte pub connecté.
          </div>
        ) : (
          <div className="space-y-2">
            {accounts.map((a) => {
              const meta = PLATFORM_META[a.platform];
              const isKept = keepIds.has(a.id);
              return (
                <div
                  key={a.id}
                  onClick={() => selectMode && toggleKeep(a.id)}
                  className={`rounded-xl border bg-white/60 p-4 flex items-center gap-4 flex-wrap transition-colors ${
                    selectMode
                      ? `cursor-pointer ${
                          isKept
                            ? "border-emerald-500/60 bg-emerald-50"
                            : "border-zinc-200 hover:border-zinc-300"
                        }`
                      : "border-zinc-200"
                  }`}
                >
                  {selectMode && (
                    <input
                      type="checkbox"
                      checked={isKept}
                      onChange={() => toggleKeep(a.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-5 h-5 accent-emerald-500"
                    />
                  )}
                  <div className="text-3xl">{meta.emoji}</div>
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{a.name ?? a.externalId}</span>
                      <span
                        className={`text-[10px] uppercase font-mono rounded-full border px-2 py-0.5 ${STATUS_BADGE[a.status]}`}
                      >
                        {a.status}
                      </span>
                      <span className={`text-[10px] uppercase font-mono ${meta.color}`}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5 truncate">
                      {a.externalId}
                      {a.currency && ` · ${a.currency}`}
                      {a.timezone && ` · ${a.timezone}`}
                    </div>
                    {a.lastError && (
                      <div className="text-xs text-red-700 mt-1">⚠ {a.lastError}</div>
                    )}
                  </div>
                  {!selectMode && (
                    <>
                      <button
                        onClick={() => syncOne(a.id)}
                        disabled={syncing === a.id}
                        className="text-xs rounded-lg bg-brand hover:bg-brand-400 disabled:opacity-50 px-3 py-1.5 font-semibold text-white"
                      >
                        {syncing === a.id ? "Sync…" : "🔄 Synchroniser"}
                      </button>
                      <button
                        onClick={() => disconnect(a.id)}
                        className="text-xs rounded-lg border border-red-200 hover:border-red-500 px-3 py-1.5 text-red-700"
                      >
                        Déconnecter
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
