"use client";

import { useMemo, useState } from "react";
import { CaptionEditor } from "./CaptionEditor";
import { HashtagsEditor } from "./HashtagsEditor";
import { MediaUploader } from "./MediaUploader";
import { PostPreview } from "./PostPreview";
import { SchedulePicker } from "./SchedulePicker";
import {
  type Account,
  type Media,
  type Platform,
  PLATFORM_EMOJI,
  PLATFORM_LABEL,
} from "./types";

function defaultDate(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Props = {
  accounts: Account[];
  onCreated: () => void;
};

export function Composer({ accounts, onCreated }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [title, setTitle] = useState("");
  const [media, setMedia] = useState<Media[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState(defaultDate());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPlatforms = useMemo<Platform[]>(
    () =>
      Array.from(
        new Set(
          accounts
            .filter((a) => selectedIds.includes(a.id))
            .map((a) => a.platform),
        ),
      ),
    [accounts, selectedIds],
  );

  const needsTitle = selectedPlatforms.includes("YOUTUBE");

  function toggleAccount(id: string) {
    setSelectedIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (selectedIds.length === 0) {
      setError("Sélectionne au moins un compte");
      return;
    }
    if (caption.trim().length === 0) {
      setError("Le texte du post ne peut pas être vide");
      return;
    }
    setSubmitting(true);
    const r = await fetch("/api/social/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caption: caption.trim(),
        media,
        scheduledAt: new Date(scheduledAt).toISOString(),
        accountIds: selectedIds,
        options: {
          hashtags,
          title: needsTitle ? title : undefined,
        },
      }),
    });
    setSubmitting(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setError(j.error ?? "Erreur création post");
      return;
    }
    onCreated();
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-brand-200 bg-brand-50/40 p-6 space-y-6"
    >
      <h3 className="text-lg font-semibold">Composer un post</h3>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Colonne gauche : édition */}
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">Comptes cibles</label>
            <div className="flex gap-2 flex-wrap">
              {accounts.map((a) => {
                const sel = selectedIds.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleAccount(a.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs flex items-center gap-2 transition-all ${
                      sel
                        ? "border-brand-400 bg-brand-100 text-brand-700"
                        : "border-zinc-200 bg-white/50 text-zinc-700 hover:border-zinc-300"
                    }`}
                  >
                    <span>{PLATFORM_EMOJI[a.platform]}</span>
                    <span>{a.displayName ?? a.username ?? PLATFORM_LABEL[a.platform]}</span>
                  </button>
                );
              })}
            </div>
            {selectedPlatforms.length > 0 && (
              <p className="text-[11px] text-zinc-400">
                Cibles : {selectedPlatforms.map((p) => PLATFORM_LABEL[p]).join(", ")}
              </p>
            )}
          </div>

          {needsTitle && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">
                Titre YouTube{" "}
                <span className="text-xs text-zinc-400">(max 100 caractères)</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                placeholder="Le titre apparaîtra sur la vidéo YouTube"
                className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
            </div>
          )}

          <CaptionEditor
            caption={caption}
            onChange={setCaption}
            platforms={selectedPlatforms}
          />

          <MediaUploader media={media} onChange={setMedia} />

          <HashtagsEditor
            hashtags={hashtags}
            onChange={setHashtags}
            platforms={selectedPlatforms}
            brief={caption}
          />

          <SchedulePicker value={scheduledAt} onChange={setScheduledAt} />
        </div>

        {/* Colonne droite : preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-zinc-700">Aperçu</h4>
            <span className="text-[11px] text-zinc-400">
              Mockup approximatif — l'apparence finale dépend de chaque plateforme
            </span>
          </div>
          <PostPreview
            caption={caption}
            title={title}
            media={media}
            hashtags={hashtags}
            accounts={accounts}
            selectedIds={selectedIds}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          ⚠ {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-brand hover:bg-brand-400 disabled:opacity-50 py-3 text-sm font-semibold text-white"
      >
        {submitting ? "Planification…" : "Planifier le post"}
      </button>
    </form>
  );
}
