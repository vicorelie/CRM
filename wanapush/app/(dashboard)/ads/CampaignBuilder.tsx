"use client";

import { useEffect, useState } from "react";
import { CreativePreview } from "./CreativePreview";
import {
  AdPlatform,
  CampaignObjective,
  COPY_LIMITS,
  CopyTone,
  GeneratedVariant,
  OBJECTIVE_LABEL,
  PLATFORM_META,
  TONE_LABEL,
} from "./types";

type AudienceLite = {
  id: string;
  name: string;
  description: string;
  size: string | null;
};

type AdAccountLite = {
  id: string;
  platform: AdPlatform;
  name: string;
  currency: string | null;
  status: string;
};

type Props = {
  onSaved: () => void;
};

const PLATFORM_ORDER: AdPlatform[] = [
  "META_ADS",
  "GOOGLE_ADS",
  "TIKTOK_ADS",
  "LINKEDIN_ADS",
];
const OBJECTIVE_ORDER: CampaignObjective[] = [
  "AWARENESS",
  "TRAFFIC",
  "LEADS",
  "CONVERSIONS",
  "APP_INSTALLS",
  "ENGAGEMENT",
];
const TONE_ORDER: CopyTone[] = [
  "DIRECT",
  "PREMIUM",
  "FRIENDLY",
  "URGENT",
  "STORYTELLING",
];

