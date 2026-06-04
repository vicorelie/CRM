// Template "saas-clean" — design SaaS moderne, inspiré de l'esthétique générique des
// landings tech 2025 (fond clair, gradient pastel, typographie bold serrée, mockups
// avec ombres profondes, code snippets en mock terminal). Tout est code original WanaPush.
//
// L'IA remplit `SaasCleanData` à partir du brief. Le template render TOUT le Home.tsx
// en un seul fichier autonome (pas de catalogue de sections).

import type { Brief } from "@/lib/site-gen/schema";

export type SaasCleanData = {
  hero: {
    badge?: string;
    title: string;
    subtitle: string;
    primaryCta: { text: string; href: string };
    secondaryCta?: { text: string; href: string };
  };
  logos?: { name: string }[];
  bigFeatures: {
    eyebrow?: string;
    title: string;
    description: string;
    bullets?: string[];
    codeSnippet?: string;
    imageKeywords?: string;
  }[];
  stats?: { value: string; label: string }[];
  finalCta: {
    title: string;
    subtitle?: string;
    ctaText: string;
    ctaHref: string;
  };
  contact?: {
    email?: string;
    phone?: string;
    address?: string;
  };
};

/**
 * Génère le contenu TSX complet du Home.tsx pour ce template.
 * Le template injecte directement les contenus (text + images Unsplash préchargées) dans le JSX.
 * imageMap : map "fsplit-i" → { url, alt } pour les images des bigFeatures (préchargées).
 */
