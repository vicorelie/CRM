import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getShopForUser } from "@/lib/shop";
import { CustomerDetailClient } from "./CustomerDetailClient";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ siteSlug: string; customerId: string }>;
}) {
  const { siteSlug, customerId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");
  const shop = await getShopForUser(session.user.email, siteSlug);
  if (!shop) notFound();
  return (
    <CustomerDetailClient
      siteSlug={siteSlug}
      customerId={customerId}
      currency={shop.currency}
      locale={shop.locale}
    />
  );
}
