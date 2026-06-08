// Cockpit founder — page server component.
// Fetch overview + anomalies en parallèle, render les sections + le drawer Copilot.
//
// Architecture (pattern 2026 PostHog/Linear/Vercel) :
//  - Server Component pour le first paint optimal (data hydratée côté serveur)
//  - <Suspense> granulaires si on rajoute des sections async coûteuses
//  - Sélecteur période 7/30/90 jours via query string `?days=`
//  - <CopilotDrawer/> floating bottom-right (client interaction)

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOverview, defaultRange } from "@/lib/analytics/aggregators";
import { detectAnomalies } from "@/lib/analytics/anomalies";
import { CockpitClient } from "./CockpitClient";
import { CopilotDrawer } from "./CopilotDrawer";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ days?: string }>;

export default async function CockpitPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true, email: true },
  });
  if (!user) redirect("/login");

  const params = await searchParams;
  const days = Math.max(1, Math.min(365, Number(params.days ?? "30")));
  const range = defaultRange(days);

  // Fetch parallèle (Promise.all) — best practice 2026
  const [overview, anomalies] = await Promise.all([
    getOverview(user.id, range),
    detectAnomalies(user.id),
  ]);

  const firstName = user.name?.split(" ")[0] ?? user.email.split("@")[0];

  return (
    <>
      <CockpitClient
        firstName={firstName}
        days={days}
        overview={overview}
        anomalies={anomalies}
      />
      <CopilotDrawer />
    </>
  );
}
