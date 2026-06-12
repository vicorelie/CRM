"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProviderList, ProviderSender, ProviderCampaign } from "@/lib/email-providers";

const CAMPAIGN_STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Brouillon", cls: "bg-zinc-100 text-zinc-600" },
  sent: { label: "Envoyée", cls: "bg-emerald-100 text-emerald-700" },
  queued: { label: "En file", cls: "bg-amber-100 text-amber-700" },
  inProcess: { label: "Envoi en cours", cls: "bg-sky-100 text-sky-700" },
  suspended: { label: "Suspendue", cls: "bg-rose-100 text-rose-700" },
};

export function EmailDashboard({
  providerLabel,
  accountEmail,
  accountName,
  plan,
  replyTo,
  lists,
  senders,
  campaigns,
  providerError,
}: {
  providerLabel: string;
  accountEmail: string | null;
  accountName: string | null;
  plan: string | null;
  replyTo: string;
  lists: ProviderList[];
  senders: ProviderSender[];
  campaigns: ProviderCampaign[];
  providerError: string | null;
}) {
  const router = useRouter();
  const totalSubs = lists.reduce((s, l) => s + l.totalSubscribers, 0);
  const sentCount = campaigns.filter((c) => c.status === "sent").length;

  async function disconnect() {
    if (!confirm("Déconnecter Brevo ? Ta clé sera supprimée de WanaPush (pas de ton compte Brevo).")) return;
    await fetch("/api/email/providers", { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-brand-700">Email marketing</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">✉️ Tes campagnes email</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-zinc-600">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              ✓ {providerLabel} connecté
            </span>
            {accountEmail && <span className="text-zinc-500">{accountName ?? accountEmail}</span>}
            {plan && <span className="text-zinc-400">· plan {plan}</span>}
          </p>
        </div>
        <button onClick={disconnect} className="shrink-0 text-xs text-zinc-400 underline hover:text-zinc-600">
          Déconnecter
        </button>
      </header>

      {providerError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          ⚠ {providerError}{" "}
          <a href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noopener noreferrer" className="font-medium underline">
            Régénère ta clé
          </a>{" "}
          puis reconnecte-la (bouton Déconnecter ci-dessus).
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Audiences (listes)" value={lists.length} />
        <Stat label="Abonnés (total)" value={totalSubs} />
        <Stat label="Campagnes envoyées" value={sentCount} />
      </div>

      {/* Compose via Brevo */}
      <Composer router={router} lists={lists} senders={senders} replyTo={replyTo} />

      {/* Audiences */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-800">Tes audiences Brevo</h2>
          <a href="https://app.brevo.com/contact/list-listing" target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-brand-700 hover:text-brand-800">
            Gérer dans Brevo →
          </a>
        </div>
        {lists.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-5 text-sm text-zinc-500">
            Aucune liste de contacts dans Brevo pour l&apos;instant.{" "}
            <a href="https://app.brevo.com/contact/list-listing" target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 underline">
              Crée une liste &amp; importe tes contacts
            </a>
            . (Bientôt : WanaPush synchronisera automatiquement tes leads et clients boutique.)
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
            {lists.map((l) => (
              <li key={l.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-medium text-zinc-900">{l.name}</span>
                <span className="text-zinc-500">{l.totalSubscribers} abonné{l.totalSubscribers > 1 ? "s" : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Campagnes récentes */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-800">Campagnes récentes</h2>
        {campaigns.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-5 text-sm text-zinc-500">
            Aucune campagne. Compose ta première newsletter ci-dessus.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
            {campaigns.map((c) => {
              const st = CAMPAIGN_STATUS[c.status] ?? { label: c.status, cls: "bg-zinc-100 text-zinc-600" };
              return (
                <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-zinc-900">{c.subject || c.name}</div>
                    {c.subject && c.name !== c.subject && <div className="truncate text-xs text-zinc-500">{c.name}</div>}
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-zinc-500">
                    {c.stats?.sent != null && <span>{c.stats.sent} envoyés</span>}
                    {c.stats?.opens != null && <span>{c.stats.opens} ouverts</span>}
                    {c.stats?.clicks != null && <span>{c.stats.clicks} clics</span>}
                    <span className={`rounded-full px-2 py-0.5 font-medium ${st.cls}`}>{st.label}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="text-2xl font-bold text-zinc-950">{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  );
}

function Composer({
  router,
  lists,
  senders,
  replyTo,
}: {
  router: ReturnType<typeof useRouter>;
  lists: ProviderList[];
  senders: ProviderSender[];
  replyTo: string;
}) {
  const activeSenders = senders.filter((s) => s.active);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [senderIdx, setSenderIdx] = useState(0);
  const [selectedLists, setSelectedLists] = useState<number[]>([]);
  const [busy, setBusy] = useState<null | "draft" | "send">(null);
  const [msg, setMsg] = useState<string | null>(null);

  const canCompose = activeSenders.length > 0 && lists.length > 0;

  function toggleList(id: number) {
    setSelectedLists((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit(send: boolean) {
    setMsg(null);
    const sender = activeSenders[senderIdx];
    if (!subject.trim() || !body.trim()) return setMsg("Sujet et contenu requis.");
    if (!sender) return setMsg("Choisis un expéditeur.");
    if (selectedLists.length === 0) return setMsg("Sélectionne au moins une audience.");
    setBusy(send ? "send" : "draft");
    try {
      const res = await fetch("/api/email/providers/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          fromName: sender.name,
          fromEmail: sender.email,
          replyTo,
          bodyMarkdown: body,
          listIds: selectedLists,
          send,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(json.error ?? "Échec.");
      } else if (send) {
        setMsg("✓ Campagne envoyée via Brevo.");
        setSubject("");
        setBody("");
        setSelectedLists([]);
        router.refresh();
      } else {
        setMsg("✓ Brouillon créé dans Brevo (tu peux le finaliser là-bas).");
        router.refresh();
      }
    } catch {
      setMsg("Erreur réseau.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-900">Composer une campagne</h2>

      {!canCompose && (
        <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {activeSenders.length === 0 && (
            <>
              Ajoute d&apos;abord un{" "}
              <a href="https://app.brevo.com/senders" target="_blank" rel="noopener noreferrer" className="font-medium underline">
                expéditeur vérifié dans Brevo
              </a>
              .{" "}
            </>
          )}
          {lists.length === 0 && (
            <>
              Crée une{" "}
              <a href="https://app.brevo.com/contact/list-listing" target="_blank" rel="noopener noreferrer" className="font-medium underline">
                liste de contacts dans Brevo
              </a>
              .
            </>
          )}
        </div>
      )}

      <div className={`mt-4 space-y-3 ${!canCompose ? "pointer-events-none opacity-50" : ""}`}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Expéditeur (vérifié Brevo)">
            <select
              value={senderIdx}
              onChange={(e) => setSenderIdx(Number(e.target.value))}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {activeSenders.length === 0 ? (
                <option>Aucun expéditeur vérifié</option>
              ) : (
                activeSenders.map((s, i) => (
                  <option key={s.id} value={i}>
                    {s.name} &lt;{s.email}&gt;
                  </option>
                ))
              )}
            </select>
          </Field>
          <Field label="Sujet">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Nos nouveautés 🎉"
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Field>
        </div>

        <Field label="Audiences destinataires">
          <div className="flex flex-wrap gap-2">
            {lists.map((l) => {
              const on = selectedLists.includes(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => toggleList(l.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    on ? "border-brand-600 bg-brand-50 text-brand-700" : "border-zinc-300 text-zinc-600 hover:border-zinc-400"
                  }`}
                >
                  {on ? "✓ " : ""}
                  {l.name} ({l.totalSubscribers})
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Contenu (Markdown supporté)">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            placeholder={"# Bonjour 👋\n\nVoici nos actualités…\n\n[Voir l'offre](https://…)"}
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 font-mono text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </Field>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => submit(true)}
            disabled={busy !== null || !canCompose}
            className="rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
          >
            {busy === "send" ? "Envoi…" : "Créer et envoyer"}
          </button>
          <button
            type="button"
            onClick={() => submit(false)}
            disabled={busy !== null || !canCompose}
            className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {busy === "draft" ? "Création…" : "Créer un brouillon dans Brevo"}
          </button>
          {msg && <span className="text-xs text-zinc-600">{msg}</span>}
        </div>
        <p className="text-xs text-zinc-400">
          Envoyé via Brevo (délivrabilité pro, désinscription &amp; List-Unsubscribe gérés par Brevo). Les réponses
          arrivent sur l&apos;expéditeur choisi.
        </p>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-600">{label}</span>
      {children}
    </label>
  );
}
