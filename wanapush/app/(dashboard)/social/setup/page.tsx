import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PlatformPicker } from "@/components/onboarding/PlatformPicker";
import { PLATFORM_CONFIGS } from "@/lib/onboarding/platforms";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) redirect("/login");

  const accounts = await prisma.socialAccount.findMany({
    where: { userId: user.id },
    select: { platform: true },
  });
  const connectedSlugs = PLATFORM_CONFIGS.filter((c) => c.kind === "social")
    .filter((c) => accounts.some((a) => a.platform === c.platform))
    .map((c) => c.slug);

  return <PlatformPicker kind="social" connectedSlugs={connectedSlugs} />;
}