export function saasCleanHomeTsx(args: {
  brief: Brief;
  data: SaasCleanData;
  imageMap: Record<string, { url: string; alt: string }>;
}): string {
  const { brief, data, imageMap } = args;
  const j = (v: unknown) => JSON.stringify(v);
  const esc = (s: string) => s.replace(/`/g, "\\`").replace(/\$/g, "\\$");

  const bigFeaturesJson = data.bigFeatures.map((b, i) => {
    const img = imageMap[`saas-feat-${i}`];
    return { ...b, imageUrl: img?.url, imageAlt: img?.alt };
  });

  return `import { useEffect } from "react";
import { motion } from "framer-motion";

type Hero = { badge?: string; title: string; subtitle: string; primaryCta: { text: string; href: string }; secondaryCta?: { text: string; href: string } };
type Logo = { name: string };
type BigFeature = { eyebrow?: string; title: string; description: string; bullets?: string[]; codeSnippet?: string; imageKeywords?: string; imageUrl?: string; imageAlt?: string };
type Stat = { value: string; label: string };
type FinalCta = { title: string; subtitle?: string; ctaText: string; ctaHref: string };
type Contact = { email?: string; phone?: string; address?: string };

const HERO: Hero = ${j(data.hero)};
const LOGOS: Logo[] = ${j(data.logos ?? [])};
const BIG_FEATURES: BigFeature[] = ${j(bigFeaturesJson)};
const STATS: Stat[] = ${j(data.stats ?? [])};
const FINAL_CTA: FinalCta = ${j(data.finalCta)};
const CONTACT: Contact = ${j(data.contact ?? {})};

export default function Home() {
  useEffect(() => {
    document.title = \`${esc(brief.brandName)} — ${esc(data.hero.title.slice(0, 70))}\`;
  }, []);

  return (
    <main className="bg-white text-slate-900 antialiased">
      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-32 pb-24 lg:pt-40 lg:pb-32">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-cyan-50" />
          <div className="absolute -top-20 -right-20 w-[600px] h-[600px] bg-gradient-to-br from-primary/20 via-secondary/15 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-gradient-to-tr from-cyan-200/40 to-transparent rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              {HERO.badge && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-[0.15em]">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  {HERO.badge}
                </span>
              )}
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-[3.25rem] xl:text-[3.75rem] font-black tracking-[-0.035em] leading-[1.08] mb-6 text-slate-900">
                {HERO.title}
              </h1>
              <p className="text-lg sm:text-xl text-slate-600 leading-relaxed mb-8 max-w-xl">
                {HERO.subtitle}
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={HERO.primaryCta.href}
                  className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-lg font-semibold hover:bg-slate-800 shadow-xl shadow-slate-900/15 transition-all hover:-translate-y-0.5"
                >
                  {HERO.primaryCta.text}
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path d="M3 8h10m-4-4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
                {HERO.secondaryCta && (
                  <a
                    href={HERO.secondaryCta.href}
                    className="inline-flex items-center gap-2 text-slate-900 px-6 py-3.5 rounded-lg font-semibold border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    {HERO.secondaryCta.text}
                  </a>
                )}
              </div>
            </motion.div>

            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            >
              <div className="absolute -inset-8 bg-gradient-to-br from-primary/30 via-secondary/20 to-transparent rounded-[2rem] blur-2xl" aria-hidden />
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/60 bg-white aspect-[4/3] lg:aspect-auto lg:h-[440px]">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white" />
                <div className="relative h-full flex flex-col p-6">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200/70">
                    <span className="w-3 h-3 rounded-full bg-red-400/70" />
                    <span className="w-3 h-3 rounded-full bg-yellow-400/70" />
                    <span className="w-3 h-3 rounded-full bg-green-400/70" />
                    <span className="ml-3 text-xs text-slate-500 font-mono">dashboard.${brief.brandName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com</span>
                  </div>
                  <div className="flex-1 flex gap-4">
                    <div className="w-1/3 space-y-2">
                      <div className="h-3 w-20 rounded bg-slate-200" />
                      <div className="h-8 rounded bg-gradient-to-r from-primary/80 to-secondary/80" />
                      <div className="h-3 w-16 rounded bg-slate-200" />
                      <div className="h-3 w-24 rounded bg-slate-200" />
                      <div className="h-3 w-12 rounded bg-slate-200" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="h-4 w-32 rounded bg-slate-300" />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-slate-200 p-3">
                          <div className="h-2 w-12 rounded bg-slate-200 mb-2" />
                          <div className="h-5 w-16 rounded bg-slate-900" />
                        </div>
                        <div className="rounded-lg border border-slate-200 p-3">
                          <div className="h-2 w-10 rounded bg-slate-200 mb-2" />
                          <div className="h-5 w-14 rounded bg-primary" />
                        </div>
                      </div>
                      <div className="h-24 rounded-lg bg-gradient-to-br from-primary/15 via-white to-secondary/10 border border-slate-100" />
                    </div>
                  </div>
                </div>
              </div>
              <motion.div
                className="absolute -bottom-6 -left-6 lg:-left-10 bg-white rounded-xl shadow-xl border border-slate-100 px-4 py-3 flex items-center gap-3"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6 }}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Statut</div>
                  <div className="text-sm font-semibold text-slate-900">Opérationnel</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── LOGOS BAR ──────────────────────────────────────────── */}
      {LOGOS.length > 0 && (
        <section className="py-14 border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-8">
              Ils nous font confiance
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-8 gap-y-6 items-center">
              {LOGOS.slice(0, 6).map((logo, i) => (
                <motion.div
                  key={logo.name + i}
                  className="text-center"
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                >
                  <span className="font-heading text-lg lg:text-xl font-bold text-slate-400 hover:text-slate-700 transition-colors tracking-tight">
                    {logo.name}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── BIG FEATURES (alternés texte / mockup ou code) ──────── */}
      {BIG_FEATURES.length > 0 && (
        <section className="py-24 lg:py-32">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 space-y-24 lg:space-y-32">
            {BIG_FEATURES.map((block, i) => {
              const reverse = i % 2 === 1;
              return (
                <div
                  key={block.title + i}
                  className={"grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center " + (reverse ? "lg:[&>*:first-child]:order-2" : "")}
                >
                  <motion.div
                    initial={{ opacity: 0, x: reverse ? 40 : -40 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {block.eyebrow && (
                      <span className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-4 block">
                        {block.eyebrow}
                      </span>
                    )}
                    <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black tracking-[-0.03em] leading-[1.05] mb-5 text-slate-900">
                      {block.title}
                    </h2>
                    <p className="text-lg text-slate-600 leading-relaxed mb-6">
                      {block.description}
                    </p>
                    {block.bullets && block.bullets.length > 0 && (
                      <ul className="space-y-3">
                        {block.bullets.map((b, j) => (
                          <li key={j} className="flex gap-3 text-slate-700">
                            <svg className="flex-shrink-0 w-5 h-5 mt-1 text-primary" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                              <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-3.5-3.5a1 1 0 011.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z" />
                            </svg>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </motion.div>
                  <motion.div
                    className="relative"
                    initial={{ opacity: 0, x: reverse ? -40 : 40 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                  >
                    <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-secondary/15 rounded-3xl blur-xl" aria-hidden />
                    {block.codeSnippet ? (
                      <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200 bg-slate-900 text-slate-100">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-slate-950">
                          <span className="w-3 h-3 rounded-full bg-red-500/70" />
                          <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
                          <span className="w-3 h-3 rounded-full bg-green-500/70" />
                        </div>
                        <pre className="p-5 text-sm font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap"><code>{block.codeSnippet}</code></pre>
                      </div>
                    ) : block.imageUrl ? (
                      <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-100 aspect-[4/3]">
                        <img src={block.imageUrl} alt={block.imageAlt ?? block.title} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    ) : (
                      <div className="relative rounded-2xl shadow-2xl border border-slate-100 bg-gradient-to-br from-primary/15 via-white to-secondary/15 aspect-[4/3]" />
                    )}
                  </motion.div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── STATS ──────────────────────────────────────────────── */}
      {STATS.length > 0 && (
        <section className="py-20 lg:py-28 bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
              {STATS.map((stat, i) => (
                <motion.div
                  key={stat.label + i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.6, delay: i * 0.08 }}
                  className="text-center lg:text-left"
                >
                  <div className="font-heading text-4xl lg:text-5xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-slate-400 uppercase tracking-wider font-semibold">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── FINAL CTA ──────────────────────────────────────────── */}
      <section className="py-24 lg:py-32" id="contact">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-black tracking-[-0.04em] leading-[1.05] mb-5 text-slate-900">
              {FINAL_CTA.title}
            </h2>
            {FINAL_CTA.subtitle && (
              <p className="text-lg sm:text-xl text-slate-600 leading-relaxed mb-8 max-w-2xl mx-auto">
                {FINAL_CTA.subtitle}
              </p>
            )}
            <a
              href={FINAL_CTA.ctaHref}
              className="inline-flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-lg font-semibold hover:bg-slate-800 shadow-xl shadow-slate-900/15 transition-all hover:-translate-y-0.5"
            >
              {FINAL_CTA.ctaText}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M3 8h10m-4-4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            {(CONTACT.email || CONTACT.phone) && (
              <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-slate-500">
                {CONTACT.email && (
                  <a href={\`mailto:\${CONTACT.email}\`} className="hover:text-slate-900 transition-colors">
                    {CONTACT.email}
                  </a>
                )}
                {CONTACT.phone && (
                  <a href={\`tel:\${CONTACT.phone}\`} className="hover:text-slate-900 transition-colors">
                    {CONTACT.phone}
                  </a>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </main>
  );
}
`;
}

/**
 * Renvoie les image queries Unsplash à précharger pour ce template, à partir des données.
 */
export function saasCleanImageQueries(data: SaasCleanData): Array<{
  keywords: string; width: number; height: number; seed: string;
}> {
  const queries: Array<{ keywords: string; width: number; height: number; seed: string }> = [];
  for (let i = 0; i < data.bigFeatures.length; i++) {
    const b = data.bigFeatures[i];
    if (b.codeSnippet) continue;
    const kw = b.imageKeywords || b.title;
    if (kw) queries.push({ keywords: String(kw), width: 1000, height: 750, seed: `saas-feat-${i}` });
  }
  return queries;
}
