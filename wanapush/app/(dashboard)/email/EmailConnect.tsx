"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EmailConnect() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    setError(null);
    if (apiKey.trim().length < 10) {
      setError("Colle ta clé API Brevo (commence par « xkeysib- »).");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/email/providers/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "brevo", apiKey: apiKey.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Connexion impossible.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Erreur réseau.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-brand-700">Email marketing</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">✉️ Connecte ta plateforme email</h1>
        <p className="mt-1 text-sm text-zinc-600">
          WanaPush s&apos;appuie sur <strong>Brevo</strong> (ex-Sendinblue), une plateforme d&apos;emailing pro :
          délivrabilité optimale, éditeur, automatisations. WanaPush devient le cerveau au-dessus — il synchronise
          tes audiences et l&apos;auto-pilote rédige tes campagnes.
        </p>
      </header>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B996E]/10 text-lg">🟢</div>
          <div>
            <div className="font-semibold text-zinc-950">Brevo</div>
            <div className="text-xs text-zinc-500">Connexion par clé API — ~30 secondes.</div>
          </div>
        </div>

        <ol className="space-y-2 rounded-xl bg-sky-50 p-4 text-sm text-sky-900">
          <li className="font-semibold">📍 Où trouver ta clé API Brevo</li>
          <li>
            1. Ouvre{" "}
            <a
              href="https://app.brevo.com/settings/keys/api"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline"
            >
              app.brevo.com → Paramètres → Clés API (SMTP &amp; API)
            </a>
          </li>
          <li>2. Clique sur « Générer une nouvelle clé API », donne-lui un nom (ex: WanaPush)</li>
          <li>3. Copie la clé (elle commence par <code className="rounded bg-white px-1">xkeysib-</code>) et colle-la ci-dessous</li>
          <li className="text-xs text-sky-700">Pas encore de compte ? <a href="https://www.brevo.com/fr/" target="_blank" rel="noopener noreferrer" className="underline">Créer un compte Brevo gratuit</a> (jusqu&apos;à 300 emails/jour offerts).</li>
        </ol>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-zinc-600">Clé API Brevo</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="xkeysib-..."
            autoComplete="off"
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 font-mono text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={connect}
              disabled={busy}
              className="rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
            >
              {busy ? "Connexion…" : "Connecter Brevo →"}
            </button>
            {error && <span className="text-xs text-rose-600">{error}</span>}
          </div>
          <p className="text-xs text-zinc-400">
            🔒 Ta clé est chiffrée (AES-256-GCM) et n&apos;est jamais réaffichée. Tu peux la révoquer à tout moment
            depuis Brevo.
          </p>
        </div>
      </div>
    </div>
  );
}
