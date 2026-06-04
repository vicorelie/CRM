import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShopForUser, formatMoney } from "@/lib/shop";

export default async function ShopOverviewPage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");
  const shop = await getShopForUser(session.user.email, siteSlug);
  if (!shop) notFound();

  const [productsCount, ordersCount, customersCount, revenue30d, recentOrders] = await Promise.all([
    prisma.product.count({ where: { shopId: shop.id } }),
    prisma.order.count({ where: { shopId: shop.id, financialStatus: "PAID" } }),
    prisma.customer.count({ where: { shopId: shop.id } }),
    prisma.order.aggregate({
      where: {
        shopId: shop.id,
        financialStatus: "PAID",
        createdAt: { gte: new Date(Date.now() - 30 * 86400_000) },
      },
      _sum: { total: true },
    }),
    prisma.order.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        customerEmail: true,
        total: true,
        currency: true,
        financialStatus: true,
        createdAt: true,
      },
    }),
  ]);

  const revenue = revenue30d._sum.total ? Number(revenue30d._sum.total) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-500/30 text-emerald-700 text-xs font-medium uppercase tracking-widest">
          Vue d&apos;ensemble
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{shop.name}</h1>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Produits" value={String(productsCount)} hint="Au catalogue" />
        <KpiCard label="Commandes payées" value={String(ordersCount)} hint="Au total" />
        <KpiCard label="Clients" value={String(customersCount)} hint="Inscrits" />
        <KpiCard
          label="CA · 30j"
          value={formatMoney(revenue, shop.currency, shop.locale)}
          hint="Commandes payées"
        />
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-zinc-200 bg-white/40 p-5 space-y-4">
          <h2 className="font-bold text-base text-zinc-900">Démarrer rapidement</h2>
          <div className="space-y-2">
            <QuickLink href={`/shop/${shop.siteSlug}/products/new`} title="+ Ajouter ton premier produit" desc="Photos, prix, variantes…" />
            <QuickLink href={`/shop/${shop.siteSlug}/settings`} title="🔑 Connecter Stripe" desc="Pour encaisser des paiements." />
            <QuickLink href={`/shop/${shop.siteSlug}/shipping`} title="🚚 Configurer la livraison" desc="Zones + méthodes + tarifs." />
            <QuickLink href={`/shop/${shop.siteSlug}/taxes`} title="📋 Définir les taxes" desc="TVA par pays." />
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white/40 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base text-zinc-900">Dernières commandes</h2>
            <Link href={`/shop/${shop.siteSlug}/orders`} className="text-xs text-emerald-700 hover:text-emerald-200">
              Voir tout →
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-zinc-400">Pas encore de commande. Configure ton paiement et ajoute des produits pour démarrer.</p>
          ) : (
            <ul className="space-y-2">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2 border-b border-zinc-200/60 last:border-0">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-zinc-900">{o.orderNumber}</div>
                    <div className="text-xs text-zinc-400 truncate">{o.customerEmail}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-zinc-900">
                      {formatMoney(Number(o.total), o.currency, shop.locale)}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-400">{o.financialStatus}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/40 p-5">
      <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-1">{label}</div>
      <div className="text-2xl font-bold text-zinc-900">{value}</div>
      {hint && <div className="text-xs text-zinc-400 mt-1">{hint}</div>}
    </div>
  );
}

function QuickLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-100/40 transition-colors">
      <div>
        <div className="text-sm font-semibold text-zinc-900">{title}</div>
        <div className="text-xs text-zinc-400">{desc}</div>
      </div>
      <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </Link>
  );
}
