"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Platform = "META_ADS" | "GOOGLE_ADS";
type Objective = "TRAFFIC" | "LEADS" | "CONVERSIONS" | "AWARENESS";

type AdAccountOption = {
  id: string;
  externalId: string;
  name: string;
  platform: string;
  currency: string | null;
};

type CopyVariant = {
  angle: string;
  primaryText?: string;
  headline?: string;
  description?: string;
  cta?: string;
};

// Meta needs image. Google Search doesn't.
// Steps for Meta: config → image → generating → review → pushing → done
// Steps for Google: config → generating → review → pushing → done
type Step = "config" | "image" | "generating" | "review" | "pushing" | "done";

type Site = {
  id: string;
  brandName: string;
  sector: string;
  siteSlug: string | null;
  audience?: string | null;
  tone?: string | null;
  lang?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
};

const OBJECTIVE_LABELS: Record<Objective, string> = {
  TRAFFIC: "Trafic vers le site",
  LEADS: "Génération de leads",
  CONVERSIONS: "Conversions / Ventes",
  AWARENESS: "Notoriété",
};

const PLATFORM_LABELS: Record<Platform, string> = {
  META_ADS: "Meta Ads (Facebook & Instagram)",
  GOOGLE_ADS: "Google Ads (Search)",
};

// Map WanaPush tones → image API tones
function mapTone(tone: string | null | undefined): "professional" | "casual" | "luxury" | "playful" {
  if (tone === "PREMIUM") return "luxury";
  if (tone === "FRIENDLY") return "casual";
  return "professional";
}

