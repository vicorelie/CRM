"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Events Meta standard supportés (sous-ensemble de STANDARD_EVENTS pour l'UI)
const EVENT_OPTIONS = [
  { value: "PageView", label: "PageView (visite de page)", default: true, desc: "Visite d'une page du site. Auto-tracked." },
  { value: "ViewContent", label: "ViewContent (clic CTA)", default: true, desc: "Clic sur un bouton CTA principal." },
  { value: "Lead", label: "Lead (formulaire soumis)", default: true, desc: "Soumission d'un formulaire de contact. Auto-tracked." },
  { value: "Contact", label: "Contact", default: false, desc: "Clic sur un lien email/téléphone." },
  { value: "Schedule", label: "Schedule (RDV pris)", default: false, desc: "Réservation d'un créneau Calendly." },
  { value: "AddToCart", label: "AddToCart (e-commerce)", default: false, desc: "Ajout au panier (Shop)." },
  { value: "InitiateCheckout", label: "InitiateCheckout (e-commerce)", default: false, desc: "Accès au checkout." },
  { value: "Purchase", label: "Purchase (e-commerce)", default: false, desc: "Achat confirmé." },
  { value: "CompleteRegistration", label: "CompleteRegistration", default: false, desc: "Inscription complétée." },
];

type AdAccount = {
  id: string;
  name: string | null;
  externalId: string;
  currency: string | null;
};

type SitePixel = {
  id: string;
  adAccountId: string;
  pixelId: string;
  pixelName: string | null;
  testEventCode: string | null;
  enabled: boolean;
  events: unknown;
  consentRequired: boolean;
  lastEventAt: Date | null;
  lastErrorAt: Date | null;
  lastError: string | null;
};

type MetaPixel = { id: string; name: string };

type Props = {
  siteId: string;
  slug: string;
  adAccounts: AdAccount[];
  initialPixel: SitePixel | null;
};

