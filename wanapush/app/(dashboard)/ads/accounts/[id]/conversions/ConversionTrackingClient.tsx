"use client";

import { useCallback, useEffect, useState } from "react";

type Category =
  | "PURCHASE"
  | "LEAD"
  | "SIGN_UP"
  | "BOOK_APPOINTMENT"
  | "REQUEST_QUOTE"
  | "GET_DIRECTIONS"
  | "OUTBOUND_CLICK"
  | "CONTACT"
  | "PAGE_VIEW"
  | "DEFAULT";

type Conversion = {
  id: string;
  resourceName: string;
  name: string;
  category: string;
  type: string;
  status: string;
  globalSiteTag?: string;
  eventSnippet?: string;
  conversionCount?: number;
};

const CATEGORIES: Array<{
  value: Category;
  label: string;
  helper: string;
  needsValue?: boolean;
}> = [
  { value: "PURCHASE", label: "Achat e-commerce", helper: "Page de remerciement après paiement réussi", needsValue: true },
  { value: "LEAD", label: "Lead (formulaire / appel)", helper: "Soumission de formulaire contact" },
  { value: "SIGN_UP", label: "Inscription", helper: "Création de compte / inscription newsletter" },
  { value: "BOOK_APPOINTMENT", label: "Prise de rendez-vous", helper: "Calendly / réservation" },
  { value: "REQUEST_QUOTE", label: "Demande de devis", helper: "Quote / estimation" },
  { value: "GET_DIRECTIONS", label: "Itinéraire", helper: "Clic « Comment venir »" },
  { value: "OUTBOUND_CLICK", label: "Clic sortant", helper: "Affiliation / lien partenaire" },
  { value: "CONTACT", label: "Contact (téléphone / email)", helper: "Clic sur lien tel: / mailto:" },
  { value: "PAGE_VIEW", label: "Vue de page clé", helper: "Téléchargement brochure, vidéo, etc." },
  { value: "DEFAULT", label: "Autre", helper: "Conversion personnalisée" },
];

