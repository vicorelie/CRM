"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Campaign = {
  id: string;
  name: string;
  subject: string;
  status: string;
  sentAt: string | null;
  stats: Record<string, number> | null;
  createdAt: string;
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Brouillon", cls: "bg-zinc-100 text-zinc-600" },
  SCHEDULED: { label: "Programmée", cls: "bg-amber-100 text-amber-700" },
  SENDING: { label: "Envoi en cours", cls: "bg-sky-100 text-sky-700" },
  SENT: { label: "Envoyée", cls: "bg-emerald-100 text-emerald-700" },
  FAILED: { label: "Échec", cls: "bg-rose-100 text-rose-700" },
};

export function EmailClient({
  activeContacts,
  totalContacts,
  sentCampaigns,
  defaultFromName,
  defaultFromEmail,
  replyTo,
  campaigns,
}: {
  activeContacts: number;
  totalContacts: number;
  sentCampaigns: number;
  defaultFromName: string;
  defaultFromEmail: string;
  replyTo: string;
  campaigns: Campaign[];
}) {
  const router = useRouter();
  const noContacts = totalContacts === 0;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-brand-700">Email marketing</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">✉️ Tes newsletters</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Importe tes contacts, écris ta newsletter, on l&apos;envoie — désinscription &amp; conformité RGPD gérées automatiquement.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Contacts actifs" value={activeContacts} />
        <Stat label="Contacts totaux" value={totalContacts} />
        <Stat label="Campagnes envoyées" value={sentCampaigns} />
      </div>

      {/* Étape 1 — contacts (mise en avant si vide) */}
      <ImportContacts router={router} highlight={noContacts} />

      {/* Étape 2 — composer */}
      <Composer
        router={router}
        defaultFromName={defaultFromName}
        defaultFromEmail={defaultFromEmail}
        replyTo={replyTo}
        disabled={noContacts}
      />

      {/* Historique */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-800">Campagnes récentes</h2>
        {campaigns.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-5 text-sm text-zinc-500">
            Aucune campagne pour l&apos;instant. Compose ta première newsletter ci-dessus.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
            {campaigns.map((c) => {
              const st = STATUS_LABEL[c.status] ?? { label: c.status, cls: "bg-zinc-100 text-zinc-600" };
              const sent = c.stats?.sent ?? c.stats?.recipients;
              const opens = c.stats?.opened;
              return (
                <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-zinc-900">{c.subject}</div>
                    <div className="truncate text-xs text-zinc-500">{c.name}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-zinc-500">
                    {typeof sent === "number" && <span>{sent} envoyés</span>}
                    {typeof opens === "number" && <span>{opens} ouverts</span>}
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

function ImportContacts({ router, highlight }: { router: ReturnType<typeof useRouter>; highlight: boolean }) {
  const [open, setOpen] = useState(highlight);
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    const emails = Array.from(
      new Set(
        raw
          .split(/[\s,;]+/)
          .map((e) => e.trim().toLowerCase())
          .filter((e) => /.+@.+\..+/.test(e)),
      ),
    );
    if (emails.length === 0) {
      setMsg("Aucune adresse email valide détectée.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/email/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts: emails.map((email) => ({ email })) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(json.error ?? "Échec de l'import.");
      } else {
        setMsg(`✓ ${emails.length} contact${emails.length > 1 ? "s" : ""} importé${emails.length > 1 ? "s" : ""}.`);
        setRaw("");
        router.refresh();
      }
    } catch {
      setMsg("Erreur réseau.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={`rounded-2xl border p-5 ${highlight ? "border-brand-300 bg-brand-50" : "border-zinc-200 bg-white"}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-semibold text-zinc-900">
          {highlight ? "👋 Commence par importer tes contacts" : "Importer des contacts"}
        </span>
        <span className="text-xs text-zinc-400">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-zinc-500">
            Colle tes adresses email (une par ligne, ou séparées par des virgules). Seuls les contacts ayant consenti
            doivent être ajoutés — chaque email inclut un lien de désinscription automatique.
          </p>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={5}
            placeholder={"client1@exemple.com\nclient2@exemple.com"}
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
            >
              {busy ? "Import…" : "Importer"}
            </button>
            {msg && <span className="text-xs text-zinc-600">{msg}</span>}
          </div>
        </div>
      )}
    </section>
  );
}

function Composer({
  router,
  defaultFromName,
  defaultFromEmail,
  replyTo,
  disabled,
}: {
  router: ReturnType<typeof useRouter>;
  defaultFromName: string;
  defaultFromEmail: string;
  replyTo: string;
  disabled: boolean;
}) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [fromName, setFromName] = useState(defaultFromName);
  const [fromEmail, setFromEmail] = useState(defaultFromEmail);
  const [customDomain, setCustomDomain] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function createAndSend() {
    setMsg(null);
    if (!subject.trim() || !fromEmail.trim() || !body.trim()) {
      setMsg("Sujet, expéditeur et contenu sont requis.");
      return;
    }
    setBusy(true);
    try {
      // 1) Créer la campagne (DRAFT)
      const createRes = await fetch("/api/email/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || subject.trim().slice(0, 80),
          subject: subject.trim(),
          fromName: fromName.trim() || "WanaPush",
          fromEmail: (fromEmail.trim() || defaultFromEmail).toLowerCase(),
          replyTo,
          bodyMarkdown: body,
        }),
      });
      const created = await createRes.json().catch(() => ({}));
      if (!createRes.ok) {
        setMsg(created.error ?? "Échec de la création.");
        setBusy(false);
        return;
      }
      const id = created.campaign?.id ?? created.id;
      if (!id) {
        setMsg("Campagne créée mais identifiant introuvable.");
        setBusy(false);
        return;
      }
      // 2) Envoyer
      const sendRes = await fetch(`/api/email/campaigns/${id}/send`, { method: "POST" });
      const sent = await sendRes.json().catch(() => ({}));
      if (!sendRes.ok) {
        setMsg(`Campagne créée (brouillon) mais envoi échoué : ${sent.error ?? "erreur"}.`);
      } else {
        setMsg(`✓ Newsletter envoyée à ${sent.recipients ?? "tes"} contact(s).`);
        setName("");
        setSubject("");
        setBody("");
        router.refresh();
      }
    } catch {
      setMsg("Erreur réseau.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-900">Composer une newsletter</h2>
      {disabled && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Importe d&apos;abord au moins un contact pour pouvoir envoyer.
        </p>
      )}
      <div className="mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nom de l'expéditeur">
            <input
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Field>
          <Field label="Email expéditeur">
            {!customDomain ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <span className="truncate text-sm text-emerald-900">
                  ✓ <strong>{defaultFromEmail}</strong>
                  <span className="ml-1 text-xs text-emerald-700">(domaine vérifié, prêt)</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCustomDomain(true);
                    setFromEmail("");
                  }}
                  className="shrink-0 text-xs font-medium text-emerald-700 underline hover:text-emerald-900"
                >
                  Utiliser mon domaine
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <input
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  placeholder="contact@tondomaine.com"
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCustomDomain(false);
                    setFromEmail(defaultFromEmail);
                  }}
                  className="text-xs text-zinc-500 underline hover:text-zinc-700"
                >
                  ← Revenir à l&apos;adresse WanaPush (recommandé)
                </button>
              </div>
            )}
          </Field>
        </div>
        <Field label="Sujet">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Nos nouveautés du mois 🎉"
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </Field>
        <Field label="Nom interne (optionnel)">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Newsletter juin"
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
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
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={createAndSend}
            disabled={busy || disabled}
            className="rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
          >
            {busy ? "Envoi…" : "Créer et envoyer"}
          </button>
          {msg && <span className="text-xs text-zinc-600">{msg}</span>}
        </div>
        <p className="text-xs text-zinc-400">
          Envoyé depuis le domaine vérifié WanaPush (délivrabilité optimale, SPF/DKIM gérés) — les réponses arrivent
          sur <strong>{replyTo}</strong>. Un lien de désinscription conforme RFC 8058 est ajouté automatiquement.
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