export function PixelConfigClient({ siteId, slug, adAccounts, initialPixel }: Props) {
  const router = useRouter();
  const [adAccountId, setAdAccountId] = useState(initialPixel?.adAccountId ?? adAccounts[0]?.id ?? "");
  const [pixelId, setPixelId] = useState(initialPixel?.pixelId ?? "");
  const [pixelName, setPixelName] = useState(initialPixel?.pixelName ?? "");
  const [capiAccessToken, setCapiAccessToken] = useState(""); // jamais pré-rempli (sensible)
  const [testEventCode, setTestEventCode] = useState(initialPixel?.testEventCode ?? "");
  const [enabled, setEnabled] = useState(initialPixel?.enabled ?? true);
  const [events, setEvents] = useState<string[]>(() => {
    const initial = Array.isArray(initialPixel?.events) ? (initialPixel?.events as string[]) : null;
    return initial ?? EVENT_OPTIONS.filter((e) => e.default).map((e) => e.value);
  });
  const [consentRequired, setConsentRequired] = useState(initialPixel?.consentRequired ?? false);

  const [availablePixels, setAvailablePixels] = useState<MetaPixel[]>([]);
  const [loadingPixels, setLoadingPixels] = useState(false);
  const [pixelsError, setPixelsError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Charge les pixels Meta disponibles quand un AdAccount est sélectionné
  useEffect(() => {
    if (!adAccountId) {
      setAvailablePixels([]);
      return;
    }
    setLoadingPixels(true);
    setPixelsError(null);
    fetch(`/api/ads/meta/pixels?adAccountId=${encodeURIComponent(adAccountId)}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Erreur fetch pixels");
        setAvailablePixels(j.pixels ?? []);
        // Auto-remplit le pixelName si on a un match avec le pixelId actuel
        if (pixelId) {
          const match = (j.pixels as MetaPixel[]).find((p) => p.id === pixelId);
          if (match && !pixelName) setPixelName(match.name);
        }
      })
      .catch((e) => setPixelsError(e instanceof Error ? e.message : "Erreur inconnue"))
      .finally(() => setLoadingPixels(false));
    // pixelId/pixelName intentionally not in deps — on fetch que sur change AdAccount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adAccountId]);

  function selectPixelFromDropdown(id: string) {
    setPixelId(id);
    const match = availablePixels.find((p) => p.id === id);
    if (match) setPixelName(match.name);
  }

  function toggleEvent(value: string) {
    setEvents((prev) => (prev.includes(value) ? prev.filter((e) => e !== value) : [...prev, value]));
  }

  async function save() {
    setSaving(true);
    setFeedback(null);
    try {
      // Si on édite une config existante sans renouveler le token, on doit accepter
      // que le user le laisse vide → on n'envoie pas le champ et le serveur garde
      // l'ancien. MAIS pour la première création, le token est obligatoire.
      if (!initialPixel && !capiAccessToken.trim()) {
        throw new Error("CAPI Access Token requis pour la première configuration");
      }
      if (!pixelId.match(/^\d{6,30}$/)) {
        throw new Error("Pixel ID doit être numérique (6-30 chiffres)");
      }
      if (events.length === 0) {
        throw new Error("Active au moins 1 event");
      }
      const body: Record<string, unknown> = {
        adAccountId,
        pixelId,
        pixelName: pixelName || undefined,
        enabled,
        events,
        consentRequired,
      };
      if (capiAccessToken.trim()) body.capiAccessToken = capiAccessToken.trim();
      else if (initialPixel) {
        // Re-save sans modifier le token : on ne peut PAS faire un PUT partiel ici
        // car schema Zod exige capiAccessToken. Workaround : demander au user de le re-saisir.
        throw new Error("Re-saisis ton CAPI Access Token pour sauver (sécurité — il n'est jamais affiché).");
      }
      if (testEventCode.trim()) body.testEventCode = testEventCode.trim();

      const r = await fetch(`/api/sites/${siteId}/pixel`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) {
        const detailsMsg = j.details ? ` (${JSON.stringify(j.details).slice(0, 200)})` : "";
        throw new Error((j.error ?? "Échec sauvegarde") + detailsMsg);
      }
      setFeedback({ type: "success", message: "Configuration enregistrée. Le tracking est actif." });
      setCapiAccessToken(""); // on vide après save (sécurité)
      router.refresh();
    } catch (e) {
      setFeedback({ type: "error", message: e instanceof Error ? e.message : "Erreur inconnue" });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Supprimer la configuration Pixel pour ce site ? Les events déjà envoyés à Meta ne sont pas affectés.")) return;
    setDeleting(true);
    setFeedback(null);
    try {
      const r = await fetch(`/api/sites/${siteId}/pixel`, { method: "DELETE" });
      if (!r.ok) throw new Error("Échec suppression");
      setFeedback({ type: "success", message: "Configuration supprimée. Le tracking est désactivé." });
      router.refresh();
    } catch (e) {
      setFeedback({ type: "error", message: e instanceof Error ? e.message : "Erreur inconnue" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {adAccounts.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          ⚠️ Tu n'as pas de compte publicitaire Meta connecté. Va sur{" "}
          <a href="/ads/setup" className="underline font-semibold">/ads/setup</a> pour en connecter un d'abord.
        </div>
      )}

      {adAccounts.length > 0 && (
        <>
          {initialPixel && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm space-y-1">
              <div className="font-semibold text-zinc-700">Configuration existante :</div>
              <div className="text-zinc-600">
                Pixel <code className="font-mono text-xs">{initialPixel.pixelId}</code> · Status{" "}
                <span className={initialPixel.enabled ? "text-emerald-700" : "text-zinc-500"}>
                  {initialPixel.enabled ? "Actif" : "Désactivé"}
                </span>
                {initialPixel.lastEventAt && (
                  <> · Dernier event : {new Date(initialPixel.lastEventAt).toLocaleString("fr")}</>
                )}
              </div>
              {initialPixel.lastError && (
                <div className="text-red-700 text-xs">⚠ Dernière erreur : {initialPixel.lastError}</div>
              )}
            </div>
          )}

          <fieldset className="space-y-4 rounded-xl border border-zinc-200 p-5">
            <legend className="px-2 text-sm font-semibold text-zinc-700">1. Compte publicitaire Meta</legend>
            <select
              value={adAccountId}
              onChange={(e) => setAdAccountId(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              {adAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name ?? a.externalId} ({a.currency ?? "—"})
                </option>
              ))}
            </select>
          </fieldset>

          <fieldset className="space-y-4 rounded-xl border border-zinc-200 p-5">
            <legend className="px-2 text-sm font-semibold text-zinc-700">2. Pixel Meta</legend>
            {loadingPixels && <div className="text-sm text-zinc-500">Chargement des pixels…</div>}
            {pixelsError && (
              <div className="text-sm text-red-700">
                ⚠ {pixelsError} — saisis le Pixel ID manuellement ci-dessous.
              </div>
            )}
            {availablePixels.length > 0 && (
              <select
                value={availablePixels.some((p) => p.id === pixelId) ? pixelId : ""}
                onChange={(e) => selectPixelFromDropdown(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              >
                <option value="">— Sélectionne un pixel —</option>
                {availablePixels.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id})
                  </option>
                ))}
              </select>
            )}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-600">
                Pixel ID (15-16 chiffres) {availablePixels.length === 0 && "(saisie manuelle)"}
              </label>
              <input
                type="text"
                value={pixelId}
                onChange={(e) => setPixelId(e.target.value.trim())}
                placeholder="1234567890123456"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono"
              />
              <label className="block text-xs font-medium text-zinc-600">Nom du pixel (libre, pour l'UI)</label>
              <input
                type="text"
                value={pixelName}
                onChange={(e) => setPixelName(e.target.value)}
                placeholder="Mon pixel principal"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
          </fieldset>

          <fieldset className="space-y-3 rounded-xl border border-zinc-200 p-5">
            <legend className="px-2 text-sm font-semibold text-zinc-700">3. Conversions API (CAPI) Access Token</legend>
            <p className="text-xs text-zinc-600">
              Token serveur pour envoyer les events à Meta sans le navigateur (bypass adblock + iOS).
              Génère-le dans <strong>Meta Events Manager → Paramètres → Conversions API → Générer un access token</strong>.
              <br />
              <a
                href="https://www.facebook.com/events_manager2/list/pixel"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-700 underline"
              >
                Ouvrir Meta Events Manager ↗
              </a>
            </p>
            <input
              type="password"
              value={capiAccessToken}
              onChange={(e) => setCapiAccessToken(e.target.value)}
              placeholder={initialPixel ? "Re-saisis le token pour modifier la config" : "EAAxxxxxxxxxxxxxx..."}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono"
              autoComplete="off"
            />
            <label className="block text-xs font-medium text-zinc-600 mt-3">
              Test Event Code (facultatif — pour tester sans pollution prod)
            </label>
            <input
              type="text"
              value={testEventCode}
              onChange={(e) => setTestEventCode(e.target.value.trim())}
              placeholder="TEST12345"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono"
            />
            <p className="text-xs text-zinc-500">
              Disponible dans Meta Events Manager → Test Events. Les events envoyés avec ce code n'apparaissent pas dans la prod.
            </p>
          </fieldset>

          <fieldset className="space-y-3 rounded-xl border border-zinc-200 p-5">
            <legend className="px-2 text-sm font-semibold text-zinc-700">4. Events à activer</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {EVENT_OPTIONS.map((evt) => (
                <label key={evt.value} className="flex items-start gap-2 cursor-pointer rounded-lg border border-zinc-200 p-3 hover:border-brand-300">
                  <input
                    type="checkbox"
                    checked={events.includes(evt.value)}
                    onChange={() => toggleEvent(evt.value)}
                    className="mt-0.5 h-4 w-4 accent-brand-500"
                  />
                  <span className="text-sm">
                    <span className="font-medium block">{evt.label}</span>
                    <span className="text-xs text-zinc-500">{evt.desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-3 rounded-xl border border-zinc-200 p-5">
            <legend className="px-2 text-sm font-semibold text-zinc-700">5. Options</legend>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-emerald-500"
              />
              <span className="text-sm">
                <span className="font-medium">Activer le tracking</span>
                <span className="text-xs text-zinc-500 block">
                  Si décoché, le Pixel n'est pas injecté dans le site (toggle instantané).
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={consentRequired}
                onChange={(e) => setConsentRequired(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-brand-500"
              />
              <span className="text-sm">
                <span className="font-medium">Exiger le consentement RGPD avant tracking</span>
                <span className="text-xs text-zinc-500 block">
                  Recommandé pour le marché EU. Le Pixel ne s'initialise qu'après opt-in du visiteur via{" "}
                  <code className="font-mono text-xs">window.wpConsent(true)</code>.
                </span>
              </span>
            </label>
          </fieldset>

          {feedback && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                feedback.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-red-200 bg-red-50 text-red-900"
              }`}
            >
              {feedback.message}
            </div>
          )}

          <div className="flex gap-3 items-center pt-2">
            <button
              onClick={save}
              disabled={saving || deleting}
              className="rounded-xl bg-brand-500 px-5 py-3 font-semibold text-white shadow-brand transition-colors hover:bg-brand-600 disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : initialPixel ? "Mettre à jour" : "Activer le tracking"}
            </button>
            {initialPixel && (
              <button
                onClick={remove}
                disabled={saving || deleting}
                className="rounded-xl border border-red-300 px-5 py-3 font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {deleting ? "Suppression…" : "Désactiver le tracking"}
              </button>
            )}
            <a
              href={`/sites/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-sm text-zinc-500 hover:text-brand-700 transition-colors"
            >
              Tester sur le site ↗
            </a>
          </div>
        </>
      )}
    </div>
  );
}
