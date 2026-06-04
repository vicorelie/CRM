"use client";

import { startTransition, useEffect, useState } from "react";

type Submission = {
  id: string;
  siteSlug: string;
  brandName: string;
  type: string;
  data: Record<string, string | number | boolean | null>;
  email: string | null;
  pageUrl: string | null;
  read: boolean;
  createdAt: string;
};

type SiteOption = { siteSlug: string; brandName: string };

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LeadsClient() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [filterSlug, setFilterSlug] = useState<string>("");
  const [filterType, setFilterType] = useState<"all" | "contact" | "newsletter">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const url = filterSlug ? `/api/forms/list?siteSlug=${encodeURIComponent(filterSlug)}` : "/api/forms/list";
      const res = await fetch(url, { credentials: "include" });
      const text = await res.text();
      let json: { error?: string; submissions?: Submission[]; sites?: SiteOption[] } | null = null;
      if (text) {
        try { json = JSON.parse(text); } catch {
          throw new Error(`Réponse invalide (status ${res.status}): ${text.slice(0, 100)}`);
        }
      }
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setSubmissions(json?.submissions ?? []);
      setSites(json?.sites ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filterSlug]);

  async function markAsRead(id: string, read: boolean) {
    await fetch(`/api/forms/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read }),
    });
    setSubmissions((subs) => subs.map((s) => (s.id === id ? { ...s, read } : s)));
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cette soumission ?")) return;
    const res = await fetch(`/api/forms/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSubmissions((subs) => subs.filter((s) => s.id !== id));
    }
  }

  function exportCsv() {
    const rows = filtered.map((s) => ({
      date: s.createdAt,
      site: s.brandName,
      type: s.type,
      email: s.email ?? "",
      data: JSON.stringify(s.data),
      pageUrl: s.pageUrl ?? "",
    }));
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => `"${String((r as Record<string, string>)[h]).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = submissions.filter((s) => filterType === "all" || s.type === filterType);
  const unreadCount = submissions.filter((s) => !s.read).length;

  return (
    <div className="space-y-5">
      {/* Filtres + actions */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterSlug}
          onChange={(e) => setFilterSlug(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm text-zinc-900 focus:border-brand focus:outline-none"
        >
          <option value="">Tous les sites ({sites.length})</option>
          {sites.map((s) => (
            <option key={s.siteSlug} value={s.siteSlug}>{s.brandName} ({s.siteSlug})</option>
          ))}
        </select>

        <div className="flex rounded-lg border border-zinc-200 bg-white/60 overflow-hidden text-sm">
          {(["all", "contact", "newsletter"] as const).map((t) => (
            <button
              key={t}
              onClick={() => startTransition(() => setFilterType(t))}
              className={`px-3 py-2 transition-colors ${
                filterType === t ? "bg-brand text-white" : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              {t === "all" ? "Tout" : t === "contact" ? "Contact" : "Newsletter"}
            </button>
          ))}
        </div>

        <div className="text-xs text-zinc-500">
          <strong className="text-brand-700">{unreadCount}</strong> non lue{unreadCount > 1 ? "s" : ""} · {submissions.length} total
        </div>

        <div className="flex-1" />

        <button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="text-xs rounded-lg border border-zinc-200 hover:border-emerald-500/60 hover:bg-emerald-50 hover:text-emerald-700 transition-colors px-3 py-2 text-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Export CSV
        </button>
        <button
          onClick={load}
          className="text-xs rounded-lg border border-zinc-200 hover:border-brand/60 hover:bg-brand/10 hover:text-brand-700 transition-colors px-3 py-2 text-zinc-700"
        >
          Actualiser
        </button>
      </div>

      {/* État */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-zinc-500 py-12 text-sm">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white/40 backdrop-blur p-12 text-center">
          <p className="text-zinc-700 mb-2">Aucune soumission pour le moment.</p>
          <p className="text-zinc-400 text-sm">Les formulaires de contact et inscriptions à la newsletter remplis sur tes sites apparaîtront ici.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white/40 backdrop-blur overflow-hidden">
          {filtered.map((s, i) => {
            const isOpen = openId === s.id;
            return (
              <div
                key={s.id}
                className={`border-b border-zinc-200 last:border-b-0 transition-colors ${!s.read ? "bg-brand/5" : ""}`}
              >
                <button
                  onClick={() => {
                    setOpenId(isOpen ? null : s.id);
                    if (!s.read && !isOpen) markAsRead(s.id, true);
                  }}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-zinc-100/30 transition-colors"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${!s.read ? "bg-brand-400" : "bg-zinc-200"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${s.type === "contact" ? "bg-blue-500/20 text-blue-300" : "bg-emerald-50 text-emerald-700"}`}>
                        {s.type}
                      </span>
                      <span className="text-sm font-medium text-zinc-900 truncate">
                        {s.email ?? (typeof s.data.name === "string" ? s.data.name : "Anonyme")}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500">
                      {s.brandName} · {formatDate(s.createdAt)}
                    </div>
                  </div>
                  <svg className={`w-4 h-4 text-zinc-400 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 space-y-3 text-sm">
                    <div className="rounded-lg bg-white/60 border border-zinc-200 p-4 space-y-2">
                      {Object.entries(s.data).map(([k, v]) => (
                        <div key={k} className="grid grid-cols-[120px_1fr] gap-3 text-xs">
                          <span className="text-zinc-400 uppercase tracking-widest">{k}</span>
                          <span className="text-zinc-800 whitespace-pre-wrap break-words">{String(v ?? "")}</span>
                        </div>
                      ))}
                    </div>
                    {s.pageUrl && (
                      <div className="text-xs text-zinc-400">
                        Page d'origine : <a href={s.pageUrl} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:text-brand-700 underline">{s.pageUrl}</a>
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => markAsRead(s.id, !s.read)}
                        className="text-xs rounded-lg border border-zinc-200 hover:border-brand/60 hover:bg-brand/10 hover:text-brand-700 transition-colors px-3 py-1.5 text-zinc-700"
                      >
                        Marquer {s.read ? "non lue" : "lue"}
                      </button>
                      {s.email && (
                        <a
                          href={`mailto:${s.email}`}
                          className="text-xs rounded-lg border border-zinc-200 hover:border-emerald-500/60 hover:bg-emerald-50 hover:text-emerald-700 transition-colors px-3 py-1.5 text-zinc-700"
                        >
                          Répondre par email
                        </a>
                      )}
                      <div className="flex-1" />
                      <button
                        onClick={() => remove(s.id)}
                        className="text-xs rounded-lg border border-red-200 hover:border-red-500 hover:bg-red-50 transition-colors px-3 py-1.5 text-red-700"
                      >
                        Supprimer
                      </button>
                    </div>
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
