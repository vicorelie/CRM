// Map un plan IA généré (sections type hero/features/stats/cta/contact) vers les data
// shape attendues par les templates. On évite un 2e call IA — on réutilise les sections
// déjà générées.

import type { GeneratedPage } from "@/lib/site-gen/schema";
import type { SaasCleanData } from "./saas-clean";

type Section = GeneratedPage["sections"][number];

function pickFirst<T>(sections: Section[], types: string[]): T | null {
  const found = sections.find((s) => types.includes(s.type));
  return (found?.data as T) ?? null;
}

/**
 * Construit le SaasCleanData depuis le plan généré.
 * Renvoie null si le plan n'a pas le minimum (hero + au moins une feature).
 */
export function planToSaasCleanData(page: GeneratedPage): SaasCleanData | null {
  const sections = page.sections;
  const heroData = pickFirst<Record<string, unknown>>(sections, [
    "hero", "hero_split", "hero_slider", "hero_blob",
  ]);
  if (!heroData) return null;

  // hero_slider stocke ses titres dans data.slides[0] — extrait
  if (heroData.slides && Array.isArray(heroData.slides) && heroData.slides[0]) {
    const slide = heroData.slides[0] as Record<string, unknown>;
    heroData.title = heroData.title ?? slide.title;
    heroData.subtitle = heroData.subtitle ?? slide.subtitle;
    heroData.ctaText = heroData.ctaText ?? slide.ctaText;
    heroData.ctaHref = heroData.ctaHref ?? slide.ctaHref;
  }

  const title = String(heroData.title ?? heroData.h1 ?? "Bienvenue");
  const subtitle = String(heroData.subtitle ?? heroData.description ?? "");
  const ctaText = String(heroData.ctaText ?? "Commencer");
  const ctaHref = String(heroData.ctaHref ?? "#contact");
  const secondaryText = heroData.ctaSecondaryText ? String(heroData.ctaSecondaryText) : undefined;
  const secondaryHref = heroData.ctaSecondaryHref ? String(heroData.ctaSecondaryHref) : "#features";
  const badge = heroData.badge ? String(heroData.badge) : undefined;

  // Logos bar
  const logosData = pickFirst<{ logos?: Array<{ name: string }> }>(sections, ["logos_bar"]);
  const logos = Array.isArray(logosData?.logos) ? logosData.logos : undefined;

  // Big features — source : feature_split | features | service_tiles | circles
  const bigFeatures: SaasCleanData["bigFeatures"] = [];
  const featureSplitData = pickFirst<{ blocks?: SaasCleanData["bigFeatures"] }>(sections, ["feature_split"]);
  if (featureSplitData?.blocks && Array.isArray(featureSplitData.blocks) && featureSplitData.blocks.length > 0) {
    bigFeatures.push(...featureSplitData.blocks.slice(0, 3));
  } else {
    // Fallback : transforme `features` en 3 big features
    const featuresData = pickFirst<{ items?: Array<{ title?: string; description?: string; imageKeywords?: string }> }>(
      sections, ["features", "service_tiles", "circles", "highlights", "services_grid"],
    );
    if (featuresData?.items && Array.isArray(featuresData.items)) {
      for (const it of featuresData.items.slice(0, 3)) {
        if (!it.title) continue;
        bigFeatures.push({
          title: String(it.title),
          description: String(it.description ?? ""),
          imageKeywords: it.imageKeywords ? String(it.imageKeywords) : undefined,
        });
      }
    }
  }

  // Stats
  const statsData = pickFirst<{ stats?: Array<{ value: string; label: string }> }>(sections, ["stats"]);
  const heroStats = Array.isArray((heroData as { stats?: unknown }).stats)
    ? ((heroData as { stats: Array<{ value: string; label: string }> }).stats)
    : null;
  const stats = statsData?.stats ?? heroStats ?? undefined;

  // Final CTA — source : section cta, sinon synthèse depuis hero
  const ctaData = pickFirst<{ title?: string; subtitle?: string; ctaText?: string; ctaHref?: string }>(sections, ["cta"]);
  const finalCta = {
    title: String(ctaData?.title ?? "Prêt à commencer ?"),
    subtitle: ctaData?.subtitle ? String(ctaData.subtitle) : undefined,
    ctaText: String(ctaData?.ctaText ?? ctaText),
    ctaHref: String(ctaData?.ctaHref ?? "#contact"),
  };

  // Contact
  const contactData = pickFirst<{ email?: string; phone?: string; address?: string }>(sections, ["contact"]);
  const contact = contactData
    ? {
        email: contactData.email ? String(contactData.email) : undefined,
        phone: contactData.phone ? String(contactData.phone) : undefined,
        address: contactData.address ? String(contactData.address) : undefined,
      }
    : undefined;

  return {
    hero: {
      badge,
      title,
      subtitle,
      primaryCta: { text: ctaText, href: ctaHref },
      secondaryCta: secondaryText ? { text: secondaryText, href: secondaryHref } : undefined,
    },
    logos,
    bigFeatures,
    stats,
    finalCta,
    contact,
  };
}
