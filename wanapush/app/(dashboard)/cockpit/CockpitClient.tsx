"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import type { AnalyticsOverview } from "@/lib/analytics/aggregators";
import type { Anomaly } from "@/lib/analytics/anomalies";
import type { AgentAction } from "@/lib/generated/prisma/client";

type Props = {
  firstName: string;
  days: number;
  overview: AnalyticsOverview;
  anomalies: Anomaly[];
  actions: AgentAction[];
};

const TIER_LABEL: Record<string, string> = {
  autopilot: "Auto",
  batch: "Lot",
  one_by_one: "À valider",
  human_only: "Manuel",
};
const TIER_BADGE: Record<string, string> = {
  autopilot: "bg-emerald-100 text-emerald-800",
  batch: "bg-sky-100 text-sky-800",
  one_by_one: "bg-amber-100 text-amber-800",
  human_only: "bg-zinc-200 text-zinc-700",
};

export function CockpitClient({ firstName, days, overview, actions }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [showAllActions, setShowAllActions] = useState(false);

  function changeDays(newDays: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("days", String(newDays));
    startTransition(() => {
      router.replace(`/cockpit?${params.toString()}`);
    });
  }

  async function resolveAction(id: string, decision: "approve" | "dismiss") {
    setResolvingId(id);
    try {
      await fetch(`/api/agent/actions/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      startTransition(() => router.refresh());
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      {/* Header avec période selector */}
      <header className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-brand-700">Cockpit</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
            Bonjour {firstName}.
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Vue d&apos;ensemble de ton business sur les {days} derniers jours.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => changeDays(d)}
              disabled={isPending}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                days === d
                  ? "bg-brand-700 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              } disabled:opacity-50`}
            >
              {d}j
            </button>
          ))}
        </div>
      </header>

      {/* File d'actions prioritaires — "l'IA prépare, tu approuves" (Phase 1 auto-pilote) */}
      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">Actions prioritaires</h2>
          {actions.length > 0 && (
            <span className="rounded-full bg-brand-700 px-2 py-0.5 text-[11px] font-bold text-white">{actions.length}</span>
          )}
        </div>
        {actions.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
            ✓ Rien d&apos;urgent — tout tourne. La plateforme surveille et préparera une action dès qu&apos;il y a un levier à activer.
          </div>
        ) : (
          <>
          <div className="space-y-3">
            {(showAllActions ? actions : actions.slice(0, 6)).map((a) => (
              <div key={a.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  <span className={`rounded px-1.5 py-0.5 ${TIER_BADGE[a.autonomyTier] ?? "bg-zinc-100 text-zinc-700"}`}>
                    {TIER_LABEL[a.autonomyTier] ?? a.autonomyTier}
                  </span>
                  <span>Impact {a.impactScore}/100 · confiance {a.confidence}%</span>
                </div>
                <div className="mt-1.5 text-base font-bold text-zinc-950">{a.title}</div>
                <div className="mt-1 text-sm text-zinc-600">{a.rationale}</div>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => resolveAction(a.id, "approve")}
                    disabled={resolvingId === a.id || isPending}
                    className="rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
                  >
                    {resolvingId === a.id ? "…" : "Approuver"}
                  </button>
                  {a.deepLink && (
                    <Link href={a.deepLink} className="rounded-lg border border-zinc-200 px-3.5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                      Voir
                    </Link>
                  )}
                  <button
                    onClick={() => resolveAction(a.id, "dismiss")}
                    disabled={resolvingId === a.id || isPending}
                    className="ml-auto text-sm text-zinc-500 hover:text-zinc-900 disabled:opacity-50"
                  >
                    Ignorer
                  </button>
                </div>
              </div>
            ))}
          </div>
          {actions.length > 6 && (
            <button
              onClick={() => setShowAllActions((s) => !s)}
              className="mt-3 text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              {showAllActions
                ? "Réduire"
                : `Voir les ${actions.length - 6} autres action${actions.length - 6 > 1 ? "s" : ""}`}
            </button>
          )}
          </>
        )}
      </section>

      {/* Unit Economics (cards header) */}
      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Unit Economics
        </h2>
        <UnitEconomicsCards ue={overview.unitEconomics} />
      </section>

      {/* Grille unifiée — TOUS les modules au même niveau visuel.
          L'emphase vient des données (metrics si dispo, empty state sinon),
          pas d'une hiérarchie arbitraire. Pattern Linear/Vercel/Notion 2026. */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Modules
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AdsCard ads={overview.ads} />
          <LeadsCard leads={overview.leads} />
          <ShopCard shop={overview.shop} />
          <EmailCard email={overview.email} />
          <GbpCard gbp={overview.gbp} />
          <ModuleCard
            href="/sites"
            emoji="🗂"
            title="Sites"
            empty="Sites générés + sites connectés (audit SEO)."
          />
          <ModuleCard
            href="/seo"
            emoji="🔍"
            title="SEO"
            empty="Audit + optimizer pour tes sites connectés."
          />
          <ModuleCard
            href="/social"
            emoji="📱"
            title="Social"
            empty="Facebook, Instagram, TikTok, LinkedIn, YouTube."
          />
          <ModuleCard
            href="/aso"
            emoji="📲"
            title="ASO"
            empty="Optimisation App Store iOS + Android."
          />
        </div>
      </section>
    </div>
  );
}

