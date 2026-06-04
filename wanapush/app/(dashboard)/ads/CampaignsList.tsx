"use client";

import { startTransition, useEffect, useState } from "react";
import {
  AdPlatform,
  CampaignObjective,
  CampaignStatus,
  OBJECTIVE_LABEL,
  PLATFORM_META,
  STATUS_BADGE,
} from "./types";

type Props = {
  refreshKey: number;
};

type Totals = {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
};

type CampaignRich = {
  id: string;
  name: string;
  type: AdPlatform;
  status: CampaignStatus;
  budget: number | null;
  dailyBudget: number | null;
  externalId: string | null;
  objective: string | null;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
  results: unknown;
  adAccount: { id: string; name: string | null; currency: string | null } | null;
  totals: Totals;
  ctr: number | null;
  cpc: number | null;
  cpa: number | null;
  roas: number | null;
};

const STATUS_OPTIONS: CampaignStatus[] = ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"];

const FILTERS: Array<{ id: "ALL" | AdPlatform; label: string }> = [
  { id: "ALL", label: "Toutes" },
  { id: "META_ADS", label: "Meta" },
  { id: "GOOGLE_ADS", label: "Google" },
  { id: "TIKTOK_ADS", label: "TikTok" },
  { id: "LINKEDIN_ADS", label: "LinkedIn" },
];

function fmt(n: number, decimals = 0): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}


/** Ouvre un sélecteur de fichier image et résout avec le File choisi (ou null si annulé). */
function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp,image/gif";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    // Sur certains navigateurs, l'annulation du dialog ne déclenche pas onchange.
    // On résout null si focus revient sans changement après un petit délai.
    const onFocus = () => {
      setTimeout(() => {
        if (!input.files || input.files.length === 0) resolve(null);
        window.removeEventListener("focus", onFocus);
      }, 300);
    };
    window.addEventListener("focus", onFocus);
    input.click();
  });
}

function fmtMoney(n: number, currency = "EUR"): string {
  return n.toLocaleString("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
}

type GeoTarget = {
  /** Type Meta : country, region, city, zip, custom (custom_locations) */
  type: "country" | "region" | "city" | "zip" | "custom";
  /** Clé Meta pour country/region/city/zip — non utilisé pour custom */
  key: string;
  /** Nom affiché en chip */
  label: string;
  /** Rayon km — uniquement pour city + custom */
  radius?: number;
  /** Coordonnées — uniquement pour custom */
  latitude?: number;
  longitude?: number;
};

type GeoLocationsPayload = {
  countries?: string[];
  regions?: Array<{ key: string }>;
  cities?: Array<{ key: string; radius?: number; distance_unit?: "kilometer" }>;
  zips?: Array<{ key: string }>;
  custom_locations?: Array<{
    latitude: number;
    longitude: number;
    radius: number;
    distance_unit: "kilometer";
    name?: string;
  }>;
};

/** Symbole devise (subset des plus communes) — défaut = le code lui-même. */
const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  ILS: "₪",
  CAD: "C$",
  CHF: "CHF",
  MAD: "MAD",
  AUD: "A$",
  JPY: "¥",
};
function currencySymbol(code: string | null | undefined): string {
  if (!code) return "€";
  return CURRENCY_SYMBOLS[code] ?? code;
}

/** Construit le payload geoLocations Meta à partir des chips de la modale.
 *  ⚠️ Meta refuse l'overlap (subcode 1487756) — si une ville/région/zip/custom est sélectionnée,
 *  on OMET le pays parent pour éviter le chevauchement géographique. */
function buildGeoLocationsPayload(geoTargets: GeoTarget[]): GeoLocationsPayload {
  const out: GeoLocationsPayload = {};
  const hasSpecific = geoTargets.some(
    (g) => g.type === "region" || g.type === "city" || g.type === "zip" || g.type === "custom",
  );
  for (const g of geoTargets) {
    if (g.type === "country") {
      // Si on a une zone plus précise (ville/région/zip/custom), on skip le pays pour éviter l'overlap.
      if (hasSpecific) continue;
      (out.countries ??= []).push(g.key);
    } else if (g.type === "region") {
      (out.regions ??= []).push({ key: g.key });
    } else if (g.type === "city") {
      (out.cities ??= []).push({
        key: g.key,
        radius: g.radius ?? 25,
        distance_unit: "kilometer",
      });
    } else if (g.type === "zip") {
      (out.zips ??= []).push({ key: g.key });
    } else if (g.type === "custom" && g.latitude !== undefined && g.longitude !== undefined) {
      (out.custom_locations ??= []).push({
        latitude: g.latitude,
        longitude: g.longitude,
        radius: g.radius ?? 25,
        distance_unit: "kilometer",
        name: g.label,
      });
    }
  }
  if (!out.countries && !out.regions && !out.cities && !out.zips && !out.custom_locations) {
    out.countries = ["FR"];
  }
  return out;
}

type DestinationMode = "wanapush_site" | "external_with_pixel" | "external_install";

type WanapushSiteOption = {
  siteId: string;
  slug: string;
  url: string;
  type: string | null;
  sector: string | null;
  pixelId: string | null;
  pixelName: string | null;
  pixelEnabled: boolean;
  events: string[];
};

type AvailablePixel = { id: string; name: string };

