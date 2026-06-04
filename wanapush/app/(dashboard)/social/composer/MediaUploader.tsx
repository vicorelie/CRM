"use client";

import { useRef, useState } from "react";
import type { Media } from "./types";

type Props = {
  media: Media[];
  onChange: (media: Media[]) => void;
};

export function MediaUploader({ media, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiSize, setAiSize] = useState<"1024x1024" | "1024x1792" | "1792x1024">("1024x1024");
  const [aiBusy, setAiBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/social/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Upload échoué");
      onChange([...media, { url: j.url, type: j.type }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur upload");
    } finally {
      setUploading(false);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const f of Array.from(files)) {
      await uploadFile(f);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  async function generateAi() {
    if (aiPrompt.trim().length < 3) {
      setError("Prompt trop court");
      return;
    }
    setError(null);
    setAiBusy(true);
    try {
      const r = await fetch("/api/social/ai-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, size: aiSize }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Erreur IA");
      onChange([...media, { url: j.url, type: "image" }]);
      setAiPrompt("");
      setAiOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur IA");
    } finally {
      setAiBusy(false);
    }
  }

  function remove(i: number) {
    onChange(media.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-700">Médias</label>
        <span className="text-xs text-zinc-400">
          {media.length} fichier{media.length > 1 ? "s" : ""} (max 10)
        </span>
      </div>

      {/* Zone upload + drag-drop */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="rounded-xl border-2 border-dashed border-zinc-200 bg-white/40 p-6 text-center hover:border-brand-400 transition-colors"
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="space-y-2">
          <div className="text-3xl">📁</div>
          <p className="text-sm text-zinc-500">
            Glisse-dépose des images/vidéos ici, ou
          </p>
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || media.length >= 10}
              className="rounded-lg bg-brand hover:bg-brand-400 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white"
            >
              {uploading ? "Upload…" : "+ Choisir des fichiers"}
            </button>
            <button
              type="button"
              onClick={() => setAiOpen((v) => !v)}
              disabled={media.length >= 10}
              className="rounded-lg bg-brand-500 hover:bg-brand-400 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white"
            >
              ✨ {aiOpen ? "Fermer" : "Générer image IA"}
            </button>
          </div>
          <p className="text-[11px] text-zinc-400 pt-1">
            JPG, PNG, WEBP, GIF, MP4, MOV, WEBM · Max 100MB par fichier
          </p>
        </div>
      </div>

      {/* Bloc IA image */}
      {aiOpen && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 space-y-3">
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            rows={3}
            placeholder="Décris l'image : 'Un café latte sur une table en bois en lumière naturelle, vue du dessus, style minimaliste'"
            className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-brand-500 focus:outline-none"
          />
          <div className="flex items-center gap-3">
            <select
              value={aiSize}
              onChange={(e) => setAiSize(e.target.value as typeof aiSize)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs"
            >
              <option value="1024x1024">Carré 1:1 (Instagram, FB)</option>
              <option value="1024x1792">Vertical 9:16 (Story, Reels, TikTok)</option>
              <option value="1792x1024">Horizontal 16:9 (YouTube)</option>
            </select>
            <button
              type="button"
              onClick={generateAi}
              disabled={aiBusy}
              className="ml-auto rounded-lg bg-brand-500 hover:bg-brand-400 disabled:opacity-50 px-4 py-1.5 text-xs font-semibold text-white"
            >
              {aiBusy ? "Génération… (15-30s)" : "Générer (DALL-E 3)"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          ⚠ {error}
        </div>
      )}

      {/* Galerie */}
      {media.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {media.map((m, i) => (
            <div
              key={i}
              className="relative group rounded-lg overflow-hidden border border-zinc-200 aspect-square bg-white"
            >
              {m.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                  <div className="text-3xl">🎬</div>
                  <div className="text-[10px] mt-1">Vidéo</div>
                </div>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 hover:bg-red-600 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                title="Retirer"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
