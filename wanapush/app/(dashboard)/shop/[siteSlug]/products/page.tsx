import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getShopForUser } from "@/lib/shop";
import { ProductsListClient } from "./ProductsListClient";

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");
  const shop = await getShopForUser(session.user.email, siteSlug);
  if (!shop) notFound();

  return <ProductsListClient siteSlug={siteSlug} currency={shop.currency} locale={shop.locale} />;
}
