"use client";

import { useEffect, useState } from "react";

type Props = { onSaved: () => void };

type GoogleAdAccount = {
  id: string;
  name: string | null;
  externalId: string;
  currency: string | null;
  status: string;
  meta: { customerId?: string; manager?: boolean } | null;
};

type Keyword = { text: string; matchType: "BROAD" | "PHRASE" | "EXACT" };

const COUNTRIES: Array<{ code: string; label: string }> = [
  { code: "FR", label: "🇫🇷 France" },
  { code: "BE", label: "🇧🇪 Belgique" },
  { code: "CH", label: "🇨🇭 Suisse" },
  { code: "LU", label: "🇱🇺 Luxembourg" },
  { code: "CA", label: "🇨🇦 Canada" },
  { code: "US", label: "🇺🇸 États-Unis" },
  { code: "GB", label: "🇬🇧 Royaume-Uni" },
  { code: "ES", label: "🇪🇸 Espagne" },
  { code: "IT", label: "🇮🇹 Italie" },
  { code: "DE", label: "🇩🇪 Allemagne" },
  { code: "PT", label: "🇵🇹 Portugal" },
  { code: "NL", label: "🇳🇱 Pays-Bas" },
];

const BIDDING_STRATEGIES = [
  { value: "MANUAL_CPC", label: "Manual CPC (sécurité, max contrôle)", needsTarget: false },
  { value: "MAXIMIZE_CONVERSIONS", label: "Maximize Conversions", needsTarget: false },
  { value: "TARGET_CPA", label: "Target CPA (€)", needsTarget: true },
  { value: "TARGET_ROAS", label: "Target ROAS (ratio, ex 3 = 300 %)", needsTarget: true },
];

const CAMPAIGN_TYPES = [
  { value: "SEARCH", label: "Search (mots-clés Google)" },
  { value: "DISPLAY", label: "Display (réseau d'affichage)", disabled: true },
  { value: "PERFORMANCE_MAX", label: "Performance Max", disabled: true },
];

