"use client";

import { useState } from "react";
import { AdPlatform, PLATFORM_META } from "./types";

type Lever = {
  title: string;
  diagnostic: string;
  action: string;
  expected_impact: string;
  effort: string;
};

type AuditResponse = {
  platform: AdPlatform;
  metrics: {
    ctr: number | null;
    cpc: number | null;
    cpa: number | null;
    roas: number | null;
  };
  audit: {
    summary?: string;
    health_score?: number;
    levers?: Lever[];
    next_test?: string;
  };
};

const PLATFORMS: AdPlatform[] = [
  "META_ADS",
  "GOOGLE_ADS",
  "TIKTOK_ADS",
  "LINKEDIN_ADS",
];

const IMPACT_COLORS: Record<string, string> = {
  Critique: "bg-rose-500/15 text-rose-300",
  Fort: "bg-amber-50 text-amber-800",
  Moyen: "bg-sky-500/15 text-sky-300",
  Faible: "bg-zinc-100 text-zinc-700",
};

export function RoasOptimizer() {
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
  const [result, setResult] = useState<AuditResponse | null>(null);

  async function handleAnalyze() {
    setError(null);
    setResult(null);

    if (!spend || Number(spend) <= 0) {
      setError("Saisis au moins la dépense.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/ads/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          objective,
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
      if (!res.ok) {
        setError(json.error ?? "Échec de l'analyse");
        return;
      }
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
              const active = platform === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className={`rounded-lg border px-3 py-2.5 text-sm flex items-center justify-center gap-2 transition-colors ${
                    active
                      ? "border-brand bg-brand/15 text-brand-700"
                      : "border-zinc-200 bg-white/40 text-zinc-700 hover:border-zinc-300"
                  }`}
                >
                  <span>{meta.emoji}</span>
                  <span className="font-semibold">{meta.label}</span>
                </button>
              );
            })}
          </div>
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Objectif de la campagne">
            <input
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="ROAS cible">
            <input
              type="number"
              min="0"
              step="0.1"
              value={targetRoas}
              onChange={(e) => setTargetRoas(e.target.value)}
              placeholder="3"
              className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Field label="Dépense (€)">
            <input
              type="number"
              min="0"
              value={spend}
              onChange={(e) => setSpend(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Revenus (€)">
            <input
              type="number"
              min="0"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Conversions">
            <input
              type="number"
              min="0"
              value={conversions}
              onChange={(e) => setConversions(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Impressions">
            <input
              type="number"
              min="0"
              value={impressions}
              onChange={(e) => setImpressions(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Clics">
            <input
              type="number"
              min="0"
              value={clicks}
              onChange={(e) => setClicks(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm"
            />
          </Field>
        </div>

        <Field label="Audience actuelle">
          <input
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="Ex : Femmes 30-50, FR, intérêts yoga + bien-être."
            className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Copy actuelle (optionnel)">
          <textarea
            rows={3}
            value={currentCopy}
            onChange={(e) => setCurrentCopy(e.target.value)}
            placeholder="Colle ici la copy en cours pour analyse."
            className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm"
          />
        </Field>

        <div className="flex items-center justify-end gap-3">
          {error && <span className="text-sm text-rose-400 mr-auto">{error}</span>}
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={loading}
            className="rounded-lg bg-brand hover:bg-brand-400 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white"
          >
            {loading ? "Analyse en cours…" : "📈 Analyser ma campagne"}
          </button>
        </div>
      </div>

      {result && <AuditPanel result={result} />}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
        {label}
      </span>
      {children}
    </label>
  );
}

function AuditPanel({ result }: { result: AuditResponse }) {
  const { metrics, audit } = result;
  const score = audit.health_score ?? null;
  const scoreColor =
    score === null
      ? "text-zinc-700"
      : score >= 75
      ? "text-emerald-700"
      : score >= 50
      ? "text-amber-800"
      : "text-rose-400";

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
              <div className="text-xs text-zinc-400 uppercase tracking-wide">
                Health score
              </div>
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
            <div
              key={i}
              className="rounded-xl border border-zinc-200 bg-white/40 p-4 space-y-2"
            >
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-semibold text-zinc-900">
                  {i + 1}. {lever.title}
                </h4>
                <div className="flex gap-2 text-xs">
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${
                      IMPACT_COLORS[lever.expected_impact] ??
                      "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    Impact : {lever.expected_impact}
                  </span>
                  <span className="rounded-full bg-zinc-200/40 text-zinc-700 px-2 py-0.5 font-medium">
                    Effort : {lever.effort}
                  </span>
                </div>
              </div>
              <p className="text-sm text-zinc-500">{lever.diagnostic}</p>
              <div className="rounded-lg bg-brand/10 border border-brand/20 px-3 py-2 text-sm text-brand-700">
                <span className="text-brand-700 font-semibold">
                  ⚡ Action :
                </span>{" "}
                {lever.action}
              </div>
            </div>
          ))}
        </div>
      )}

      {audit.next_test && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 p-4 text-sm">
          <span className="text-emerald-700 font-semibold">🧪 Test prioritaire :</span>{" "}
          <span className="text-emerald-100">{audit.next_test}</span>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number | null;
  suffix: string;
}) {
  return (
    <div>
      <div className="text-xs text-zinc-400 uppercase tracking-wide">{label}</div>
      <div className="text-lg font-semibold text-zinc-900">
        {value === null || Number.isNaN(value)
          ? "—"
          : `${value.toFixed(2)}${suffix}`}
      </div>
    </div>
  );
}
