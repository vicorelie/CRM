"use client";

import { useEffect, useState } from "react";
import { AdPlatform, PLATFORM_META } from "./types";
import type { OptimizationSuggestion } from "@/lib/ads/auto-optimizer";

// ─── Types ────────────────────────────────────────────────────────────────────

type Lever = {
  title: string;
  diagnostic: string;
  action: string;
  expected_impact: string;
  effort: string;
};

type ManualAuditResult = {
  platform: AdPlatform;
  metrics: { ctr: number | null; cpc: number | null; cpa: number | null; roas: number | null };
  audit: { summary?: string; health_score?: number; levers?: Lever[]; next_test?: string };
};

type CampaignRow = {
  id: string;
  name: string;
  type: AdPlatform;
  status: string;
  externalId: string | null;
  dailyBudget: number | null;
};

const PLATFORMS: AdPlatform[] = ["META_ADS", "GOOGLE_ADS", "TIKTOK_ADS", "LINKEDIN_ADS"];

const ACTION_META: Record<OptimizationSuggestion["action"], { label: string; color: string; emoji: string }> = {
  PAUSE: { label: "Pause", color: "bg-rose-500/15 text-rose-600 border-rose-200", emoji: "⏸" },
  SCALE: { label: "Scale +30%", color: "bg-emerald-500/15 text-emerald-700 border-emerald-200", emoji: "🚀" },
  REDUCE_BUDGET: { label: "Réduire budget", color: "bg-amber-500/15 text-amber-700 border-amber-200", emoji: "📉" },
  WATCH: { label: "Surveillance", color: "bg-sky-500/15 text-sky-700 border-sky-200", emoji: "👁" },
  INSUFFICIENT_DATA: { label: "Données insuffisantes", color: "bg-zinc-100 text-zinc-500 border-zinc-200", emoji: "⏳" },
};

const IMPACT_COLORS: Record<string, string> = {
  Critique: "bg-rose-500/15 text-rose-600",
  Fort: "bg-amber-50 text-amber-800",
  Moyen: "bg-sky-500/15 text-sky-700",
  Faible: "bg-zinc-100 text-zinc-700",
};

// ─── Composant principal ──────────────────────────────────────────────────────

export function RoasOptimizer() {
  const [tab, setTab] = useState<"auto" | "manual">("auto");

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-zinc-200">
        {(["auto", "manual"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-brand text-brand-700"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {t === "auto" ? "🤖 Auto-optimisation" : "📊 Analyse manuelle"}
          </button>
        ))}
      </div>

      {tab === "auto" ? <AutoOptimizerTab /> : <ManualOptimizerTab />}
    </div>
  );
}

// ─── Onglet Auto ──────────────────────────────────────────────────────────────

