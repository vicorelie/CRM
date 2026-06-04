"use client";

import { startTransition, useEffect, useState } from "react";
import {
  AdPlatform,
  CampaignObjective,
  CampaignStatus,
  PLATFORM_META,
  STATUS_BADGE,
} from "./types";
import {
  COUNTRY_OPTIONS,
  OBJECTIVE_ORDER,
  buildGeoLocationsPayload,
  fmt,
  fmtMoney,
  pickImageFile,
} from "./_components/utils";
import type {
  AdAccountChoice,
  AvailablePixel,
  CampaignRich,
  GeoTarget,
  PushModalState,
  Totals,
  WanapushSiteOption,
} from "./_components/types";
import { PushModal } from "./_components/PushModal";

type Props = {
  refreshKey: number;
};

const STATUS_OPTIONS: CampaignStatus[] = ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"];

const FILTERS: Array<{ id: "ALL" | AdPlatform; label: string }> = [
  { id: "ALL", label: "Toutes" },
  { id: "META_ADS", label: "Meta" },
  { id: "GOOGLE_ADS", label: "Google" },
  { id: "TIKTOK_ADS", label: "TikTok" },
  { id: "LINKEDIN_ADS", label: "LinkedIn" },
];

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

