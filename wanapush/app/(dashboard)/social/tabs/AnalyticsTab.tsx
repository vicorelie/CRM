"use client";

import { useEffect, useState } from "react";

type Totals = {
  impressions: number;
  reach: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  posts: number;
};

type ByPlatform = Totals & { platform: string };
type ByAccount = Totals & {
  id: string;
  platform: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

type Data = {
  totals: Totals;
  byPlatform: ByPlatform[];
  byAccount: ByAccount[];
};

const PLATFORM_EMOJI: Record<string, string> = {
  FACEBOOK: "📘",
  INSTAGRAM: "📷",
  LINKEDIN: "💼",
  YOUTUBE: "▶️",
  TIKTOK: "🎵",
};

function n(v: number | undefined): string {
  if (!v) return "0";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return String(v);
}

export function AnalyticsTab() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const r = await fetch(`/api/social/analytics?days=${days}`);
      setData(await r.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  async function runFetch() {
    if (!confirm("Lancer la récupération des métriques pour tous les posts publiés (peut être long) ?")) return;
    setRunning(true);
    // Pas d'auth secret côté UI — on tape via un endpoint d'admin spécifique si besoin.
    // Ici on appelle simplement le cron (le user devrait être admin) — sinon il faut configurer le cron côté serveur.
    alert(
      "La récupération automatique des analytics est gérée par cron. Pour la déclencher manuellement, exécute :\n\ncurl -H 'X-Cron-Secret: $CRON_SECRET' https://wanatest.com/api/social/cron/analytics",
    );
    setRunning(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Performance globale</h2>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm"
          >
            <option value={7}>7 jours</option>
            <option value={30}>30 jours</option>
            <option value={90}>90 jours</option>
          </select>
          <button
            onClick={runFetch}
            disabled={running}
            className="text-xs rounded-lg border border-zinc-200 hover:border-zinc-300 px-3 py-1.5 disabled:opacity-50"
          >
            Comment rafraîchir
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-zinc-500">Chargement…</div>
      ) : !data ? (
        <div className="text-sm text-red-700">Erreur de chargement</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <Stat label="Posts" value={n(data.totals.posts)} />
            <Stat label="Impressions" value={n(data.totals.impressions)} />
            <Stat label="Reach" value={n(data.totals.reach)} />
            <Stat label="Vues" value={n(data.totals.views)} />
            <Stat label="Likes" value={n(data.totals.likes)} />
            <Stat label="Comments" value={n(data.totals.comments)} />
            <Stat label="Shares" value={n(data.totals.shares)} />
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white/60 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-zinc-700">Par plateforme</h3>
            {data.byPlatform.length === 0 ? (
              <div className="text-xs text-zinc-400">
                Aucune donnée. Les analytics se remplissent après publications + cron.
              </div>
            ) : (
              <div className="space-y-2">
                {data.byPlatform.map((p) => (
                  <div key={p.platform} className="flex items-center gap-3 text-sm">
                    <span className="text-2xl w-8">{PLATFORM_EMOJI[p.platform]}</span>
                    <span className="font-medium w-24">{p.platform}</span>
                    <span className="text-zinc-500">{p.posts} posts</span>
                    <span className="text-zinc-500">· {n(p.impressions)} imp.</span>
                    <span className="text-zinc-500">· {n(p.likes)} ❤</span>
                    <span className="text-zinc-500">· {n(p.comments)} 💬</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white/60 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-zinc-700">Par compte</h3>
            {data.byAccount.length === 0 ? (
              <div className="text-xs text-zinc-400">Aucun compte.</div>
            ) : (
              <div className="space-y-2">
                {data.byAccount.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 text-sm">
                    <span className="text-xl w-8">{PLATFORM_EMOJI[a.platform]}</span>
                    <span className="font-medium flex-1 min-w-0 truncate">
                      {a.displayName ?? a.username ?? a.id}
                    </span>
                    <span className="text-zinc-500 w-16 text-right">{a.posts} posts</span>
                    <span className="text-zinc-500 w-20 text-right">{n(a.impressions)} imp.</span>
                    <span className="text-zinc-500 w-16 text-right">{n(a.likes)} ❤</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white/60 p-4">
      <div className="text-[10px] uppercase tracking-wider text-zinc-400">{label}</div>
      <div className="text-2xl font-bold text-zinc-900 mt-1">{value}</div>
    </div>
  );
}
