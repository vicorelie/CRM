"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { SitesClient } from "./SitesClient";
import { GeneratedSitesClient } from "../generated-sites/GeneratedSitesClient";

type Tab = "generated" | "connected";

const TABS: Array<{ id: Tab; label: string; emoji: string; hint: string }> = [
  { id: "generated", label: "Sites générés", emoji: "🎨", hint: "Créés avec WanaPush" },
  { id: "connected", label: "Sites connectés", emoji: "🔌", hint: "WordPress, Shopify, custom" },
];

export function SitesHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const rawTab = searchParams.get("tab");
  const activeTab: Tab = rawTab === "connected" ? "connected" : "generated";

  function switchTab(tab: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "generated") {
      params.delete("tab"); // tab par défaut, URL plus propre
    } else {
      params.set("tab", tab);
    }
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/sites?${qs}` : "/sites");
    });
  }

  return (
    <main className="min-h-screen bg-white text-zinc-900 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <Link
            href="/cockpit"
            className="text-sm text-zinc-500 hover:text-brand-700 transition-colors"
          >
            ← Retour au cockpit
          </Link>
          {activeTab === "generated" && (
            <Link
              href="/generate"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-800"
            >
              + Nouveau site
            </Link>
          )}
        </header>

        <section className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Sites</h1>
          <p className="max-w-2xl text-sm text-zinc-600">
            Tes sites générés avec WanaPush et tes sites tiers connectés pour
            audit + corrections SEO automatiques.
          </p>
        </section>

        {/* Tab nav — pattern Linear/Vercel 2026 */}
        <div className="border-b border-zinc-200">
          <nav className="flex gap-1" role="tablist">
            {TABS.map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => switchTab(t.id)}
                  disabled={isPending}
                  className={`relative inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                    active
                      ? "border-brand-700 text-brand-700"
                      : "border-transparent text-zinc-500 hover:text-zinc-900"
                  } disabled:opacity-50`}
                >
                  <span aria-hidden>{t.emoji}</span>
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content (mounted conditionnellement pour éviter fetch inutile) */}
        <div role="tabpanel" className="pt-2">
          {activeTab === "generated" ? <GeneratedSitesClient /> : <SitesClient />}
        </div>
      </div>
    </main>
  );
}
