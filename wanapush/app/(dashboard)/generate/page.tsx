import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GenerateClient } from "./GenerateClient";

export default async function GeneratePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <header className="max-w-6xl mx-auto px-6 lg:px-10 pt-6 flex items-center justify-between">
        <Link
          href="/cockpit"
          className="text-sm text-zinc-500 hover:text-brand-700 transition-colors inline-flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Retour au cockpit
        </Link>
        <div className="flex items-center gap-5">
          <Link
            href="/generated-sites"
            className="text-sm text-brand-700 hover:text-brand-700 transition-colors inline-flex items-center gap-1.5"
          >
            Mes sites générés
          </Link>
        </div>
      </header>

      <GenerateClient />
    </main>
  );
}
