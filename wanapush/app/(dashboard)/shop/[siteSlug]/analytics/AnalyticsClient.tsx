"use client";

import { useCallback, useEffect, useState } from "react";

type Series = { date: string; revenue: number; orders: number };
type TopProduct = { title: string; revenue: number; qty: number };
type TopDiscount = { code: string; uses: number; saved: number };
type Data = {
  range: number;
  kpis: {
    revenue: number;
    orders: number;
    aov: number;
    conversionRate: number;
    customersCount: number;
    revenueDelta: number | null;
    ordersDelta: number | null;
  };
  series: Series[];
  topProducts: TopProduct[];
  topDiscounts: TopDiscount[];
};

export function AnalyticsClient({ siteSlug, currency, locale }: { siteSlug: string; currency: string; locale: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [range, setRange] = useState(30);
  const [loading, setLoading] = useState(true);

  const fmt = useCallback((n: number) => new Intl.NumberFormat(locale, { style: "currency", currency }).format(n), [locale, currency]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shop/${siteSlug}/analytics?range=${range}`);
      if (res.ok) setData(await res.json());
    } finally { setLoading(false); }
  }, [siteSlug, range]);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-500/30 text-emerald-700 text-xs font-medium uppercase tracking-widest">
            Analytics
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Performance de la boutique</h1>
        </div>
        <div className="flex gap-1 bg-white/40 border border-zinc-200 rounded-lg p-1">
          {[7, 30, 90, 365].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded text-xs font-semibold ${range === r ? "bg-emerald-500 text-white" : "text-zinc-500 hover:text-zinc-900"}`}
            >
              {r}j
            </button>
          ))}
        </div>
      </header>

      {loading || !data ? (
        <div className="text-sm text-zinc-500">Chargement…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Kpi label="CA" value={fmt(data.kpis.revenue)} delta={data.kpis.revenueDelta} />
            <Kpi label="Commandes" value={String(data.kpis.orders)} delta={data.kpis.ordersDelta} />
            <Kpi label="Panier moyen" value={fmt(data.kpis.aov)} />
            <Kpi label="Conversion" value={`${data.kpis.conversionRate.toFixed(1)}%`} hint="Commandes payées / total" />
          </div>

          <Card title={`Évolution sur ${data.range}j`}>
            <Sparkline series={data.series} fmt={fmt} />
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Top produits">
              {data.topProducts.length === 0 ? (
                <p className="text-sm text-zinc-400">Pas de données.</p>
              ) : (
                <ul className="space-y-2">
                  {data.topProducts.map((p, i) => (
                    <li key={p.title} className="flex items-center gap-3 py-2 border-b border-zinc-200/60 last:border-0">
                      <div className="text-xs text-zinc-400 font-mono w-5">{i + 1}.</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-zinc-900 truncate">{p.title}</div>
                        <div className="text-xs text-zinc-400">{p.qty} vendus</div>
                      </div>
                      <div className="text-right font-mono font-semibold text-zinc-900">{fmt(p.revenue)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Top codes promo">
              {data.topDiscounts.length === 0 ? (
                <p className="text-sm text-zinc-400">Pas de codes utilisés sur cette période.</p>
              ) : (
                <ul className="space-y-2">
                  {data.topDiscounts.map((d) => (
                    <li key={d.code} className="flex items-center justify-between py-2 border-b border-zinc-200/60 last:border-0">
                      <div>
                        <div className="font-mono font-bold text-zinc-900">{d.code}</div>
                        <div className="text-xs text-zinc-400">{d.uses} utilisations</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-zinc-400">Économies clients</div>
                        <div className="font-bold text-emerald-700">{fmt(d.saved)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, delta, hint }: { label: string; value: string; delta?: number | null; hint?: string }) {
  const deltaColor = delta == null ? "" : delta > 0 ? "text-emerald-700" : delta < 0 ? "text-red-700" : "text-zinc-500";
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/40 p-5">
      <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-1">{label}</div>
      <div className="text-2xl font-bold text-zinc-900">{value}</div>
      {delta != null && (
        <div className={`text-xs mt-1 ${deltaColor}`}>
          {delta > 0 ? "↑" : delta < 0 ? "↓" : "→"} {Math.abs(delta).toFixed(1)}% vs période précédente
        </div>
      )}
      {hint && <div className="text-xs text-zinc-400 mt-1">{hint}</div>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white/40 p-5 space-y-3">
      <h2 className="font-bold text-base text-zinc-900">{title}</h2>
      {children}
    </section>
  );
}

function Sparkline({ series, fmt }: { series: Series[]; fmt: (n: number) => string }) {
  const max = Math.max(1, ...series.map((s) => s.revenue));
  const w = 600;
  const h = 140;
  const step = series.length > 1 ? w / (series.length - 1) : w;
  const points = series.map((s, i) => {
    const x = i * step;
    const y = h - (s.revenue / max) * (h - 8) - 4;
    return `${x},${y}`;
  }).join(" ");

  // Bars
  const barW = step * 0.7;
  const total = series.reduce((s, x) => s + x.revenue, 0);

  return (
    <div className="space-y-2">
      <div className="text-xs text-zinc-500">
        Total {fmt(total)} sur {series.length} jours · pic {fmt(max)}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="none">
        {/* Bars */}
        {series.map((s, i) => {
          if (s.revenue === 0) return null;
          const x = i * step - barW / 2;
          const barH = (s.revenue / max) * (h - 8);
          return (
            <rect
              key={i}
              x={x}
              y={h - barH - 4}
              width={barW}
              height={barH}
              rx="2"
              fill="rgb(99 102 241)"
              opacity="0.25"
            />
          );
        })}
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke="rgb(99 102 241)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Dots on data points */}
        {series.map((s, i) => {
          if (s.revenue === 0) return null;
          const x = i * step;
          const y = h - (s.revenue / max) * (h - 8) - 4;
          return <circle key={i} cx={x} cy={y} r="3" fill="rgb(99 102 241)" />;
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-zinc-400">
        <span>{series[0]?.date}</span>
        <span>{series[series.length - 1]?.date}</span>
      </div>
    </div>
  );
}
