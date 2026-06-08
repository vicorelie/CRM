import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LeadsClient } from "./LeadsClient";

export default async function LeadsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <main className="min-h-screen bg-white text-zinc-900 p-6 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <Link
            href="/cockpit"
            className="text-sm text-zinc-500 hover:text-brand-700 transition-colors inline-flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Retour au cockpit
          </Link>
        </header>

        <section className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/30 text-brand-700 text-xs font-medium uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
            Boîte de réception
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Leads & soumissions</h1>
          <p className="text-zinc-700 max-w-2xl">
            Toutes les soumissions de formulaires de contact et inscriptions à la newsletter reçues sur tes sites générés.
          </p>
        </section>

        <LeadsClient />
      </div>
    </main>
  );
}