// ─── Helpers format ────────────────────────────────────────────────────────

function fmtMoney(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtNum(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

// ─── Unit Economics cards (header style) ───────────────────────────────────

function UnitEconomicsCards({ ue }: { ue: AnalyticsOverview["unitEconomics"] }) {
  // Empty state pattern 2026 (Canva, Linear) : si rien de calculable,
  // remplacer par un onboarding card avec actions concrètes (+75% conversion
  // vs "No data" générique selon empty state UX studies).
  const isEmpty =
    ue.cac === null &&
    ue.ltv === null &&
    ue.ltvCacRatio === null &&
    ue.leadVelocityRate === null;

  if (isEmpty) {
    return <UnitEconomicsOnboarding />;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Kpi
        label="CAC"
        value={ue.cac !== null ? fmtMoney(ue.cac) : "—"}
        hint="Coût d'acquisition client"
      />
      <Kpi
        label="LTV"
        value={ue.ltv !== null ? fmtMoney(ue.ltv) : "—"}
        hint="Valeur vie client"
      />
      <Kpi
        label="LTV / CAC"
        value={
          ue.ltvCacRatio !== null
            ? `${ue.ltvCacRatio.toFixed(2)}:1`
            : "—"
        }
        hint={ue.ltvCacRatio !== null ? (ue.ltvCacRatio >= 3 ? "✓ Cible 3:1" : "⚠ Sous cible 3:1") : ""}
        accent={ue.ltvCacRatio !== null ? (ue.ltvCacRatio >= 3 ? "good" : "warn") : "neutral"}
      />
      <Kpi
        label="Lead Velocity"
        value={
          ue.leadVelocityRate !== null
            ? `${ue.leadVelocityRate >= 0 ? "▲ +" : "▼ "}${(Math.abs(ue.leadVelocityRate) * 100).toFixed(0)}%`
            : "—"
        }
        hint="vs période précédente"
        accent={ue.leadVelocityRate !== null ? (ue.leadVelocityRate >= 0 ? "good" : "warn") : "neutral"}
      />
    </div>
  );
}

function UnitEconomicsOnboarding() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-gradient-to-br from-brand-50 via-white to-white p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-xl">
          💡
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-zinc-950">
            Connecte tes outils pour voir ton Unit Economics
          </h3>
          <p className="mt-1 text-sm text-zinc-600">
            CAC, LTV, LTV/CAC et Lead Velocity se calculent automatiquement à
            partir de tes <strong>dépenses publicitaires</strong> + tes{" "}
            <strong>ventes Stripe</strong>. 2 connexions, 5 minutes.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/ads"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-800"
            >
              🎯 Connecter un compte pub
            </Link>
            <Link
              href="/shop"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-brand-300 hover:text-brand-700"
            >
              🛍️ Setup boutique Stripe
            </Link>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("wp:open-copilot"))}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-brand-300 hover:text-brand-700"
            >
              🤖 Demander au Copilot
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  accent = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "good" | "warn" | "neutral";
}) {
  const accentColor =
    accent === "good"
      ? "text-emerald-700"
      : accent === "warn"
        ? "text-amber-700"
        : "text-zinc-900";
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${accentColor}`}>{value}</p>
      {hint && <p className="mt-1 text-[11px] text-zinc-500">{hint}</p>}
    </div>
  );
}

// ─── Module cards (cliquables, lien vers le module) ────────────────────────

function ModuleCard({
  href,
  emoji,
  title,
  empty,
  children,
}: {
  href: string;
  emoji: string;
  title: string;
  empty?: string;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-xl border border-zinc-200 bg-white p-5 transition-all hover:border-brand-300 hover:shadow-sm"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xl" aria-hidden>
          {emoji}
        </span>
        <h3 className="font-semibold text-zinc-950">{title}</h3>
        <span className="ml-auto text-xs text-zinc-400 group-hover:text-brand-700">→</span>
      </div>
      {empty ? (
        <p className="text-sm text-zinc-500">{empty}</p>
      ) : (
        <div className="space-y-1.5 text-sm">{children}</div>
      )}
    </Link>
  );
}

function MetricLine({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "good" | "warn";
}) {
  const color =
    accent === "good"
      ? "text-emerald-700"
      : accent === "warn"
        ? "text-amber-700"
        : "text-zinc-900";
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className={`font-mono font-semibold ${color}`}>{value}</span>
    </div>
  );
}

function AdsCard({ ads }: { ads: AnalyticsOverview["ads"] }) {
  if (ads.totalSpend === 0) {
    return (
      <ModuleCard
        href="/ads"
        emoji="🎯"
        title="Publicité"
        empty="Pas encore de campagnes actives. Connecte un compte pub."
      />
    );
  }
  const topPlat = ads.byPlatform[0];
  return (
    <ModuleCard href="/ads" emoji="🎯" title="Publicité">
      <MetricLine label="Dépense" value={fmtMoney(ads.totalSpend)} />
      <MetricLine
        label="ROAS"
        value={`${ads.roas.toFixed(2)}x`}
        accent={ads.roas >= 2 ? "good" : ads.roas < 1 ? "warn" : undefined}
      />
      <MetricLine label="Revenue" value={fmtMoney(ads.totalRevenue)} />
      {topPlat && (
        <MetricLine
          label="Top"
          value={`${topPlat.platform.replace("_ADS", "")} ${topPlat.roas.toFixed(2)}x`}
        />
      )}
    </ModuleCard>
  );
}

function LeadsCard({ leads }: { leads: AnalyticsOverview["leads"] }) {
  if (leads.total === 0) {
    return (
      <ModuleCard
        href="/leads"
        emoji="🧲"
        title="Leads"
        empty="Aucun lead capturé. Active les formulaires sur tes sites."
      />
    );
  }
  return (
    <ModuleCard href="/leads" emoji="🧲" title="Leads">
      <MetricLine label="Total" value={fmtNum(leads.total)} />
      <MetricLine
        label="🔥 HOT / 🌡 WARM"
        value={`${leads.byTemperature.HOT} / ${leads.byTemperature.WARM}`}
        accent={leads.byTemperature.HOT > 0 ? "good" : undefined}
      />
      <MetricLine
        label="Score moyen"
        value={leads.averageScore !== null ? `${leads.averageScore.toFixed(0)}/100` : "—"}
      />
      <MetricLine label="Conversion" value={fmtPct(leads.conversionRate)} />
    </ModuleCard>
  );
}

function ShopCard({ shop }: { shop: AnalyticsOverview["shop"] }) {
  if (shop.paidOrders === 0) {
    return (
      <ModuleCard
        href="/shop"
        emoji="🛍️"
        title="Boutiques"
        empty="Pas encore de ventes. Configure Stripe sur ta boutique."
      />
    );
  }
  return (
    <ModuleCard href="/shop" emoji="🛍️" title="Boutiques">
      <MetricLine label="CA brut" value={fmtMoney(shop.totalRevenue)} />
      <MetricLine label="CA net" value={fmtMoney(shop.netRevenue)} />
      <MetricLine label="Commandes" value={fmtNum(shop.paidOrders)} />
      <MetricLine label="Panier moyen" value={fmtMoney(shop.averageOrderValue)} />
    </ModuleCard>
  );
}

function EmailCard({ email }: { email: AnalyticsOverview["email"] }) {
  if (email.campaignsSent === 0) {
    return (
      <ModuleCard
        href="/email"
        emoji="✉️"
        title="Email"
        empty="Aucune campagne envoyée. Crée ta première newsletter."
      />
    );
  }
  return (
    <ModuleCard href="/email" emoji="✉️" title="Email">
      <MetricLine label="Campagnes" value={fmtNum(email.campaignsSent)} />
      <MetricLine label="Destinataires" value={fmtNum(email.totalDelivered)} />
      <MetricLine
        label="Ouverture"
        value={fmtPct(email.openRate)}
        accent={email.openRate >= 0.2 ? "good" : email.openRate < 0.1 ? "warn" : undefined}
      />
      <MetricLine
        label="Clic"
        value={fmtPct(email.clickRate)}
        accent={email.clickRate >= 0.02 ? "good" : undefined}
      />
    </ModuleCard>
  );
}

function GbpCard({ gbp }: { gbp: AnalyticsOverview["gbp"] }) {
  if (gbp.totalImpressions === 0 && gbp.totalReviews === 0) {
    return (
      <ModuleCard
        href="/gbp"
        emoji="📍"
        title="Google Business"
        empty="Pas connecté. Branche ta fiche Google Business Profile."
      />
    );
  }
  return (
    <ModuleCard href="/gbp" emoji="📍" title="Google Business">
      <MetricLine label="Impressions" value={fmtNum(gbp.totalImpressions)} />
      <MetricLine label="Site → clics" value={fmtNum(gbp.websiteClicks)} />
      <MetricLine label="Appels" value={fmtNum(gbp.callClicks)} />
      {gbp.averageRating !== null && (
        <MetricLine
          label="Note"
          value={`${gbp.averageRating.toFixed(1)}★ (${fmtNum(gbp.totalReviews)})`}
        />
      )}
    </ModuleCard>
  );
}

