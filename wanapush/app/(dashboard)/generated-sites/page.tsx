import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GeneratedSitesClient } from "./GeneratedSitesClient";

export default async function GeneratedSitesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <main className="min-h-screen bg-white text-zinc-900 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="text-sm text-zinc-500 hover:text-brand-700 transition-colors"
          >
            ← Retour au dashboard
          </Link>
        </header>

        <section className="space-y-3">
          <div className="text-5xl">🗂</div>
          <h1 className="text-4xl font-bold tracking-tight">Mes sites générés</h1>
          <p className="text-zinc-700 max-w-2xl">
            Tous les sites créés via{" "}
            <Link
              href="/generate"
              className="text-brand-700 hover:text-brand-700 underline"
            >
              Générer un site
            </Link>
            . Tu peux les visualiser, télécharger le ZIP ou les supprimer.
          </p>
        </section>

        <GeneratedSitesClient />
      </div>
    </main>
  );
}
