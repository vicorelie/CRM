import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PixelConfigClient } from "./PixelConfigClient";

export const dynamic = "force-dynamic";

export default async function PixelConfigPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  // Vérifier ownership du site + récupérer info
  const site = await prisma.generatedSite.findFirst({
    where: { id: params.id, user: { email: session.user.email } },
    select: {
      id: true,
      slug: true,
      brief: true,
      meta: true,
      createdAt: true,
      sitePixel: {
        select: {
          id: true,
          adAccountId: true,
          pixelId: true,
          pixelName: true,
          testEventCode: true,
          enabled: true,
          events: true,
          consentRequired: true,
          lastEventAt: true,
          lastErrorAt: true,
          lastError: true,
        },
      },
    },
  });

  if (!site) notFound();

  // Lister les AdAccounts Meta de l'utilisateur (pour le dropdown)
  const adAccounts = await prisma.adAccount.findMany({
    where: { user: { email: session.user.email }, platform: "META_ADS", status: "CONNECTED" },
    select: { id: true, name: true, externalId: true, currency: true },
    orderBy: { connectedAt: "desc" },
  });

  const brief = (site.brief ?? {}) as { brandName?: string; sector?: string };
  const brandName = brief.brandName ?? "Site sans nom";

  return (
    <main className="min-h-screen bg-white text-zinc-900 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex items-center justify-between text-sm">
          <Link href="/generated-sites" className="text-zinc-500 hover:text-brand-700 transition-colors">
            ← Mes sites générés
          </Link>
          {site.slug && (
            <a
              href={`/sites/${site.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-700 hover:underline"
            >
              Voir le site public ↗
            </a>
          )}
        </header>

        <section className="space-y-2">
          <div className="text-4xl">📊</div>
          <h1 className="text-3xl font-bold tracking-tight">Tracking publicitaire Meta</h1>
          <p className="text-zinc-600">
            Active le tracking Meta Pixel + Conversions API sur ton site{" "}
            <strong>{brandName}</strong> pour mesurer les conversions de tes campagnes
            publicitaires et optimiser leur performance.
          </p>
          {!site.slug && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              ⚠️ Ce site n'a pas de slug — impossible de l'activer en URL publique. Régénère le site pour résoudre.
            </div>
          )}
        </section>

        {site.slug && (
          <PixelConfigClient
            siteId={site.id}
            slug={site.slug}
            adAccounts={adAccounts}
            initialPixel={site.sitePixel}
          />
        )}
      </div>
    </main>
  );
}
