import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getShopForUser } from "@/lib/shop";
import { ShippingClient } from "./ShippingClient";

export default async function ShippingPage({
  params,
}: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");
  const shop = await getShopForUser(session.user.email, siteSlug);
  if (!shop) notFound();
  return <ShippingClient siteSlug={siteSlug} currency={shop.currency} weightUnit={shop.weightUnit} />;
}