type WizardMode = "create" | "edit_and_push";

type AdAccountChoice = {
  id: string;
  name: string;
  platform: AdPlatform;
  currency: string | null;
};

type PushModalState = {
  /** "create" : pas de campagne existante. "edit_and_push" : pousse une DRAFT existante. */
  mode: WizardMode;
  /** Brief (mode create uniquement, mais sections visibles en edit aussi) */
  briefName: string;
  briefPlatform: AdPlatform;
  briefAdAccountId: string;
  briefAvailableAdAccounts: AdAccountChoice[];
  briefProduct: string;
  briefAudience: string;
  briefTone: "DIRECT" | "PREMIUM" | "FRIENDLY" | "URGENT" | "STORYTELLING";
  briefTotalBudget: string;
  expandBrief: boolean;
  /** En mode "create" jusqu'à sauvegarde, on a une campagne fantôme avec adAccount résolu. */
  campaign: CampaignRich;
  objective: CampaignObjective;
  finalUrl: string;
  dailyBudget: string;
  // Destination
  destinationMode: DestinationMode;
  wanapushSites: WanapushSiteOption[];
  availablePixels: AvailablePixel[];
  selectedSiteId: string | null;
  externalUrl: string;
  externalPixelId: string;
  pixelVerifyResult: { ok: boolean; found: boolean; hint?: string; error?: string } | null;
  // Texte de l'annonce
  primaryText: string;
  headline: string;
  description: string;
  cta: string;
  /** Variantes A/B/C générées par le builder (si dispo) — sélecteur radio */
  variants: Array<{
    angle?: string;
    primary_text?: string;
    headline?: string;
    description?: string;
    cta?: string;
  }>;
  /** Index de la variante actuellement sélectionnée */
  selectedVariantIndex: number;
  // Ciblage
  geoTargets: GeoTarget[];
  geoQuery: string;
  geoSuggestions: Array<{ key: string; name: string; type: string; country_code?: string }>;
  ageMin: string;
  ageMax: string;
  genders: Array<1 | 2>;
  // Instagram
  instagramActorId: string;
  // Advantage+
  advantageAudience: boolean;
  advantageCreative: boolean;
  multiAdvertiserAds: boolean;
  // Image
  imageMode: "upload" | "ai" | "url";
  aiBrief: string;
  urlInput: string;
  imageUrl: string | null;
  // UI state
  busyAction:
    | "uploading"
    | "generating"
    | "pushing"
    | "geo-searching"
    | "auto-configuring"
    | "fetching-pixel"
    | "verifying-pixel"
    | "loading-destinations"
    | null;
  error: string | null;
  successUrl: string | null;
  aiRationale: string | null;
  /** Pixels détectés sur le AdAccount (fetché à l'ouverture pour LEADS/SALES) */
  detectedPixel: { id: string; name: string } | null;
  // Sections collapsibles
  expandText: boolean;
  expandTargeting: boolean;
  expandAdvanced: boolean;
};

const CTA_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "LEARN_MORE", label: "En savoir plus" },
  { value: "SHOP_NOW", label: "Acheter" },
  { value: "SUBSCRIBE", label: "S'inscrire" },
  { value: "CONTACT_US", label: "Nous contacter" },
  { value: "BOOK_TRAVEL", label: "Réserver" },
  { value: "DOWNLOAD", label: "Télécharger" },
  { value: "CALL_NOW", label: "Appeler" },
  { value: "APPLY_NOW", label: "Postuler" },
  { value: "GET_QUOTE", label: "Demander un devis" },
  { value: "GET_OFFER", label: "Obtenir l'offre" },
  { value: "GET_STARTED", label: "Commencer" },
  { value: "WATCH_MORE", label: "Voir la vidéo" },
];

const COUNTRY_OPTIONS: Array<{ code: string; label: string }> = [
  { code: "FR", label: "🇫🇷 France" },
  { code: "BE", label: "🇧🇪 Belgique" },
  { code: "CH", label: "🇨🇭 Suisse" },
  { code: "LU", label: "🇱🇺 Luxembourg" },
  { code: "CA", label: "🇨🇦 Canada" },
  { code: "MA", label: "🇲🇦 Maroc" },
  { code: "DZ", label: "🇩🇿 Algérie" },
  { code: "TN", label: "🇹🇳 Tunisie" },
  { code: "US", label: "🇺🇸 USA" },
  { code: "UK", label: "🇬🇧 UK" },
];

const OBJECTIVE_ORDER: CampaignObjective[] = [
  "AWARENESS",
  "TRAFFIC",
  "ENGAGEMENT",
  "LEADS",
  "CONVERSIONS",
  "APP_INSTALLS",
];
const PIXEL_REQUIRED_OBJECTIVES: CampaignObjective[] = ["LEADS", "CONVERSIONS"];

