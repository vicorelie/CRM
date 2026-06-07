"use client";

import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type GlobalStats = {
  spend: number;
  revenue: number;
  roas: number | null;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number | null;
  cpc: number | null;
  cpa: number | null;
};

type PlatformStat = {
  platform: string;
  spend: number;
  revenue: number;
  roas: number | null;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number | null;
  spendShare: number | null;
};

type DailyStat = {
  date: string;
  spend: number;
  revenue: number;
  roas: number | null;
  conversions: number;
};

type CampaignStat = {
  id: string;
  name: string;
  platform: string;
  status: string;
  dailyBudget: number | null;
  spend: number;
  revenue: number;
  roas: number | null;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number | null;
  cpc: number | null;
  cpa: number | null;
};

type AnalyticsData = {
  days: number;
  global: GlobalStats;
  platforms: PlatformStat[];
  daily: DailyStat[];
  campaigns: CampaignStat[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PLATFORM_LABEL: Record<string, string> = {
  META_ADS: "Meta Ads",
  GOOGLE_ADS: "Google Ads",
  TIKTOK_ADS: "TikTok Ads",
  LINKEDIN_ADS: "LinkedIn Ads",
};

const PLATFORM_COLOR: Record<string, string> = {
  META_ADS: "#1877f2",
  GOOGLE_ADS: "#4285f4",
  TIKTOK_ADS: "#010101",
  LINKEDIN_ADS: "#0a66c2",
};

function fmtEur(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k €";
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "k";
  return String(n);
}

function fmtPct(n: number | null): string {
  return n !== null ? (n * 100).toFixed(2) + "%" : "—";
}

function roasColor(roas: number | null): string {
  if (roas === null) return "text-zinc-400";
  if (roas >= 2.5) return "text-emerald-600";
  if (roas >= 1.0) return "text-amber-600";
  return "text-rose-600";
}

function roasBg(roas: number | null): string {
  if (roas === null) return "bg-zinc-50 text-zinc-400 border-zinc-200";
  if (roas >= 2.5) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (roas >= 1.0) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
}

// ─── Sparkline CSS-only ───────────────────────────────────────────────────────

function Sparkline({ data, valueKey }: { data: DailyStat[]; valueKey: "spend" | "roas" }) {
  const values = data.map((d) => (valueKey === "spend" ? d.spend : (d.roas ?? 0)));
  const max = Math.max(...values, 0.001);
  const height = 40;

  return (
    <div className="flex items-end gap-[2px] h-10">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all"
          style={{
            height: `${Math.max(2, (v / max) * height)}px`,
            background: valueKey === "spend" ? "#7c3aed" : v >= 2.5 ? "#16a34a" : v >= 1 ? "#d97706" : "#dc2626",
            opacity: 0.7 + (i / values.length) * 0.3,
          }}
          title={`${data[i].date}: ${valueKey === "spend" ? fmtEur(v) : v.toFixed(2) + "x"}`}
        />
      ))}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  colorClass = "text-zinc-800",
}: {
  label: string;
  value: string;
  sub?: string;
  colorClass?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white/70 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">{label}</div>
      <div className={`text-2xl font-extrabold ${colorClass}`}>{value}</div>
      {sub && <div className="text-xs text-zinc-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Platform bar ─────────────────────────────────────────────────────────────

function PlatformBar({ stat, maxSpend }: { stat: PlatformStat; maxSpend: number }) {
  const share = maxSpend > 0 ? (stat.spend / maxSpend) * 100 : 0;
  const color = PLATFORM_COLOR[stat.platform] ?? "#7c3aed";
  const label = PLATFORM_LABEL[stat.platform] ?? stat.platform;

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium text-zinc-700">{label}</span>
        <div className="flex gap-3 text-xs text-zinc-500">
          <span className="font-semibold text-zinc-800">{fmtEur(stat.spend)}</span>
          {stat.roas !== null && (
            <span className={`font-bold ${roasColor(stat.roas)}`}>ROAS {stat.roas.toFixed(2)}x</span>
          )}
        </div>
      </div>
      <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${share}%`, background: color }}
        />
      </div>
      <div className="flex gap-3 text-[10px] text-zinc-400">
        <span>{fmtNum(stat.impressions)} impr.</span>
        <span>{fmtNum(stat.clicks)} clics</span>
        <span>{fmtPct(stat.ctr)} CTR</span>
        <span>{fmtNum(stat.conversions)} conv.</span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PerformanceTab() {
  const [days, setDays] = useState<7 | 30 | 90>(7);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(d: 7 | 30 | 90) {
    setLoading(true);
    try {
      const r = await fetch(`/api/ads/analytics?days=${d}`);
      const j = await r.json() as AnalyticsData;
      setData(j);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(days); }, [days]);

  const g = data?.global;
  const maxSpend = Math.max(...(data?.platforms.map((p) => p.spend) ?? [0]), 0.001);

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Performance publicitaire</h2>
        <div className="flex gap-1 bg-zinc-100 rounded-lg p-0.5">
          {([7, 30, 90] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                days === d ? "bg-white shadow-sm text-brand-700" : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {d}j
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-zinc-500">Chargement…</div>
      ) : !g || data!.campaigns.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white/40 p-8 text-center text-sm text-zinc-500">
          Aucune donnée de campagne sur les {days} derniers jours.
          <br />
          <span className="text-xs text-zinc-400">
            Les KPIs sont synchronisés toutes les 30 minutes via le cron de sync.
          </span>
        </div>
      ) : (
        <>
          {/* ─── KPI cards ─── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard
              label="Dépenses"
              value={fmtEur(g.spend)}
              colorClass="text-brand-700"
            />
            <StatCard
              label="ROAS"
              value={g.roas !== null ? `${g.roas.toFixed(2)}x` : "—"}
              colorClass={roasColor(g.roas)}
            />
            <StatCard
              label="Conversions"
              value={fmtNum(g.conversions)}
              sub={g.cpa !== null ? `CPA ${fmtEur(g.cpa)}` : undefined}
            />
            <StatCard
              label="Clics"
              value={fmtNum(g.clicks)}
              sub={`CTR ${fmtPct(g.ctr)}`}
            />
            <StatCard
              label="Impressions"
              value={fmtNum(g.impressions)}
              sub={g.cpc !== null ? `CPC ${fmtEur(g.cpc)}` : undefined}
            />
          </div>

          {/* ─── Sparklines ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-zinc-200 bg-white/60 p-4 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Dépenses / jour</div>
              <Sparkline data={data!.daily} valueKey="spend" />
              <div className="flex justify-between text-[10px] text-zinc-400">
                <span>{data!.daily[0]?.date.slice(5).replace("-", "/")}</span>
                <span>{data!.daily[data!.daily.length - 1]?.date.slice(5).replace("-", "/")}</span>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white/60 p-4 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">ROAS / jour</div>
              <Sparkline data={data!.daily} valueKey="roas" />
              <div className="flex justify-between text-[10px] text-zinc-400">
                <span>{data!.daily[0]?.date.slice(5).replace("-", "/")}</span>
                <span>{data!.daily[data!.daily.length - 1]?.date.slice(5).replace("-", "/")}</span>
              </div>
            </div>
          </div>

          {/* ─── Platform breakdown ─── */}
          {data!.platforms.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white/60 p-5 space-y-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Répartition par plateforme</div>
              <div className="space-y-4">
                {data!.platforms.map((p) => (
                  <PlatformBar key={p.platform} stat={p} maxSpend={maxSpend} />
                ))}
              </div>
            </div>
          )}

          {/* ─── Campaign table ─── */}
          <div className="rounded-xl border border-zinc-200 bg-white/60 overflow-hidden">
            <div className="px-5 py-3 border-b border-zinc-100">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Campagnes ({data!.campaigns.length})
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                    <th className="px-4 py-2.5 text-left">Campagne</th>
                    <th className="px-4 py-2.5 text-right">Dépense</th>
                    <th className="px-4 py-2.5 text-right">Impr.</th>
                    <th className="px-4 py-2.5 text-right">Clics</th>
                    <th className="px-4 py-2.5 text-right">Conv.</th>
                    <th className="px-4 py-2.5 text-right">ROAS</th>
                    <th className="px-4 py-2.5 text-right">CPA</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.campaigns.map((c) => (
                    <tr key={c.id} className="border-t border-zinc-100 hover:bg-zinc-50/50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-800 truncate max-w-[220px]">{c.name}</div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">
                          {PLATFORM_LABEL[c.platform] ?? c.platform}
                          {c.dailyBudget != null && ` · ${fmtEur(c.dailyBudget)}/j`}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-zinc-800">{fmtEur(c.spend)}</td>
                      <td className="px-4 py-3 text-right text-zinc-600">{fmtNum(c.impressions)}</td>
                      <td className="px-4 py-3 text-right text-zinc-600">
                        {fmtNum(c.clicks)}
                        {c.ctr !== null && (
                          <div className="text-[10px] text-zinc-400">{fmtPct(c.ctr)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-600">{fmtNum(c.conversions)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-bold ${roasBg(c.roas)}`}>
                          {c.roas !== null ? `${c.roas.toFixed(2)}x` : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-600 text-xs">
                        {c.cpa !== null ? fmtEur(c.cpa) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
