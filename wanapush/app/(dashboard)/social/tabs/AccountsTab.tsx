"use client";

import { useEffect, useState } from "react";

type Platform = "FACEBOOK" | "INSTAGRAM" | "LINKEDIN" | "YOUTUBE" | "TIKTOK";

type Account = {
  id: string;
  platform: Platform;
  accountId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  status: "CONNECTED" | "EXPIRED" | "REVOKED" | "ERROR";
  tokenExpiresAt: string | null;
  connectedAt: string;
  lastError: string | null;
  meta: { kind?: string } | null;
};

const PLATFORM_LABELS: Record<Platform, { label: string; emoji: string; color: string }> = {
  FACEBOOK: { label: "Facebook", emoji: "📘", color: "bg-blue-600" },
  INSTAGRAM: { label: "Instagram", emoji: "📷", color: "bg-pink-600" },
  LINKEDIN: { label: "LinkedIn", emoji: "💼", color: "bg-sky-700" },
  YOUTUBE: { label: "YouTube", emoji: "▶️", color: "bg-red-600" },
  TIKTOK: { label: "TikTok", emoji: "🎵", color: "bg-zinc-50" },
};

export function AccountsTab() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const r = await fetch("/api/social/accounts");
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
    if (!confirm("Déconnecter ce compte ?")) return;
    await fetch(`/api/social/accounts/${id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div className="space-y-6">
      {/* Bouton unique pour démarrer la connexion d'un nouveau compte */}
      <a
        href="/social/setup"
        className="flex items-center justify-between gap-4 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/30 p-6 transition-all hover:border-brand-500 hover:bg-brand-50 hover:shadow-lift"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-2xl text-white shadow-brand">
            +
          </div>
          <div>
            <div className="text-base font-semibold text-zinc-950">
              Connecter un réseau social
            </div>
            <div className="text-sm text-zinc-600">
              Facebook · Instagram · LinkedIn · TikTok · YouTube
            </div>
          </div>
        </div>
        <span className="text-2xl text-brand-500">→</span>
      </a>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">
          Comptes connectés{" "}
          <span className="text-sm text-zinc-400">({accounts.length})</span>
        </h2>
        {loading ? (
          <div className="text-sm text-zinc-500">Chargement…</div>
        ) : accounts.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white/40 p-6 text-sm text-zinc-500 text-center">
            Aucun compte connecté pour le moment.
          </div>
        ) : (
          <div className="space-y-2">
            {accounts.map((a) => {
              const conf = PLATFORM_LABELS[a.platform];
              return (
                <div
                  key={a.id}
                  className="rounded-xl border border-zinc-200 bg-white/60 p-4 flex items-center gap-4"
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${conf.color}`}
                  >
                    {a.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.avatarUrl}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      conf.emoji
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {a.displayName ?? a.username ?? a.accountId}
                      </span>
                      <span className="text-[10px] uppercase font-mono text-zinc-400">
                        {conf.label}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-mono rounded-full border px-2 py-0.5 ${
                          a.status === "CONNECTED"
                            ? "border-emerald-500/40 bg-emerald-50 text-emerald-700"
                            : "border-red-200 bg-red-50 text-red-700"
                        }`}
                      >
                        {a.status}
                      </span>
                    </div>
                    {a.username && (
                      <div className="text-xs text-zinc-400 truncate">@{a.username}</div>
                    )}
                    {a.lastError && (
                      <div className="text-xs text-red-700 mt-1">⚠ {a.lastError}</div>
                    )}
                  </div>
                  <button
                    onClick={() => disconnect(a.id)}
                    className="text-xs rounded-lg border border-red-200 hover:border-red-500 px-3 py-1.5 text-red-700"
                  >
                    Déconnecter
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
