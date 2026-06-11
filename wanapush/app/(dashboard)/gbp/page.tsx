// Google Business Profile — page connect-first (1 clic, l'OAuth backend existe déjà).
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function GbpPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) redirect("/login");

  const accounts = await prisma.gbpAccount.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      accountName: true,
      locations: { select: { id: true, title: true, address: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const connected = accounts.length > 0;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-brand-700">Google Business Profile</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">📍 Ta visibilité locale</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Posts hebdo, réponses aux avis automatisées, suivi des appels — directement sur ta fiche Google Maps.
        </p>
      </header>

      {!connected ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center space-y-4 shadow-sm">
          <div className="text-5xl">📍</div>
          <h2 className="text-xl font-bold text-zinc-950">Connecte ta fiche Google Business en 1 clic</h2>
          <p className="mx-auto max-w-md text-sm text-zinc-600">
            Autorise WanaPush à gérer ta fiche — ensuite on s&apos;occupe des posts hebdo et des réponses aux avis
            automatiquement. ~30 secondes, <strong>rien à copier</strong>.
          </p>
          <Link
            href="/api/gbp/oauth/google/start"
            className="inline-block rounded-xl bg-brand-700 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Connecter Google Business →
          </Link>
          <p className="text-xs text-zinc-400">Tu seras redirigé vers Google pour autoriser l&apos;accès, puis ramené ici.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
            <span className="font-semibold">✓ {accounts.length} compte{accounts.length > 1 ? "s" : ""} Google connecté{accounts.length > 1 ? "s" : ""}.</span>{" "}
            La plateforme va pouvoir automatiser tes posts et tes réponses aux avis.
          </div>
          {accounts.map((a) => (
            <div key={a.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="font-bold text-zinc-950">{a.accountName ?? "Compte Google"}</div>
              {a.locations.length === 0 ? (
                <p className="mt-1 text-sm text-zinc-500">Aucun établissement synchronisé pour l&apos;instant.</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {a.locations.map((l) => (
                    <li key={l.id} className="text-sm text-zinc-700">
                      📍 <strong>{l.title}</strong>
                      {l.address ? ` — ${l.address}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          <Link href="/api/gbp/oauth/google/start" className="inline-block text-sm font-medium text-brand-700 hover:text-brand-800">
            + Connecter un autre compte
          </Link>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-600">
        <p className="font-semibold text-zinc-800">Prochainement (automatique une fois connecté)</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          <li>Posts hebdomadaires programmés (offres, actus, événements)</li>
          <li>Réponses IA aux avis (positifs et négatifs), validées par toi</li>
          <li>Audit de la fiche + suivi des appels et demandes d&apos;itinéraire</li>
        </ul>
      </div>
    </div>
  );
}