function AutoOptimizerTab() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<Record<string, OptimizationSuggestion>>({});
  const [previewing, setPreviewing] = useState<Record<string, boolean>>({});
  const [applying, setApplying] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/ads/campaigns")
      .then((r) => r.json())
      .then((json) => {
        if (Array.isArray(json.campaigns)) {
          setCampaigns(
            json.campaigns.filter((c: CampaignRow) =>
              ["ACTIVE", "PAUSED"].includes(c.status),
            ),
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function preview(campaignId: string) {
    setPreviewing((p) => ({ ...p, [campaignId]: true }));
    try {
      const r = await fetch(`/api/ads/campaigns/${campaignId}/auto-optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true }),
      });
      const json = await r.json();
      if (json.suggestion) setSuggestions((s) => ({ ...s, [campaignId]: json.suggestion }));
    } catch {}
    setPreviewing((p) => ({ ...p, [campaignId]: false }));
  }

  async function apply(campaignId: string) {
    setApplying((a) => ({ ...a, [campaignId]: true }));
    try {
      const r = await fetch(`/api/ads/campaigns/${campaignId}/auto-optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false }),
      });
      const json = await r.json();
      if (json.suggestion) setSuggestions((s) => ({ ...s, [campaignId]: json.suggestion }));
    } catch {}
    setApplying((a) => ({ ...a, [campaignId]: false }));
  }

  if (loading) {
    return <div className="text-sm text-zinc-400 py-8 text-center">Chargement des campagnes…</div>;
  }

  if (campaigns.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 p-10 text-center space-y-2">
        <div className="text-3xl">📊</div>
        <p className="text-sm text-zinc-500">Aucune campagne active ou en pause trouvée.</p>
        <p className="text-xs text-zinc-400">Lance une campagne depuis l'onglet Builder pour voir l'auto-optimisation ici.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500">
        Analyse les métriques des 7 derniers jours et suggère : pause, scale (+30%), réduction de budget ou surveillance.
      </p>

      {campaigns.map((c) => {
        const sug = suggestions[c.id];
        const meta = PLATFORM_META[c.type];
        const actionMeta = sug ? ACTION_META[sug.action] : null;
        const isPreview = previewing[c.id];
        const isApply = applying[c.id];

        return (
          <div key={c.id} className="rounded-2xl border border-zinc-200 bg-white/60 p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xl">{meta?.emoji}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-zinc-900 truncate">{c.name}</p>
                  <p className="text-xs text-zinc-400">{meta?.label} · {c.status}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {actionMeta && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${actionMeta.color}`}>
                    {actionMeta.emoji} {actionMeta.label}
                  </span>
                )}
                {!sug && (
                  <button
                    type="button"
                    onClick={() => preview(c.id)}
                    disabled={isPreview}
                    className="rounded-lg border border-zinc-200 bg-white/60 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {isPreview ? "Analyse…" : "Analyser"}
                  </button>
                )}
              </div>
            </div>

            {/* Suggestion */}
            {sug && (
              <div className="space-y-3 border-t border-zinc-100 pt-4">
                {/* Métriques */}
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  <SmallMetric label="Dépense" value={`${sug.metrics.spend.toFixed(2)} €`} />
                  <SmallMetric label="ROAS" value={sug.metrics.roas !== null ? `${sug.metrics.roas.toFixed(2)}x` : "—"} />
                  <SmallMetric label="Conversions" value={String(sug.metrics.conversions)} />
                  <SmallMetric label="CTR" value={sug.metrics.ctr !== null ? `${(sug.metrics.ctr * 100).toFixed(2)} %` : "—"} />
                  <SmallMetric label="CPA" value={sug.metrics.cpa !== null ? `${sug.metrics.cpa.toFixed(2)} €` : "—"} />
                </div>

                {/* Raison */}
                <p className="text-sm text-zinc-600">{sug.reason}</p>

                {/* Budget proposé */}
                {sug.newDailyBudget !== null && (
                  <p className="text-xs text-zinc-400">
                    Budget journalier : {sug.currentDailyBudget?.toFixed(2) ?? "?"} € → <strong>{sug.newDailyBudget.toFixed(2)} €</strong>
                  </p>
                )}

                {/* Feedback après application */}
                {sug.applied && (
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-200 px-3 py-2 text-xs text-emerald-700 font-medium">
                    ✅ Action appliquée sur la plateforme.
                  </div>
                )}
                {sug.appliedError && (
                  <div className="rounded-lg bg-rose-500/10 border border-rose-200 px-3 py-2 text-xs text-rose-600">
                    ⚠️ {sug.appliedError}
                  </div>
                )}

                {/* Actions */}
                {!sug.applied && sug.action !== "WATCH" && sug.action !== "INSUFFICIENT_DATA" && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => apply(c.id)}
                      disabled={isApply}
                      className="rounded-lg bg-brand hover:bg-brand-400 disabled:opacity-50 px-4 py-1.5 text-xs font-semibold text-white"
                    >
                      {isApply ? "Application…" : `Appliquer — ${actionMeta?.label}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSuggestions((s) => { const n = { ...s }; delete n[c.id]; return n; })}
                      className="text-xs text-zinc-400 hover:text-zinc-600"
                    >
                      Ignorer
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-zinc-900">{value}</p>
    </div>
  );
}

// ─── Onglet Manuel (inchangé, gardé pour audits custom) ───────────────────────

function ManualOptimizerTab() {
  const [platform, setPlatform] = useState<AdPlatform>("META_ADS");
  const [objective, setObjective] = useState("Conversions e-commerce");
  const [spend, setSpend] = useState("");
  const [revenue, setRevenue] = useState("");
  const [conversions, setConversions] = useState("");
  const [impressions, setImpressions] = useState("");
  const [clicks, setClicks] = useState("");
  const [audience, setAudience] = useState("");
  const [currentCopy, setCurrentCopy] = useState("");
  const [targetRoas, setTargetRoas] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ManualAuditResult | null>(null);

  async function handleAnalyze() {
    setError(null);
    setResult(null);
    if (!spend || Number(spend) <= 0) { setError("Saisis au moins la dépense."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/ads/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform, objective,
          spend: Number(spend),
          revenue: revenue ? Number(revenue) : undefined,
          conversions: conversions ? Number(conversions) : undefined,
          impressions: impressions ? Number(impressions) : undefined,
          clicks: clicks ? Number(clicks) : undefined,
          audience: audience || undefined,
          currentCopy: currentCopy || undefined,
          targetRoas: targetRoas ? Number(targetRoas) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Échec de l'analyse"); return; }
      setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white/60 backdrop-blur p-6 space-y-5">
        <Field label="Plateforme">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {PLATFORMS.map((p) => {
              const meta = PLATFORM_META[p];
              return (
                <button key={p} type="button" onClick={() => setPlatform(p)}
                  className={`rounded-lg border px-3 py-2.5 text-sm flex items-center justify-center gap-2 transition-colors ${
                    platform === p ? "border-brand bg-brand/15 text-brand-700" : "border-zinc-200 bg-white/40 text-zinc-700 hover:border-zinc-300"
                  }`}>
                  <span>{meta.emoji}</span><span className="font-semibold">{meta.label}</span>
                </button>
              );
            })}
          </div>
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Objectif">
            <input value={objective} onChange={(e) => setObjective(e.target.value)} className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm" />
          </Field>
          <Field label="ROAS cible">
            <input type="number" min="0" step="0.1" value={targetRoas} onChange={(e) => setTargetRoas(e.target.value)} placeholder="3" className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm" />
          </Field>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Dépense (€)", val: spend, set: setSpend },
            { label: "Revenus (€)", val: revenue, set: setRevenue },
            { label: "Conversions", val: conversions, set: setConversions },
            { label: "Impressions", val: impressions, set: setImpressions },
            { label: "Clics", val: clicks, set: setClicks },
          ].map(({ label, val, set }) => (
            <Field key={label} label={label}>
              <input type="number" min="0" value={val} onChange={(e) => set(e.target.value)} className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm" />
            </Field>
          ))}
        </div>

        <Field label="Audience actuelle">
          <input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Ex : Femmes 30-50, FR, intérêts yoga + bien-être." className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm" />
        </Field>

        <Field label="Copy actuelle (optionnel)">
          <textarea rows={3} value={currentCopy} onChange={(e) => setCurrentCopy(e.target.value)} placeholder="Colle ici la copy en cours pour analyse." className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm" />
        </Field>

        <div className="flex items-center justify-end gap-3">
          {error && <span className="text-sm text-rose-400 mr-auto">{error}</span>}
          <button type="button" onClick={handleAnalyze} disabled={loading}
            className="rounded-lg bg-brand hover:bg-brand-400 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white">
            {loading ? "Analyse en cours…" : "📈 Analyser ma campagne"}
          </button>
        </div>
      </div>

      {result && <ManualAuditPanel result={result} />}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</span>
      {children}
    </label>
  );
}

function ManualAuditPanel({ result }: { result: ManualAuditResult }) {
  const { metrics, audit } = result;
  const score = audit.health_score ?? null;
  const scoreColor = score === null ? "text-zinc-700" : score >= 75 ? "text-emerald-700" : score >= 50 ? "text-amber-800" : "text-rose-400";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white/60 p-6 space-y-4">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-2 flex-1">
            <h3 className="text-lg font-semibold">Diagnostic</h3>
            <p className="text-sm text-zinc-700">{audit.summary ?? "—"}</p>
          </div>
          {score !== null && (
            <div className="text-right">
              <div className={`text-4xl font-bold ${scoreColor}`}>{score}</div>
              <div className="text-xs text-zinc-400 uppercase tracking-wide">Health score</div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-zinc-200">
          <Metric label="ROAS" value={metrics.roas} suffix="x" />
          <Metric label="CTR" value={metrics.ctr} suffix=" %" />
          <Metric label="CPC" value={metrics.cpc} suffix=" €" />
          <Metric label="CPA" value={metrics.cpa} suffix=" €" />
        </div>
      </div>

      {audit.levers && audit.levers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Leviers prioritaires</h3>
          {audit.levers.map((lever, i) => (
            <div key={i} className="rounded-xl border border-zinc-200 bg-white/40 p-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-semibold text-zinc-900">{i + 1}. {lever.title}</h4>
                <div className="flex gap-2 text-xs">
                  <span className={`rounded-full px-2 py-0.5 font-medium ${IMPACT_COLORS[lever.expected_impact] ?? "bg-zinc-100 text-zinc-700"}`}>
                    Impact : {lever.expected_impact}
                  </span>
                  <span className="rounded-full bg-zinc-200/40 text-zinc-700 px-2 py-0.5 font-medium">
                    Effort : {lever.effort}
                  </span>
                </div>
              </div>
              <p className="text-sm text-zinc-500">{lever.diagnostic}</p>
              <div className="rounded-lg bg-brand/10 border border-brand/20 px-3 py-2 text-sm text-brand-700">
                <span className="font-semibold">⚡ Action :</span> {lever.action}
              </div>
            </div>
          ))}
        </div>
      )}

      {audit.next_test && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 p-4 text-sm">
          <span className="text-emerald-700 font-semibold">🧪 Test prioritaire :</span>{" "}
          <span className="text-emerald-800">{audit.next_test}</span>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, suffix }: { label: string; value: number | null; suffix: string }) {
  return (
    <div>
      <div className="text-xs text-zinc-400 uppercase tracking-wide">{label}</div>
      <div className="text-lg font-semibold text-zinc-900">
        {value === null || Number.isNaN(value) ? "—" : `${value.toFixed(2)}${suffix}`}
      </div>
    </div>
  );
}
