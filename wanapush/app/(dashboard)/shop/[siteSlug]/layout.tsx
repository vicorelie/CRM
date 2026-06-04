import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getShopForUser } from "@/lib/shop";
import { ShopSidebar } from "./ShopSidebar";

export default async function ShopLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const shop = await getShopForUser(session.user.email, siteSlug);
  if (!shop) notFound();

  return (
    <div className="flex">
      <ShopSidebar shop={{ siteSlug: shop.siteSlug, name: shop.name, setupCompleted: shop.setupCompleted }} />
      <div className="flex-1 min-w-0">
        <div className="border-b border-zinc-200 bg-white">
          <div className="px-6 py-3 flex items-center justify-between">
            <Link href="/shop" className="text-sm text-zinc-500 hover:text-brand-700 inline-flex items-center gap-1.5 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Toutes mes boutiques
            </Link>
            <a
              href={`/preview/${shop.siteSlug}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-500 hover:text-brand-700 inline-flex items-center gap-1.5 transition-colors"
            >
              Voir le site →
            </a>
          </div>
        </div>
        <main className="p-6 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