export function ConversionTrackingClient({
  accountId,
  accountName,
  currency,
}: {
  accountId: string;
  accountName: string;
  currency: string;
}) {
  const [conversions, setConversions] = useState<Conversion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [showSnippetFor, setShowSnippetFor] = useState<Conversion | null>(null);
  const [busy, setBusy] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("LEAD");
  const [defaultValue, setDefaultValue] = useState<string>("");

  const fetchList = useCallback(async () => {
    try {
      const r = await fetch(`/api/ads/accounts/${accountId}/conversions`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Erreur");
      setConversions(j.conversions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setConversions([]);
    }
  }, [accountId]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { name: name.trim(), category };
      if (defaultValue.trim()) {
        const v = Number(defaultValue);
        if (!Number.isFinite(v) || v < 0) throw new Error("Valeur invalide");
        body.defaultValue = v;
        body.defaultCurrencyCode = currency;
      }
      const r = await fetch(`/api/ads/accounts/${accountId}/conversions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Erreur");
      setShowSnippetFor(j.conversion);
      setOpen(false);
      setName("");
      setDefaultValue("");
      await fetchList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  const selectedCategory = CATEGORIES.find((c) => c.value === category)!;
  const isEmpty = conversions !== null && conversions.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Tracking des conversions</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Compte Google Ads : <strong>{accountName}</strong> · devise {currency}
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-brand hover:bg-brand-600"
        >
          + Nouvelle conversion
        </button>
      </div>

      {/* Intro pédagogique */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <h2 className="text-base font-semibold text-blue-900">
          ❓ Pourquoi configurer le tracking
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-blue-900/90">
          Le smart bidding Google (TARGET_CPA, TARGET_ROAS, MAXIMIZE_CONVERSIONS)
          a besoin de <strong>données de conversion</strong> pour apprendre à optimiser
          vos enchères. Sans tracking, vous restez bloqué·e en MANUAL_CPC qui est
          beaucoup moins efficace en 2026.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-blue-900/90">
          <strong>Comment ça marche :</strong> on crée ici une « ConversionAction »
          côté Google Ads, on vous donne deux snippets HTML, vous les collez sur
          votre site (1 dans &lt;head&gt;, 1 sur la page de remerciement). Google
          enregistre alors chaque conversion attribuable à un clic publicitaire.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          ⚠ {error}
        </div>
      )}

      {/* Liste */}
      {conversions === null ? (
        <div className="rounded-2xl border border-zinc-200 bg-white/40 p-8 text-center text-sm text-zinc-500">
          Chargement…
        </div>
      ) : isEmpty ? (
        <div className="rounded-2xl border-2 border-dashed border-zinc-300 bg-white/40 p-8 text-center">
          <p className="text-sm text-zinc-600">
            Aucune conversion configurée. Créez-en une pour débloquer le smart
            bidding sur vos campagnes Google Ads.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {conversions.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <h3 className="truncate font-semibold text-zinc-900">{c.name}</h3>
                  <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                    {c.category}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      c.status === "ENABLED"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-zinc-500">
                  ID Google : {c.id}
                  {c.conversionCount !== undefined && (
                    <> · {c.conversionCount} conversion(s) enregistrée(s)</>
                  )}
                </p>
              </div>
              <button
                onClick={() => setShowSnippetFor(c)}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-zinc-400"
              >
                Voir le snippet
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Modal création */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-zinc-900">Nouvelle conversion</h2>

            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">
                  Nom interne
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex : Achat boutique"
                  className="mt-1.5 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">
                  Catégorie
                </span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className="mt-1.5 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-xs text-zinc-500">
                  {selectedCategory.helper}
                </span>
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">
                  Valeur par défaut {selectedCategory.needsValue && (
                    <span className="text-red-600">* requis pour TARGET_ROAS</span>
                  )}
                </span>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={defaultValue}
                    onChange={(e) => setDefaultValue(e.target.value)}
                    placeholder="0"
                    className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  />
                  <span className="text-sm font-semibold text-zinc-500">
                    {currency}
                  </span>
                </div>
                <span className="mt-1 block text-xs text-zinc-500">
                  Laissez vide si la valeur de chaque conversion varie (vous la
                  passerez côté gtag).
                </span>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-700 hover:border-zinc-400"
              >
                Annuler
              </button>
              <button
                onClick={create}
                disabled={busy || !name.trim()}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-brand hover:bg-brand-600 disabled:opacity-50"
              >
                {busy ? "Création…" : "Créer la conversion"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal snippet */}
      {showSnippetFor && (
        <SnippetModal
          conversion={showSnippetFor}
          onClose={() => setShowSnippetFor(null)}
        />
      )}
    </div>
  );
}

function SnippetModal({
  conversion,
  onClose,
}: {
  conversion: Conversion;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<"global" | "event" | null>(null);

  function copy(text: string, which: "global" | "event") {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">
              Snippets de tracking — {conversion.name}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Copiez-collez ces deux snippets dans votre site (le client peut
              les transmettre à son webmaster s'il préfère).
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-zinc-200 px-2 py-1 text-sm hover:border-zinc-400"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {conversion.globalSiteTag ? (
            <div>
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <h3 className="font-semibold text-zinc-900">
                  1. Global tag — à coller dans &lt;head&gt; de <strong>toutes</strong> les pages
                </h3>
                <button
                  onClick={() => copy(conversion.globalSiteTag!, "global")}
                  className="rounded border border-zinc-200 px-2 py-1 text-xs hover:border-zinc-400"
                >
                  {copied === "global" ? "✓ Copié" : "Copier"}
                </button>
              </div>
              <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-xs text-zinc-100">
                {conversion.globalSiteTag}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-amber-700">
              Le global tag n'est pas encore disponible. Recharge la page dans
              quelques secondes (Google met parfois 30s à le générer).
            </p>
          )}

          {conversion.eventSnippet && (
            <div>
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <h3 className="font-semibold text-zinc-900">
                  2. Event snippet — à coller sur la page <strong>de conversion</strong>{" "}
                  (page de remerciement, confirmation, etc.)
                </h3>
                <button
                  onClick={() => copy(conversion.eventSnippet!, "event")}
                  className="rounded border border-zinc-200 px-2 py-1 text-xs hover:border-zinc-400"
                >
                  {copied === "event" ? "✓ Copié" : "Copier"}
                </button>
              </div>
              <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-xs text-zinc-100">
                {conversion.eventSnippet}
              </pre>
            </div>
          )}

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
            <strong>✅ Une fois installé :</strong> les conversions arrivent dans
            Google Ads sous 24-48h. Vous pourrez alors lier cette conversion à
            vos campagnes pour activer TARGET_CPA / TARGET_ROAS.
          </div>
        </div>
      </div>
    </div>
  );
}
