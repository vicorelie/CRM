"use client";

import { useState } from "react";

type Initial = {
  name: string;
  description: string;
  currency: string;
  locale: string;
  timezone: string;
  weightUnit: string;
  email: string;
  phone: string;
  legalName: string;
  legalAddress: string;
  vatNumber: string;
  logoUrl: string;
  stripeMode: string;
  stripeAccountId: string;
  stripePublishableKey: string;
  hasStripeSecret: boolean;
  hasStripeWebhook: boolean;
  paypalMode: string;
  paypalClientId: string;
  hasPaypalSecret: boolean;
  fromEmail: string;
  fromName: string;
  taxesIncluded: boolean;
  requireShipping: boolean;
  allowGuestCheckout: boolean;
};

const TABS = [
  { id: "general", label: "Général" },
  { id: "payments", label: "Paiements" },
  { id: "emails", label: "Emails" },
  { id: "checkout", label: "Checkout" },
  { id: "legal", label: "Légal" },
] as const;

export function SettingsClient({ siteSlug, initial }: { siteSlug: string; initial: Initial }) {
  const [tab, setTab] = useState<typeof TABS[number]["id"]>("general");
  const [state, setState] = useState(initial);
  const [stripeSecret, setStripeSecret] = useState("");
  const [stripeWebhook, setStripeWebhook] = useState("");
  const [paypalSecret, setPaypalSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof Initial>(key: K, value: Initial[K]) {
    setState({ ...state, [key]: value });
    setSaved(false);
  }

  async function save() {
    setSaving(true); setError(null); setSaved(false);
    try {
      const payload: Record<string, unknown> = {
        name: state.name,
        description: state.description,
        currency: state.currency,
        locale: state.locale,
        timezone: state.timezone,
        weightUnit: state.weightUnit,
        email: state.email,
        phone: state.phone,
        legalName: state.legalName,
        legalAddress: state.legalAddress,
        vatNumber: state.vatNumber,
        logoUrl: state.logoUrl,
        stripeMode: state.stripeMode,
        stripeAccountId: state.stripeAccountId,
        stripePublishableKey: state.stripePublishableKey,
        paypalMode: state.paypalMode,
        paypalClientId: state.paypalClientId,
        fromEmail: state.fromEmail,
        fromName: state.fromName,
        taxesIncluded: state.taxesIncluded,
        requireShipping: state.requireShipping,
        allowGuestCheckout: state.allowGuestCheckout,
      };
      if (stripeSecret) payload.stripeSecretKey = stripeSecret;
      if (stripeWebhook) payload.stripeWebhookSecret = stripeWebhook;
      if (paypalSecret) payload.paypalSecret = paypalSecret;

      const res = await fetch(`/api/shop/${siteSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? "Erreur"); return; }
      setSaved(true);
      // Met à jour les "has*" si on a posté un secret
      if (stripeSecret) { setState((s) => ({ ...s, hasStripeSecret: true })); setStripeSecret(""); }
      if (stripeWebhook) { setState((s) => ({ ...s, hasStripeWebhook: true })); setStripeWebhook(""); }
      if (paypalSecret) { setState((s) => ({ ...s, hasPaypalSecret: true })); setPaypalSecret(""); }
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-500/30 text-emerald-700 text-xs font-medium uppercase tracking-widest">
            Configuration
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-sm text-emerald-700">✓ Enregistré</span>}
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold text-sm"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">⚠ {error}</div>
      )}

      <div className="flex gap-1 border-b border-zinc-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id ? "border-emerald-500 text-emerald-700" : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "general" && (
        <Card>
          <Field label="Nom de la boutique">
            <input className={inp} value={state.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Description publique">
            <textarea className={`${inp} resize-y min-h-[80px]`} rows={3} value={state.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Devise">
              <select className={inp} value={state.currency} onChange={(e) => set("currency", e.target.value)}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Locale">
              <select className={inp} value={state.locale} onChange={(e) => set("locale", e.target.value)}>
                {LOCALES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="Unité de poids">
              <select className={inp} value={state.weightUnit} onChange={(e) => set("weightUnit", e.target.value)}>
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="lb">lb</option>
                <option value="oz">oz</option>
              </select>
            </Field>
          </div>
          <Field label="Logo (URL)">
            <input className={inp} type="url" value={state.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} placeholder="https://..." />
          </Field>
        </Card>
      )}

      {tab === "payments" && (
        <>
          <Card title="Stripe" hint="Pour encaisser des paiements. Crée un compte sur stripe.com et copie tes clés API ici.">
            <Field label="Mode">
              <select className={inp} value={state.stripeMode} onChange={(e) => set("stripeMode", e.target.value)}>
                <option value="test">Test (sandbox)</option>
                <option value="live">Production (live)</option>
              </select>
            </Field>
            <Field label="Publishable Key (pk_...)" hint="Visible côté client. Pas sensible.">
              <input className={inp} value={state.stripePublishableKey} onChange={(e) => set("stripePublishableKey", e.target.value)} placeholder="pk_test_..." />
            </Field>
            <Field label="Secret Key (sk_...)" hint={state.hasStripeSecret ? "✓ Clé déjà enregistrée. Laisser vide pour conserver." : "Chiffrée AES-256-GCM en BDD."}>
              <input type="password" className={inp} value={stripeSecret} onChange={(e) => setStripeSecret(e.target.value)} placeholder={state.hasStripeSecret ? "•••••••• (déjà défini)" : "sk_test_..."} />
            </Field>
            <WebhookUrlCopy siteSlug={siteSlug} />
            <Field label="Webhook Signing Secret (whsec_...)" hint={state.hasStripeWebhook ? "✓ Déjà défini." : "Copié depuis Stripe Dashboard > Webhooks > [Reveal signing secret]."}>
              <input type="password" className={inp} value={stripeWebhook} onChange={(e) => setStripeWebhook(e.target.value)} placeholder={state.hasStripeWebhook ? "•••••••• (déjà défini)" : "whsec_..."} />
            </Field>
            <Field label="Stripe Account ID (optionnel)" hint="Pour Stripe Connect, plateformes multi-vendeurs.">
              <input className={inp} value={state.stripeAccountId} onChange={(e) => set("stripeAccountId", e.target.value)} placeholder="acct_..." />
            </Field>
          </Card>

          <Card title="PayPal" hint="Configuration optionnelle pour PayPal en deuxième méthode de paiement.">
            <Field label="Mode">
              <select className={inp} value={state.paypalMode} onChange={(e) => set("paypalMode", e.target.value)}>
                <option value="sandbox">Sandbox (test)</option>
                <option value="live">Production</option>
              </select>
            </Field>
            <Field label="Client ID">
              <input className={inp} value={state.paypalClientId} onChange={(e) => set("paypalClientId", e.target.value)} />
            </Field>
            <Field label="Secret" hint={state.hasPaypalSecret ? "✓ Déjà défini." : "Chiffré en BDD."}>
              <input type="password" className={inp} value={paypalSecret} onChange={(e) => setPaypalSecret(e.target.value)} placeholder={state.hasPaypalSecret ? "•••••••• (déjà défini)" : ""} />
            </Field>
          </Card>
        </>
      )}

      {tab === "emails" && (
        <Card title="Adresse d'envoi" hint="Apparaît dans les emails de confirmation de commande.">
          <Field label="Email expéditeur">
            <input type="email" className={inp} value={state.fromEmail} onChange={(e) => set("fromEmail", e.target.value)} placeholder="contact@maboutique.com" />
          </Field>
          <Field label="Nom expéditeur">
            <input className={inp} value={state.fromName} onChange={(e) => set("fromName", e.target.value)} placeholder="Ma Boutique" />
          </Field>
        </Card>
      )}

      {tab === "checkout" && (
        <Card title="Comportement du checkout">
          <Toggle label="Prix TTC affichés" hint="Si activé, les prix incluent déjà la TVA." checked={state.taxesIncluded} onChange={(v) => set("taxesIncluded", v)} />
          <Toggle label="Livraison requise" hint="Désactive pour les produits 100% numériques sans expédition." checked={state.requireShipping} onChange={(v) => set("requireShipping", v)} />
          <Toggle label="Autoriser le checkout invité" hint="Sans création de compte. Recommandé pour conversion." checked={state.allowGuestCheckout} onChange={(v) => set("allowGuestCheckout", v)} />
        </Card>
      )}

      {tab === "legal" && (
        <Card title="Informations légales" hint="Apparaissent sur les factures et les emails. Obligatoires en France.">
          <Field label="Raison sociale">
            <input className={inp} value={state.legalName} onChange={(e) => set("legalName", e.target.value)} placeholder="SARL Ma Boutique" />
          </Field>
          <Field label="Adresse légale">
            <textarea className={`${inp} resize-y min-h-[80px]`} rows={3} value={state.legalAddress} onChange={(e) => set("legalAddress", e.target.value)} />
          </Field>
          <Field label="N° TVA / SIRET">
            <input className={inp} value={state.vatNumber} onChange={(e) => set("vatNumber", e.target.value)} placeholder="FR12345678901" />
          </Field>
          <Field label="Email contact">
            <input type="email" className={inp} value={state.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Téléphone">
            <input className={inp} value={state.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
        </Card>
      )}
    </div>
  );
}

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "CAD", "AUD", "JPY"];
const LOCALES = ["fr-FR", "en-US", "en-GB", "es-ES", "de-DE", "it-IT", "pt-PT", "nl-NL"];

const inp = "w-full px-3 py-2 rounded-lg bg-white border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 transition-colors";

function Card({ title, hint, children }: { title?: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white/40 p-5 space-y-4">
      {title && (
        <div>
          <h2 className="font-bold text-base text-zinc-900">{title}</h2>
          {hint && <p className="text-xs text-zinc-400 mt-0.5">{hint}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-1.5">{label}</div>
      {children}
      {hint && <div className="text-xs text-zinc-400 mt-1">{hint}</div>}
    </label>
  );
}

function WebhookUrlCopy({ siteSlug }: { siteSlug: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${typeof window !== "undefined" ? window.location.origin : "https://wanatest.com"}/api/webhooks/stripe/${siteSlug}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }
  return (
    <div className="rounded-lg bg-brand/10 border border-brand/30 p-3 space-y-2">
      <div className="text-xs font-semibold text-brand-700 uppercase tracking-widest">URL Webhook à coller dans Stripe</div>
      <div className="flex gap-2">
        <code className="flex-1 px-3 py-2 rounded bg-white border border-zinc-200 text-[11px] font-mono text-zinc-800 break-all">{url}</code>
        <button onClick={copy} className="px-3 py-2 rounded bg-brand hover:bg-brand-400 text-white text-xs font-semibold whitespace-nowrap">
          {copied ? "✓ Copié" : "Copier"}
        </button>
      </div>
      <p className="text-[11px] text-brand-200/80">
        Crée un endpoint dans <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noreferrer" className="underline">Stripe Dashboard → Webhooks</a> avec cette URL.
        Active les événements <code className="text-brand-700">checkout.session.completed</code>, <code className="text-brand-700">payment_intent.payment_failed</code>, <code className="text-brand-700">charge.refunded</code>.
        Puis copie le « Signing secret » ci-dessous.
      </p>
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer py-2">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5 ${checked ? "bg-emerald-500" : "bg-zinc-200"}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${checked ? "translate-x-4.5 left-1" : "left-0.5"}`} style={{ transform: checked ? "translateX(16px)" : "translateX(0)" }} />
      </button>
      <div>
        <div className="text-sm text-zinc-800">{label}</div>
        {hint && <div className="text-xs text-zinc-400">{hint}</div>}
      </div>
    </label>
  );
}
