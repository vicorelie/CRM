"use client";

import { useCallback, useEffect, useState } from "react";

type Review = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  authorName: string | null;
  authorEmail: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  verifiedPurchase: boolean;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
  product: { id: string; title: string; slug: string };
  customer: { id: string; email: string; firstName: string | null; lastName: string | null } | null;
};

export function ReviewsClient({ siteSlug }: { siteSlug: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<"PENDING" | "APPROVED" | "REJECTED" | "">("PENDING");
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL(`/api/shop/${siteSlug}/reviews`, window.location.origin);
      if (status) url.searchParams.set("status", status);
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews ?? []);
        setCounts(data.counts ?? {});
      }
    } finally { setLoading(false); }
  }, [siteSlug, status]);

  useEffect(() => { refresh(); }, [refresh]);

  async function moderate(r: Review, newStatus: "APPROVED" | "REJECTED" | "PENDING") {
    await fetch(`/api/shop/${siteSlug}/reviews/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    refresh();
  }
  async function submitReply(r: Review) {
    if (!replyText.trim()) return;
    await fetch(`/api/shop/${siteSlug}/reviews/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply: replyText }),
    });
    setReplyingTo(null);
    setReplyText("");
    refresh();
  }
  async function remove(r: Review) {
    if (!confirm(`Supprimer définitivement cet avis ?`)) return;
    await fetch(`/api/shop/${siteSlug}/reviews/${r.id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-500/30 text-emerald-700 text-xs font-medium uppercase tracking-widest">
          Modération
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Avis clients</h1>
      </header>

      <div className="flex flex-wrap gap-2">
        <TabBtn label="À modérer" count={counts.PENDING ?? 0} active={status === "PENDING"} onClick={() => setStatus("PENDING")} />
        <TabBtn label="Approuvés" count={counts.APPROVED ?? 0} active={status === "APPROVED"} onClick={() => setStatus("APPROVED")} />
        <TabBtn label="Refusés" count={counts.REJECTED ?? 0} active={status === "REJECTED"} onClick={() => setStatus("REJECTED")} />
        <TabBtn label="Tous" count={(counts.PENDING ?? 0) + (counts.APPROVED ?? 0) + (counts.REJECTED ?? 0)} active={status === ""} onClick={() => setStatus("")} />
      </div>

      {loading ? (
        <div className="text-sm text-zinc-500">Chargement…</div>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white/40 p-10 text-center space-y-3">
          <div className="text-5xl">⭐</div>
          <p className="text-zinc-700">Aucun avis pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <article key={r.id} className="rounded-2xl border border-zinc-200 bg-white/40 p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <Stars value={r.rating} />
                    {r.verifiedPurchase && (
                      <span className="text-[10px] uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        Achat vérifié
                      </span>
                    )}
                  </div>
                  {r.title && <h3 className="font-bold text-zinc-900 mb-1">{r.title}</h3>}
                  {r.body && <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{r.body}</p>}
                  <div className="text-xs text-zinc-400 mt-2">
                    Par <strong className="text-zinc-700">{r.authorName || r.customer?.email || "Anonyme"}</strong>
                    {" · "}
                    {new Date(r.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                    {" · sur "}
                    <strong className="text-zinc-700">{r.product.title}</strong>
                  </div>
                </div>
                <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border whitespace-nowrap ${
                  r.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border-emerald-500/30"
                    : r.status === "REJECTED" ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-amber-50 text-amber-800 border-amber-500/30"
                }`}>
                  {r.status === "APPROVED" ? "Approuvé" : r.status === "REJECTED" ? "Refusé" : "À modérer"}
                </span>
              </div>

              {r.reply && (
                <div className="ml-4 pl-4 border-l-2 border-brand/40 bg-brand/5 rounded p-3">
                  <div className="text-[10px] uppercase tracking-widest text-brand-700 font-semibold mb-1">Réponse du marchand</div>
                  <p className="text-sm text-zinc-700 whitespace-pre-wrap">{r.reply}</p>
                </div>
              )}

              {replyingTo === r.id ? (
                <div className="flex gap-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={2}
                    placeholder="Réponse publique…"
                    className="flex-1 px-3 py-2 rounded-lg bg-white border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:border-emerald-500 resize-y"
                  />
                  <div className="flex flex-col gap-1">
                    <button onClick={() => submitReply(r)} className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold">Envoyer</button>
                    <button onClick={() => { setReplyingTo(null); setReplyText(""); }} className="px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-700 text-xs">Annuler</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-200/60">
                  {r.status !== "APPROVED" && <button onClick={() => moderate(r, "APPROVED")} className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-50 text-emerald-700 border border-emerald-500/30 text-xs font-semibold">✓ Approuver</button>}
                  {r.status !== "REJECTED" && <button onClick={() => moderate(r, "REJECTED")} className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-50 text-red-700 border border-red-200 text-xs font-semibold">✕ Refuser</button>}
                  <button onClick={() => { setReplyingTo(r.id); setReplyText(r.reply ?? ""); }} className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs">
                    {r.reply ? "Modifier la réponse" : "Répondre"}
                  </button>
                  <button onClick={() => remove(r)} className="px-3 py-1.5 rounded-lg text-red-700 hover:text-red-700 text-xs ml-auto">Supprimer</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function TabBtn({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
        active ? "bg-emerald-50 text-emerald-200 border-emerald-500/30" : "bg-white/40 text-zinc-500 border-zinc-200 hover:text-zinc-800"
      }`}
    >
      {label} <span className="text-xs opacity-70">({count})</span>
    </button>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill={i <= value ? "#fbbf24" : "none"} stroke={i <= value ? "#fbbf24" : "#475569"} strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}
