"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { label: "Vue d'ensemble", path: "", icon: "📊" },
  { label: "Produits", path: "/products", icon: "📦" },
  { label: "Catégories", path: "/categories", icon: "🗂️" },
  { label: "Options & variantes", path: "/options", icon: "🎨" },
  { label: "Commandes", path: "/orders", icon: "📨" },
  { label: "Clients", path: "/customers", icon: "👥" },
  { label: "Remises", path: "/discounts", icon: "🏷️" },
  { label: "Livraison", path: "/shipping", icon: "🚚" },
  { label: "Taxes", path: "/taxes", icon: "📋" },
  { label: "Avis", path: "/reviews", icon: "⭐" },
  { label: "Paramètres", path: "/settings", icon: "⚙️" },
];

export function ShopSidebar({
  shop,
}: {
  shop: { siteSlug: string; name: string; setupCompleted: boolean };
}) {
  const pathname = usePathname();
  const base = `/shop/${shop.siteSlug}`;

  return (
    <aside className="w-64 border-r border-zinc-200/60 bg-white/40 backdrop-blur min-h-screen flex flex-col">
      <div className="p-5 border-b border-zinc-200/60">
        <div className="text-[10px] uppercase tracking-widest text-emerald-700 font-semibold mb-1">
          Boutique
        </div>
        <div className="font-bold text-base text-zinc-900 truncate">{shop.name}</div>
        <div className="text-xs text-zinc-400 font-mono mt-0.5 truncate">/{shop.siteSlug}</div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV.map((item) => {
          const fullPath = `${base}${item.path}`;
          const active =
            item.path === ""
              ? pathname === fullPath || pathname === base
              : pathname.startsWith(fullPath);
          return (
            <Link
              key={item.path}
              href={fullPath}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-emerald-50 text-emerald-200 font-semibold border border-emerald-500/30"
                  : "text-zinc-700 hover:bg-zinc-100/40 hover:text-zinc-900"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {!shop.setupCompleted && (
        <div className="m-3 p-3 rounded-lg bg-amber-50 border border-amber-500/30">
          <div className="text-[10px] uppercase tracking-widest font-semibold text-amber-800 mb-1">
            Setup à finir
          </div>
          <p className="text-xs text-amber-200/80">
            Configure Stripe, livraison et taxes pour activer les ventes.
          </p>
        </div>
      )}
    </aside>
  );
}
