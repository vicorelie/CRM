import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SocialClient } from "./SocialClient";

export default async function SocialPage({
  searchParams,
}: {
  searchParams: { ok?: string; error?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <main className="min-h-screen bg-white text-zinc-900 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <Link
            href="/cockpit"
            className="text-sm text-zinc-500 hover:text-brand-700 transition-colors"
          >
            ← Retour au cockpit
          </Link>
        </header>

        <section className="space-y-3">
          <div className="text-5xl">📱</div>
          <h1 className="text-4xl font-bold tracking-tight">Réseaux sociaux</h1>
          <p className="text-zinc-700 max-w-2xl">
            Connecte tes comptes Instagram, TikTok, YouTube, LinkedIn, Facebook.
            Planifie, publie, analyse — le tout depuis WanaPush.
          </p>
        </section>

        {searchParams.ok && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            ✓ {searchParams.ok}
          </div>
        )}
        {searchParams.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            ⚠ {searchParams.error}
          </div>
        )}

        <SocialClient />
      </div>
    </main>
  );
}
