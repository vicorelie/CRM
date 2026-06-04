import type { CampaignObjective } from "../types";
import type { GeoTarget, GeoLocationsPayload } from "./types";

export function fmt(n: number, decimals = 0): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Ouvre un sélecteur de fichier image et résout avec le File choisi (ou null si annulé). */
export function pickImageFile(): Promise<File | null> {
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

export function fmtMoney(n: number, currency = "EUR"): string {
  return n.toLocaleString("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
}

/** Symbole devise (subset des plus communes) — défaut = le code lui-même. */
export const CURRENCY_SYMBOLS: Record<string, string> = {
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
export function currencySymbol(code: string | null | undefined): string {
  if (!code) return "€";
  return CURRENCY_SYMBOLS[code] ?? code;
}

/** Construit le payload geoLocations Meta à partir des chips de la modale.
 *  ⚠️ Meta refuse l'overlap (subcode 1487756) — si une ville/région/zip/custom est sélectionnée,
 *  on OMET le pays parent pour éviter le chevauchement géographique. */
export function buildGeoLocationsPayload(geoTargets: GeoTarget[]): GeoLocationsPayload {
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

export const CTA_OPTIONS: Array<{ value: string; label: string }> = [
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

export const COUNTRY_OPTIONS: Array<{ code: string; label: string }> = [
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

export const OBJECTIVE_ORDER: CampaignObjective[] = [
  "AWARENESS",
  "TRAFFIC",
  "ENGAGEMENT",
  "LEADS",
  "CONVERSIONS",
  "APP_INSTALLS",
];
export const PIXEL_REQUIRED_OBJECTIVES: CampaignObjective[] = ["LEADS", "CONVERSIONS"];
