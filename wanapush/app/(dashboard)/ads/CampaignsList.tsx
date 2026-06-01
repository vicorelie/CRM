"use client";

import { useEffect, useState } from "react";
import {
  AdPlatform,
  CampaignStatus,
  PLATFORM_META,
  STATUS_BADGE,
} from "./types";

type Props = {
  refreshKey: number;
};

type Totals = {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
};

type CampaignRich = {
  id: string;
  name: string;
  type: AdPlatform;
  status: CampaignStatus;
  budget: number | null;
  dailyBudget: number | null;
  externalId: string | null;
  objective: string | null;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
  results: unknown;
  adAccount: { id: string; name: string | null; currency: string | null } | null;
  totals: Totals;
  ctr: number | null;
  cpc: number | null;
  cpa: number | null;
  roas: number | null;
};

const STATUS_OPTIONS: CampaignStatus[] = ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"];

const FILTERS: Array<{ id: "ALL" | AdPlatform; label: string }> = [
  { id: "ALL", label: "Toutes" },
  { id: "META_ADS", label: "Meta" },
  { id: "GOOGLE_ADS", label: "Google" },
  { id: "TIKTOK_ADS", label: "TikTok" },
  { id: "LINKEDIN_ADS", label: "LinkedIn" },
];

function fmt(n: number, decimals = 0): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtMoney(n: number, currency = "EUR"): string {
  return n.toLocaleString("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
}

export function CampaignsList({ refreshKey }: Props) {
  const [campaigns, setCampaigns] = useState<CampaignRich[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | AdPlatform>("ALL");

  async function load() {
    setError(null);
    try {
      const res = await fetch("/api/ads/campaigns");
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Échec chargement");
        return;
      }
      setCampaigns(json.campaigns ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau");
    }
  }

  useEffect(() => {
    load();
  }, [refreshKey]);

  async function updateStatus(id: string, status: CampaignStatus) {
    setBusyId(id);
    try {
      await fetch(`/api/ads/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cette campagne ?")) return;
    setBusyId(id);
    try {
      await fetch(`/api/ads/campaigns/${id}`, { method: "DELETE" });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function duplicate(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/ads/campaigns/${id}`, { method: "POST" });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function pushToProvider(c: CampaignRich) {
    // Préparation du body de push : récupère les valeurs depuis la campagne stockée
    let dailyBudget = c.dailyBudget ?? c.budget ?? 0;
    if (!dailyBudget) {
      const v = prompt(
        "Budget quotidien (€) ?\nLa campagne sera créée en PAUSED, tu activeras manuellement après vérification.",
        "20",
      );
      if (!v) return;
      const parsed = parseFloat(v.replace(",", "."));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        alert("Budget invalide");
        return;
      }
      dailyBudget = parsed;
    }
    const finalUrl =
      prompt(
        "URL de destination de la pub ?",
        (c.results as { externalUrl?: string } | null)?.externalUrl ?? "https://wanapush.com",
      ) ?? undefined;
    if (!finalUrl) return;

    // Image — option 1 : générer via IA, option 2 : URL existante, option 3 : skip
    let imageUrl: string | undefined;
    if (c.type === "META_ADS") {
      const choice = prompt(
        "Image de la publicité ?\n\n" +
          "• Tape un brief court (ex : 'formation SEO IA pour entrepreneurs') → on génère l'image avec l'IA\n" +
          "• Ou colle une URL d'image existante (https://...)\n" +
          "• Ou laisse vide → annonce sans image",
        "",
      );
      if (choice && choice.trim()) {
        const trimmed = choice.trim();
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
          imageUrl = trimmed;
        } else {
          // Brief → génération IA
          setBusyId(c.id);
          try {
            const r = await fetch("/api/ads/generate-image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                brief: { productOrService: trimmed, tone: "casual" },
                size: "square",
              }),
            });
            const j = await r.json();
            if (!r.ok || !j.url) {
              alert(`Échec génération image : ${j.error ?? "?"}`);
              setBusyId(null);
              return;
            }
            imageUrl = j.url;
            alert(
              `Image générée par ${j.model}. Elle apparaîtra dans l'annonce Meta après push.`,
            );
          } catch (e) {
            alert(`Erreur génération image : ${e instanceof Error ? e.message : "?"}`);
            setBusyId(null);
            return;
          } finally {
            setBusyId(null);
          }
        }
      }
    }

    if (
      !confirm(
        `Pousser la campagne "${c.name}" vers ${PLATFORM_META[c.type].label} ?\n\n` +
          (imageUrl ? `Avec image : ${imageUrl.slice(0, 80)}\n\n` : "Sans image (link-only ad)\n\n") +
          "La campagne sera créée en PAUSED dans le Manager natif. Tu pourras l'activer manuellement après vérification.",
      )
    )
      return;

    setBusyId(c.id);
    try {
      const res = await fetch(`/api/ads/campaigns/${c.id}/push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyBudget,
          campaignType: c.objective ?? "TRAFFIC",
          finalUrl,
          countries: ["FR"],
          ...(imageUrl ? { imageUrl } : {}),
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        alert(`Échec du push : ${j.error ?? "erreur inconnue"}`);
        return;
      }
      const url = j.externalUrl;
      if (url && confirm(`Campagne créée en PAUSED côté ${PLATFORM_META[c.type].label}.\n\nOuvrir le Manager natif pour activer ?`)) {
        window.open(url, "_blank");
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  function exportCsv() {
    if (!campaigns || campaigns.length === 0) return;
    const headers = [
      "name",
      "platform",
      "status",
      "budget",
      "spend",
      "impressions",
      "clicks",
      "conversions",
      "revenue",
      "ctr%",
      "cpc",
      "cpa",
      "roas",
      "lastSync",
    ];
    const rows = campaigns.map((c) => [
      c.name,
      c.type,
      c.status,
      c.budget ?? "",
      c.totals.spend,
      c.totals.impressions,
      c.totals.clicks,
      c.totals.conversions,
      c.totals.revenue,
      c.ctr?.toFixed(2) ?? "",
      c.cpc?.toFixed(2) ?? "",
      c.cpa?.toFixed(2) ?? "",
      c.roas?.toFixed(2) ?? "",
      c.lastSyncAt ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((r) =>
        r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wanapush-campaigns-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (campaigns === null && !error)
    return <div className="text-sm text-zinc-400">Chargement…</div>;
  if (error)
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-300">
        {error}
      </div>
    );

  const filtered = (campaigns ?? []).filter((c) => filter === "ALL" || c.type === filter);

  // Aggregate global
  const global = filtered.reduce<Totals & { count: number }>(
    (acc, c) => ({
      count: acc.count + 1,
      spend: acc.spend + c.totals.spend,
      impressions: acc.impressions + c.totals.impressions,
      clicks: acc.clicks + c.totals.clicks,
      conversions: acc.conversions + c.totals.conversions,
      revenue: acc.revenue + c.totals.revenue,
    }),
    { count: 0, spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
  );
  const globalRoas = global.spend > 0 ? global.revenue / global.spend : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                filter === f.id
                  ? "border-brand bg-brand/15 text-brand-700"
                  : "border-zinc-200 bg-white/40 text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={exportCsv}
          disabled={!campaigns || campaigns.length === 0}
          className="text-xs rounded-lg border border-zinc-200 hover:border-zinc-300 px-3 py-1.5 disabled:opacity-50"
        >
          📥 Export CSV
        </button>
      </div>

      {global.count > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white/40 p-4 grid grid-cols-2 sm:grid-cols-6 gap-3">
          <Stat label="Campagnes" value={fmt(global.count)} />
          <Stat label="Dépense" value={fmtMoney(global.spend)} />
          <Stat label="Impressions" value={fmt(global.impressions)} />
          <Stat label="Clics" value={fmt(global.clicks)} />
          <Stat label="Conversions" value={fmt(global.conversions)} />
          <Stat label="ROAS" value={globalRoas !== null ? `${globalRoas.toFixed(2)}x` : "—"} />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white/60 p-8 text-center space-y-2">
          <div className="text-4xl">🎯</div>
          <h3 className="font-semibold">Aucune campagne</h3>
          <p className="text-sm text-zinc-500">
            Crée-en une via l&apos;onglet « Nouvelle campagne » ou synchronise un compte
            pub depuis « Comptes pub ».
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const meta = PLATFORM_META[c.type];
            const currency = c.adAccount?.currency ?? "EUR";
            return (
              <div
                key={c.id}
                className="rounded-xl border border-zinc-200 bg-white/60 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="text-2xl">{meta.emoji}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-zinc-900 truncate">
                          {c.name}
                        </h4>
                        <span
                          className={`text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 font-medium ${STATUS_BADGE[c.status]}`}
                        >
                          {c.status}
                        </span>
                        {c.externalId && (
                          <span className="text-[10px] uppercase rounded-full border border-emerald-500/40 bg-emerald-50 text-emerald-700 px-2 py-0.5">
                            🔗 connecté
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5 truncate">
                        <span className={meta.color}>{meta.label}</span>
                        {c.adAccount?.name && ` · ${c.adAccount.name}`}
                        {c.objective && ` · ${c.objective}`}
                        {c.budget !== null && ` · Budget ${fmtMoney(c.budget, currency)}`}
                        {c.lastSyncAt && (
                          <>
                            {" "}
                            · Sync{" "}
                            {new Date(c.lastSyncAt).toLocaleString("fr-FR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={c.status}
                      disabled={busyId === c.id}
                      onChange={(e) =>
                        updateStatus(c.id, e.target.value as CampaignStatus)
                      }
                      className="rounded-md border border-zinc-200 bg-white/60 px-2 py-1 text-xs"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    {!c.externalId && c.status === "DRAFT" && (
                      <button
                        onClick={() => pushToProvider(c)}
                        disabled={busyId === c.id}
                        title={`Lancer sur ${PLATFORM_META[c.type].label} (créée en PAUSED)`}
                        className="text-xs rounded-md bg-brand-500 hover:bg-brand-600 text-white px-3 py-1 font-semibold disabled:opacity-50"
                      >
                        {busyId === c.id ? "Push…" : "🚀 Lancer"}
                      </button>
                    )}
                    <button
                      onClick={() => duplicate(c.id)}
                      disabled={busyId === c.id}
                      title="Dupliquer"
                      className="text-xs text-zinc-500 hover:text-brand-700 px-2"
                    >
                      ⎘
                    </button>
                    <button
                      onClick={() => remove(c.id)}
                      disabled={busyId === c.id}
                      title="Supprimer"
                      className="text-xs text-zinc-400 hover:text-rose-300 px-2"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {(c.totals.spend > 0 || c.totals.impressions > 0) && (
                  <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 text-xs border-t border-zinc-200 pt-3">
                    <Mini label="Dépense" value={fmtMoney(c.totals.spend, currency)} />
                    <Mini label="Imp." value={fmt(c.totals.impressions)} />
                    <Mini label="Clics" value={fmt(c.totals.clicks)} />
                    <Mini label="Conv." value={fmt(c.totals.conversions)} />
                    <Mini label="CTR" value={c.ctr !== null ? `${c.ctr.toFixed(2)}%` : "—"} />
                    <Mini label="CPC" value={c.cpc !== null ? fmtMoney(c.cpc, currency) : "—"} />
                    <Mini
                      label="ROAS"
                      value={c.roas !== null ? `${c.roas.toFixed(2)}x` : "—"}
                      highlight={c.roas !== null && c.roas >= 2}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-400">{label}</div>
      <div className="text-base font-bold text-zinc-900">{value}</div>
    </div>
  );
}

function Mini({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase text-zinc-400">{label}</div>
      <div
        className={`font-mono font-semibold ${highlight ? "text-emerald-700" : "text-zinc-800"}`}
      >
        {value}
      </div>
    </div>
  );
}
