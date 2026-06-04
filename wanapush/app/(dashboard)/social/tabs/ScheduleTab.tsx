"use client";

import { useEffect, useState } from "react";
import { Composer } from "../composer/Composer";
import { type Account, PLATFORM_EMOJI, type Platform } from "../composer/types";

type Target = {
  id: string;
  platform: Platform;
  status: string;
  externalUrl: string | null;
  lastError: string | null;
  account: {
    id: string;
    platform: Platform;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
};

type Post = {
  id: string;
  caption: string;
  mediaUrls: Array<{ url: string; type: "image" | "video"; alt?: string }>;
  scheduledAt: string;
  publishedAt: string | null;
  status: string;
  lastError: string | null;
  options: {
    firstComment?: string;
    title?: string;
    privacy?: string;
    hashtags?: string[];
  } | null;
  targets: Target[];
};

const STATUS_BADGE: Record<string, string> = {
  SCHEDULED: "border-sky-200 bg-sky-50 text-sky-700",
  PUBLISHING: "border-amber-200 bg-amber-50 text-amber-800",
  PUBLISHED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  FAILED: "border-red-200 bg-red-50 text-red-700",
  DRAFT: "border-zinc-200 bg-zinc-100 text-zinc-700",
  CANCELED: "border-zinc-200 bg-zinc-100 text-zinc-500",
};

export function ScheduleTab() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [showComposer, setShowComposer] = useState(false);

  async function refresh() {
    const [accRes, postsRes] = await Promise.all([
      fetch("/api/social/accounts").then((r) => r.json()),
      fetch("/api/social/posts").then((r) => r.json()),
    ]);
    setAccounts(accRes.accounts ?? []);
    setPosts(postsRes.posts ?? []);
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Posts planifiés{" "}
          <span className="text-sm text-zinc-400">({posts.length})</span>
        </h2>
        <button
          onClick={() => setShowComposer((v) => !v)}
          className="rounded-lg bg-brand hover:bg-brand-400 px-4 py-2 text-sm font-semibold text-white"
        >
          {showComposer ? "Annuler" : "+ Nouveau post"}
        </button>
      </div>

      {showComposer && accounts.length > 0 && (
        <Composer
          accounts={accounts}
          onCreated={() => {
            setShowComposer(false);
            refresh();
          }}
        />
      )}
      {showComposer && accounts.length === 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-50 p-4 text-sm text-amber-200">
          Connecte d&apos;abord un compte dans l&apos;onglet &laquo;&nbsp;Comptes&nbsp;&raquo;.
        </div>
      )}

      {posts.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white/40 p-6 text-sm text-zinc-500 text-center">
          Aucun post planifié pour le moment.
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} onChange={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}

function PostCard({ post, onChange }: { post: Post; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const date = new Date(post.scheduledAt);

  async function publishNow() {
    if (!confirm("Publier maintenant sur toutes les cibles ?")) return;
    setBusy(true);
    await fetch(`/api/social/posts/${post.id}`, { method: "POST" });
    setBusy(false);
    onChange();
  }
  async function remove() {
    if (!confirm("Supprimer ce post planifié ?")) return;
    await fetch(`/api/social/posts/${post.id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white/60 p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-[10px] uppercase font-mono rounded-full border px-2 py-0.5 ${STATUS_BADGE[post.status] ?? STATUS_BADGE.DRAFT}`}
            >
              {post.status}
            </span>
            <span className="text-xs text-zinc-500">
              {date.toLocaleString("fr-FR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </span>
            <div className="flex gap-1">
              {post.targets.map((t) => (
                <span
                  key={t.id}
                  title={`${t.platform} – ${t.status}`}
                  className="text-base"
                >
                  {PLATFORM_EMOJI[t.platform]}
                </span>
              ))}
            </div>
          </div>
          <p className="text-sm text-zinc-800 whitespace-pre-wrap line-clamp-3">
            {post.caption}
          </p>
          {post.mediaUrls.length > 0 && (
            <div className="flex gap-2 pt-1">
              {post.mediaUrls.slice(0, 4).map((m, i) =>
                m.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={m.url}
                    alt={m.alt ?? ""}
                    className="w-16 h-16 rounded-md object-cover border border-zinc-200"
                  />
                ) : (
                  <div
                    key={i}
                    className="w-16 h-16 rounded-md bg-white border border-zinc-200 flex items-center justify-center text-2xl"
                  >
                    🎬
                  </div>
                ),
              )}
              {post.mediaUrls.length > 4 && (
                <div className="w-16 h-16 rounded-md bg-white border border-zinc-200 flex items-center justify-center text-xs text-zinc-500">
                  +{post.mediaUrls.length - 4}
                </div>
              )}
            </div>
          )}
          {post.lastError && (
            <div className="text-xs text-red-700">⚠ {post.lastError}</div>
          )}
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          {post.status !== "PUBLISHED" && (
            <button
              onClick={publishNow}
              disabled={busy}
              className="text-xs rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 px-3 py-1.5 font-semibold"
            >
              {busy ? "…" : "Publier maintenant"}
            </button>
          )}
          <button
            onClick={remove}
            className="text-xs rounded-lg border border-red-200 hover:border-red-500 px-3 py-1.5 text-red-700"
          >
            Supprimer
          </button>
        </div>
      </div>
      {post.targets.some((t) => t.externalUrl || t.lastError) && (
        <div className="border-t border-zinc-200 pt-2 space-y-1">
          {post.targets.map((t) =>
            t.externalUrl ? (
              <a
                key={t.id}
                href={t.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-brand-700 hover:text-brand-700 block truncate"
              >
                {PLATFORM_EMOJI[t.platform]} {t.externalUrl}
              </a>
            ) : t.lastError ? (
              <div key={t.id} className="text-xs text-red-700 truncate">
                {PLATFORM_EMOJI[t.platform]} ⚠ {t.lastError}
              </div>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