export function CampaignFromSiteModal({
  site,
  onClose,
}: {
  site: Site;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("config");

  // Step 1 — config
  const [platform, setPlatform] = useState<Platform>("META_ADS");
  const [objective, setObjective] = useState<Objective>("TRAFFIC");
  const [dailyBudget, setDailyBudget] = useState(10);
  const [adAccountId, setAdAccountId] = useState("");
  const [accounts, setAccounts] = useState<AdAccountOption[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Step 2 — image (Meta only)
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageGenerating, setImageGenerating] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Step 3 — copy
  const [variants, setVariants] = useState<CopyVariant[]>([]);
  const [genError, setGenError] = useState<string | null>(null);

  // Step done
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);

  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetch("/api/ads/accounts")
      .then((r) => r.json())
      .then((json) => {
        const all: AdAccountOption[] = (json.accounts ?? []).map(
          (a: { id: string; externalId: string; name: string; platform: string; currency: string | null }) => ({
            id: a.id,
            externalId: a.externalId,
            name: a.name,
            platform: a.platform,
            currency: a.currency,
          }),
        );
        setAccounts(all);
        const first = all.find((a) => a.platform === platform);
        if (first) setAdAccountId(first.externalId);
      })
      .catch(() => {})
      .finally(() => setLoadingAccounts(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const first = accounts.find((a) => a.platform === platform);
    setAdAccountId(first?.externalId ?? "");
    // Reset image when switching platforms
    setImageUrl(null);
    setImageError(null);
  }, [platform, accounts]);

  const filteredAccounts = accounts.filter((a) => a.platform === platform);

  // ── Image generation (Meta only) ──
  async function generateImage() {
    setImageGenerating(true);
    setImageError(null);
    const colors = [site.primaryColor, site.secondaryColor].filter(Boolean) as string[];
    try {
      const res = await fetch("/api/ads/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: {
            productOrService: [site.brandName, site.sector].filter(Boolean).join(" — "),
            audience: site.audience ?? undefined,
            tone: mapTone(site.tone),
            brandColors: colors.length > 0 ? colors : undefined,
          },
          size: "square",
          style: "vivid",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setImageError(json?.error ?? "Erreur génération image");
      } else {
        setImageUrl(json.url as string);
      }
    } catch (e) {
      setImageError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setImageGenerating(false);
    }
  }

  // Called when user clicks "Suivant" on config step
  async function handleNextFromConfig() {
    if (platform === "META_ADS") {
      setStep("image");
      // Auto-trigger image generation immediately
      setImageGenerating(true);
      setImageError(null);
      const colors = [site.primaryColor, site.secondaryColor].filter(Boolean) as string[];
      try {
        const res = await fetch("/api/ads/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brief: {
              productOrService: [site.brandName, site.sector].filter(Boolean).join(" — "),
              audience: site.audience ?? undefined,
              tone: mapTone(site.tone),
              brandColors: colors.length > 0 ? colors : undefined,
            },
            size: "square",
            style: "vivid",
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          setImageError(json?.error ?? "Erreur génération image");
        } else {
          setImageUrl(json.url as string);
        }
      } catch (e) {
        setImageError(e instanceof Error ? e.message : "Erreur réseau");
      } finally {
        setImageGenerating(false);
      }
    } else {
      // Google: skip image step
      await handleGenerateCopy();
    }
  }

  // ── Copy generation ──
  async function handleGenerateCopy() {
    setStep("generating");
    setGenError(null);
    try {
      const res = await fetch("/api/ads/generate-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          objective,
          product: [site.brandName, site.sector].filter(Boolean).join(" — "),
          audience: site.audience ?? "Particuliers et professionnels intéressés",
          tone: site.tone ?? "DIRECT",
          lang: site.lang ?? "fr",
          variants: 3,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setGenError(json?.error ?? "Erreur génération copy");
        setStep(platform === "META_ADS" ? "image" : "config");
        return;
      }
      const raw = (json.variants ?? []) as Array<{ angle: string; copy: Record<string, unknown> }>;
      const normalised: CopyVariant[] = raw.map((v) => {
        const c = v.copy ?? {};
        if (platform === "GOOGLE_ADS") {
          const headlines = Array.isArray(c.headlines) ? (c.headlines as string[]) : [];
          const descs = Array.isArray(c.descriptions) ? (c.descriptions as string[]) : [];
          return { angle: v.angle, headline: headlines[0] ?? "", description: descs[0] ?? "" };
        }
        return {
          angle: v.angle,
          primaryText: (c.primary_text as string) ?? "",
          headline: (c.headline as string) ?? "",
          description: (c.description as string) ?? "",
          cta: (c.cta as string) ?? "",
        };
      });
      setVariants(normalised);
      setStep("review");
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Erreur réseau");
      setStep(platform === "META_ADS" ? "image" : "config");
    }
  }

  // ── Launch ──
  async function handleLaunch() {
    setStep("pushing");
    setPushError(null);
    try {
      const res = await fetch("/api/ads/campaigns/from-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: site.id,
          adAccountId,
          platform,
          objective,
          dailyBudget,
          copyVariants: variants.map((v) => ({
            primaryText: v.primaryText,
            headline: v.headline,
            description: v.description,
            cta: v.cta,
          })),
          imageUrl: imageUrl ?? undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPushError(json?.error ?? "Erreur lors du push de la campagne");
        setStep("review");
        return;
      }
      setCampaignId(json.campaignId ?? null);
      setStep("done");
    } catch (e) {
      setPushError(e instanceof Error ? e.message : "Erreur réseau");
      setStep("review");
    }
  }

  function patchVariant(index: number, patch: Partial<CopyVariant>) {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  // Step labels & indicator logic
  const metaSteps = ["config", "image", "generating", "review"] as const;
  const googleSteps = ["config", "generating", "review"] as const;
  const activeSteps = platform === "META_ADS" ? metaSteps : googleSteps;
  const stepLabels: Record<string, string> = {
    config: "Config",
    image: "Visuel",
    generating: "Copy IA",
    review: "Revue",
  };
  const effectiveStep = step === "pushing" ? "review" : step;
  const currentIndex = (activeSteps as readonly string[]).indexOf(effectiveStep);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Lancer une campagne</h2>
            <p className="text-xs text-zinc-500 truncate max-w-xs">{site.brandName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-zinc-100 transition-colors text-zinc-400 hover:text-zinc-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        {step !== "done" && (
          <div className="px-5 pt-3 pb-0 flex items-center gap-2">
            {activeSteps.map((s, i) => {
              const done = i < currentIndex;
              const active = i === currentIndex;
              return (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div
                    className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${
                      done
                        ? "bg-emerald-500 text-white"
                        : active
                          ? "bg-brand text-white"
                          : "bg-zinc-200 text-zinc-500"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </div>
                  <span className={`text-xs ${active ? "text-zinc-900 font-medium" : "text-zinc-400"}`}>
                    {stepLabels[s]}
                  </span>
                  {i < activeSteps.length - 1 && <div className="flex-1 h-px bg-zinc-200" />}
                </div>
              );
            })}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ── Step 1: Config ── */}
          {step === "config" && (
            <>
              {genError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                  {genError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700">Plateforme</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["META_ADS", "GOOGLE_ADS"] as Platform[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlatform(p)}
                      className={`rounded-xl border-2 px-3 py-2.5 text-left text-xs transition-all ${
                        platform === p
                          ? "border-brand bg-brand/5 text-brand-700 font-semibold"
                          : "border-zinc-200 hover:border-zinc-300 text-zinc-600"
                      }`}
                    >
                      <div className="font-semibold">
                        {p === "META_ADS" ? "Meta Ads" : "Google Ads"}
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">
                        {p === "META_ADS" ? "Facebook & Instagram" : "Search & Shopping"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700">Compte publicitaire</label>
                {loadingAccounts ? (
                  <div className="text-xs text-zinc-400">Chargement…</div>
                ) : filteredAccounts.length === 0 ? (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                    Aucun compte {PLATFORM_LABELS[platform]} connecté.{" "}
                    <Link href="/ads" className="underline font-medium">
                      Connecter un compte →
                    </Link>
                  </div>
                ) : (
                  <select
                    value={adAccountId}
                    onChange={(e) => setAdAccountId(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand/30"
                  >
                    {filteredAccounts.map((a) => (
                      <option key={a.externalId} value={a.externalId}>
                        {a.name} ({a.externalId}){a.currency ? ` — ${a.currency}` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700">Objectif</label>
                <select
                  value={objective}
                  onChange={(e) => setObjective(e.target.value as Objective)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand/30"
                >
                  {(Object.keys(OBJECTIVE_LABELS) as Objective[]).map((o) => (
                    <option key={o} value={o}>
                      {OBJECTIVE_LABELS[o]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700">Budget journalier (€)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    step={1}
                    value={dailyBudget}
                    onChange={(e) => setDailyBudget(Math.max(1, Number(e.target.value)))}
                    className="w-28 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                  <div className="flex gap-1">
                    {[5, 10, 20, 50].map((v) => (
                      <button
                        key={v}
                        onClick={() => setDailyBudget(v)}
                        className={`text-[11px] rounded-lg px-2 py-1 border transition-colors ${
                          dailyBudget === v
                            ? "border-brand bg-brand/5 text-brand-700 font-semibold"
                            : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
                        }`}
                      >
                        {v}€
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-zinc-400">≈ {(dailyBudget * 30).toFixed(0)} €/mois estimé</p>
              </div>

              {(site.audience || site.tone) && (
                <div className="rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2 space-y-1">
                  <p className="text-[11px] font-medium text-zinc-600">Contexte IA (depuis ton site)</p>
                  {site.audience && (
                    <p className="text-[11px] text-zinc-500">
                      <span className="font-medium">Audience :</span> {site.audience}
                    </p>
                  )}
                  {site.tone && (
                    <p className="text-[11px] text-zinc-500">
                      <span className="font-medium">Ton :</span> {site.tone.toLowerCase()}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Step 2: Image (Meta only) ── */}
          {step === "image" && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-500">
                Claude génère un visuel publicitaire aux couleurs de ta marque. Tu peux le regénérer ou continuer sans image (Meta utilisera son créatif automatique).
              </p>

              <div className="relative rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-50 aspect-square flex items-center justify-center">
                {imageGenerating && (
                  <div className="flex flex-col items-center gap-3">
                    <svg className="w-8 h-8 text-brand animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
                    </svg>
                    <p className="text-xs text-zinc-500">Génération du visuel…</p>
                  </div>
                )}
                {!imageGenerating && imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt="Visuel publicitaire généré"
                    className="w-full h-full object-cover"
                  />
                )}
                {!imageGenerating && !imageUrl && imageError && (
                  <div className="flex flex-col items-center gap-2 px-6 text-center">
                    <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" strokeLinecap="round" />
                    </svg>
                    <p className="text-xs text-red-600">{imageError}</p>
                  </div>
                )}
                {!imageGenerating && !imageUrl && !imageError && (
                  <div className="flex flex-col items-center gap-2 text-zinc-400">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="m21 15-5-5L5 21" /><circle cx="8.5" cy="8.5" r="1.5" />
                    </svg>
                    <p className="text-xs">Aucun visuel</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={generateImage}
                  disabled={imageGenerating}
                  className="flex-1 rounded-lg border border-zinc-200 hover:border-brand/40 hover:bg-brand/5 transition-colors px-3 py-2 text-xs text-zinc-700 hover:text-brand-700 font-medium disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
                >
                  <svg className={`w-3.5 h-3.5 ${imageGenerating ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Regénérer
                </button>
              </div>
            </div>
          )}

          {/* ── Step generating (copy) ── */}
          {step === "generating" && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-brand animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
                </svg>
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-zinc-900">Génération des copies IA…</p>
                <p className="text-xs text-zinc-500">
                  Claude rédige 3 variantes A/B pour {PLATFORM_LABELS[platform]}.
                </p>
              </div>
            </div>
          )}

          {/* ── Step 3: Review ── */}
          {(step === "review" || step === "pushing") && (
            <>
              {pushError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                  {pushError}
                </div>
              )}

              {/* Image thumbnail for Meta */}
              {platform === "META_ADS" && imageUrl && (
                <div className="flex items-center gap-3 rounded-xl bg-zinc-50 border border-zinc-200 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="Visuel" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-zinc-700">Visuel publicitaire</p>
                    <p className="text-[11px] text-zinc-400">Sera utilisé dans toutes les variantes</p>
                  </div>
                </div>
              )}
              {platform === "META_ADS" && !imageUrl && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                  Aucun visuel — Meta utilisera son créatif automatique Advantage+.
                </div>
              )}

              <p className="text-xs text-zinc-500">
                Vérifie et ajuste les copies avant le lancement. Toutes les variantes seront poussées en A/B.
              </p>
              <div className="space-y-3">
                {variants.map((v, i) => (
                  <VariantCard
                    key={i}
                    index={i}
                    platform={platform}
                    variant={v}
                    onChange={(patch) => patchVariant(i, patch)}
                    disabled={step === "pushing"}
                  />
                ))}
              </div>
            </>
          )}

          {/* ── Done ── */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-8 gap-5 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-2xl">
                🚀
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold text-zinc-900">Campagne lancée !</p>
                <p className="text-xs text-zinc-500">
                  Ta campagne {PLATFORM_LABELS[platform]} est en ligne, statut{" "}
                  <strong>PAUSED</strong> — active-la depuis ton gestionnaire de pub.
                </p>
              </div>
              {campaignId && (
                <div className="rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-3 text-left w-full space-y-1">
                  <p className="text-[11px] text-zinc-400">ID Campagne WanaPush</p>
                  <p className="text-xs font-mono text-zinc-700 truncate">{campaignId}</p>
                </div>
              )}
              <Link
                href="/ads"
                onClick={onClose}
                className="rounded-lg bg-brand hover:bg-brand-400 transition-colors px-5 py-2.5 text-sm font-semibold text-white inline-flex items-center gap-2"
              >
                Voir mes campagnes
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== "done" && (
          <div className="px-5 py-4 border-t border-zinc-200 flex justify-between items-center gap-3">
            {step === "config" && (
              <>
                <button
                  onClick={onClose}
                  className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleNextFromConfig}
                  disabled={!adAccountId || filteredAccounts.length === 0}
                  className="rounded-lg bg-brand hover:bg-brand-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors px-5 py-2 text-sm font-semibold text-white inline-flex items-center gap-2"
                >
                  {platform === "META_ADS" ? "Générer le visuel →" : "Générer les copies IA →"}
                </button>
              </>
            )}
            {step === "image" && (
              <>
                <button
                  onClick={() => setStep("config")}
                  className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
                >
                  ← Retour
                </button>
                <div className="flex items-center gap-2">
                  {!imageUrl && !imageGenerating && (
                    <button
                      onClick={handleGenerateCopy}
                      className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
                    >
                      Ignorer le visuel
                    </button>
                  )}
                  <button
                    onClick={handleGenerateCopy}
                    disabled={imageGenerating}
                    className="rounded-lg bg-brand hover:bg-brand-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors px-5 py-2 text-sm font-semibold text-white inline-flex items-center gap-2"
                  >
                    {imageGenerating ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
                        </svg>
                        Génération…
                      </>
                    ) : (
                      <>Générer les copies IA →</>
                    )}
                  </button>
                </div>
              </>
            )}
            {(step === "review" || step === "pushing") && (
              <>
                <button
                  onClick={() => setStep(platform === "META_ADS" ? "image" : "config")}
                  disabled={step === "pushing"}
                  className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors disabled:opacity-40"
                >
                  ← Retour
                </button>
                <button
                  onClick={handleLaunch}
                  disabled={step === "pushing" || variants.length === 0}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors px-5 py-2 text-sm font-semibold text-white inline-flex items-center gap-2"
                >
                  {step === "pushing" ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
                      </svg>
                      Lancement…
                    </>
                  ) : (
                    <>
                      Lancer sur {platform === "META_ADS" ? "Meta" : "Google"}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function VariantCard({
  index,
  platform,
  variant,
  onChange,
  disabled,
}: {
  index: number;
  platform: Platform;
  variant: CopyVariant;
  onChange: (patch: Partial<CopyVariant>) => void;
  disabled: boolean;
}) {
  const label = ["A", "B", "C", "D", "E"][index] ?? `${index + 1}`;
  return (
    <div className="rounded-xl border border-zinc-200 p-3 space-y-2.5 bg-zinc-50/50">
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-brand/10 text-brand-700 text-[11px] font-bold flex items-center justify-center flex-shrink-0">
          {label}
        </span>
        <span className="text-[11px] text-zinc-500 truncate italic">{variant.angle}</span>
      </div>
      {platform === "META_ADS" && (
        <>
          <Field label="Texte principal" value={variant.primaryText ?? ""} maxLen={125} onChange={(v) => onChange({ primaryText: v })} multiline disabled={disabled} />
          <Field label="Titre" value={variant.headline ?? ""} maxLen={40} onChange={(v) => onChange({ headline: v })} disabled={disabled} />
          <Field label="Description" value={variant.description ?? ""} maxLen={30} onChange={(v) => onChange({ description: v })} disabled={disabled} />
          <Field label="CTA" value={variant.cta ?? ""} maxLen={20} onChange={(v) => onChange({ cta: v })} disabled={disabled} />
        </>
      )}
      {platform === "GOOGLE_ADS" && (
        <>
          <Field label="Titre principal" value={variant.headline ?? ""} maxLen={30} onChange={(v) => onChange({ headline: v })} disabled={disabled} />
          <Field label="Description" value={variant.description ?? ""} maxLen={90} onChange={(v) => onChange({ description: v })} multiline disabled={disabled} />
        </>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  maxLen,
  onChange,
  multiline = false,
  disabled,
}: {
  label: string;
  value: string;
  maxLen: number;
  onChange: (v: string) => void;
  multiline?: boolean;
  disabled: boolean;
}) {
  const len = value.length;
  const over = len > maxLen;
  const baseClass = `w-full rounded-lg border px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none ${
    over ? "border-red-400 bg-red-50" : "border-zinc-200"
  } disabled:opacity-50`;
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-zinc-500">{label}</span>
        <span className={`text-[10px] tabular-nums ${over ? "text-red-500 font-semibold" : "text-zinc-400"}`}>
          {len}/{maxLen}
        </span>
      </div>
      {multiline ? (
        <textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={baseClass} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={baseClass} />
      )}
    </div>
  );
}
