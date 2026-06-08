import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SeoModeSwitcher } from "./SeoModeSwitcher";

export default async function SeoPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <main className="min-h-screen bg-white text-zinc-900 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <Link
            href="/cockpit"
            className="text-sm text-zinc-500 hover:text-brand-700 transition-colors"
          >
            ← Retour au cockpit
          </Link>
        </header>

        <section className="space-y-3">
          <div className="text-5xl">🔍</div>
          <h1 className="text-4xl font-bold tracking-tight">Audit SEO</h1>
          <p className="text-zinc-700 max-w-2xl">
            Audite et optimise une page individuelle ou tout ton site d'un coup.
            WanaPush génère le contenu SEO optimisé (titles, métas, schema, alts)
            avec l'IA et applique tout directement sur ton site.
          </p>
        </section>

        <SeoModeSwitcher />
      </div>
    </main>
  );
}
