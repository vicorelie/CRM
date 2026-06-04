import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdsSetupWizard } from "@/components/onboarding/AdsSetupWizard";
import { getPlatformConfigBySlug } from "@/lib/onboarding/platforms";

export const dynamic = "force-dynamic";

type Params = { params: { platform: string } };

export default async function Page({ params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const cfg = getPlatformConfigBySlug(params.platform, "social");
  if (!cfg) notFound();
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <AdsSetupWizard cfg={cfg} />
    </Suspense>
  );
}