export function CampaignsList({ refreshKey }: Props) {
  const [campaigns, setCampaigns] = useState<CampaignRich[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | AdPlatform>("ALL");
  const [pushModal, setPushModal] = useState<PushModalState | null>(null);

  async function openCreateWizard() {
    // Fetch les AdAccounts dispo
    let adAccounts: AdAccountChoice[] = [];
    try {
      const r = await fetch("/api/ads/accounts");
      const j = await r.json();
      adAccounts = (j.accounts ?? []) as AdAccountChoice[];
    } catch {
      // silencieux
    }
    const firstMeta = adAccounts.find((a) => a.platform === "META_ADS");
    const fakeCampaign: CampaignRich = {
      id: "",
      name: "",
      type: "META_ADS",
      status: "DRAFT",
      budget: null,
      dailyBudget: null,
      externalId: null,
      objective: null,
      lastSyncAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      results: null,
      adAccount: firstMeta
        ? { id: firstMeta.id, name: firstMeta.name, currency: firstMeta.currency }
        : null,
      totals: { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
      ctr: null,
      cpc: null,
      cpa: null,
      roas: null,
    };
    setPushModal({
      mode: "create",
      campaign: fakeCampaign,
      briefName: "",
      briefPlatform: "META_ADS",
      briefAdAccountId: firstMeta?.id ?? "",
      briefAvailableAdAccounts: adAccounts,
      briefProduct: "",
      briefAudience: "",
      briefTone: "DIRECT",
      briefTotalBudget: "100",
      expandBrief: true,
      objective: "AWARENESS",
      finalUrl: "https://wanapush.com",
      dailyBudget: "20",
      primaryText: "",
      headline: "",
      description: "",
      cta: "LEARN_MORE",
      variants: [],
      selectedVariantIndex: 0,
      geoTargets: [{ type: "country", key: "FR", label: "🇫🇷 France" }],
      geoQuery: "",
      geoSuggestions: [],
      ageMin: "18",
      ageMax: "65",
      genders: [],
      instagramActorId: "",
      advantageAudience: true,
      advantageCreative: true,
      multiAdvertiserAds: true,
      destinationMode: "wanapush_site",
      wanapushSites: [],
      availablePixels: [],
      selectedSiteId: null,
      externalUrl: "",
      externalPixelId: "",
      pixelVerifyResult: null,
      imageMode: "upload",
      aiBrief: "",
      urlInput: "",
      imageUrl: null,
      busyAction: null,
      error: null,
      successUrl: null,
      aiRationale: null,
      detectedPixel: null,
      expandText: false,
      expandTargeting: false,
      expandAdvanced: false,
    });
    if (firstMeta?.id) {
      fetchPixelInBg(firstMeta.id);
      fetchDestinationOptions(firstMeta.id);
    }
  }

  function openPushModal(c: CampaignRich) {
    const r = (c.results ?? {}) as {
      externalUrl?: string;
      objective?: string;
      variants?: Array<{ copy?: Record<string, string | string[]> }>;
      product?: string;
      audience?: string;
      tone?: string;
    };
    const builderObjective = r.objective as CampaignObjective | undefined;
    const safeObjective: CampaignObjective =
      builderObjective && OBJECTIVE_ORDER.includes(builderObjective)
        ? builderObjective
        : "AWARENESS";
    const firstString = (v: unknown): string => (typeof v === "string" ? v : "");
    // Normalise les variantes du builder en flat objects
    const flatVariants = (r.variants ?? []).map((v, i) => {
      const copy = v.copy ?? {};
      const angle = (v as { angle?: string }).angle ?? `Variante ${String.fromCharCode(65 + i)}`;
      return {
        angle,
        primary_text: firstString(copy.primary_text),
        headline: firstString(copy.headline),
        description: firstString(copy.description),
        cta: firstString(copy.cta),
      };
    });
    const variantOne = flatVariants[0] ?? { primary_text: "", headline: "", description: "", cta: "" };
    setPushModal({
      mode: "edit_and_push",
      campaign: c,
      briefName: c.name,
      briefPlatform: c.type,
      briefAdAccountId: c.adAccount?.id ?? "",
      briefAvailableAdAccounts: [],
      briefProduct: firstString(r.product),
      briefAudience: firstString(r.audience),
      briefTone:
        (r.tone as "DIRECT" | "PREMIUM" | "FRIENDLY" | "URGENT" | "STORYTELLING") ?? "DIRECT",
      briefTotalBudget: String(c.budget ?? 100),
      expandBrief: false,
      objective: safeObjective,
      finalUrl: r.externalUrl ?? "https://wanapush.com",
      dailyBudget: String(c.dailyBudget ?? c.budget ?? 20),
      primaryText: variantOne.primary_text.slice(0, 125),
      headline: variantOne.headline.slice(0, 40) || c.name.slice(0, 40),
      description: variantOne.description.slice(0, 30),
      cta: variantOne.cta || "LEARN_MORE",
      variants: flatVariants,
      selectedVariantIndex: 0,
      geoTargets: [{ type: "country", key: "FR", label: "🇫🇷 France" }],
      geoQuery: "",
      geoSuggestions: [],
      ageMin: "18",
      ageMax: "65",
      genders: [],
      instagramActorId: "",
      advantageAudience: true,
      advantageCreative: true,
      multiAdvertiserAds: true,
      imageMode: "upload",
      aiBrief: "",
      urlInput: "",
      imageUrl: null,
      destinationMode: "wanapush_site",
      wanapushSites: [],
      availablePixels: [],
      selectedSiteId: null,
      externalUrl: "",
      externalPixelId: "",
      pixelVerifyResult: null,
      busyAction: null,
      error: null,
      successUrl: null,
      aiRationale: null,
      detectedPixel: null,
      expandText: true,
      expandTargeting: false,
      expandAdvanced: false,
    });
    // Fetch Pixel + destinations en background
    if (c.adAccount?.id) {
      fetchPixelInBg(c.adAccount.id);
      fetchDestinationOptions(c.adAccount.id);
    }
  }

  async function fetchDestinationOptions(adAccountId: string) {
    patchModal({ busyAction: "loading-destinations" });
    try {
      const r = await fetch(
        `/api/ads/destination-options?adAccountId=${encodeURIComponent(adAccountId)}`,
      );
      const j = await r.json();
      if (!r.ok) {
        patchModal({ busyAction: null });
        return;
      }
      const wanapushSites = (j.wanapushSites ?? []) as WanapushSiteOption[];
      const availablePixels = (j.availablePixels ?? []) as AvailablePixel[];
      // Auto-sélection : premier site avec Pixel enabled OU défaut Mode externe si rien
      const firstReady = wanapushSites.find((s) => s.pixelId && s.pixelEnabled);
      patchModal({
        busyAction: null,
        wanapushSites,
        availablePixels,
        selectedSiteId: firstReady?.siteId ?? wanapushSites[0]?.siteId ?? null,
        finalUrl: firstReady?.url ?? wanapushSites[0]?.url ?? "https://wanapush.com",
        destinationMode: wanapushSites.length > 0 ? "wanapush_site" : "external_with_pixel",
      });
    } catch {
      patchModal({ busyAction: null });
    }
  }

  function selectWanapushSite(siteId: string) {
    if (!pushModal) return;
    const site = pushModal.wanapushSites.find((s) => s.siteId === siteId);
    if (!site) return;
    patchModal({
      selectedSiteId: siteId,
      finalUrl: site.url,
      pixelVerifyResult: null,
    });
  }

  async function verifyExternalPixel() {
    if (!pushModal) return;
    const { externalUrl, externalPixelId } = pushModal;
    if (!externalUrl.trim() || !externalPixelId.trim()) {
      patchModal({
        pixelVerifyResult: {
          ok: false,
          found: false,
          error: "Renseigne URL et Pixel ID",
        },
      });
      return;
    }
    patchModal({ busyAction: "verifying-pixel", pixelVerifyResult: null });
    try {
      const r = await fetch("/api/ads/verify-pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: externalUrl.trim(),
          pixelId: externalPixelId.trim(),
        }),
      });
      const j = await r.json();
      patchModal({
        busyAction: null,
        pixelVerifyResult: {
          ok: !!j.ok,
          found: !!j.found,
          hint: j.hint,
          error: j.error,
        },
        ...(j.ok && j.found ? { finalUrl: externalUrl.trim() } : {}),
      });
    } catch (e) {
      patchModal({
        busyAction: null,
        pixelVerifyResult: {
          ok: false,
          found: false,
          error: e instanceof Error ? e.message : "Erreur réseau",
        },
      });
    }
  }

  function selectVariant(index: number) {
    if (!pushModal) return;
    const v = pushModal.variants[index];
    if (!v) return;
    patchModal({
      selectedVariantIndex: index,
      primaryText: (v.primary_text ?? "").slice(0, 125),
      headline: (v.headline ?? pushModal.campaign.name).slice(0, 40),
      description: (v.description ?? "").slice(0, 30),
      cta: v.cta || "LEARN_MORE",
    });
  }

  async function fetchPixelInBg(adAccountId: string) {
    try {
      const r = await fetch(`/api/ads/meta/pixels?adAccountId=${encodeURIComponent(adAccountId)}`);
      const j = await r.json();
      if (!r.ok) return;
      const first = (j.pixels ?? [])[0] as { id: string; name?: string } | undefined;
      if (!first) return;
      patchModal({ detectedPixel: { id: first.id, name: first.name ?? first.id } });
    } catch {
      // silencieux : c'est un nice-to-have
    }
  }

  // ============ Auto-config IA ============
  async function modalAutoConfig() {
    if (!pushModal) return;
    patchModal({ busyAction: "auto-configuring", error: null });
    try {
      const r = await fetch("/api/ads/auto-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: pushModal.campaign.id }),
      });
      const j = await r.json();
      if (!r.ok || !j.config) {
        patchModal({ busyAction: null, error: j.error ?? "Échec auto-config IA" });
        return;
      }
      const cfg = j.config as {
        primaryText: string;
        headline: string;
        description: string;
        cta: string;
        countries: string[];
        ageMin: number;
        ageMax: number;
        genders: Array<1 | 2>;
        suggestedCity: string | null;
        rationale: string;
      };
      const flagFor = (cc: string) => {
        const opt = COUNTRY_OPTIONS.find((o) => o.code === cc);
        return opt?.label ?? cc;
      };
      const geoTargets: GeoTarget[] = cfg.countries.map((cc) => ({
        type: "country" as const,
        key: cc,
        label: flagFor(cc),
      }));
      patchModal({
        busyAction: null,
        primaryText: cfg.primaryText.slice(0, 125),
        headline: cfg.headline.slice(0, 40),
        description: cfg.description.slice(0, 30),
        cta: cfg.cta,
        geoTargets,
        ageMin: String(cfg.ageMin),
        ageMax: String(cfg.ageMax),
        genders: cfg.genders,
        aiRationale: cfg.rationale,
        expandText: true,
        expandTargeting: true,
      });
      // Si l'IA suggère une ville, la chercher automatiquement pour proposer un GeoTarget
      if (cfg.suggestedCity) {
        await searchGeoFor(cfg.suggestedCity, true);
      }
    } catch (e) {
      patchModal({
        busyAction: null,
        error: e instanceof Error ? e.message : "Erreur IA",
      });
    }
  }

  // ============ Recherche géographique ============
  async function searchGeoFor(query: string, autoAddFirst = false) {
    if (!pushModal) return;
    const adAccountId = pushModal.campaign.adAccount?.id;
    if (!adAccountId) return;
    const q = query.trim();
    if (q.length < 2) {
      patchModal({ geoSuggestions: [] });
      return;
    }
    patchModal({ busyAction: "geo-searching", error: null });
    try {
      const url = new URL("/api/ads/meta/geo-search", window.location.origin);
      url.searchParams.set("adAccountId", adAccountId);
      url.searchParams.set("q", q);
      url.searchParams.set("types", "country,region,city,zip");
      const r = await fetch(url.toString());
      const j = await r.json();
      if (!r.ok) {
        patchModal({ busyAction: null, error: j.error ?? "Échec recherche géo" });
        return;
      }
      const results = (j.results ?? []) as Array<{
        key: string;
        name: string;
        type: string;
        country_code?: string;
        country_name?: string;
        region?: string;
      }>;
      const suggestions = results.map((r) => ({
        key: r.key,
        name: r.region
          ? `${r.name}, ${r.region}${r.country_code ? ` (${r.country_code})` : ""}`
          : r.country_name
            ? `${r.name} (${r.country_name})`
            : r.name,
        type: r.type,
        country_code: r.country_code,
      }));
      patchModal({ busyAction: null, geoSuggestions: suggestions });
      if (autoAddFirst && suggestions.length > 0) {
        addGeoTarget(suggestions[0]);
      }
    } catch (e) {
      patchModal({
        busyAction: null,
        error: e instanceof Error ? e.message : "Erreur réseau",
      });
    }
  }

  function addGeoTarget(s: { key: string; name: string; type: string; country_code?: string }) {
    if (!pushModal) return;
    const type = s.type as "country" | "region" | "city" | "zip";
    // Éviter doublon
    if (pushModal.geoTargets.some((g) => g.type === type && g.key === s.key)) return;
    const newTarget: GeoTarget = {
      type,
      key: s.key,
      label: s.name,
      ...(type === "city" ? { radius: 25 } : {}),
    };
    patchModal({
      geoTargets: [...pushModal.geoTargets, newTarget],
      geoQuery: "",
      geoSuggestions: [],
    });
  }

  function removeGeoTarget(index: number) {
    if (!pushModal) return;
    patchModal({
      geoTargets: pushModal.geoTargets.filter((_, i) => i !== index),
    });
  }

  function patchGeoTarget(index: number, patch_: Partial<GeoTarget>) {
    if (!pushModal) return;
    patchModal({
      geoTargets: pushModal.geoTargets.map((g, i) => (i === index ? { ...g, ...patch_ } : g)),
    });
  }

  function patchModal(patch: Partial<PushModalState>) {
    setPushModal((p) => (p ? { ...p, ...patch } : null));
  }

  async function modalUpload() {
    const file = await pickImageFile();
    if (!file) return;
    patchModal({ busyAction: "uploading", error: null });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/social/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok || !j.url) {
        patchModal({ busyAction: null, error: j.error ?? "Échec upload" });
        return;
      }
      patchModal({ busyAction: null, imageUrl: j.url });
    } catch (e) {
      patchModal({
        busyAction: null,
        error: e instanceof Error ? e.message : "Erreur upload",
      });
    }
  }

  async function modalGenerate() {
    const brief = pushModal?.aiBrief.trim();
    if (!brief) {
      patchModal({ error: "Renseigne un brief court pour la génération IA" });
      return;
    }
    patchModal({ busyAction: "generating", error: null });
    try {
      const r = await fetch("/api/ads/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: { productOrService: brief, tone: "casual" },
          size: "square",
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.url) {
        patchModal({ busyAction: null, error: j.error ?? "Échec génération IA" });
        return;
      }
      patchModal({ busyAction: null, imageUrl: j.url });
    } catch (e) {
      patchModal({
        busyAction: null,
        error: e instanceof Error ? e.message : "Erreur génération",
      });
    }
  }

  function modalUseUrl() {
    const u = pushModal?.urlInput.trim();
    if (!u) {
      patchModal({ error: "Renseigne une URL d'image" });
      return;
    }
    if (!u.startsWith("http://") && !u.startsWith("https://")) {
      patchModal({ error: "URL doit commencer par http(s)://" });
      return;
    }
    patchModal({ imageUrl: u, error: null });
  }

  /** Crée la campagne en DB (mode create). Retourne le nouvel ID ou null si échec. */
  async function createCampaignFromBrief(): Promise<string | null> {
    if (!pushModal) return null;
    if (pushModal.briefName.trim().length < 2) {
      patchModal({ error: "Donne un nom à la campagne", expandBrief: true });
      return null;
    }
    if (!pushModal.briefAdAccountId) {
      patchModal({ error: "Sélectionne un compte publicitaire", expandBrief: true });
      return null;
    }
    const totalBudget = parseFloat(pushModal.briefTotalBudget.replace(",", "."));
    try {
      const res = await fetch("/api/ads/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pushModal.briefName.trim(),
          type: pushModal.briefPlatform,
          adAccountId: pushModal.briefAdAccountId,
          status: "DRAFT",
          budget: Number.isFinite(totalBudget) ? totalBudget : undefined,
          results: {
            objective: pushModal.objective,
            product: pushModal.briefProduct.trim(),
            audience: pushModal.briefAudience.trim(),
            tone: pushModal.briefTone,
            variants: pushModal.variants,
          },
        }),
      });
      const j = await res.json();
      if (!res.ok || !j.campaign?.id) {
        patchModal({ error: j.error ?? "Échec création campagne", expandBrief: true });
        return null;
      }
      return j.campaign.id as string;
    } catch (e) {
      patchModal({
        error: e instanceof Error ? e.message : "Erreur réseau création",
        expandBrief: true,
      });
      return null;
    }
  }

  /** Mode "Sauver brouillon" : crée la campagne mais ne pousse pas. */
  async function modalSaveDraft() {
    if (!pushModal || pushModal.mode !== "create") return;
    patchModal({ busyAction: "pushing", error: null });
    const newId = await createCampaignFromBrief();
    if (!newId) {
      patchModal({ busyAction: null });
      return;
    }
    patchModal({
      busyAction: null,
      successUrl: "", // Vide → modale succès sans lien externe
    });
    await load();
  }

  /** Mode "Générer 3 variantes IA" depuis le brief. */
  async function modalGenerateVariants() {
    if (!pushModal) return;
    if (
      pushModal.briefProduct.trim().length < 3 ||
      pushModal.briefAudience.trim().length < 3
    ) {
      patchModal({
        error: "Renseigne au moins le produit (3+ chars) et l'audience (3+ chars)",
        expandBrief: true,
      });
      return;
    }
    patchModal({ busyAction: "auto-configuring", error: null });
    try {
      const res = await fetch("/api/ads/generate-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: pushModal.briefPlatform,
          objective: pushModal.objective,
          product: pushModal.briefProduct.trim(),
          audience: pushModal.briefAudience.trim(),
          tone: pushModal.briefTone,
          variants: 3,
        }),
      });
      const j = await res.json();
      if (!res.ok || !j.variants) {
        patchModal({ busyAction: null, error: j.error ?? "Échec génération IA" });
        return;
      }
      const firstString = (v: unknown): string => (typeof v === "string" ? v : "");
      const flatVariants = (j.variants as Array<{
        angle?: string;
        copy?: Record<string, string | string[]>;
      }>).map((v, i) => {
        const copy = v.copy ?? {};
        return {
          angle: v.angle ?? `Variante ${String.fromCharCode(65 + i)}`,
          primary_text: firstString(copy.primary_text),
          headline: firstString(copy.headline),
          description: firstString(copy.description),
          cta: firstString(copy.cta),
        };
      });
      const first = flatVariants[0];
      patchModal({
        busyAction: null,
        variants: flatVariants,
        selectedVariantIndex: 0,
        primaryText: (first?.primary_text ?? "").slice(0, 125),
        headline: (first?.headline ?? pushModal.briefName).slice(0, 40),
        description: (first?.description ?? "").slice(0, 30),
        cta: first?.cta || "LEARN_MORE",
        expandText: true,
      });
    } catch (e) {
      patchModal({
        busyAction: null,
        error: e instanceof Error ? e.message : "Erreur IA",
      });
    }
  }

  async function modalSubmitPush() {
    if (!pushModal) return;
    const { finalUrl, dailyBudget, imageUrl } = pushModal;
    let c = pushModal.campaign;

    const budgetNum = parseFloat(dailyBudget.replace(",", "."));
    if (!Number.isFinite(budgetNum) || budgetNum <= 0) {
      patchModal({ error: "Budget invalide" });
      return;
    }
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      patchModal({ error: "URL de destination doit commencer par http(s)://" });
      return;
    }
    if (c.type === "META_ADS" && !imageUrl) {
      patchModal({ error: "Image obligatoire pour Meta — choisis une option ci-dessus" });
      return;
    }

    // Mode CREATE : on crée d'abord la campagne en DB, puis on push avec l'ID retourné.
    if (pushModal.mode === "create") {
      patchModal({ busyAction: "pushing", error: null });
      const newId = await createCampaignFromBrief();
      if (!newId) {
        patchModal({ busyAction: null });
        return;
      }
      c = { ...c, id: newId, name: pushModal.briefName.trim() };
      patchModal({ campaign: c });
    }

    patchModal({ busyAction: "pushing", error: null });
    try {
      const ageMinNum = parseInt(pushModal.ageMin, 10);
      const ageMaxNum = parseInt(pushModal.ageMax, 10);
      // Détermine le pixelId selon le mode de destination
      let pixelIdForPush: string | undefined;
      if (pushModal.destinationMode === "wanapush_site" && pushModal.selectedSiteId) {
        const site = pushModal.wanapushSites.find(
          (s) => s.siteId === pushModal.selectedSiteId,
        );
        if (site?.pixelId) pixelIdForPush = site.pixelId;
      } else if (
        pushModal.destinationMode === "external_with_pixel" ||
        pushModal.destinationMode === "external_install"
      ) {
        if (pushModal.externalPixelId.trim()) {
          pixelIdForPush = pushModal.externalPixelId.trim();
        }
      }
      const res = await fetch(`/api/ads/campaigns/${c.id}/push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyBudget: budgetNum,
          campaignType: pushModal.objective,
          finalUrl,
          ...(pixelIdForPush ? { pixelId: pixelIdForPush } : {}),
          geoLocations: buildGeoLocationsPayload(pushModal.geoTargets),
          ...(Number.isFinite(ageMinNum) ? { ageMin: ageMinNum } : {}),
          ...(Number.isFinite(ageMaxNum) ? { ageMax: ageMaxNum } : {}),
          ...(pushModal.genders.length > 0 ? { genders: pushModal.genders } : {}),
          ...(pushModal.instagramActorId.trim() ? { instagramActorId: pushModal.instagramActorId.trim() } : {}),
          advantageAudience: pushModal.advantageAudience,
          advantageCreative: pushModal.advantageCreative,
          multiAdvertiserAds: pushModal.multiAdvertiserAds,
          ...(pushModal.primaryText.trim() ? { primaryText: pushModal.primaryText.trim().slice(0, 125) } : {}),
          ...(pushModal.headline.trim() ? { headlines: [pushModal.headline.trim().slice(0, 40)] } : {}),
          ...(pushModal.description.trim() ? { descriptions: [pushModal.description.trim().slice(0, 30)] } : {}),
          ...(pushModal.cta ? { cta: pushModal.cta } : {}),
          ...(imageUrl ? { imageUrl } : {}),
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        patchModal({ busyAction: null, error: j.error ?? "Échec du push" });
        return;
      }
      patchModal({ busyAction: null, successUrl: j.externalUrl ?? "" });
      await load();
    } catch (e) {
      patchModal({
        busyAction: null,
        error: e instanceof Error ? e.message : "Erreur réseau",
      });
    }
  }

  async function load() {
    setError(null);
    try {
      const res = await fetch("/api/ads/campaigns");
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Échec chargement");
        return;
      }
      setCampaigns(json.campaigns ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau");
    }
  }

  useEffect(() => {
    load();
  }, [refreshKey]);

  async function updateStatus(id: string, status: CampaignStatus) {
    setBusyId(id);
    try {
      await fetch(`/api/ads/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cette campagne ?")) return;
    setBusyId(id);
    try {
      await fetch(`/api/ads/campaigns/${id}`, { method: "DELETE" });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function duplicate(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/ads/campaigns/${id}`, { method: "POST" });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  function pushToProvider(c: CampaignRich) {
    openPushModal(c);
  }

  function exportCsv() {
    if (!campaigns || campaigns.length === 0) return;
    const headers = [
      "name",
      "platform",
      "status",
      "budget",
      "spend",
      "impressions",
      "clicks",
      "conversions",
      "revenue",
      "ctr%",
      "cpc",
      "cpa",
      "roas",
      "lastSync",
    ];
    const rows = campaigns.map((c) => [
      c.name,
      c.type,
      c.status,
      c.budget ?? "",
      c.totals.spend,
      c.totals.impressions,
      c.totals.clicks,
      c.totals.conversions,
      c.totals.revenue,
      c.ctr?.toFixed(2) ?? "",
      c.cpc?.toFixed(2) ?? "",
      c.cpa?.toFixed(2) ?? "",
      c.roas?.toFixed(2) ?? "",
      c.lastSyncAt ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((r) =>
        r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wanapush-campaigns-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (campaigns === null && !error)
    return <div className="text-sm text-zinc-400">Chargement…</div>;
  if (error)
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-300">
        {error}
      </div>
    );

  const filtered = (campaigns ?? []).filter((c) => filter === "ALL" || c.type === filter);

  // Aggregate global
  const global = filtered.reduce<Totals & { count: number }>(
    (acc, c) => ({
      count: acc.count + 1,
      spend: acc.spend + c.totals.spend,
      impressions: acc.impressions + c.totals.impressions,
      clicks: acc.clicks + c.totals.clicks,
      conversions: acc.conversions + c.totals.conversions,
      revenue: acc.revenue + c.totals.revenue,
    }),
    { count: 0, spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
  );
  const globalRoas = global.spend > 0 ? global.revenue / global.spend : null;

  return (
    <div className="space-y-4">
      {pushModal && (
        <PushModal
          state={pushModal}
          patch={patchModal}
          onClose={() => setPushModal(null)}
          onUpload={modalUpload}
          onGenerate={modalGenerate}
          onUseUrl={modalUseUrl}
          onSubmit={modalSubmitPush}
          onAutoConfig={modalAutoConfig}
          onGeoSearch={searchGeoFor}
          onAddGeoTarget={addGeoTarget}
          onRemoveGeoTarget={removeGeoTarget}
          onPatchGeoTarget={patchGeoTarget}
          onSelectVariant={selectVariant}
          onSelectWanapushSite={selectWanapushSite}
          onVerifyExternalPixel={verifyExternalPixel}
          onSaveDraft={modalSaveDraft}
          onGenerateVariants={modalGenerateVariants}
        />
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => startTransition(() => setFilter(f.id))}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                filter === f.id
                  ? "border-brand bg-brand/15 text-brand-700"
                  : "border-zinc-200 bg-white/40 text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            disabled={!campaigns || campaigns.length === 0}
            className="text-xs rounded-lg border border-zinc-200 hover:border-zinc-300 px-3 py-1.5 disabled:opacity-50"
          >
            📥 Export CSV
          </button>
          <button
            onClick={openCreateWizard}
            className="text-sm rounded-lg bg-brand hover:bg-brand/90 text-white px-4 py-1.5 font-semibold flex items-center gap-1.5"
          >
            <span className="text-base leading-none">+</span> Nouvelle campagne
          </button>
        </div>
      </div>

      {global.count > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white/40 p-4 grid grid-cols-2 sm:grid-cols-6 gap-3">
          <Stat label="Campagnes" value={fmt(global.count)} />
          <Stat label="Dépense" value={fmtMoney(global.spend)} />
          <Stat label="Impressions" value={fmt(global.impressions)} />
          <Stat label="Clics" value={fmt(global.clicks)} />
          <Stat label="Conversions" value={fmt(global.conversions)} />
          <Stat label="ROAS" value={globalRoas !== null ? `${globalRoas.toFixed(2)}x` : "—"} />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white/60 p-8 text-center space-y-2">
          <div className="text-4xl">🎯</div>
          <h3 className="font-semibold">Aucune campagne</h3>
          <p className="text-sm text-zinc-500">
            Crée-en une via l&apos;onglet « Nouvelle campagne » ou synchronise un compte
            pub depuis « Comptes pub ».
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const meta = PLATFORM_META[c.type];
            const currency = c.adAccount?.currency ?? "EUR";
            return (
              <div
                key={c.id}
                className="rounded-xl border border-zinc-200 bg-white/60 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="text-2xl">{meta.emoji}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-zinc-900 truncate">
                          {c.name}
                        </h4>
                        <span
                          className={`text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 font-medium ${STATUS_BADGE[c.status]}`}
                        >
                          {c.status}
                        </span>
                        {c.externalId && (
                          <span className="text-[10px] uppercase rounded-full border border-emerald-500/40 bg-emerald-50 text-emerald-700 px-2 py-0.5">
                            🔗 connecté
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5 truncate">
                        <span className={meta.color}>{meta.label}</span>
                        {c.adAccount?.name && ` · ${c.adAccount.name}`}
                        {c.objective && ` · ${c.objective}`}
                        {c.budget !== null && ` · Budget ${fmtMoney(c.budget, currency)}`}
                        {c.lastSyncAt && (
                          <>
                            {" "}
                            · Sync{" "}
                            {new Date(c.lastSyncAt).toLocaleString("fr-FR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={c.status}
                      disabled={busyId === c.id}
                      onChange={(e) =>
                        updateStatus(c.id, e.target.value as CampaignStatus)
                      }
                      className="rounded-md border border-zinc-200 bg-white/60 px-2 py-1 text-xs"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    {!c.externalId && c.status === "DRAFT" && (
                      <button
                        onClick={() => pushToProvider(c)}
                        disabled={busyId === c.id}
                        title={`Lancer sur ${PLATFORM_META[c.type].label} (créée en PAUSED)`}
                        className="text-xs rounded-md bg-brand-500 hover:bg-brand-600 text-white px-3 py-1 font-semibold disabled:opacity-50"
                      >
                        {busyId === c.id ? "Push…" : "🚀 Lancer"}
                      </button>
                    )}
                    <button
                      onClick={() => duplicate(c.id)}
                      disabled={busyId === c.id}
                      title="Dupliquer"
                      className="text-xs text-zinc-500 hover:text-brand-700 px-2"
                    >
                      ⎘
                    </button>
                    <button
                      onClick={() => remove(c.id)}
                      disabled={busyId === c.id}
                      title="Supprimer"
                      className="text-xs text-zinc-400 hover:text-rose-300 px-2"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {(c.totals.spend > 0 || c.totals.impressions > 0) && (
                  <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 text-xs border-t border-zinc-200 pt-3">
                    <Mini label="Dépense" value={fmtMoney(c.totals.spend, currency)} />
                    <Mini label="Imp." value={fmt(c.totals.impressions)} />
                    <Mini label="Clics" value={fmt(c.totals.clicks)} />
                    <Mini label="Conv." value={fmt(c.totals.conversions)} />
                    <Mini label="CTR" value={c.ctr !== null ? `${c.ctr.toFixed(2)}%` : "—"} />
                    <Mini label="CPC" value={c.cpc !== null ? fmtMoney(c.cpc, currency) : "—"} />
                    <Mini
                      label="ROAS"
                      value={c.roas !== null ? `${c.roas.toFixed(2)}x` : "—"}
                      highlight={c.roas !== null && c.roas >= 2}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-400">{label}</div>
      <div className="text-base font-bold text-zinc-900">{value}</div>
    </div>
  );
}

function Mini({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase text-zinc-400">{label}</div>
      <div
        className={`font-mono font-semibold ${highlight ? "text-emerald-700" : "text-zinc-800"}`}
      >
        {value}
      </div>
    </div>
  );
}

function PushModal({
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
  } = state;
  const isCreate = mode === "create";
  const isMeta = (isCreate ? briefPlatform : c.type) === "META_ADS";
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
