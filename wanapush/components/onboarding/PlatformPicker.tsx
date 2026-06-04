"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/context";
import { useLocalized } from "@/lib/onboarding/helpers";
import { PLATFORM_CONFIGS } from "@/lib/onboarding/platforms";
import { LangSwitcher } from "@/components/ui/LangSwitcher";

type Props = {
  kind: "ads" | "social";
  /** Liste des slugs de plateformes déjà connectées — pour afficher un badge "Déjà connecté". */
  connectedSlugs?: string[];
};

export function PlatformPicker({ kind, connectedSlugs = [] }: Props) {
  const { t } = useT();
  const L = useLocalized();
  const platforms = PLATFORM_CONFIGS.filter((c) => c.kind === kind);
  const baseHref = kind === "ads" ? "/ads" : "/social";
  const heading =
    kind === "ads"
      ? { fr: "Quel compte publicitaire voulez-vous connecter ?", en: "Which ad account do you want to connect?" }
      : { fr: "Quel réseau social voulez-vous connecter ?", en: "Which social network do you want to connect?" };
  const subtitle =
    kind === "ads"
      ? { fr: "Sélectionnez la plateforme. Vous pourrez en ajouter d'autres ensuite.", en: "Pick the platform. You can add more later." }
      : { fr: "Sélectionnez la plateforme. Vous pourrez en ajouter d'autres ensuite.", en: "Pick the platform. You can add more later." };

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      {/* Header avec breadcrumb + langue */}
      <div className="sticky top-[68px] z-10 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-6 py-3">
          <Link
            href={baseHref}
            className="whitespace-nowrap text-xs text-zinc-500 transition-colors hover:text-brand-700"
          >
            ← {kind === "ads" ? "Publicité payante" : "Réseaux sociaux"}
          </Link>
          <div className="h-4 w-px bg-zinc-200" />
          <div className="flex-1 min-w-[200px]">
            <div className="text-[10px] font-medium uppercase tracking-widest text-zinc-400">
              {t("wizard.step")} 1 {t("wizard.of")} 2
            </div>
            <div className="text-sm font-semibold text-zinc-950">
              {kind === "ads" ? "🎯 Choisir une plateforme pub" : "📱 Choisir un réseau social"}
            </div>
          </div>
          <LangSwitcher />
        </div>
        <div className="h-1 overflow-hidden bg-zinc-100">
          <div className="h-full w-1/2 bg-gradient-to-r from-brand-500 to-brand-700 transition-all duration-500" />
        </div>
      </div>

      {/* Content */}
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="space-y-3 mb-10">
          <div className="text-5xl">{kind === "ads" ? "🎯" : "📱"}</div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
            {L(heading)}
          </h1>
          <p className="text-base text-zinc-600 sm:text-lg">{L(subtitle)}</p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          {platforms.map((p) => {
            const isConnected = connectedSlugs.includes(p.slug);
            return (
              <Link
                key={p.slug}
                href={`${baseHref}/setup/${p.slug}`}
                className="group relative flex items-start gap-4 rounded-2xl border border-zinc-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-lift"
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-50 text-3xl transition-colors group-hover:bg-brand-50">
                  {p.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-zinc-950">
                      {L(p.welcome.title).replace(/^Connecter |^Connect /, "").replace(/ à WanaPush$| to WanaPush$/, "")}
                    </span>
                    {isConnected && (
                      <span className="text-[10px] uppercase font-bold tracking-wider rounded-full border border-emerald-500/40 bg-emerald-50 text-emerald-700 px-2 py-0.5">
                        ✓ Connecté
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">{L(p.welcome.subtitle)}</p>
                  <p className="mt-2 text-[11px] text-zinc-400">⏱ ~{p.estimatedMinutes} min</p>
                </div>
                <span className="absolute right-4 top-4 text-zinc-300 transition-colors group-hover:text-brand-500">
                  →
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
