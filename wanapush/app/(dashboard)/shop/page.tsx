import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ShopListClient } from "./ShopListClient";

export default async function ShopIndexPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <main className="min-h-screen bg-white text-zinc-900 p-6 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="text-sm text-zinc-500 hover:text-brand-700 transition-colors inline-flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Retour au dashboard
          </Link>
        </header>

        <section className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-500/30 text-emerald-700 text-xs font-medium uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            E-commerce
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Mes boutiques</h1>
          <p className="text-zinc-500 max-w-2xl">
            Active l&apos;e-commerce sur un site généré et configure ton catalogue, ton paiement,
            tes livraisons. Chaque boutique est indépendante.
          </p>
        </section>

        <ShopListClient />
      </div>
    </main>
  );
}