export function CampaignBuilder({ onSaved }: Props) {
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<AdPlatform>("META_ADS");
  const [objective, setObjective] = useState<CampaignObjective>("CONVERSIONS");
  const [product, setProduct] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState<CopyTone>("DIRECT");
  const [budget, setBudget] = useState<string>("");

  const [audiences, setAudiences] = useState<AudienceLite[]>([]);
  const [selectedAudienceId, setSelectedAudienceId] = useState<string>("");

  const [adAccounts, setAdAccounts] = useState<AdAccountLite[]>([]);
  const [adAccountId, setAdAccountId] = useState<string>("");

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [variants, setVariants] = useState<GeneratedVariant[] | null>(null);

  useEffect(() => {
    fetch("/api/ads/audiences")
      .then((r) => r.json())
      .then((j) => setAudiences(j.audiences ?? []))
      .catch(() => {});
    fetch("/api/ads/accounts")
      .then((r) => r.json())
      .then((j) => setAdAccounts(j.accounts ?? []))
      .catch(() => {});
  }, []);

  // Auto-select premier compte pub correspondant à la plateforme
  const platformAccounts = adAccounts.filter((a) => a.platform === platform);
  useEffect(() => {
    if (platformAccounts.length === 0) {
      setAdAccountId("");
      return;
    }
    const current = platformAccounts.find((a) => a.id === adAccountId);
    if (!current) setAdAccountId(platformAccounts[0].id);
  }, [platform, adAccounts]); // eslint-disable-line react-hooks/exhaustive-deps

  function pickAudience(id: string) {
    setSelectedAudienceId(id);
    if (!id) return;
    const found = audiences.find((a) => a.id === id);
    if (found) setAudience(found.description);
  }

  async function handleGenerate() {
    setError(null);
    setVariants(null);

    if (product.trim().length < 3 || audience.trim().length < 3) {
      setError("Renseigne au moins le produit et l'audience.");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/ads/generate-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          objective,
          product,
          audience,
          tone,
          variants: 3,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Échec de la génération");
        return;
      }
      setVariants(json.variants ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setError(null);
    if (name.trim().length < 2) {
      setError("Donne un nom à la campagne.");
      return;
    }

    setSaving(true);
    try {
      if (!adAccountId) {
        setError(
          platformAccounts.length === 0
            ? `Aucun compte ${PLATFORM_META[platform].label} connecté. Va dans Comptes pub d'abord.`
            : "Sélectionne un compte publicitaire.",
        );
        setSaving(false);
        return;
      }
      const res = await fetch("/api/ads/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type: platform,
          adAccountId,
          status: "DRAFT",
          budget: budget ? Number(budget) : undefined,
          results: {
            objective,
            product,
            audience,
            tone,
            variants: variants ?? [],
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Échec de la sauvegarde");
        return;
      }
      onSaved();
      setName("");
      setBudget("");
      setVariants(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white/60 backdrop-blur p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nom de la campagne">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Promo printemps formation"
              className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Budget total (€)">
            <input
              type="number"
              min="0"
              step="10"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="500"
              className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm"
            />
          </Field>
        </div>

        <Field label="Plateforme">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {PLATFORM_ORDER.map((p) => {
              const meta = PLATFORM_META[p];
              const active = platform === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className={`rounded-lg border px-3 py-2.5 text-sm flex items-center justify-center gap-2 transition-colors ${
                    active
                      ? "border-brand bg-brand/15 text-brand-700"
                      : "border-zinc-200 bg-white/40 text-zinc-700 hover:border-zinc-300"
                  }`}
                >
                  <span>{meta.emoji}</span>
                  <span className="font-semibold">{meta.label}</span>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Compte publicitaire">
          {platformAccounts.length === 0 ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Aucun compte {PLATFORM_META[platform].label} connecté.{" "}
              <a href="/ads" className="font-semibold underline">
                Va dans Comptes pub
              </a>{" "}
              pour le connecter.
            </div>
          ) : (
            <select
              value={adAccountId}
              onChange={(e) => setAdAccountId(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm"
            >
              {platformAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.currency ? ` (${a.currency})` : ""}
                  {a.status !== "CONNECTED" ? ` — ${a.status}` : ""}
                </option>
              ))}
            </select>
          )}
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Objectif">
            <select
              value={objective}
              onChange={(e) => setObjective(e.target.value as CampaignObjective)}
              className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm"
            >
              {OBJECTIVE_ORDER.map((o) => (
                <option key={o} value={o}>
                  {OBJECTIVE_LABEL[o]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ton">
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as CopyTone)}
              className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm"
            >
              {TONE_ORDER.map((t) => (
                <option key={t} value={t}>
                  {TONE_LABEL[t]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Produit / service">
          <textarea
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            rows={3}
            placeholder="Ex : Formation 8 semaines pour devenir expert SEO IA, certifiée, 100% en ligne, suivi 1:1."
            className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Audience cible">
          {audiences.length > 0 && (
            <select
              value={selectedAudienceId}
              onChange={(e) => pickAudience(e.target.value)}
              className="mb-2 w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-xs"
            >
              <option value="">— Choisir depuis la bibliothèque —</option>
              {audiences.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.size ? ` (${a.size})` : ""}
                </option>
              ))}
            </select>
          )}
          <textarea
            value={audience}
            onChange={(e) => {
              setAudience(e.target.value);
              setSelectedAudienceId("");
            }}
            rows={2}
            placeholder="Ex : Freelances marketing 25-40 ans, FR, qui veulent monter leur agence solo et atteindre 10k€/mois."
            className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm"
          />
        </Field>

        <div className="flex items-center justify-end gap-3">
          {error && <span className="text-sm text-rose-400 mr-auto">{error}</span>}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-lg bg-brand hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold text-white"
          >
            {generating ? "Génération…" : "✨ Générer 3 variantes IA"}
          </button>
        </div>
      </div>

      {variants && variants.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>{PLATFORM_META[platform].emoji}</span>
            Variantes A/B générées
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {variants.map((v, i) => (
              <VariantCard key={i} index={i} variant={v} platform={platform} />
            ))}
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-zinc-700">
              Aperçu creative — Variante A
            </h4>
            <CreativePreview platform={platform} copy={variants[0].copy} />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white"
            >
              {saving ? "Sauvegarde…" : "💾 Sauvegarder la campagne"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
        {label}
      </span>
      {children}
    </label>
  );
}

function VariantCard({
  index,
  variant,
  platform,
}: {
  index: number;
  variant: GeneratedVariant;
  platform: AdPlatform;
}) {
  const c = variant.copy;
  return (
    <div className="rounded-xl border border-zinc-200 bg-white/40 p-4 space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-brand/15 text-brand-700 px-2 py-0.5 text-xs font-medium">
          Variante {String.fromCharCode(65 + index)}
        </span>
        <span className="text-xs text-zinc-400 italic">{variant.angle}</span>
      </div>

      {platform === "META_ADS" && (
        <>
          <CopyLine label="Texte principal" value={c.primary_text} platform={platform} field="primary_text" />
          <CopyLine label="Titre" value={c.headline} platform={platform} field="headline" />
          <CopyLine label="Description" value={c.description} platform={platform} field="description" />
          <CopyLine label="CTA" value={c.cta} platform={platform} field="cta" />
        </>
      )}
      {platform === "GOOGLE_ADS" && (
        <>
          <CopyLine label="Titres (3)" value={c.headlines} platform={platform} field="headlines" />
          <CopyLine label="Descriptions (2)" value={c.descriptions} platform={platform} field="descriptions" />
          <CopyLine label="Chemin d'affichage" value={c.display_path} platform={platform} field="display_path" />
        </>
      )}
      {platform === "TIKTOK_ADS" && (
        <>
          <CopyLine label="Hook" value={c.hook} platform={platform} field="hook" />
          <CopyLine label="Texte" value={c.text} platform={platform} field="text" />
          <CopyLine label="CTA" value={c.cta} platform={platform} field="cta" />
        </>
      )}
      {platform === "LINKEDIN_ADS" && (
        <>
          <CopyLine label="Texte d'intro" value={c.intro_text} platform={platform} field="intro_text" />
          <CopyLine label="Titre" value={c.headline} platform={platform} field="headline" />
          <CopyLine label="Description" value={c.description} platform={platform} field="description" />
          <CopyLine label="CTA" value={c.cta} platform={platform} field="cta" />
        </>
      )}

      <button
        type="button"
        onClick={() => {
          const txt = JSON.stringify(c, null, 2);
          navigator.clipboard.writeText(txt);
        }}
        className="text-xs text-zinc-400 hover:text-brand-700 transition-colors"
      >
        📋 Copier
      </button>
    </div>
  );
}

function CopyLine({
  label,
  value,
  platform,
  field,
}: {
  label: string;
  value: string | string[] | undefined;
  platform: AdPlatform;
  field: string;
}) {
  if (!value) return null;
  const items = Array.isArray(value) ? value : [value];
  const limit = COPY_LIMITS[platform]?.[field];
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-zinc-400 mb-0.5">
        <span>{label}</span>
        {limit && (
          <span className="font-mono text-[10px] normal-case">
            limite {limit.hard}c
          </span>
        )}
      </div>
      <div className="space-y-1">
        {items.map((it, i) => {
          const len = it.length;
          const overSoft = limit && len > limit.soft;
          const overHard = limit && len > limit.hard;
          return (
            <div key={i} className="flex items-start gap-2">
              <div className="flex-1 text-zinc-800 leading-snug whitespace-pre-wrap break-words">
                {it}
              </div>
              {limit && (
                <span
                  className={`shrink-0 text-[10px] font-mono rounded px-1.5 py-0.5 ${
                    overHard
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : overSoft
                        ? "bg-amber-50 text-amber-800"
                        : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {len}/{limit.hard}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
