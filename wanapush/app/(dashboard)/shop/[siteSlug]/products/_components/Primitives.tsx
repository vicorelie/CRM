"use client";

import { useRef, useState } from "react";

// Style partagé des inputs — utilisé par ProductEditor (16 occurrences) et par
// ValuesInput ci-dessous. Externalisé ici pour qu'un changement visuel ne
// nécessite pas de toucher l'éditeur principal.
export const inp =
  "w-full px-3 py-2 rounded-lg bg-white/60 border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 transition-colors";

export function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white/40 p-5 space-y-4">
      <div>
        <h2 className="font-bold text-base text-zinc-900">{title}</h2>
        {hint && <p className="text-xs text-zinc-400 mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-1.5">{label}</div>
      {children}
      {hint && <div className="text-xs text-zinc-400 mt-1">{hint}</div>}
    </label>
  );
}

export function ValuesInput({
  values,
  onChange,
  suggestions = [],
}: {
  values: string[];
  onChange: (v: string[]) => void;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);

  function flush(text: string) {
    const parts = text.split(/[,;]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const merged = [...values];
    for (const p of parts) if (!merged.includes(p)) merged.push(p);
    if (merged.length !== values.length) onChange(merged);
    setDraft("");
  }
  function addOne(v: string) {
    if (values.includes(v)) return;
    onChange([...values, v]);
    setDraft("");
  }
  function remove(v: string) {
    onChange(values.filter((x) => x !== v));
  }

  // Suggestions filtrées : valeurs catalogue non encore ajoutées qui matchent le draft.
  const filtered = suggestions
    .filter((s) => !values.includes(s))
    .filter((s) => {
      if (!draft.trim()) return true;
      return s.toLowerCase().includes(draft.toLowerCase().trim());
    });
  const showDropdown = focused && filtered.length > 0;

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 text-xs bg-emerald-50 border border-emerald-500/30 text-emerald-200 px-2 py-1 rounded-full">
            {v}
            <button onClick={() => remove(v)} className="hover:text-red-700">×</button>
          </span>
        ))}
      </div>
      <div className="relative">
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => {
              const val = e.target.value;
              if (/[,;]/.test(val)) flush(val);
              else setDraft(val);
            }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); flush(draft); } }}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              // Délai pour permettre le onClick d'une suggestion (qui blur l'input)
              setTimeout(() => { setFocused(false); flush(draft); }, 150);
            }}
            placeholder="Sépare par virgule ou Entrée — ex: S, M, L"
            className={`${inp} flex-1`}
          />
          <button
            type="button"
            onClick={() => flush(draft)}
            disabled={!draft.trim()}
            className="px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 text-white text-sm font-bold"
          >
            + Ajouter
          </button>
        </div>
        {showDropdown && (
          <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-60 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg">
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-zinc-400 border-b border-zinc-100">
              Suggestions du catalogue
            </div>
            {filtered.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); addOne(s); }}
                className="w-full text-left px-3 py-2 text-sm text-zinc-800 hover:bg-emerald-50 hover:text-emerald-700"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-[10px] text-zinc-400 mt-1.5">Astuce : tape <code className="bg-zinc-100 px-1 rounded">S, M, L</code> et appuie sur Entrée pour ajouter les 3 d&apos;un coup.</p>
    </div>
  );
}

// ─── Markdown : rendu simple (sans dépendance) ─────────────────────────
function renderMd(text: string): string {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // headings
  html = html
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>");
  // bold / italic
  html = html
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>")
    .replace(/_([^_\n]+)_/g, "<em>$1</em>");
  // links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  // bullet lists
  html = html.replace(/(?:^[-*] .+(?:\n|$))+/gm, (block) => {
    const items = block.trim().split("\n").map((l) => `<li>${l.replace(/^[-*] /, "")}</li>`).join("");
    return `<ul>${items}</ul>`;
  });
  // numbered lists
  html = html.replace(/(?:^\d+\. .+(?:\n|$))+/gm, (block) => {
    const items = block.trim().split("\n").map((l) => `<li>${l.replace(/^\d+\. /, "")}</li>`).join("");
    return `<ol>${items}</ol>`;
  });
  // paragraphs
  return html.split(/\n\n+/).map((p) => {
    const t = p.trim();
    if (!t) return "";
    if (/^<(h[1-3]|ul|ol|p|blockquote)/i.test(t)) return t;
    return `<p>${t.replace(/\n/g, "<br/>")}</p>`;
  }).join("\n");
}

export function MarkdownTextarea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  function wrap(prefix: string, suffix: string = prefix) {
    const el = taRef.current;
    if (!el) { onChange(value + prefix + suffix); return; }
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const sel = value.slice(start, end);
    const next = value.slice(0, start) + prefix + sel + suffix + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = start + prefix.length;
      el.selectionEnd = start + prefix.length + sel.length;
    });
  }

  function prefix(p: string) {
    const el = taRef.current;
    if (!el) { onChange(value + "\n" + p); return; }
    const start = el.selectionStart ?? 0;
    // Find start of current line
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const next = value.slice(0, lineStart) + p + value.slice(lineStart);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = start + p.length;
      el.selectionEnd = start + p.length;
    });
  }

  function insertLink() {
    const url = prompt("URL du lien :", "https://");
    if (!url) return;
    wrap("[", `](${url})`);
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-zinc-200 bg-white/40">
        <ToolbarBtn onClick={() => wrap("**")} title="Gras">B</ToolbarBtn>
        <ToolbarBtn onClick={() => wrap("*")} title="Italique"><span className="italic">i</span></ToolbarBtn>
        <span className="w-px h-4 bg-zinc-200 mx-1" />
        <ToolbarBtn onClick={() => prefix("## ")} title="Titre">H</ToolbarBtn>
        <ToolbarBtn onClick={() => prefix("- ")} title="Liste à puces">•</ToolbarBtn>
        <ToolbarBtn onClick={() => prefix("1. ")} title="Liste numérotée">1.</ToolbarBtn>
        <span className="w-px h-4 bg-zinc-200 mx-1" />
        <ToolbarBtn onClick={insertLink} title="Lien">🔗</ToolbarBtn>
        <div className="ml-auto flex">
          <button type="button" onClick={() => setMode("edit")} className={`px-3 py-1 text-xs rounded ${mode === "edit" ? "bg-emerald-50 text-emerald-700" : "text-zinc-500 hover:text-zinc-800"}`}>Édition</button>
          <button type="button" onClick={() => setMode("preview")} className={`px-3 py-1 text-xs rounded ${mode === "preview" ? "bg-emerald-50 text-emerald-700" : "text-zinc-500 hover:text-zinc-800"}`}>Aperçu</button>
        </div>
      </div>
      {mode === "edit" ? (
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={10}
          placeholder="Composition, taille, caractéristiques, conseils d'entretien…&#10;&#10;**gras**, *italique*, ## titre, - liste, [lien](https://...)"
          className="block w-full bg-transparent px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none resize-y min-h-[200px] leading-relaxed font-mono"
        />
      ) : (
        <div
          className="prose prose-sm prose-invert max-w-none px-3 py-2.5 min-h-[200px] text-zinc-900 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: value.trim() ? renderMd(value) : '<p class="text-zinc-400 italic">Rien à prévisualiser.</p>' }}
        />
      )}
    </div>
  );
}

function ToolbarBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="w-7 h-7 rounded text-sm font-semibold text-zinc-700 hover:bg-zinc-200/60 hover:text-zinc-900 inline-flex items-center justify-center"
    >
      {children}
    </button>
  );
}
