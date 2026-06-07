"use client";
import { useEffect } from "react";
import { OBJECTIVE_LABEL, PLATFORM_META } from "../types";
import type { AdPlatform, CampaignObjective } from "../types";

// Count utility — mirror du parseNegativeKeywords côté push (CampaignsList).
// On évite l'import pour ne pas créer de dépendance cyclique avec le parent.
function parseNegativeKeywordsCount(text: string): number {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l.length <= 80)
    .slice(0, 200).length;
}
import type {
  AdAccountChoice,
  AvailablePixel,
  DestinationMode,
  GeoTarget,
  PushModalState,
  WanapushSiteOption,
} from "./types";
import {
  CTA_OPTIONS,
  OBJECTIVE_ORDER,
  PIXEL_REQUIRED_OBJECTIVES,
  currencySymbol,
} from "./utils";

export function PushModal({
  state,
  patch,
  onClose,
  onUpload,
  onGenerate,
  onUseUrl,
  onSubmit,
  onAutoConfig,
  onGeoSearch,
  onAddGeoTarget,
  onRemoveGeoTarget,
  onPatchGeoTarget,
  onSelectVariant,
  onSelectWanapushSite,
  onVerifyExternalPixel,
  onSaveDraft,
  onGenerateVariants,
  onLoadConversions,
}: {
  state: PushModalState;
  patch: (p: Partial<PushModalState>) => void;
  onClose: () => void;
  onUpload: () => void;
  onGenerate: () => void;
  onUseUrl: () => void;
  onSubmit: () => void;
  onAutoConfig: () => void;
  onGeoSearch: (q: string) => void;
  onAddGeoTarget: (s: { key: string; name: string; type: string; country_code?: string }) => void;
  onRemoveGeoTarget: (index: number) => void;
  onPatchGeoTarget: (index: number, patch: Partial<GeoTarget>) => void;
  onSelectVariant: (index: number) => void;
  onSelectWanapushSite: (siteId: string) => void;
  onVerifyExternalPixel: () => void;
  onSaveDraft: () => void;
  onGenerateVariants: () => void;
  onLoadConversions: (adAccountId: string) => Promise<void>;
}) {
  const {
    mode,
    briefName,
    briefPlatform,
    briefAdAccountId,
    briefAvailableAdAccounts,
    briefProduct,
    briefAudience,
    briefTone,
    briefTotalBudget,
    expandBrief,
    campaign: c,
    objective,
    finalUrl,
    dailyBudget,
    primaryText,
    headline,
    description,
    cta,
    geoTargets,
    geoQuery,
    geoSuggestions,
    ageMin,
    ageMax,
    genders,
    instagramActorId,
    advantageAudience,
    advantageCreative,
    multiAdvertiserAds,
    imageMode,
    aiBrief,
    urlInput,
    imageUrl,
    busyAction,
    error,
    successUrl,
    aiRationale,
    detectedPixel,
    expandText,
    expandTargeting,
    expandAdvanced,
    negativeKeywordsText,
    selectedConversionActionId,
    availableConversionActions,
  } = state;
  const isCreate = mode === "create";
  const platform: AdPlatform = isCreate ? briefPlatform : c.type;
  const isMeta = platform === "META_ADS";
  const isGoogle = platform === "GOOGLE_ADS";

  // Charge les ConversionActions dès qu'on entre dans le mode Google Ads avec
  // un compte sélectionné. Idempotent : la fonction parent setera l'array dans
  // le state, on évite de refetch si déjà chargé.
  useEffect(() => {
    if (isGoogle && briefAdAccountId && availableConversionActions.length === 0) {
      onLoadConversions(briefAdAccountId);
    }
  }, [isGoogle, briefAdAccountId, availableConversionActions.length, onLoadConversions]);
  const busy = busyAction !== null;
  const needsPixel = PIXEL_REQUIRED_OBJECTIVES.includes(objective);

  function toggleGender(g: 1 | 2) {
    if (genders.includes(g)) {
      patch({ genders: genders.filter((x) => x !== g) });
    } else {
      patch({ genders: [...genders, g] });
    }
  }

  // État succès — on remplace le contenu par un récap
  if (successUrl !== null) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-center">
          <div className="text-5xl">🎉</div>
          <h3 className="text-xl font-bold">Campagne créée en PAUSED</h3>
          <p className="text-sm text-zinc-600">
            La campagne <strong>{c.name}</strong> a été publiée côté{" "}
            {PLATFORM_META[c.type].label} en mode PAUSED.
            <br />
            Active-la dans le Manager natif quand tu es prêt.
          </p>
          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-300 bg-white text-zinc-700 px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50"
            >
              Fermer
            </button>
            {successUrl && (
              <a
                href={successUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-lg bg-brand text-white px-4 py-2.5 text-sm font-semibold hover:bg-brand/90"
                onClick={onClose}
              >
                Ouvrir Manager natif →
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 flex items-start justify-between gap-3 z-10">
          <div>
            <h3 className="text-lg font-bold">
              {isCreate
                ? `Nouvelle campagne ${PLATFORM_META[briefPlatform].label}`
                : `Lancer sur ${PLATFORM_META[c.type].label}`}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {isCreate ? (
                "Brief + ciblage + push en un seul flow. PAUSED par défaut."
              ) : (
                <>
                  <strong>{c.name}</strong> · La campagne sera créée en{" "}
                  <span className="font-mono">PAUSED</span> dans le Manager natif.
                </>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="text-zinc-400 hover:text-zinc-900 text-2xl leading-none disabled:opacity-30"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* === SECTION BRIEF (mode create — toujours visible ; mode edit — collapsible) === */}
          {isCreate && (
            <Section
              title="📋 Brief de la campagne"
              hint="Indique nom + produit + audience, l'IA génère 3 variantes copy"
              expanded={expandBrief}
              onToggle={() => patch({ expandBrief: !expandBrief })}
              disabled={busy}
            >
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase text-zinc-500">
                      Nom de la campagne
                    </label>
                    <input
                      type="text"
                      value={briefName}
                      onChange={(e) => patch({ briefName: e.target.value })}
                      disabled={busy}
                      placeholder="Ex : Promo printemps formation"
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase text-zinc-500">
                      Budget total ({currencySymbol(c.adAccount?.currency)})
                    </label>
                    <input
                      type="number"
                      min={1}
                      step={10}
                      value={briefTotalBudget}
                      onChange={(e) => patch({ briefTotalBudget: e.target.value })}
                      disabled={busy}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase text-zinc-500">
                      Plateforme
                    </label>
                    <select
                      value={briefPlatform}
                      onChange={(e) =>
                        patch({ briefPlatform: e.target.value as AdPlatform })
                      }
                      disabled={busy}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand focus:outline-none bg-white"
                    >
                      {(["META_ADS", "GOOGLE_ADS", "TIKTOK_ADS", "LINKEDIN_ADS"] as AdPlatform[]).map(
                        (p) => (
                          <option key={p} value={p}>
                            {PLATFORM_META[p].emoji} {PLATFORM_META[p].label}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase text-zinc-500">
                      Compte publicitaire
                    </label>
                    {briefAvailableAdAccounts.filter((a) => a.platform === briefPlatform).length === 0 ? (
                      <div className="text-xs text-amber-700 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                        Aucun compte {PLATFORM_META[briefPlatform].label} connecté.{" "}
                        <a href="/ads" className="underline font-semibold">
                          Connecter →
                        </a>
                      </div>
                    ) : (
                      <select
                        value={briefAdAccountId}
                        onChange={(e) => patch({ briefAdAccountId: e.target.value })}
                        disabled={busy}
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand focus:outline-none bg-white"
                      >
                        {briefAvailableAdAccounts
                          .filter((a) => a.platform === briefPlatform)
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} {a.currency ? `(${a.currency})` : ""}
                            </option>
                          ))}
                      </select>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-zinc-500">
                    Produit / service
                  </label>
                  <textarea
                    value={briefProduct}
                    onChange={(e) => patch({ briefProduct: e.target.value })}
                    disabled={busy}
                    rows={2}
                    placeholder="Ex : Formation 8 semaines pour devenir expert SEO IA, certifiée, 100% en ligne."
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-zinc-500">
                    Audience cible
                  </label>
                  <textarea
                    value={briefAudience}
                    onChange={(e) => patch({ briefAudience: e.target.value })}
                    disabled={busy}
                    rows={2}
                    placeholder="Ex : Indépendants & PME en France, 30-55 ans, qui veulent rester compétitifs en SEO."
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-zinc-500">Ton</label>
                  <select
                    value={briefTone}
                    onChange={(e) =>
                      patch({
                        briefTone: e.target.value as
                          | "DIRECT"
                          | "PREMIUM"
                          | "FRIENDLY"
                          | "URGENT"
                          | "STORYTELLING",
                      })
                    }
                    disabled={busy}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand focus:outline-none bg-white"
                  >
                    <option value="DIRECT">Direct</option>
                    <option value="PREMIUM">Premium</option>
                    <option value="FRIENDLY">Amical</option>
                    <option value="URGENT">Urgent</option>
                    <option value="STORYTELLING">Storytelling</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={onGenerateVariants}
                  disabled={busy || !briefProduct.trim() || !briefAudience.trim()}
                  className="w-full rounded-lg bg-gradient-to-br from-brand to-violet-600 text-white px-3 py-2.5 text-sm font-semibold disabled:opacity-40 hover:from-brand/95 hover:to-violet-500"
                >
                  {busyAction === "auto-configuring"
                    ? "Génération IA en cours…"
                    : "✨ Générer 3 variantes IA (copy A/B/C)"}
                </button>
              </div>
            </Section>
          )}

          {/* === Auto-config IA === */}
          {isMeta && (
            <div className="rounded-xl border-2 border-brand/30 bg-gradient-to-br from-brand/5 to-violet-50 p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-brand-700 flex items-center gap-1.5">
                    ✨ Auto-configuration IA
                  </div>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    L&apos;IA propose la meilleure config (texte + ciblage + démographie) basée sur
                    ton produit et ton audience.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onAutoConfig}
                  disabled={busy}
                  className="shrink-0 rounded-lg bg-brand text-white px-4 py-2 text-xs font-semibold disabled:opacity-40 hover:bg-brand/90"
                >
                  {busyAction === "auto-configuring" ? "Génération…" : "Auto-config"}
                </button>
              </div>
              {aiRationale && (
                <div className="rounded-lg bg-white/70 border border-brand/20 px-3 py-2 text-[11px] text-zinc-700 leading-snug">
                  <span className="font-semibold text-brand-700">IA :</span> {aiRationale}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-zinc-500">
              Objectif de la campagne
            </label>
            <select
              value={objective}
              onChange={(e) => patch({ objective: e.target.value as CampaignObjective })}
              disabled={busy}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand focus:outline-none bg-white"
            >
              {OBJECTIVE_ORDER.map((o) => (
                <option key={o} value={o}>
                  {OBJECTIVE_LABEL[o]}
                  {PIXEL_REQUIRED_OBJECTIVES.includes(o) ? " — Pixel requis" : ""}
                </option>
              ))}
            </select>
            {isMeta && needsPixel && detectedPixel && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-900">
                ✓ Pixel détecté : <strong>{detectedPixel.name}</strong>{" "}
                <span className="font-mono text-emerald-700/70">({detectedPixel.id})</span>
                <br />
                Optimisation conversion : <strong>{objective === "LEADS" ? "LEAD" : "PURCHASE"}</strong>
              </div>
            )}
            {isMeta && needsPixel && !detectedPixel && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
                ⚠️ <strong>{OBJECTIVE_LABEL[objective]}</strong> exige un Pixel Meta. Détection en
                cours… Si aucun Pixel détecté, choisis <strong>Notoriété</strong> ou{" "}
                <strong>Trafic</strong>.
              </div>
            )}
          </div>

          {isMeta && (
            <Section
              title="Texte de l'annonce"
              hint={state.variants.length > 1
                ? `${state.variants.length} variantes IA dispo — choisis ou édite`
                : "Pré-rempli depuis ton builder si dispo"}
              expanded={expandText}
              onToggle={() => patch({ expandText: !expandText })}
              disabled={busy}
            >
              <div className="space-y-3">
                {state.variants.length > 1 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase text-zinc-500">
                      Variantes A/B/C
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {state.variants.map((v, i) => {
                        const letter = String.fromCharCode(65 + i);
                        const active = state.selectedVariantIndex === i;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => onSelectVariant(i)}
                            disabled={busy}
                            className={`text-left rounded-lg border px-2.5 py-1.5 text-xs transition ${
                              active
                                ? "border-brand bg-brand/10 text-brand-700"
                                : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                            }`}
                          >
                            <div className="font-semibold">
                              {letter} · {v.angle ?? `Variante ${letter}`}
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-0.5 truncate">
                              {v.headline || v.primary_text?.slice(0, 30) || "(vide)"}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Toggle A/B test — Meta uniquement, visible quand >= 2 variantes */}
                    {isMeta && (
                      <button
                        type="button"
                        onClick={() => patch({ pushAllVariants: !state.pushAllVariants })}
                        disabled={busy}
                        className={`w-full flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition ${
                          state.pushAllVariants
                            ? "border-violet-400 bg-violet-50 text-violet-800"
                            : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                        }`}
                      >
                        <div className="text-left">
                          <div className="font-semibold text-xs">
                            🧪 Pousser les {state.variants.length} variantes (A/B test)
                          </div>
                          <div className="text-[10px] text-zinc-500 mt-0.5">
                            1 Campaign CBO · {state.variants.length} AdSets — Meta optimise automatiquement
                          </div>
                        </div>
                        <div className={`ml-3 flex-shrink-0 w-9 h-5 rounded-full transition-colors ${state.pushAllVariants ? "bg-violet-500" : "bg-zinc-300"}`}>
                          <div className={`mt-0.5 ml-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${state.pushAllVariants ? "translate-x-4" : "translate-x-0"}`} />
                        </div>
                      </button>
                    )}
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-zinc-500 flex justify-between">
                    <span>Texte principal</span>
                    <span className="text-zinc-400 font-normal">{primaryText.length}/125</span>
                  </label>
                  <textarea
                    value={primaryText}
                    onChange={(e) => patch({ primaryText: e.target.value.slice(0, 125) })}
                    disabled={busy}
                    rows={2}
                    placeholder="Le hook qui apparaît au-dessus de l'image..."
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand focus:outline-none resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase text-zinc-500 flex justify-between">
                      <span>Titre</span>
                      <span className="text-zinc-400 font-normal">{headline.length}/40</span>
                    </label>
                    <input
                      type="text"
                      value={headline}
                      onChange={(e) => patch({ headline: e.target.value.slice(0, 40) })}
                      disabled={busy}
                      placeholder="Sous l'image"
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase text-zinc-500 flex justify-between">
                      <span>Description</span>
                      <span className="text-zinc-400 font-normal">{description.length}/30</span>
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => patch({ description: e.target.value.slice(0, 30) })}
                      disabled={busy}
                      placeholder="Optionnel"
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-zinc-500">CTA</label>
                  <select
                    value={cta}
                    onChange={(e) => patch({ cta: e.target.value })}
                    disabled={busy}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand focus:outline-none bg-white"
                  >
                    {CTA_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Section>
          )}

          {isMeta && (
            <Section
              title="Ciblage"
              hint="Advantage+ Audience étend l'audience automatiquement"
              expanded={expandTargeting}
              onToggle={() => patch({ expandTargeting: !expandTargeting })}
              disabled={busy}
            >
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-zinc-500">
                    Localisations ciblées
                  </label>
                  {/* Chips des zones sélectionnées */}
                  {geoTargets.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {geoTargets.map((g, i) => (
                        <div
                          key={`${g.type}-${g.key}-${i}`}
                          className="flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-2.5 py-1 text-xs text-brand-700"
                        >
                          <span className="font-semibold">{g.label}</span>
                          {(g.type === "city" || g.type === "custom") && (
                            <span className="text-brand-700/70">
                              <input
                                type="number"
                                value={g.radius ?? 25}
                                min={1}
                                max={80}
                                onChange={(e) =>
                                  onPatchGeoTarget(i, {
                                    radius: Number(e.target.value) || 1,
                                  })
                                }
                                disabled={busy}
                                className="w-12 bg-transparent text-center font-mono"
                              />
                              km
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => onRemoveGeoTarget(i)}
                            disabled={busy}
                            className="text-brand-700/60 hover:text-brand-700 text-base leading-none"
                            aria-label="Retirer"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Search input + autocomplete */}
                  <div className="relative">
                    <input
                      type="text"
                      value={geoQuery}
                      onChange={(e) => {
                        const v = e.target.value;
                        patch({ geoQuery: v });
                        if (v.trim().length >= 2 && onGeoSearch) onGeoSearch(v);
                      }}
                      disabled={busy}
                      placeholder="Pays, région, ville, code postal…"
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                    />
                    {busyAction === "geo-searching" && (
                      <div className="absolute right-3 top-2.5 text-xs text-zinc-400">…</div>
                    )}
                    {geoSuggestions.length > 0 && (
                      <div className="absolute z-10 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg">
                        {geoSuggestions.map((s, i) => (
                          <button
                            key={`${s.type}-${s.key}-${i}`}
                            type="button"
                            onClick={() => onAddGeoTarget && onAddGeoTarget(s)}
                            disabled={busy}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 border-b border-zinc-100 last:border-0 flex items-center justify-between"
                          >
                            <span>{s.name}</span>
                            <span className="text-[10px] uppercase text-zinc-400 font-mono">
                              {s.type}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Tape 2+ caractères pour rechercher dans le catalogue Meta. Sélectionne
                    pays/régions/villes/codes postaux. Pour les villes, ajuste le rayon (km).
                  </p>
                  {(() => {
                    const hasCountry = geoTargets.some((g) => g.type === "country");
                    const hasSpecific = geoTargets.some(
                      (g) =>
                        g.type === "region" ||
                        g.type === "city" ||
                        g.type === "zip" ||
                        g.type === "custom",
                    );
                    if (hasCountry && hasSpecific) {
                      return (
                        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-900">
                          ⚠️ Pour éviter l&apos;overlap géo (refusé par Meta), seules les
                          zones précises (régions / villes / codes postaux) seront envoyées.
                          Les chips de pays sont ignorées dans ce cas.
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase text-zinc-500">
                      Âge min
                    </label>
                    <input
                      type="number"
                      min={13}
                      max={65}
                      value={ageMin}
                      onChange={(e) => patch({ ageMin: e.target.value })}
                      disabled={busy}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase text-zinc-500">
                      Âge max
                    </label>
                    <input
                      type="number"
                      min={13}
                      max={65}
                      value={ageMax}
                      onChange={(e) => patch({ ageMax: e.target.value })}
                      disabled={busy}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-zinc-500">Genres</label>
                  <div className="flex gap-1.5">
                    {(
                      [
                        { v: 0, label: "Tous" },
                        { v: 2, label: "♀ Femmes" },
                        { v: 1, label: "♂ Hommes" },
                      ] as Array<{ v: 0 | 1 | 2; label: string }>
                    ).map((g) => {
                      const isAll = g.v === 0;
                      const active = isAll
                        ? genders.length === 0
                        : genders.includes(g.v as 1 | 2);
                      return (
                        <button
                          key={g.label}
                          type="button"
                          onClick={() =>
                            isAll ? patch({ genders: [] }) : toggleGender(g.v as 1 | 2)
                          }
                          disabled={busy}
                          className={`text-xs px-3 py-1.5 rounded-full border transition ${
                            active
                              ? "border-brand bg-brand/15 text-brand-700"
                              : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300"
                          }`}
                        >
                          {g.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Section>
          )}

          {isMeta && (
            <Section
              title="Avancé (Advantage+ 2026)"
              hint="Best practices Meta 2026 — laisse activé sauf cas spécifique"
              expanded={expandAdvanced}
              onToggle={() => patch({ expandAdvanced: !expandAdvanced })}
              disabled={busy}
            >
              <div className="space-y-2">
                <ToggleRow
                  label="Advantage+ Audience"
                  hint="Meta étend l'audience au-delà du ciblage (recommandé)"
                  checked={advantageAudience}
                  onChange={(v) => patch({ advantageAudience: v })}
                  disabled={busy}
                />
                <ToggleRow
                  label="Advantage+ Creative"
                  hint="Meta optimise titre/image/texte automatiquement (+14% CPR)"
                  checked={advantageCreative}
                  onChange={(v) => patch({ advantageCreative: v })}
                  disabled={busy}
                />
                <ToggleRow
                  label="Multi-advertiser ads"
                  hint="Apparaît dans des unités combinées Meta (meilleur reach)"
                  checked={multiAdvertiserAds}
                  onChange={(v) => patch({ multiAdvertiserAds: v })}
                  disabled={busy}
                />
                <div className="pt-2">
                  <label className="text-xs font-semibold uppercase text-zinc-500">
                    Instagram actor_id (optionnel)
                  </label>
                  <input
                    type="text"
                    value={instagramActorId}
                    onChange={(e) => patch({ instagramActorId: e.target.value })}
                    disabled={busy}
                    placeholder="Auto-détecté depuis la Page FB"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Vide = auto-détection. Renseigne l&apos;ID IG Business pour forcer un compte
                    spécifique (cross-platform FB+IG).
                  </p>
                </div>
              </div>
            </Section>
          )}

          {isMeta && (
            <DestinationWidget
              state={state}
              patch={patch}
              onSelectWanapushSite={onSelectWanapushSite}
              onVerifyExternalPixel={onVerifyExternalPixel}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-zinc-500">
                URL finale
              </label>
              <input
                type="text"
                value={finalUrl}
                onChange={(e) => patch({ finalUrl: e.target.value })}
                disabled={busy}
                placeholder="https://..."
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand focus:outline-none bg-zinc-50"
                readOnly={isMeta}
              />
              {isMeta && (
                <p className="text-[11px] text-zinc-500">
                  Calculée depuis la destination ci-dessus.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-zinc-500">
                Budget /jour ({currencySymbol(c.adAccount?.currency)})
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={dailyBudget}
                onChange={(e) => patch({ dailyBudget: e.target.value })}
                disabled={busy}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
              {c.adAccount?.currency && c.adAccount.currency !== "EUR" && (
                <p className="text-[11px] text-amber-700">
                  ⚠️ Compte pub en <strong>{c.adAccount.currency}</strong> — pas en EUR. Le budget
                  saisi est en {currencySymbol(c.adAccount.currency)}.
                </p>
              )}
            </div>
          </div>

          {isMeta && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase text-zinc-500">
                  Image de l&apos;annonce
                </label>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => patch({ imageUrl: null })}
                    disabled={busy}
                    className="text-xs text-zinc-500 hover:text-zinc-900 underline"
                  >
                    Changer
                  </button>
                )}
              </div>

              {imageUrl ? (
                <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50/40 p-3 space-y-2">
                  <img
                    src={imageUrl}
                    alt="Aperçu de l'annonce"
                    className="w-full max-h-72 object-contain rounded-md bg-white"
                  />
                  <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                    ✓ Image prête pour le push
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {(["upload", "ai", "url"] as const).map((m) => {
                      const labels = {
                        upload: "📁 Upload",
                        ai: "✨ IA",
                        url: "🔗 URL",
                      };
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => patch({ imageMode: m, error: null })}
                          disabled={busy}
                          className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                            imageMode === m
                              ? "border-brand bg-brand/10 text-brand-700"
                              : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                          }`}
                        >
                          {labels[m]}
                        </button>
                      );
                    })}
                  </div>

                  {imageMode === "upload" && (
                    <button
                      type="button"
                      onClick={onUpload}
                      disabled={busy}
                      className="w-full rounded-lg border-2 border-dashed border-zinc-300 bg-white px-4 py-6 text-center hover:border-brand transition disabled:opacity-50"
                    >
                      <div className="text-2xl">📁</div>
                      <div className="text-sm font-semibold mt-1">
                        {busyAction === "uploading" ? "Upload en cours…" : "Choisir un fichier"}
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        JPG / PNG / WebP / GIF — max 100 Mo
                      </div>
                    </button>
                  )}

                  {imageMode === "ai" && (
                    <div className="space-y-2">
                      {(primaryText.trim() || headline.trim()) && (
                        <button
                          type="button"
                          onClick={() => {
                            const autoBrief = [primaryText, headline].filter(Boolean).join(" — ");
                            patch({ aiBrief: autoBrief });
                            // micro-déférement pour que le state propage avant l'appel
                            setTimeout(onGenerate, 50);
                          }}
                          disabled={busy}
                          className="w-full rounded-lg border-2 border-brand bg-gradient-to-br from-brand/10 to-violet-50 text-brand-700 px-3 py-2.5 text-sm font-semibold disabled:opacity-40 hover:from-brand/15 hover:to-violet-100"
                        >
                          {busyAction === "generating"
                            ? "Génération en cours…"
                            : "⚡ Auto-générer depuis le texte de l'annonce"}
                        </button>
                      )}
                      <div className="text-[11px] text-zinc-500 text-center">
                        ou écris un brief manuellement :
                      </div>
                      <input
                        type="text"
                        value={aiBrief}
                        onChange={(e) => patch({ aiBrief: e.target.value })}
                        placeholder="Ex : formation SEO IA pour entrepreneurs"
                        disabled={busy}
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={onGenerate}
                        disabled={busy || !aiBrief.trim()}
                        className="w-full rounded-lg bg-brand text-white px-3 py-2.5 text-sm font-semibold disabled:opacity-40 hover:bg-brand/90"
                      >
                        {busyAction === "generating"
                          ? "Génération en cours…"
                          : "✨ Générer l'image"}
                      </button>
                    </div>
                  )}

                  {imageMode === "url" && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={urlInput}
                        onChange={(e) => patch({ urlInput: e.target.value })}
                        placeholder="https://..."
                        disabled={busy}
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={onUseUrl}
                        disabled={busy || !urlInput.trim()}
                        className="w-full rounded-lg border border-zinc-300 bg-white text-zinc-700 px-3 py-2.5 text-sm font-semibold hover:bg-zinc-50 disabled:opacity-40"
                      >
                        Utiliser cette URL
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ─── Section Google Ads spécifique ───────────────────────── */}
          {isGoogle && (
            <Section
              title="🎯 Smart Bidding & Tracking (Google Ads)"
              expanded={state.expandGoogle}
              onToggle={() => patch({ expandGoogle: !state.expandGoogle })}
            >
              <div className="space-y-5 px-4 py-4">
                {/* Conversion linking */}
                <div>
                  <label className="block text-sm font-semibold text-zinc-900 mb-2">
                    Lier à une conversion (débloque smart bidding)
                  </label>
                  {availableConversionActions.length === 0 ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      Aucune conversion configurée sur ce compte Google Ads.
                      Sans tracking, TARGET_CPA et TARGET_ROAS ne peuvent pas
                      fonctionner.{" "}
                      <a
                        href={`/ads/accounts/${briefAdAccountId}/conversions`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold underline hover:text-amber-700"
                      >
                        Configurer le tracking ↗
                      </a>
                    </div>
                  ) : (
                    <>
                      <select
                        value={selectedConversionActionId ?? ""}
                        onChange={(e) =>
                          patch({
                            selectedConversionActionId: e.target.value || null,
                          })
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                      >
                        <option value="">
                          Aucune (optimise sur le pool global du compte)
                        </option>
                        {availableConversionActions
                          .filter((ca) => ca.status === "ENABLED")
                          .map((ca) => (
                            <option key={ca.id} value={ca.id}>
                              {ca.name} ({ca.category})
                            </option>
                          ))}
                      </select>
                      <p className="mt-1.5 text-xs text-zinc-500">
                        Avec une conversion liée, le bidding s'optimise{" "}
                        <strong>uniquement</strong> sur ce goal — plus prédictif
                        que d'utiliser tout l'historique du compte.
                      </p>
                    </>
                  )}
                </div>

                {/* Negative keywords */}
                <div>
                  <label className="block text-sm font-semibold text-zinc-900 mb-2">
                    Mots-clés négatifs (anti-gaspillage)
                  </label>
                  <textarea
                    value={negativeKeywordsText}
                    onChange={(e) =>
                      patch({ negativeKeywordsText: e.target.value })
                    }
                    rows={5}
                    placeholder={`gratuit\nemploi\ntutoriel\nstage`}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono focus:border-brand focus:outline-none"
                  />
                  <p className="mt-1.5 text-xs text-zinc-500">
                    Un mot-clé par ligne. Match type{" "}
                    <code className="bg-zinc-100 px-1 rounded">PHRASE</code>.
                    Exclut les recherches qui contiennent ce groupe de mots.
                    Anti-gaspillage budget sur des intents non-acheteurs
                    ("gratuit", "tutoriel", "emploi" si vous vendez du service
                    payant).
                  </p>
                  {parseNegativeKeywordsCount(negativeKeywordsText) > 0 && (
                    <p className="mt-1 text-xs text-emerald-700 font-semibold">
                      {parseNegativeKeywordsCount(negativeKeywordsText)}{" "}
                      mot(s)-clé(s) seront ajoutés à la campagne
                    </p>
                  )}
                </div>
              </div>
            </Section>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-zinc-200 px-6 py-4 flex gap-2 z-10">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-zinc-300 bg-white text-zinc-700 px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50 disabled:opacity-50"
          >
            Annuler
          </button>
          {isCreate && (
            <button
              onClick={onSaveDraft}
              disabled={busy || briefName.trim().length < 2}
              className="flex-1 rounded-lg border border-brand/40 bg-brand/5 text-brand-700 px-4 py-2.5 text-sm font-semibold hover:bg-brand/10 disabled:opacity-40"
            >
              💾 Sauver brouillon
            </button>
          )}
          <button
            onClick={onSubmit}
            disabled={busy || (isMeta && !imageUrl) || (isCreate && briefName.trim().length < 2)}
            className="flex-1 rounded-lg bg-brand text-white px-4 py-2.5 text-sm font-semibold hover:bg-brand/90 disabled:opacity-40"
          >
            {busyAction === "pushing"
              ? "Publication en cours…"
              : isCreate
                ? "🚀 Créer et lancer"
                : "🚀 Pousser la campagne"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  hint,
  expanded,
  onToggle,
  disabled,
  children,
}: {
  title: string;
  hint?: string;
  expanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 hover:bg-zinc-100 transition disabled:opacity-50"
      >
        <div className="text-left">
          <div className="text-sm font-semibold text-zinc-800">{title}</div>
          {hint && <div className="text-[11px] text-zinc-500 mt-0.5">{hint}</div>}
        </div>
        <span className={`text-zinc-400 text-lg transition-transform ${expanded ? "rotate-180" : ""}`}>
          ⌄
        </span>
      </button>
      {expanded && <div className="p-4">{children}</div>}
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start gap-3 py-2 cursor-pointer ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-1 h-4 w-4 rounded border-zinc-300 text-brand focus:ring-brand"
      />
      <div className="flex-1">
        <div className="text-sm font-medium text-zinc-800">{label}</div>
        {hint && <div className="text-[11px] text-zinc-500 mt-0.5">{hint}</div>}
      </div>
    </label>
  );
}

function DestinationWidget({
  state,
  patch,
  onSelectWanapushSite,
  onVerifyExternalPixel,
}: {
  state: PushModalState;
  patch: (p: Partial<PushModalState>) => void;
  onSelectWanapushSite: (siteId: string) => void;
  onVerifyExternalPixel: () => void;
}) {
  const {
    destinationMode,
    wanapushSites,
    availablePixels,
    selectedSiteId,
    externalUrl,
    externalPixelId,
    pixelVerifyResult,
    busyAction,
  } = state;
  const busy = busyAction !== null;
  const verifying = busyAction === "verifying-pixel";
  const loading = busyAction === "loading-destinations";

  const sitesReady = wanapushSites.filter((s) => s.pixelId && s.pixelEnabled);
  const sitesNoPixel = wanapushSites.filter((s) => !s.pixelId);

  const pixelSnippet = `<!-- Meta Pixel — installé par WanaPush -->
<script>
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
  document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '${externalPixelId || "PIXEL_ID"}');
  fbq('track', 'PageView');
</script>
<noscript>
  <img height="1" width="1" style="display:none"
    src="https://www.facebook.com/tr?id=${externalPixelId || "PIXEL_ID"}&ev=PageView&noscript=1"/>
</noscript>
<!-- End Meta Pixel -->`;

  return (
    <div className="rounded-xl border-2 border-zinc-200 p-4 space-y-3">
      <div>
        <div className="text-sm font-bold flex items-center gap-2">
          🎯 Où veux-tu envoyer le trafic ?
        </div>
        <p className="text-[11px] text-zinc-500 mt-0.5">
          La destination détermine quelle URL et quel Pixel seront utilisés pour mesurer les
          conversions.
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            { mode: "wanapush_site", label: "✨ Site WanaPush", hint: "Pixel auto" },
            { mode: "external_with_pixel", label: "🔗 Externe + Pixel", hint: "Déjà installé" },
            { mode: "external_install", label: "📋 Externe à installer", hint: "Code à coller" },
          ] as Array<{ mode: DestinationMode; label: string; hint: string }>
        ).map((t) => {
          const active = destinationMode === t.mode;
          return (
            <button
              key={t.mode}
              type="button"
              onClick={() => patch({ destinationMode: t.mode, pixelVerifyResult: null })}
              disabled={busy}
              className={`rounded-lg border px-3 py-2 text-left transition ${
                active
                  ? "border-brand bg-brand/10 text-brand-700"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
              }`}
            >
              <div className="text-xs font-semibold">{t.label}</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">{t.hint}</div>
            </button>
          );
        })}
      </div>

      {/* === MODE A : Site WanaPush === */}
      {destinationMode === "wanapush_site" && (
        <div className="space-y-2">
          {loading ? (
            <div className="text-xs text-zinc-500 py-3 text-center">Chargement des sites…</div>
          ) : wanapushSites.length === 0 ? (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
              Aucun site généré encore. Crée d&apos;abord un site via{" "}
              <a href="/generate" className="underline font-semibold">
                Générateur de site
              </a>{" "}
              ou bascule sur "Externe".
            </div>
          ) : (
            <>
              {sitesReady.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-semibold text-emerald-700">
                    ✓ Sites prêts (Pixel installé)
                  </div>
                  {sitesReady.map((s) => {
                    const active = selectedSiteId === s.siteId;
                    return (
                      <button
                        key={s.siteId}
                        type="button"
                        onClick={() => onSelectWanapushSite(s.siteId)}
                        disabled={busy}
                        className={`w-full text-left rounded-lg border px-3 py-2 text-xs transition ${
                          active
                            ? "border-brand bg-brand/10"
                            : "border-emerald-200 bg-emerald-50/40 hover:border-emerald-300"
                        }`}
                      >
                        <div className="font-semibold text-zinc-800">{s.slug}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">{s.url}</div>
                        <div className="text-[10px] text-emerald-700 mt-0.5">
                          ✓ Pixel{" "}
                          <span className="font-mono">
                            {s.pixelName ?? s.pixelId} ({s.pixelId?.slice(0, 8)}…)
                          </span>
                          {s.events.length > 0 && (
                            <span> · Events : {s.events.slice(0, 4).join(", ")}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {sitesNoPixel.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="text-[10px] uppercase font-semibold text-zinc-500">
                    Sites sans Pixel (à configurer)
                  </div>
                  {sitesNoPixel.map((s) => (
                    <div
                      key={s.siteId}
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs flex justify-between items-center"
                    >
                      <div>
                        <div className="font-semibold text-zinc-700">{s.slug}</div>
                        <div className="text-[10px] text-zinc-500">Pas de Pixel sur ce site</div>
                      </div>
                      <a
                        href={`/generated-sites/${s.siteId}/pixel`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-brand-700 underline"
                      >
                        Configurer →
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* === MODE B : Site externe avec Pixel déjà installé === */}
      {destinationMode === "external_with_pixel" && (
        <div className="space-y-2">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-semibold text-zinc-500">
              URL du site externe
            </label>
            <input
              type="text"
              value={externalUrl}
              onChange={(e) => patch({ externalUrl: e.target.value, pixelVerifyResult: null })}
              disabled={busy}
              placeholder="https://monsite.com/landing"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-semibold text-zinc-500">
              Pixel Meta installé sur cette URL
            </label>
            {availablePixels.length > 0 ? (
              <select
                value={externalPixelId}
                onChange={(e) =>
                  patch({ externalPixelId: e.target.value, pixelVerifyResult: null })
                }
                disabled={busy}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand focus:outline-none bg-white"
              >
                <option value="">— Choisir un Pixel —</option>
                {availablePixels.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={externalPixelId}
                onChange={(e) =>
                  patch({ externalPixelId: e.target.value, pixelVerifyResult: null })
                }
                disabled={busy}
                placeholder="Pixel ID (ex : 2760118177582499)"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
            )}
          </div>
          <button
            type="button"
            onClick={onVerifyExternalPixel}
            disabled={busy || !externalUrl.trim() || !externalPixelId.trim()}
            className="w-full rounded-lg bg-brand text-white px-3 py-2 text-sm font-semibold disabled:opacity-40 hover:bg-brand/90"
          >
            {verifying ? "Vérification…" : "🔍 Vérifier l'installation du Pixel"}
          </button>
          {pixelVerifyResult && (
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                pixelVerifyResult.found
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              {pixelVerifyResult.found ? "✓ " : "⚠️ "}
              {pixelVerifyResult.hint ?? pixelVerifyResult.error ?? "Vérification effectuée"}
            </div>
          )}
        </div>
      )}

      {/* === MODE C : Site externe à installer === */}
      {destinationMode === "external_install" && (
        <div className="space-y-2">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-semibold text-zinc-500">
              URL du site externe
            </label>
            <input
              type="text"
              value={externalUrl}
              onChange={(e) => patch({ externalUrl: e.target.value, pixelVerifyResult: null })}
              disabled={busy}
              placeholder="https://monsite.com/landing"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-semibold text-zinc-500">
              Quel Pixel utiliser ?
            </label>
            <select
              value={externalPixelId}
              onChange={(e) =>
                patch({ externalPixelId: e.target.value, pixelVerifyResult: null })
              }
              disabled={busy}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand focus:outline-none bg-white"
            >
              <option value="">— Choisir le Pixel à installer —</option>
              {availablePixels.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.id})
                </option>
              ))}
            </select>
          </div>
          {externalPixelId && (
            <div className="rounded-lg bg-zinc-900 text-zinc-100 p-3 text-[11px] font-mono leading-snug overflow-x-auto">
              <div className="flex items-center justify-between mb-1.5 -mt-1">
                <span className="text-zinc-400 text-[10px] uppercase font-semibold">
                  📋 Code à coller dans &lt;head&gt;
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(pixelSnippet);
                  }}
                  className="text-[10px] bg-zinc-700 hover:bg-zinc-600 text-white px-2 py-0.5 rounded font-sans"
                >
                  Copier
                </button>
              </div>
              <pre className="whitespace-pre-wrap break-all text-[10px]">{pixelSnippet}</pre>
            </div>
          )}
          <p className="text-[11px] text-zinc-500">
            Colle ce code dans la balise <code className="bg-zinc-100 px-1 rounded">&lt;head&gt;</code>{" "}
            de chaque page du site. Recharge la page une fois, puis clique sur Vérifier.
          </p>
          <button
            type="button"
            onClick={onVerifyExternalPixel}
            disabled={busy || !externalUrl.trim() || !externalPixelId.trim()}
            className="w-full rounded-lg bg-brand text-white px-3 py-2 text-sm font-semibold disabled:opacity-40 hover:bg-brand/90"
          >
            {verifying ? "Vérification…" : "✓ J'ai installé, vérifier"}
          </button>
          {pixelVerifyResult && (
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                pixelVerifyResult.found
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              {pixelVerifyResult.found ? "✓ " : "⚠️ "}
              {pixelVerifyResult.hint ?? pixelVerifyResult.error ?? "Vérification effectuée"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
