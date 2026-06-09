"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
  toolCalls?: Array<{ name: string }>;
};

const SUGGESTIONS = [
  "Pourquoi mon ROAS a chuté cette semaine ?",
  "Quels sont mes top 3 leads HOT actuels ?",
  "Comment scaler de 1k à 5k€ MRR en 90 jours ?",
  "Fais ma revue hebdo founder",
];

type Props = {
  /** Nombre d'anomalies CRITICAL — affichées en badge rouge sur le bouton flottant */
  criticalCount?: number;
};

export function CopilotDrawer({ criticalCount = 0 }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Écouter l'event custom du Cockpit (click sur card)
  useEffect(() => {
    function handleOpen() { setOpen(true); }
    window.addEventListener("wp:open-copilot", handleOpen);
    return () => window.removeEventListener("wp:open-copilot", handleOpen);
  }, []);

  // Scroll bottom à chaque nouveau message
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Esc to close
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", handleEsc);
      return () => document.removeEventListener("keydown", handleEsc);
    }
  }, [open]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: question }]);
    setLoading(true);
    try {
      const res = await fetch("/api/copilot/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, conversationId }),
      });
      const data = await res.json();
      if (res.ok) {
        setConversationId(data.conversationId);
        setMessages((m) => [
          ...m,
          { role: "assistant", content: data.reply, toolCalls: data.toolCalls },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: `Erreur : ${data.error ?? "inconnue"}` },
        ]);
      }
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Erreur réseau : ${e instanceof Error ? e.message : "?"}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Bouton flottant (toujours visible) avec badge anomalies CRITICAL */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-700 text-2xl text-white shadow-lg transition-all hover:scale-110 hover:bg-brand-800 ${open ? "scale-0 opacity-0" : ""}`}
        aria-label={
          criticalCount > 0
            ? `Ouvrir le Copilot IA — ${criticalCount} alerte${criticalCount > 1 ? "s" : ""} critique${criticalCount > 1 ? "s" : ""}`
            : "Ouvrir le Copilot IA"
        }
      >
        🤖
        {criticalCount > 0 && (
          <span
            className="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-bold text-white ring-2 ring-white animate-pulse"
            aria-hidden
          >
            {criticalCount}
          </span>
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Drawer (right side) */}
      <aside
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-md bg-white shadow-2xl transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
        aria-hidden={!open}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <header className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden>🤖</span>
              <div>
                <h2 className="text-sm font-semibold text-zinc-950">WanaPush Copilot</h2>
                <p className="text-xs text-zinc-500">
                  Exploite tes vraies données business
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
              aria-label="Fermer"
            >
              ✕
            </button>
          </header>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-zinc-600">
                  Pose-moi une question sur ton business. Je vais chercher dans tes vraies
                  données.
                </p>
                <div className="grid gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-left text-sm text-zinc-700 transition-colors hover:border-brand-300 hover:bg-brand-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((m, i) => (
                  <MessageBubble key={i} message={m} />
                ))}
                {loading && (
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <span className="inline-flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500" style={{ animationDelay: "300ms" }} />
                    </span>
                    Je consulte tes données…
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t border-zinc-200 p-4"
          >
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Pose une question…"
                rows={1}
                disabled={loading}
                className="flex-1 resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-800 disabled:opacity-50"
              >
                Envoyer
              </button>
            </div>
            <p className="mt-2 text-[11px] text-zinc-500">
              Enter pour envoyer · Shift+Enter pour saut de ligne · Esc pour fermer
            </p>
          </form>
        </div>
      </aside>
    </>
  );
}

// ─── Message bubble ────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? "bg-brand-700 text-white"
            : "bg-zinc-50 text-zinc-900 ring-1 ring-zinc-200"
        }`}
      >
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {message.toolCalls.map((t, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-md bg-white/80 px-1.5 py-0.5 text-[10px] font-mono text-zinc-600 ring-1 ring-zinc-200"
              >
                <span aria-hidden>⚡</span>
                {t.name}
              </span>
            ))}
          </div>
        )}
        <div className="prose-sm whitespace-pre-wrap leading-relaxed">
          {message.content}
        </div>
      </div>
    </div>
  );
}
