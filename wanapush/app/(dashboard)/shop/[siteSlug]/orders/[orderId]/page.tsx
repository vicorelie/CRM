import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShopForUser, formatMoney } from "@/lib/shop";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ siteSlug: string; orderId: string }>;
}) {
  const { siteSlug, orderId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");
  const shop = await getShopForUser(session.user.email, siteSlug);
  if (!shop) notFound();

  const order = await prisma.order.findFirst({
    where: { id: orderId, shopId: shop.id },
    include: { items: true, refunds: true, fulfillments: true, customer: true },
  });
  if (!order) notFound();

  const shipping = (order.shippingAddressJson ?? null) as null | {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="space-y-2">
        <Link href={`/shop/${siteSlug}/orders`} className="text-sm text-zinc-500 hover:text-emerald-700 inline-flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Toutes les commandes
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Commande {order.orderNumber}</h1>
          <div className="flex gap-2">
            <span className={`text-[11px] uppercase tracking-widest px-3 py-1 rounded-full border ${badgeFin(order.financialStatus)}`}>
              {order.financialStatus.replace("_", " ").toLowerCase()}
            </span>
            <span className={`text-[11px] uppercase tracking-widest px-3 py-1 rounded-full border ${badgeFul(order.fulfillmentStatus)}`}>
              {order.fulfillmentStatus.toLowerCase()}
            </span>
          </div>
        </div>
        <div className="text-xs text-zinc-400">
          {new Date(order.createdAt).toLocaleString(shop.locale, { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title={`Articles (${order.items.length})`}>
            <ul className="divide-y divide-zinc-800">
              {order.items.map((it) => (
                <li key={it.id} className="flex items-center gap-4 py-3">
                  {it.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={it.imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover bg-zinc-100" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-300">📦</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-zinc-900">{it.productTitle}</div>
                    {it.variantTitle && <div className="text-xs text-zinc-400">{it.variantTitle}</div>}
                    {it.sku && <div className="text-xs text-zinc-400 font-mono">SKU: {it.sku}</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-zinc-700">{it.quantity} × {formatMoney(Number(it.unitPrice), order.currency, shop.locale)}</div>
                    <div className="font-bold text-zinc-900">{formatMoney(Number(it.totalPrice), order.currency, shop.locale)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Totaux">
            <Row label="Sous-total" value={formatMoney(Number(order.subtotal), order.currency, shop.locale)} />
            {Number(order.shippingCost) > 0 && (
              <Row label={`Livraison${order.shippingMethod ? ` (${order.shippingMethod})` : ""}`} value={formatMoney(Number(order.shippingCost), order.currency, shop.locale)} />
            )}
            {Number(order.taxAmount) > 0 && (
              <Row label="TVA" value={formatMoney(Number(order.taxAmount), order.currency, shop.locale)} />
            )}
            {Number(order.discountAmount) > 0 && (
              <Row label="Remise" value={`-${formatMoney(Number(order.discountAmount), order.currency, shop.locale)}`} emerald />
            )}
            <div className="flex justify-between pt-3 mt-3 border-t border-zinc-200 text-lg font-bold">
              <span>Total payé</span>
              <span>{formatMoney(Number(order.total), order.currency, shop.locale)}</span>
            </div>
          </Card>

          {order.refunds.length > 0 && (
            <Card title="Remboursements">
              <ul className="divide-y divide-zinc-800">
                {order.refunds.map((r) => (
                  <li key={r.id} className="flex justify-between py-2">
                    <div>
                      <div className="text-sm text-zinc-700">{r.reason ?? "Remboursement"}</div>
                      <div className="text-xs text-zinc-400">{new Date(r.createdAt).toLocaleString(shop.locale)}</div>
                    </div>
                    <div className="font-bold text-orange-300">-{formatMoney(Number(r.amount), order.currency, shop.locale)}</div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Client">
            <div className="space-y-1">
              <div className="font-semibold text-zinc-900">{order.customerName || order.customerEmail}</div>
              <div className="text-sm text-zinc-500">{order.customerEmail}</div>
              {order.customerPhone && <div className="text-sm text-zinc-500">{order.customerPhone}</div>}
            </div>
          </Card>

          {shipping && (
            <Card title="Livraison">
              <div className="text-sm text-zinc-700 leading-relaxed">
                {shipping.line1 && <div>{shipping.line1}</div>}
                {shipping.line2 && <div>{shipping.line2}</div>}
                <div>{[shipping.postal_code, shipping.city, shipping.state].filter(Boolean).join(", ")}</div>
                {shipping.country && <div className="text-zinc-400">{shipping.country}</div>}
              </div>
            </Card>
          )}

          {order.paymentMethod && (
            <Card title="Paiement">
              <div className="text-sm space-y-1">
                <div className="text-zinc-700">Méthode : <span className="capitalize">{order.paymentMethod}</span></div>
                {order.paymentIntentId && (
                  <div className="text-xs text-zinc-400 font-mono break-all">{order.paymentIntentId}</div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white/40 p-5 space-y-3">
      <h2 className="font-bold text-base text-zinc-900">{title}</h2>
      {children}
    </section>
  );
}
function Row({ label, value, emerald }: { label: string; value: string; emerald?: boolean }) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-zinc-500">{label}</span>
      <span className={`font-mono ${emerald ? "text-emerald-700" : "text-zinc-900"}`}>{value}</span>
    </div>
  );
}
function badgeFin(s: string) {
  return s === "PAID" ? "bg-emerald-50 text-emerald-700 border-emerald-500/30"
    : s === "REFUNDED" || s === "PARTIALLY_REFUNDED" ? "bg-orange-500/15 text-orange-300 border-orange-500/30"
    : s === "FAILED" ? "bg-red-50 text-red-700 border-red-200"
    : "bg-amber-50 text-amber-800 border-amber-500/30";
}
function badgeFul(s: string) {
  return s === "FULFILLED" ? "bg-emerald-50 text-emerald-700 border-emerald-500/30"
    : s === "PARTIAL" ? "bg-amber-50 text-amber-800 border-amber-500/30"
    : "bg-zinc-200/40 text-zinc-700 border-zinc-200";
}
