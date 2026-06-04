import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SitesClient } from "./SitesClient";

export default async function SitesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <main className="min-h-screen bg-white text-zinc-900 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="text-sm text-zinc-500 hover:text-brand-700 transition-colors"
          >
            ← Retour au dashboard
          </Link>
        </header>

        <section className="space-y-3">
          <div className="text-5xl">🔌</div>
          <h1 className="text-4xl font-bold tracking-tight">Mes sites</h1>
          <p className="text-zinc-700 max-w-2xl">
            Connecte tes sites pour que WanaPush puisse les{" "}
            <strong>modifier directement</strong> : appliquer les corrections
            SEO, mettre à jour les meta-tags, optimiser les images, etc. Tout
            ce qui est détecté dans l'audit devient cliquable.
          </p>
        </section>

        <SitesClient />
      </div>
    </main>
  );
}
