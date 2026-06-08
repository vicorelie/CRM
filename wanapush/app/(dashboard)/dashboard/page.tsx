import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const MODULES = [
  { name: "Cockpit", emoji: "🎛️", href: "/cockpit", hint: "Vue d'ensemble + Copilot IA" },
  { name: "Mes sites", emoji: "🔌", href: "/sites", hint: "Connecter un site" },
  { name: "Générer un site", emoji: "🎨", href: "/generate", hint: "Builder IA" },
  { name: "Sites générés", emoji: "🗂", href: "/generated-sites", hint: "Bibliothèque" },
  { name: "Boutiques", emoji: "🛍️", href: "/shop", hint: "E-commerce" },
  { name: "SEO", emoji: "🔍", href: "/seo", hint: "Référencement" },
  { name: "Social", emoji: "📱", href: "/social", hint: "Réseaux sociaux" },
  { name: "Ads", emoji: "🎯", href: "/ads", hint: "Publicité payante" },
  { name: "GBP", emoji: "📍", href: "/gbp", hint: "Google Business" },
  { name: "Leads", emoji: "🧲", href: "/leads", hint: "Prospection" },
  { name: "Email", emoji: "✉️", href: "/email", hint: "Campagnes" },
  { name: "ASO", emoji: "📲", href: "/aso", hint: "App stores" },
  { name: "Analytics", emoji: "📊", href: "/analytics", hint: "Performance" },
] as const;

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const firstName =
    session.user?.name?.split(" ")[0] ?? session.user?.email?.split("@")[0] ?? "";

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <section className="mb-10">
        <p className="text-xs font-medium uppercase tracking-widest text-brand-700">
          Bienvenue
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl">
          Bonjour {firstName}.
        </h1>
        <p className="mt-3 max-w-xl text-base text-zinc-600">
          Choisissez un module pour commencer. Chaque brique du marketing
          digital, à portée de clic.
        </p>
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Modules
          </h2>
          <span className="text-xs text-zinc-400">
            {MODULES.length} disponibles
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {MODULES.map((m) => (
            <Link
              key={m.name}
              href={m.href}
              className="group relative flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-lift"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-50 text-2xl transition-colors group-hover:bg-brand-50">
                {m.emoji}
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-950">
                  {m.name}
                </div>
                <div className="mt-0.5 text-xs text-zinc-500">{m.hint}</div>
              </div>
              <span className="absolute right-4 top-4 text-zinc-300 transition-colors group-hover:text-brand">
                →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
