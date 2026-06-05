import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ConversionTrackingClient } from "./ConversionTrackingClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export default async function Page({ params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const account = await prisma.adAccount.findFirst({
    where: { id: params.id, user: { email: session.user.email } },
    select: {
      id: true,
      platform: true,
      name: true,
      externalId: true,
      currency: true,
    },
  });

  if (!account) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h1 className="text-lg font-semibold text-red-900">
          Compte publicitaire introuvable
        </h1>
        <p className="mt-2 text-sm text-red-700">
          Il a peut-être été supprimé. Retournez au{" "}
          <a href="/ads" className="underline">
            tableau de bord Ads
          </a>
          .
        </p>
      </div>
    );
  }

  if (account.platform !== "GOOGLE_ADS") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-lg font-semibold text-amber-900">
          Tracking non supporté pour {account.platform}
        </h1>
        <p className="mt-2 text-sm text-amber-800">
          Cette page gère uniquement le tracking Google Ads. Pour Meta, voir le
          module Pixel + Conversions API dans la page de chaque site généré.
        </p>
      </div>
    );
  }

  return (
    <ConversionTrackingClient
      accountId={account.id}
      accountName={account.name ?? account.externalId}
      currency={account.currency ?? "EUR"}
    />
  );
}