export function GoogleAdsBuilder({ onSaved }: Props) {
  const [accounts, setAccounts] = useState<GoogleAdAccount[]>([]);
  const [accountId, setAccountId] = useState("");

  const [name, setName] = useState("");
  const [campaignType, setCampaignType] = useState("SEARCH");
  const [dailyBudget, setDailyBudget] = useState("10");
  const [biddingStrategy, setBiddingStrategy] = useState("MANUAL_CPC");
  const [biddingTarget, setBiddingTarget] = useState("");
  const [countries, setCountries] = useState<string[]>(["FR"]);
  const [finalUrl, setFinalUrl] = useState("");

  const [keywordsInput, setKeywordsInput] = useState("");
  const [matchType, setMatchType] = useState<"BROAD" | "PHRASE" | "EXACT">("PHRASE");
  const [keywords, setKeywords] = useState<Keyword[]>([]);

  const [headlines, setHeadlines] = useState<string[]>(["", "", ""]);
  const [descriptions, setDescriptions] = useState<string[]>(["", ""]);

  const [aiBrief, setAiBrief] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ads/accounts")
      .then((r) => r.json())
      .then((j) => {
        const list = (j.accounts ?? []).filter(
          (a: GoogleAdAccount & { platform: string }) =>
            a.platform === "GOOGLE_ADS" &&
            a.status === "CONNECTED" &&
            // Exclure les MCC (Manager Accounts) — ils ne peuvent pas créer de campagnes
            a.meta?.manager !== true,
        );
        setAccounts(list);
        if (list.length > 0 && !accountId) setAccountId(list[0].id);
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleCountry(code: string) {
    setCountries((cur) =>
      cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code],
    );
  }

  function addKeywords() {
    const tokens = keywordsInput
      .split(/[\n,]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (tokens.length === 0) return;
    setKeywords((cur) => [
      ...cur,
      ...tokens.map((text) => ({ text, matchType })),
    ]);
    setKeywordsInput("");
  }

  function removeKeyword(i: number) {
    setKeywords((cur) => cur.filter((_, idx) => idx !== i));
  }

  function updateHeadline(i: number, v: string) {
    setHeadlines((cur) => {
      const next = [...cur];
      next[i] = v;
      return next;
    });
  }
  function updateDescription(i: number, v: string) {
    setDescriptions((cur) => {
      const next = [...cur];
      next[i] = v;
      return next;
    });
  }

  async function generateAi() {
    if (aiBrief.trim().length < 10) {
      setError("Brief trop court pour générer la copy IA");
      return;
    }
    setError(null);
    setAiBusy(true);
    try {
      const countryNames = countries
        .map((c) => COUNTRIES.find((x) => x.code === c)?.label.replace(/^[^\s]+\s/, "") ?? c)
        .join(", ");
      const audience = countryNames
        ? `Internautes en ${countryNames} cherchant ce service sur Google`
        : "Internautes francophones cherchant ce service sur Google";
      const r = await fetch("/api/ads/generate-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "GOOGLE_ADS",
          objective: "CONVERSIONS",
          product: aiBrief,
          audience,
          tone: "DIRECT",
          variants: 1,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Erreur IA");
      const v = j.variants?.[0]?.copy as
        | { headlines?: string[]; descriptions?: string[] }
        | undefined;
      if (v?.headlines && v.headlines.length > 0) {
        setHeadlines(
          v.headlines.length >= 3
            ? v.headlines
            : [...v.headlines, ...Array(3 - v.headlines.length).fill("")],
        );
      }
      if (v?.descriptions && v.descriptions.length > 0) {
        setDescriptions(
          v.descriptions.length >= 2
            ? v.descriptions
            : [...v.descriptions, ...Array(2 - v.descriptions.length).fill("")],
        );
      }
      // Suggérer des mots-clés à partir du brief
      const suggestedKeywords = (
        v?.headlines?.flatMap((h) => h.toLowerCase().split(/\s+/)) ?? []
      )
        .filter((w) => w.length > 4)
        .filter((w, i, arr) => arr.indexOf(w) === i)
        .slice(0, 5);
      if (suggestedKeywords.length > 0 && keywords.length === 0) {
        setKeywords(
          suggestedKeywords.map((text) => ({ text, matchType: "PHRASE" as const })),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur IA");
    } finally {
      setAiBusy(false);
    }
  }

  async function saveAndPush() {
    setError(null);
    setSuccess(null);
    if (!accountId) {
      setError("Sélectionne un compte Google Ads");
      return;
    }
    if (name.trim().length < 2) {
      setError("Nom de campagne requis");
      return;
    }
    if (!finalUrl) {
      setError("URL de destination requise");
      return;
    }
    const cleanHeadlines = headlines.map((h) => h.trim()).filter(Boolean);
    const cleanDescriptions = descriptions.map((d) => d.trim()).filter(Boolean);
    if (cleanHeadlines.length < 3) {
      setError(`Il faut au moins 3 headlines (tu en as ${cleanHeadlines.length})`);
      return;
    }
    if (cleanDescriptions.length < 2) {
      setError(`Il faut au moins 2 descriptions (tu en as ${cleanDescriptions.length})`);
      return;
    }
    if (keywords.length === 0) {
      setError("Ajoute au moins 1 mot-clé");
      return;
    }
    if (countries.length === 0) {
      setError("Sélectionne au moins 1 pays");
      return;
    }

    setBusy(true);
    try {
      // 1) Créer la campagne en DB
      const createRes = await fetch("/api/ads/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type: "GOOGLE_ADS",
          status: "DRAFT",
          adAccountId: accountId,
          budget: Number(dailyBudget) * 30, // estimation 30 jours
        }),
      });
      const createJson = await createRes.json();
      if (!createRes.ok) throw new Error(createJson.error ?? "Erreur création campagne");
      const campaignId = createJson.campaign.id as string;

      // 2) Push sur Google Ads
      const pushRes = await fetch(
        `/api/ads/campaigns/${campaignId}/push`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dailyBudget: Number(dailyBudget),
            campaignType,
            biddingStrategy,
            biddingTarget: biddingTarget ? Number(biddingTarget) : undefined,
            finalUrl,
            countries,
            keywords,
            headlines: cleanHeadlines,
            descriptions: cleanDescriptions,
          }),
        },
      );
      const pushJson = await pushRes.json();
      if (!pushRes.ok) {
        throw new Error(
          `Campagne sauvegardée en DB mais push Google Ads échoué : ${pushJson.error}`,
        );
      }
      setSuccess(
        `✓ Campagne créée sur Google Ads (status PAUSED — à activer manuellement). ${pushJson.externalUrl ? "Lien : " + pushJson.externalUrl : ""}`,
      );
      setTimeout(() => onSaved(), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (accounts.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-500/40 bg-amber-50 p-6 text-sm text-amber-200">
        Aucun compte <strong>Google Ads</strong> connecté. Va dans l&apos;onglet
        « Comptes pub » et connecte au moins un compte Google Ads avant de créer
        une campagne.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white/60 p-6 space-y-5">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          🔎 Nouvelle campagne Google Ads
          <span className="text-[10px] uppercase font-mono rounded-full border border-amber-500/40 bg-amber-50 text-amber-800 px-2 py-0.5">
            créée en PAUSED
          </span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Compte Google Ads">
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name ?? a.externalId}
                  {a.meta?.manager ? " (MCC)" : ""}
                  {a.currency ? ` – ${a.currency}` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type de campagne">
            <select
              value={campaignType}
              onChange={(e) => setCampaignType(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm"
            >
              {CAMPAIGN_TYPES.map((t) => (
                <option key={t.value} value={t.value} disabled={t.disabled}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Nom de la campagne">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Spotifone – Numéros pro France – Juin 2026"
            className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm"
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Budget journalier (€)">
            <input
              type="number"
              min="1"
              step="1"
              value={dailyBudget}
              onChange={(e) => setDailyBudget(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Stratégie d'enchères">
            <select
              value={biddingStrategy}
              onChange={(e) => setBiddingStrategy(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm"
            >
              {BIDDING_STRATEGIES.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </Field>
          {BIDDING_STRATEGIES.find((b) => b.value === biddingStrategy)?.needsTarget && (
            <Field label="Cible (€ pour CPA, ratio pour ROAS)">
              <input
                type="number"
                min="0"
                step="0.1"
                value={biddingTarget}
                onChange={(e) => setBiddingTarget(e.target.value)}
                placeholder={biddingStrategy === "TARGET_ROAS" ? "3" : "10"}
                className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm"
              />
            </Field>
          )}
        </div>

        <Field label="URL de destination (page de l'annonce)">
          <input
            type="url"
            value={finalUrl}
            onChange={(e) => setFinalUrl(e.target.value)}
            placeholder="https://spotifone.com/numeros-professionnels"
            className="w-full rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Pays ciblés">
          <div className="flex flex-wrap gap-2">
            {COUNTRIES.map((c) => {
              const sel = countries.includes(c.code);
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => toggleCountry(c.code)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    sel
                      ? "border-brand-400 bg-brand/20 text-brand-700"
                      : "border-zinc-200 bg-white/40 text-zinc-500 hover:border-zinc-300"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </Field>
      </div>

      {/* IA générateur */}
      <div className="rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/5 p-5 space-y-3">
        <h4 className="text-sm font-semibold text-fuchsia-200">
          ✨ Générer headlines + descriptions + mots-clés avec l&apos;IA
        </h4>
        <div className="flex gap-2">
          <input
            value={aiBrief}
            onChange={(e) => setAiBrief(e.target.value)}
            placeholder="Brief : ex. 'Numéros français professionnels gratuits à vie pour PME'"
            className="flex-1 rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={generateAi}
            disabled={aiBusy}
            className="rounded-lg bg-fuchsia-500 hover:bg-fuchsia-400 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white"
          >
            {aiBusy ? "…" : "Générer"}
          </button>
        </div>
      </div>

      {/* Headlines */}
      <div className="rounded-2xl border border-zinc-200 bg-white/60 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">
            Headlines{" "}
            <span className="text-xs text-zinc-400">
              (3 à 15, max 30c chacun)
            </span>
          </h4>
          <button
            type="button"
            onClick={() => setHeadlines((cur) => [...cur, ""])}
            disabled={headlines.length >= 15}
            className="text-xs rounded-lg border border-zinc-200 hover:border-zinc-300 px-3 py-1 disabled:opacity-50"
          >
            + Ajouter
          </button>
        </div>
        <div className="space-y-2">
          {headlines.map((h, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={h}
                onChange={(e) => updateHeadline(i, e.target.value)}
                placeholder={`Headline ${i + 1}`}
                className="flex-1 rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm"
                maxLength={30}
              />
              <span
                className={`text-[10px] font-mono w-12 text-right ${
                  h.length > 30
                    ? "text-red-700"
                    : h.length > 25
                      ? "text-amber-800"
                      : "text-zinc-400"
                }`}
              >
                {h.length}/30
              </span>
              {headlines.length > 3 && (
                <button
                  type="button"
                  onClick={() =>
                    setHeadlines((cur) => cur.filter((_, idx) => idx !== i))
                  }
                  className="text-zinc-400 hover:text-red-700"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Descriptions */}
      <div className="rounded-2xl border border-zinc-200 bg-white/60 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">
            Descriptions{" "}
            <span className="text-xs text-zinc-400">
              (2 à 4, max 90c chacune)
            </span>
          </h4>
          <button
            type="button"
            onClick={() => setDescriptions((cur) => [...cur, ""])}
            disabled={descriptions.length >= 4}
            className="text-xs rounded-lg border border-zinc-200 hover:border-zinc-300 px-3 py-1 disabled:opacity-50"
          >
            + Ajouter
          </button>
        </div>
        <div className="space-y-2">
          {descriptions.map((d, i) => (
            <div key={i} className="flex items-start gap-2">
              <textarea
                value={d}
                onChange={(e) => updateDescription(i, e.target.value)}
                placeholder={`Description ${i + 1}`}
                className="flex-1 rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm"
                maxLength={90}
                rows={2}
              />
              <span
                className={`text-[10px] font-mono w-12 text-right pt-2 ${
                  d.length > 90
                    ? "text-red-700"
                    : d.length > 80
                      ? "text-amber-800"
                      : "text-zinc-400"
                }`}
              >
                {d.length}/90
              </span>
              {descriptions.length > 2 && (
                <button
                  type="button"
                  onClick={() =>
                    setDescriptions((cur) => cur.filter((_, idx) => idx !== i))
                  }
                  className="text-zinc-400 hover:text-red-700 pt-2"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mots-clés */}
      <div className="rounded-2xl border border-zinc-200 bg-white/60 p-5 space-y-3">
        <h4 className="text-sm font-semibold">
          Mots-clés{" "}
          <span className="text-xs text-zinc-400">({keywords.length}/50)</span>
        </h4>
        <div className="flex gap-2">
          <textarea
            value={keywordsInput}
            onChange={(e) => setKeywordsInput(e.target.value)}
            placeholder="Un mot-clé par ligne (ou séparé par virgules)"
            className="flex-1 rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm font-mono"
            rows={3}
          />
          <div className="flex flex-col gap-2">
            <select
              value={matchType}
              onChange={(e) =>
                setMatchType(e.target.value as "BROAD" | "PHRASE" | "EXACT")
              }
              className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs"
            >
              <option value="PHRASE">Phrase</option>
              <option value="BROAD">Broad</option>
              <option value="EXACT">Exact</option>
            </select>
            <button
              type="button"
              onClick={addKeywords}
              className="rounded-lg bg-brand hover:bg-brand-400 px-3 py-1.5 text-xs font-semibold text-white"
            >
              + Ajouter
            </button>
          </div>
        </div>
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {keywords.map((k, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full bg-brand/15 border border-brand/40 text-brand-700 px-2.5 py-0.5 text-xs"
              >
                {k.matchType === "EXACT"
                  ? `[${k.text}]`
                  : k.matchType === "PHRASE"
                    ? `"${k.text}"`
                    : k.text}
                <button
                  type="button"
                  onClick={() => removeKeyword(i)}
                  className="text-brand-700 hover:text-red-700"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          ⚠ {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <button
        type="button"
        onClick={saveAndPush}
        disabled={busy}
        className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 py-3 text-sm font-semibold text-white"
      >
        {busy ? "Création sur Google Ads…" : "🚀 Créer la campagne sur Google Ads (PAUSED)"}
      </button>
      <p className="text-[11px] text-zinc-400 text-center">
        La campagne sera créée en mode <strong>PAUSED</strong> — tu devras
        l&apos;activer manuellement dans Google Ads après vérification.
      </p>
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
