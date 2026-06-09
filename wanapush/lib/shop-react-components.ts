// Génère les composants React shop pour les sites e-commerce générés.
// Tous les composants utilisent framer-motion pour cohérence visuelle avec
// le reste du site et fetchent l'API publique /api/storefront/{slug}/*.

// Le slug est injecté dans src/shop-config.ts au moment de la génération.

export function shopConfigFile(slug: string): string {
  return `// Auto-généré par WanaPush. Ne pas éditer.
export const SHOP_SLUG = ${JSON.stringify(slug)};
export const API_BASE = "/api/storefront/" + SHOP_SLUG;

export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = localStorage.getItem("wp_sf_session");
  if (!sid) {
    sid = "sf_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("wp_sf_session", sid);
  }
  return sid;
}

export function fmtMoney(amount: number | string, currency: string, locale: string): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(n);
  } catch {
    return n.toFixed(2) + " " + currency;
  }
}
`;
}

export function customerContextFile(): string {
  return `import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { API_BASE } from "../shop-config";

export type CustomerOrder = {
  id: string;
  orderNumber: string;
  status: string;
  financialStatus: string;
  fulfillmentStatus: string;
  total: string | number;
  currency: string;
  createdAt: string;
  shippingTracking: string | null;
  shippingCarrier: string | null;
  _count: { items: number };
};
export type CustomerAddress = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  address1: string;
  address2: string | null;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};
export type Customer = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  totalSpent: number;
  ordersCount: number;
  addresses: CustomerAddress[];
  orders: CustomerOrder[];
};

type Ctx = {
  customer: Customer | null;
  loading: boolean;
  loginSent: boolean;
  modalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  sendMagicLink: (email: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const CustomerContext = createContext<Ctx | null>(null);

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginSent, setLoginSent] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API_BASE + "/customer/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCustomer(data.customer ?? null);
      }
    } catch (e) {
      console.warn("[customer] refresh failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Si on revient avec ?account=ok dans l'URL → on rafraîchit
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("account") === "ok") {
      refresh();
      // Cleanup URL
      params.delete("account");
      const newUrl = window.location.pathname + (params.toString() ? "?" + params.toString() : "") + window.location.hash;
      window.history.replaceState({}, "", newUrl);
    }
  }, [refresh]);

  const sendMagicLink = useCallback(async (email: string) => {
    setLoginSent(false);
    try {
      const res = await fetch(API_BASE + "/customer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { ok: false, error: err?.error ?? "Erreur" };
      }
      setLoginSent(true);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau" };
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch(API_BASE + "/customer/logout", { method: "POST", credentials: "include" });
    setCustomer(null);
    setModalOpen(false);
  }, []);

  return (
    <CustomerContext.Provider value={{
      customer, loading, loginSent, modalOpen,
      openModal: () => setModalOpen(true),
      closeModal: () => setModalOpen(false),
      sendMagicLink, logout, refresh,
    }}>
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  const ctx = useContext(CustomerContext);
  if (!ctx) throw new Error("useCustomer must be used inside CustomerProvider");
  return ctx;
}
`;
}

export function accountButtonFile(): string {
  return `import { motion } from "framer-motion";
import { useCustomer } from "../../contexts/CustomerContext";

export default function AccountButton() {
  const { customer, openModal } = useCustomer();
  return (
    <motion.button
      onClick={openModal}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.7 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-6 right-24 z-[9998] w-14 h-14 rounded-full shadow-xl flex items-center justify-center bg-white text-gray-900 border border-gray-200"
      aria-label="Mon compte"
    >
      {customer ? (
        <div className="w-9 h-9 rounded-full text-white flex items-center justify-center font-bold text-sm" style={{ background: "var(--color-primary, #6366f1)" }}>
          {customer.email.slice(0, 1).toUpperCase()}
        </div>
      ) : (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )}
    </motion.button>
  );
}
`;
}

export function accountModalFile(): string {
  return `import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useCustomer } from "../../contexts/CustomerContext";
import { fmtMoney } from "../../shop-config";

export default function AccountModal() {
  const { customer, modalOpen, closeModal, sendMagicLink, logout, loginSent } = useCustomer();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const r = await sendMagicLink(email);
    if (!r.ok) setError(r.error ?? "Erreur");
    setSending(false);
  }

  const isLoggedIn = !!customer;

  return (
    <AnimatePresence>
      {modalOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[10001] bg-black/50"
            onClick={closeModal}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[10002] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl pointer-events-auto">
              <header className="flex items-center justify-between p-5 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">
                  {isLoggedIn ? "Mon compte" : "Connexion"}
                </h2>
                <button onClick={closeModal} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Fermer">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" /></svg>
                </button>
              </header>

              <div className="p-5">
                {!isLoggedIn && !loginSent && (
                  <form onSubmit={submit} className="space-y-4">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Saisis ton email. On t&apos;envoie un lien magique pour te connecter — pas de mot de passe à retenir.
                    </p>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="ton@email.com"
                      className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:border-indigo-500"
                      autoFocus
                    />
                    {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">⚠ {error}</div>}
                    <button
                      type="submit"
                      disabled={sending || !email}
                      className="w-full py-3 rounded-lg text-white font-bold text-sm disabled:opacity-50"
                      style={{ background: "var(--color-primary, #6366f1)" }}
                    >
                      {sending ? "Envoi…" : "Recevoir le lien"}
                    </button>
                  </form>
                )}

                {!isLoggedIn && loginSent && (
                  <div className="text-center py-6 space-y-3">
                    <div className="text-5xl">📬</div>
                    <h3 className="font-bold text-lg text-gray-900">Vérifie ta boîte mail</h3>
                    <p className="text-sm text-gray-600">Un lien de connexion vient d&apos;être envoyé à <strong>{email}</strong>. Il expire dans 30 minutes.</p>
                  </div>
                )}

                {isLoggedIn && customer && (
                  <div className="space-y-5">
                    <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                      <div className="w-12 h-12 rounded-full text-white flex items-center justify-center font-bold text-lg" style={{ background: "var(--color-primary, #6366f1)" }}>
                        {customer.email.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 truncate">
                          {customer.firstName || customer.lastName
                            ? \`\${customer.firstName ?? ""} \${customer.lastName ?? ""}\`.trim()
                            : customer.email}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{customer.email}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Commandes</div>
                        <div className="text-lg font-bold text-gray-900">{customer.ordersCount}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Total dépensé</div>
                        <div className="text-lg font-bold text-gray-900">{fmtMoney(customer.totalSpent, "EUR", "fr-FR")}</div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-gray-900 mb-3">Mes commandes</h3>
                      {customer.orders.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-6">Pas encore de commande.</p>
                      ) : (
                        <ul className="space-y-2">
                          {customer.orders.map((o) => (
                            <li key={o.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200">
                              <div className="min-w-0">
                                <div className="font-semibold text-sm text-gray-900">{o.orderNumber}</div>
                                <div className="text-xs text-gray-500">
                                  {new Date(o.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                                  · {o._count.items} article{o._count.items > 1 ? "s" : ""}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-sm text-gray-900">{fmtMoney(Number(o.total), o.currency, "fr-FR")}</div>
                                <span className={\`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full \${badgeStyle(o.financialStatus)}\`}>
                                  {financialLabel(o.financialStatus)}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <button
                      onClick={logout}
                      className="w-full py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50"
                    >
                      Me déconnecter
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function badgeStyle(s: string) {
  if (s === "PAID") return "bg-emerald-100 text-emerald-700";
  if (s === "REFUNDED" || s === "PARTIALLY_REFUNDED") return "bg-orange-100 text-orange-700";
  if (s === "FAILED") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
}
function financialLabel(s: string) {
  return s.replace("_", " ").toLowerCase();
}
`;
}

export function cartContextFile(): string {
  return `import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { API_BASE, getSessionId } from "../shop-config";

export type CartItem = {
  id: string;
  variantId: string;
  productId: string;
  productTitle: string;
  variantTitle: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  image: string | null;
  slug: string;
};

export type Cart = {
  id: string;
  currency: string;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  discountCode: string | null;
  total: number;
  itemCount: number;
};

type CartCtx = {
  cart: Cart | null;
  loading: boolean;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addToCart: (variantId: string, quantity?: number) => Promise<void>;
  updateQty: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const CartContext = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API_BASE + "/cart?sessionId=" + encodeURIComponent(getSessionId()));
      if (res.ok) {
        const data = await res.json();
        setCart(data.cart);
      }
    } catch (e) {
      console.warn("[cart] refresh failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Capture Google click identifiers depuis l'URL au premier load et persiste
  // 90 jours dans des cookies first-party (fenêtre d'attribution Google Ads pour
  // offline conversions). Permet un suivi multi-page : l'user peut arriver depuis
  // un ad sur une catégorie, naviguer, puis acheter — le gclid suit.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const params: Array<["gclid" | "gbraid" | "wbraid", string]> = [];
    const g = url.searchParams.get("gclid"); if (g) params.push(["gclid", g.slice(0, 255)]);
    const gb = url.searchParams.get("gbraid"); if (gb) params.push(["gbraid", gb.slice(0, 255)]);
    const wb = url.searchParams.get("wbraid"); if (wb) params.push(["wbraid", wb.slice(0, 255)]);
    // ttclid : TikTok click ID dans l'URL (valide 7 jours côté plateforme).
    // On le persiste 7 jours en cookie pour le multi-page tracking.
    const ttclid = url.searchParams.get("ttclid")?.slice(0, 255) || undefined;
    // li_fat_id : déposé par le LinkedIn Insight Tag s'il est installé. On le
    // persiste aussi sous wp_li_fat_id (60-90j) au cas où.
    const liCookies = document.cookie.split("; ").reduce((acc, c) => {
      const i = c.indexOf("="); if (i > 0) acc[c.slice(0, i)] = c.slice(i + 1); return acc;
    }, {} as Record<string, string>);
    const liFatId = liCookies.li_fat_id;
    const maxAge = 90 * 24 * 60 * 60; // 90 jours
    const ttMaxAge = 7 * 24 * 60 * 60; // 7 jours (fenêtre TikTok)
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    if (params.length === 0 && !liFatId && !ttclid) return;
    for (const [k, v] of params) {
      document.cookie = "wp_" + k + "=" + encodeURIComponent(v) + "; max-age=" + maxAge + "; path=/; SameSite=Lax" + secure;
    }
    if (liFatId) {
      document.cookie = "wp_li_fat_id=" + encodeURIComponent(liFatId) + "; max-age=" + maxAge + "; path=/; SameSite=Lax" + secure;
    }
    if (ttclid) {
      document.cookie = "wp_ttclid=" + encodeURIComponent(ttclid) + "; max-age=" + ttMaxAge + "; path=/; SameSite=Lax" + secure;
    }
  }, []);

  const addToCart = useCallback(async (variantId: string, quantity = 1) => {
    try {
      const res = await fetch(API_BASE + "/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: getSessionId(), variantId, quantity }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.error ?? "Ajout impossible");
        return;
      }
      const data = await res.json();
      setCart(data.cart);
      setDrawerOpen(true);
    } catch (e) {
      console.warn("[cart] add failed", e);
    }
  }, []);

  const updateQty = useCallback(async (itemId: string, quantity: number) => {
    const res = await fetch(API_BASE + "/cart/items/" + itemId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: getSessionId(), quantity }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err?.error ?? "Mise à jour impossible");
    }
    refresh();
  }, [refresh]);

  const removeItem = useCallback(async (itemId: string) => {
    await fetch(API_BASE + "/cart/items/" + itemId + "?sessionId=" + encodeURIComponent(getSessionId()), {
      method: "DELETE",
    });
    refresh();
  }, [refresh]);

  return (
    <CartContext.Provider value={{
      cart, loading, drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      addToCart, updateQty, removeItem, refresh,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
`;
}

export function useShopProductsFile(): string {
  return `import { useEffect, useState } from "react";
import { API_BASE } from "../shop-config";

export type ShopInfo = {
  siteSlug: string;
  name: string;
  currency: string;
  locale: string;
  taxesIncluded: boolean;
};

export type ShopProduct = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  featured: boolean;
  image: string | null;
  imageAlt: string;
  minPrice: number | string | null;
  maxPrice: number | string | null;
  compareAt: number | string | null;
  variantCount: number;
  firstVariantId: string | null;
  categories: Array<{ slug: string; name: string }>;
};

type Opts = {
  category?: string;
  featured?: boolean;
  limit?: number;
  q?: string;
};

export function useShopProducts(opts: Opts = {}) {
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (opts.limit) params.set("limit", String(opts.limit));
        if (opts.featured) params.set("featured", "1");
        if (opts.category) params.set("category", opts.category);
        if (opts.q) params.set("q", opts.q);
        const res = await fetch(API_BASE + "/products?" + params.toString());
        if (!res.ok) {
          if (!cancelled) setError("Boutique non configurée");
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setShop(data.shop);
        setProducts(data.products ?? []);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [opts.category, opts.featured, opts.limit, opts.q]);

  return { shop, products, loading, error };
}
`;
}

export function productCardFile(): string {
  return `import { motion } from "framer-motion";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { ShopInfo, ShopProduct } from "../../hooks/useShopProducts";
import { useCart } from "../../contexts/CartContext";
import { fmtMoney } from "../../shop-config";

export default function ProductCard({ product, shop, index = 0 }: { product: ShopProduct; shop: ShopInfo | null; index?: number }) {
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);

  const minP = product.minPrice != null ? Number(product.minPrice) : 0;
  const maxP = product.maxPrice != null ? Number(product.maxPrice) : minP;
  const compare = product.compareAt != null ? Number(product.compareAt) : null;
  const currency = shop?.currency ?? "EUR";
  const locale = shop?.locale ?? "fr-FR";
  const onSale = compare !== null && compare > minP;
  const hasVariants = product.variantCount > 1;

  async function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    if (!product.firstVariantId) return;
    setAdding(true);
    try {
      if (hasVariants) {
        navigate("/produit/" + product.slug);
        return;
      }
      await addToCart(product.firstVariantId, 1);
    } finally {
      setAdding(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow"
    >
      <Link to={"/produit/" + product.slug} className="block relative aspect-square bg-gray-100 overflow-hidden">
        {onSale && (
          <span className="absolute top-3 left-3 z-10 bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
            Promo
          </span>
        )}
        {product.image ? (
          <img
            src={product.image}
            alt={product.imageAlt}
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            className="transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-6xl">📦</div>
        )}
      </Link>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-semibold text-gray-900 leading-snug line-clamp-2 min-h-[2.6em]">
          <Link to={"/produit/" + product.slug} className="hover:text-gray-700 transition-colors">{product.title}</Link>
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-gray-900">
            {minP === maxP ? fmtMoney(minP, currency, locale) : fmtMoney(minP, currency, locale) + " – " + fmtMoney(maxP, currency, locale)}
          </span>
          {onSale && compare !== null && (
            <span className="text-sm text-gray-400 line-through">{fmtMoney(compare, currency, locale)}</span>
          )}
        </div>
        <button
          onClick={handleAdd}
          disabled={adding || !product.firstVariantId}
          className="mt-auto px-4 py-2.5 rounded-lg font-semibold text-sm text-white transition-colors disabled:opacity-50"
          style={{ background: "var(--color-primary, #6366f1)" }}
        >
          {adding ? "Ajout…" : hasVariants ? "Voir les options" : "Ajouter au panier"}
        </button>
      </div>
    </motion.div>
  );
}
`;
}

export function shopGridFile(): string {
  return `import { motion } from "framer-motion";
import { useShopProducts } from "../../hooks/useShopProducts";
import ProductCard from "./ProductCard";

type Props = { title?: string; subtitle?: string; limit?: number; columns?: number; category?: string };

export default function ShopGrid({ title = "Notre boutique", subtitle = "Découvrez notre sélection.", limit = 12, columns = 4, category }: Props) {
  const { shop, products, loading, error } = useShopProducts({ limit, category });
  const cols = columns === 2 ? "lg:grid-cols-2" : columns === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4";

  return (
    <section data-edit-section="ShopGrid" className="py-16 md:py-20 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 max-w-2xl mx-auto"
        >
          <h2 data-edit-field="title" className="text-3xl md:text-4xl font-bold mb-3 text-gray-900">{title}</h2>
          <p data-edit-field="subtitle" className="text-gray-600">{subtitle}</p>
        </motion.div>

        {loading && (
          <div className={\`grid grid-cols-1 sm:grid-cols-2 \${cols} gap-4 sm:gap-6\`}>
            {Array.from({ length: limit }).slice(0, 8).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}
        {!loading && error && (
          <div className="text-center py-10 text-gray-400">Boutique non encore configurée.</div>
        )}
        {!loading && !error && products.length === 0 && (
          <div className="text-center py-10 text-gray-400">Aucun produit pour le moment.</div>
        )}
        {!loading && !error && products.length > 0 && (
          <div className={\`grid grid-cols-1 sm:grid-cols-2 \${cols} gap-4 sm:gap-6\`}>
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} shop={shop} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
`;
}

export function shopFeaturedFile(): string {
  return `import { motion } from "framer-motion";
import { useShopProducts } from "../../hooks/useShopProducts";
import ProductCard from "./ProductCard";

type Props = { title?: string; subtitle?: string; eyebrow?: string; limit?: number };

export default function ShopFeatured({ title = "Sélection du moment", subtitle = "Nos produits les plus appréciés.", eyebrow = "— Coups de cœur", limit = 6 }: Props) {
  const { shop, products, loading, error } = useShopProducts({ featured: true, limit });

  return (
    <section data-edit-section="ShopFeatured" className="py-16 md:py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 max-w-2xl mx-auto"
        >
          <div data-edit-field="eyebrow" className="inline-block text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: "var(--color-primary, #6366f1)" }}>
            {eyebrow}
          </div>
          <h2 data-edit-field="title" className="text-3xl md:text-4xl font-bold mb-3 text-gray-900">{title}</h2>
          <p data-edit-field="subtitle" className="text-gray-600">{subtitle}</p>
        </motion.div>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: Math.min(limit, 6) }).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}
        {!loading && error && (
          <div className="text-center py-10 text-gray-400">Boutique non encore configurée.</div>
        )}
        {!loading && !error && products.length === 0 && (
          <div className="text-center py-10 text-gray-400">Marque des produits comme « Coup de cœur » dans le dashboard pour les mettre en avant.</div>
        )}
        {!loading && !error && products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} shop={shop} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
`;
}

export function shopCategoriesFile(): string {
  return `import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE } from "../../shop-config";

type Cat = { id: string; slug: string; name: string; imageUrl: string | null; _count?: { products: number } };
type Props = { title?: string; subtitle?: string };

export default function ShopCategories({ title = "Catégories", subtitle = "Trouve ce qui te plaît." }: Props) {
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API_BASE.replace("/storefront/", "/storefront/") + "/categories")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.categories) setCats(d.categories); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section data-edit-section="ShopCategories" className="py-16 md:py-20 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 max-w-2xl mx-auto"
        >
          <h2 data-edit-field="title" className="text-3xl md:text-4xl font-bold mb-3 text-gray-900">{title}</h2>
          <p data-edit-field="subtitle" className="text-gray-600">{subtitle}</p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-square bg-gray-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : cats.length === 0 ? (
          <div className="text-center py-10 text-gray-400">Crée des catégories dans le dashboard pour les afficher ici.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {cats.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <Link
                  to={"/categorie/" + c.slug}
                  className="relative block aspect-square rounded-2xl overflow-hidden group"
                  style={{ backgroundColor: "#d1d5db" }}
                >
                  {c.imageUrl ? (
                    <img src={c.imageUrl} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} className="transition-transform duration-500 group-hover:scale-110" />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/70 flex items-end p-4">
                    <div className="font-bold text-white text-lg drop-shadow">{c.name}</div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
`;
}

export function shopBrowseFile(): string {
  return `import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { API_BASE, fmtMoney } from "../../shop-config";

type OptionLite = { name: string; values: Array<{ value: string; color: string | null }> };
type ProductLite = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  featured: boolean;
  image: string | null;
  imageAlt: string;
  minPrice: number;
  maxPrice: number;
  compareAt: number | null;
  variantCount: number;
  firstVariantId: string | null;
  categories: Array<{ slug: string; name: string }>;
  options?: OptionLite[];
};
type Category = { id: string; slug: string; name: string; imageUrl: string | null; _count?: { products: number } };
type Shop = { currency: string; locale: string };
type Props = { title?: string; subtitle?: string };

export default function ShopBrowse({ title = "Tous nos produits", subtitle }: Props) {
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  // { "Taille": Set(["S","M"]), "Couleur": Set(["Rouge"]) }
  const [selectedOptions, setSelectedOptions] = useState<Record<string, Set<string>>>({});
  const [priceMin, setPriceMin] = useState<number | null>(null);
  const [priceMax, setPriceMax] = useState<number | null>(null);
  const [sort, setSort] = useState<"featured" | "price-asc" | "price-desc" | "name">("featured");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["price"]));

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(API_BASE + "/products").then((r) => (r.ok ? r.json() : null)),
      fetch(API_BASE + "/categories").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([p, c]) => {
        if (p) {
          const list: ProductLite[] = (p.products ?? []).map((pr: ProductLite) => ({
            ...pr,
            minPrice: typeof pr.minPrice === "string" ? parseFloat(pr.minPrice) : pr.minPrice,
            maxPrice: typeof pr.maxPrice === "string" ? parseFloat(pr.maxPrice) : pr.maxPrice,
            compareAt: pr.compareAt == null ? null : typeof pr.compareAt === "string" ? parseFloat(pr.compareAt) : pr.compareAt,
          }));
          setProducts(list);
          setShop(p.shop ?? null);
        }
        if (c) setCategories(c.categories ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  // Bornes absolues du slider prix (calculées une fois products chargés).
  const [absMin, absMax] = useMemo(() => {
    if (products.length === 0) return [0, 100];
    const mins = products.map((p) => p.minPrice);
    return [Math.floor(Math.min(...mins)), Math.ceil(Math.max(...mins))];
  }, [products]);

  // Initialise le slider aux bornes la première fois.
  useEffect(() => {
    if (priceMin == null && products.length > 0) setPriceMin(absMin);
    if (priceMax == null && products.length > 0) setPriceMax(absMax);
  }, [products, absMin, absMax, priceMin, priceMax]);

  // Agrégation des options shop-wide à partir des produits.
  const aggregatedOptions = useMemo(() => {
    const map = new Map<string, Map<string, string | null>>(); // name → (value → color)
    for (const p of products) {
      for (const o of p.options ?? []) {
        let vals = map.get(o.name);
        if (!vals) { vals = new Map(); map.set(o.name, vals); }
        for (const v of o.values) {
          if (!vals.has(v.value)) vals.set(v.value, v.color ?? null);
        }
      }
    }
    return Array.from(map.entries()).map(([name, vals]) => ({
      name,
      values: Array.from(vals.entries()).map(([value, color]) => ({ value, color })),
    }));
  }, [products]);

  function toggleSection(key: string) {
    setOpenSections((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  }
  function toggleCat(slug: string) {
    setSelectedCats((s) => {
      const n = new Set(s);
      if (n.has(slug)) n.delete(slug); else n.add(slug);
      return n;
    });
  }
  function toggleOption(optName: string, value: string) {
    setSelectedOptions((prev) => {
      const next = { ...prev };
      const set = new Set(next[optName] ?? []);
      if (set.has(value)) set.delete(value); else set.add(value);
      if (set.size === 0) delete next[optName];
      else next[optName] = set;
      return next;
    });
  }
  function resetFilters() {
    setSelectedCats(new Set());
    setSelectedOptions({});
    setPriceMin(absMin);
    setPriceMax(absMax);
  }

  const filtered = useMemo(() => {
    const min = priceMin ?? absMin;
    const max = priceMax ?? absMax;
    let out = products.filter((p) => {
      if (selectedCats.size > 0) {
        const has = p.categories.some((c) => selectedCats.has(c.slug));
        if (!has) return false;
      }
      if (p.minPrice < min || p.minPrice > max) return false;
      for (const [optName, vals] of Object.entries(selectedOptions)) {
        const opt = (p.options ?? []).find((o) => o.name === optName);
        if (!opt) return false;
        const hasOne = opt.values.some((v) => vals.has(v.value));
        if (!hasOne) return false;
      }
      return true;
    });
    if (sort === "price-asc") out = [...out].sort((a, b) => a.minPrice - b.minPrice);
    else if (sort === "price-desc") out = [...out].sort((a, b) => b.minPrice - a.minPrice);
    else if (sort === "name") out = [...out].sort((a, b) => a.title.localeCompare(b.title));
    else out = [...out].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    return out;
  }, [products, selectedCats, selectedOptions, priceMin, priceMax, absMin, absMax, sort]);

  const currency = shop?.currency ?? "EUR";
  const locale = shop?.locale ?? "fr-FR";
  const fmt = (n: number) => fmtMoney(n, currency, locale);
  const totalFiltered = filtered.length;
  const activeFilterCount =
    selectedCats.size +
    Object.values(selectedOptions).reduce((acc, s) => acc + s.size, 0) +
    ((priceMin != null && priceMin > absMin) || (priceMax != null && priceMax < absMax) ? 1 : 0);

  return (
    <section className="py-10 md:py-16 px-4 md:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-10 md:mb-14">
          <h1 className="text-3xl md:text-5xl font-light text-gray-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-3 font-light">{subtitle}</p>}
        </header>

        <div className="grid lg:grid-cols-[260px_1fr] gap-8 lg:gap-12">
          <aside className={(filtersOpen ? "block" : "hidden") + " lg:block"}>
            <div className="lg:sticky lg:top-8">
              <div className="flex items-center justify-between mb-4 lg:mb-0">
                <h2 className="text-2xl font-light text-gray-900 tracking-tight">Filter by</h2>
                <button onClick={() => setFiltersOpen(false)} className="text-gray-500 text-xl lg:hidden">×</button>
              </div>

              <div className="border-t border-gray-200 mt-4" />

              <FilterSection
                label="Price"
                open={openSections.has("price")}
                onToggle={() => toggleSection("price")}
              >
                <PriceRange
                  absMin={absMin}
                  absMax={absMax}
                  min={priceMin ?? absMin}
                  max={priceMax ?? absMax}
                  onMinChange={(v) => setPriceMin(Math.min(v, (priceMax ?? absMax) - 1))}
                  onMaxChange={(v) => setPriceMax(Math.max(v, (priceMin ?? absMin) + 1))}
                  fmt={fmt}
                />
              </FilterSection>

              {categories.length > 0 && (
                <FilterSection
                  label="Catégories"
                  open={openSections.has("categories")}
                  onToggle={() => toggleSection("categories")}
                  count={selectedCats.size}
                >
                  <ul className="space-y-2 pt-1">
                    {categories.map((c) => {
                      const checked = selectedCats.has(c.slug);
                      return (
                        <li key={c.id}>
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCat(c.slug)}
                              className="w-3.5 h-3.5 accent-gray-900"
                            />
                            <span className="text-sm text-gray-700 group-hover:text-gray-900 font-light flex-1">{c.name}</span>
                            {c._count?.products != null && (
                              <span className="text-[10px] text-gray-400">{c._count.products}</span>
                            )}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </FilterSection>
              )}

              {aggregatedOptions.map((opt) => {
                const selected = selectedOptions[opt.name] ?? new Set<string>();
                return (
                  <FilterSection
                    key={opt.name}
                    label={opt.name}
                    open={openSections.has("opt:" + opt.name)}
                    onToggle={() => toggleSection("opt:" + opt.name)}
                    count={selected.size}
                  >
                    <ul className="space-y-2 pt-1">
                      {opt.values.map((v) => {
                        const checked = selected.has(v.value);
                        return (
                          <li key={v.value}>
                            <label className="flex items-center gap-2 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleOption(opt.name, v.value)}
                                className="w-3.5 h-3.5 accent-gray-900"
                              />
                              {v.color && (
                                <span
                                  aria-hidden
                                  className="inline-block w-3.5 h-3.5 rounded-full border border-gray-200"
                                  style={{ background: v.color }}
                                />
                              )}
                              <span className="text-sm text-gray-700 group-hover:text-gray-900 font-light flex-1">{v.value}</span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </FilterSection>
                );
              })}

              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="mt-6 text-xs text-gray-500 hover:text-gray-900 underline underline-offset-4"
                >
                  Réinitialiser ({activeFilterCount})
                </button>
              )}
            </div>
          </aside>

          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-gray-100">
              <button onClick={() => setFiltersOpen(true)} className="lg:hidden text-xs uppercase tracking-widest text-gray-700 border border-gray-300 rounded-sm px-3 py-1.5">
                Filtres {activeFilterCount > 0 ? "(" + activeFilterCount + ")" : ""}
              </button>
              <span className="text-xs text-gray-500 font-light">
                {loading ? "Chargement…" : totalFiltered + " produit" + (totalFiltered > 1 ? "s" : "")}
              </span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="text-xs text-gray-700 border border-gray-200 rounded-sm px-3 py-1.5 focus:outline-none focus:border-gray-900 bg-white"
              >
                <option value="featured">Mis en avant</option>
                <option value="price-asc">Prix croissant</option>
                <option value="price-desc">Prix décroissant</option>
                <option value="name">Nom A-Z</option>
              </select>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <div className="aspect-[3/4] bg-[#f7f6f3] animate-pulse" />
                    <div className="h-3 bg-gray-100 w-3/4 animate-pulse" />
                    <div className="h-3 bg-gray-100 w-1/4 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 space-y-3">
                <div className="text-4xl">🔍</div>
                <p className="text-gray-500 font-light">Aucun produit ne correspond à tes filtres.</p>
                {activeFilterCount > 0 && (
                  <button onClick={resetFilters} className="text-xs text-gray-700 underline underline-offset-4 hover:text-gray-900">
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
                {filtered.map((p, i) => {
                  const onSale = p.compareAt != null && p.compareAt > p.minPrice;
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-50px" }}
                      transition={{ duration: 0.4, delay: Math.min(i * 0.03, 0.3) }}
                    >
                      <Link to={"/produit/" + p.slug} className="group block">
                        <div className="relative aspect-[3/4] bg-[#f7f6f3] overflow-hidden mb-3">
                          {p.featured && (
                            <span className="absolute top-3 left-3 z-10 bg-white/90 text-gray-900 text-[10px] uppercase tracking-widest px-2 py-1">
                              Coup de cœur
                            </span>
                          )}
                          {onSale && (
                            <span className="absolute top-3 right-3 z-10 text-[10px] uppercase tracking-[0.2em] text-red-600 bg-white/90 px-2 py-1">
                              Promo
                            </span>
                          )}
                          {p.image ? (
                            <img
                              src={p.image}
                              alt={p.imageAlt}
                              loading="lazy"
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              className="transition-transform duration-700 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300 text-5xl">📦</div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-sm text-gray-900 font-light group-hover:text-gray-600 transition-colors">{p.title}</h3>
                          <div className="flex items-baseline gap-2 text-sm">
                            <span className={"text-gray-900 " + (onSale ? "font-medium" : "font-light")}>
                              {p.minPrice === p.maxPrice ? fmt(p.minPrice) : "à partir de " + fmt(p.minPrice)}
                            </span>
                            {onSale && p.compareAt != null && (
                              <span className="text-gray-400 line-through text-xs font-light">{fmt(p.compareAt)}</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function FilterSection({
  label,
  open,
  onToggle,
  count,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="border-b border-gray-200">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between py-4 text-left"
          aria-expanded={open}
        >
          <span className="text-base text-gray-900 font-light">
            {label}
            {count != null && count > 0 && (
              <span className="ml-2 text-xs text-gray-500">({count})</span>
            )}
          </span>
          <span className="text-gray-500 text-lg leading-none w-4 text-center select-none" aria-hidden>
            {open ? "−" : "+"}
          </span>
        </button>
        {open && <div className="pb-5">{children}</div>}
      </div>
    </>
  );
}

function PriceRange({
  absMin,
  absMax,
  min,
  max,
  onMinChange,
  onMaxChange,
  fmt,
}: {
  absMin: number;
  absMax: number;
  min: number;
  max: number;
  onMinChange: (v: number) => void;
  onMaxChange: (v: number) => void;
  fmt: (n: number) => string;
}) {
  const range = Math.max(1, absMax - absMin);
  const leftPct = ((min - absMin) / range) * 100;
  const rightPct = 100 - ((max - absMin) / range) * 100;
  const thumbCss =
    "absolute inset-0 w-full bg-transparent pointer-events-none appearance-none " +
    "[&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-px " +
    "[&::-moz-range-track]:bg-transparent [&::-moz-range-track]:h-px " +
    "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none " +
    "[&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full " +
    "[&::-webkit-slider-thumb]:bg-gray-900 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:-mt-1.5 " +
    "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 " +
    "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-gray-900 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer";

  return (
    <div className="pt-2 pb-1">
      <div className="relative h-3">
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-px bg-gray-200" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-px bg-gray-900"
          style={{ left: leftPct + "%", right: rightPct + "%" }}
        />
        <input
          type="range"
          min={absMin}
          max={absMax}
          value={min}
          onChange={(e) => onMinChange(parseFloat(e.target.value))}
          className={thumbCss}
          style={{ zIndex: min > absMax - (range * 0.1) ? 2 : 1 }}
          aria-label="Prix minimum"
        />
        <input
          type="range"
          min={absMin}
          max={absMax}
          value={max}
          onChange={(e) => onMaxChange(parseFloat(e.target.value))}
          className={thumbCss}
          style={{ zIndex: 2 }}
          aria-label="Prix maximum"
        />
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-gray-700 font-light">
        <span>{fmt(min)}</span>
        <span>{fmt(max)}</span>
      </div>
    </div>
  );
}
`;
}

export function cartButtonFile(): string {
  return `import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../contexts/CartContext";

export default function CartButton() {
  const { cart, openDrawer } = useCart();
  const count = cart?.itemCount ?? 0;

  return (
    <motion.button
      onClick={openDrawer}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.6 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-6 right-6 z-[9998] w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white"
      style={{ background: "var(--color-primary, #6366f1)" }}
      aria-label="Ouvrir le panier"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
      <AnimatePresence>
        {count > 0 && (
          <motion.span
            key="count"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center border-2 border-white"
          >
            {count}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
`;
}

export function cartDrawerFile(): string {
  return `import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useCart } from "../../contexts/CartContext";
import { API_BASE, fmtMoney, getSessionId } from "../../shop-config";

export default function CartDrawer() {
  const { cart, drawerOpen, closeDrawer, updateQty, removeItem, refresh } = useCart();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeApplying, setCodeApplying] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const paypalCfgRef = useRef<{ enabled: boolean; clientId?: string; currency?: string } | null>(null);
  const paypalRenderedRef = useRef(false);
  const [paypalEnabled, setPaypalEnabled] = useState(false);

  function collectClickIds() {
    const url = new URL(window.location.href);
    const cookies = Object.fromEntries(
      document.cookie.split("; ").filter(Boolean).map((c) => {
        const idx = c.indexOf("=");
        return [c.slice(0, idx), decodeURIComponent(c.slice(idx + 1))];
      }),
    );
    return {
      gclid: url.searchParams.get("gclid") || cookies.wp_gclid || undefined,
      gbraid: url.searchParams.get("gbraid") || cookies.wp_gbraid || undefined,
      wbraid: url.searchParams.get("wbraid") || cookies.wp_wbraid || undefined,
      liFatId: cookies.li_fat_id || cookies.wp_li_fat_id || undefined,
      ttclid: url.searchParams.get("ttclid") || cookies.wp_ttclid || undefined,
    };
  }

  // PayPal JS SDK : createOrder/onApprove appellent notre serveur (jamais de
  // montant côté client). Rendu une fois le drawer ouvert avec des articles.
  useEffect(() => {
    if (!drawerOpen) { paypalRenderedRef.current = false; return; }
    if (!cart || cart.items.length === 0) return;
    let cancelled = false;

    function renderButtons() {
      const paypal = (window as any).paypal;
      const container = document.getElementById("paypal-button-container");
      if (!paypal || !container || paypalRenderedRef.current) return;
      paypalRenderedRef.current = true;
      paypal.Buttons({
        style: { layout: "horizontal", height: 45, tagline: false },
        createOrder: async () => {
          const r = await fetch(API_BASE + "/paypal/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: getSessionId() }),
          });
          const d = await r.json();
          if (!r.ok) { setCheckoutError(d?.error || "Erreur PayPal"); throw new Error("paypal create"); }
          return d.orderID;
        },
        onApprove: async (data: any) => {
          const r = await fetch(API_BASE + "/paypal/capture", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderID: data.orderID, ...collectClickIds() }),
          });
          const d = await r.json();
          if (!r.ok) { setCheckoutError(d?.error || "Paiement PayPal échoué"); return; }
          window.location.href = window.location.pathname + "?order=success";
        },
        onError: () => setCheckoutError("Erreur PayPal"),
      }).render("#paypal-button-container");
    }

    async function setup() {
      if (!paypalCfgRef.current) {
        try {
          const r = await fetch(API_BASE + "/paypal/config");
          paypalCfgRef.current = await r.json();
        } catch { return; }
      }
      const cfg = paypalCfgRef.current;
      if (cancelled || !cfg || !cfg.enabled || !cfg.clientId) return;
      setPaypalEnabled(true);
      if ((window as any).paypal) { renderButtons(); return; }
      if (!document.getElementById("paypal-sdk")) {
        const s = document.createElement("script");
        s.id = "paypal-sdk";
        s.src = "https://www.paypal.com/sdk/js?client-id=" + encodeURIComponent(cfg.clientId) + "&currency=" + encodeURIComponent(cfg.currency || "EUR") + "&intent=capture";
        s.onload = () => { if (!cancelled) renderButtons(); };
        document.body.appendChild(s);
      } else {
        renderButtons();
      }
    }
    setup();
    return () => { cancelled = true; };
  }, [drawerOpen, cart]);

  async function applyCode() {
    if (!code.trim()) return;
    setCodeApplying(true);
    setCodeError(null);
    try {
      const res = await fetch(API_BASE + "/cart/discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: getSessionId(), code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCodeError(data?.error ?? "Code invalide");
        return;
      }
      setCode("");
      await refresh();
    } catch {
      setCodeError("Erreur réseau");
    } finally {
      setCodeApplying(false);
    }
  }
  async function removeCode() {
    await fetch(API_BASE + "/cart/discount?sessionId=" + encodeURIComponent(getSessionId()), { method: "DELETE" });
    await refresh();
  }

  async function startCheckout() {
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      // Capture Google click identifiers depuis URL OU cookie wp_gclid (60-90j).
      // L'utilisateur peut être arrivé sur une page produit puis cliqué sur le panier
      // depuis une autre page — d'où la persistance cookie.
      const url = new URL(window.location.href);
      const cookies = Object.fromEntries(
        document.cookie.split("; ").filter(Boolean).map((c) => {
          const idx = c.indexOf("=");
          return [c.slice(0, idx), decodeURIComponent(c.slice(idx + 1))];
        }),
      );
      const gclid = url.searchParams.get("gclid") ?? cookies.wp_gclid;
      const gbraid = url.searchParams.get("gbraid") ?? cookies.wp_gbraid;
      const wbraid = url.searchParams.get("wbraid") ?? cookies.wp_wbraid;
      // li_fat_id : cookie déposé par le LinkedIn Insight Tag (visible si le tag
      // est installé sur la page). On lit aussi notre persistance wp_li_fat_id
      // (au cas où le cookie original aurait été ré-écrit / supprimé).
      const liFatId = cookies.li_fat_id ?? cookies.wp_li_fat_id;
      const ttclid = url.searchParams.get("ttclid") ?? cookies.wp_ttclid;

      const res = await fetch(API_BASE + "/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: getSessionId(),
          email: email || undefined,
          gclid: gclid || undefined,
          gbraid: gbraid || undefined,
          wbraid: wbraid || undefined,
          liFatId: liFatId || undefined,
          ttclid: ttclid || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCheckoutError(data?.error ?? "Impossible de démarrer le paiement");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setCheckoutLoading(false);
    }
  }

  if (!cart) return null;
  const currency = cart.currency;
  const locale = "fr-FR";

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] bg-black/50"
            onClick={closeDrawer}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-[10000] w-full max-w-md bg-white shadow-2xl flex flex-col"
          >
            <header className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Mon panier</h2>
              <button
                onClick={closeDrawer}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                aria-label="Fermer"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-5">
              {cart.items.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">🛒</div>
                  <p className="text-gray-500">Ton panier est vide.</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {cart.items.map((it) => (
                    <li key={it.id} className="flex gap-3 py-3 border-b border-gray-100 last:border-0">
                      {it.image ? (
                        <img src={it.image} alt="" className="w-16 h-16 rounded-lg object-cover bg-gray-100 flex-shrink-0" />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-300">📦</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-900 leading-snug">{it.productTitle}</div>
                        {it.variantTitle && it.variantTitle !== "Default" && (
                          <div className="text-xs text-gray-500 mt-0.5">{it.variantTitle}</div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <button onClick={() => updateQty(it.id, Math.max(0, it.quantity - 1))} className="w-7 h-7 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-700">−</button>
                          <span className="text-sm font-semibold w-6 text-center">{it.quantity}</span>
                          <button onClick={() => updateQty(it.id, it.quantity + 1)} className="w-7 h-7 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-700">+</button>
                          <button onClick={() => removeItem(it.id)} className="text-xs text-red-500 hover:text-red-600 ml-2">Retirer</button>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm text-gray-900">{fmtMoney(it.totalPrice, currency, locale)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {cart.items.length > 0 && (
              <footer className="p-5 border-t border-gray-200 bg-gray-50 space-y-2">
                {/* Code promo */}
                <div className="pb-2 border-b border-gray-200 space-y-1.5">
                  {cart.discount > 0 ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold">
                        ✓ Code appliqué
                      </span>
                      <button onClick={removeCode} className="text-xs text-gray-500 hover:text-red-500">Retirer</button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={code}
                          onChange={(e) => setCode(e.target.value.toUpperCase())}
                          onKeyDown={(e) => { if (e.key === "Enter") applyCode(); }}
                          placeholder="Code promo"
                          className="flex-1 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm uppercase font-mono focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          onClick={applyCode}
                          disabled={codeApplying || !code.trim()}
                          className="px-3 py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold disabled:opacity-50"
                        >
                          {codeApplying ? "…" : "Appliquer"}
                        </button>
                      </div>
                      {codeError && <div className="text-xs text-red-600">⚠ {codeError}</div>}
                    </>
                  )}
                </div>

                <div className="flex justify-between text-sm text-gray-600">
                  <span>Sous-total</span>
                  <strong className="text-gray-900">{fmtMoney(cart.subtotal, currency, locale)}</strong>
                </div>
                {cart.shipping > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Livraison</span>
                    <strong className="text-gray-900">{fmtMoney(cart.shipping, currency, locale)}</strong>
                  </div>
                )}
                {cart.tax > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>TVA</span>
                    <strong className="text-gray-900">{fmtMoney(cart.tax, currency, locale)}</strong>
                  </div>
                )}
                {cart.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Remise</span>
                    <strong className="text-emerald-600">-{fmtMoney(cart.discount, currency, locale)}</strong>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t border-gray-200 text-lg font-bold">
                  <span>Total</span>
                  <span>{fmtMoney(cart.total, currency, locale)}</span>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ton@email.com (optionnel)"
                  className="w-full mt-3 px-3 py-2.5 rounded-lg bg-white border border-gray-200 text-sm focus:outline-none focus:border-indigo-500"
                />
                {checkoutError && (
                  <div className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">⚠ {checkoutError}</div>
                )}
                <button
                  onClick={startCheckout}
                  disabled={checkoutLoading}
                  className="w-full mt-2 py-3.5 rounded-xl text-white font-bold text-sm transition-colors disabled:opacity-50"
                  style={{ background: "var(--color-primary, #6366f1)" }}
                >
                  {checkoutLoading ? "Préparation…" : "Procéder au paiement"}
                </button>
                {paypalEnabled && (
                  <div className="my-3 flex items-center gap-3">
                    <span className="flex-1 h-px bg-gray-200" />
                    <span className="text-[10px] text-gray-400">ou</span>
                    <span className="flex-1 h-px bg-gray-200" />
                  </div>
                )}
                <div id="paypal-button-container" style={{ display: paypalEnabled ? "block" : "none" }} />
                <p className="mt-2 text-[10px] text-gray-400 text-center">
                  {paypalEnabled ? "Paiement sécurisé via Stripe ou PayPal" : "Paiement sécurisé via Stripe"}
                </p>
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
`;
}

// ShopHydrator : scanne le DOM pour les markers data-shop-section et y monte
// les composants React via createPortal. Pour gérer les sections insérées
// dynamiquement par l'éditeur WYSIWYG après hydration React initiale.
export function shopHydratorFile(): string {
  return `import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ShopGrid from "./ShopGrid";
import ShopFeatured from "./ShopFeatured";
import ShopCategories from "./ShopCategories";

type Marker = { el: Element; type: string; props: Record<string, string> };

function readProps(el: Element): Record<string, string> {
  const props: Record<string, string> = {};
  for (const attr of Array.from(el.attributes)) {
    if (attr.name.startsWith("data-prop-")) {
      props[attr.name.slice("data-prop-".length)] = attr.value;
    }
  }
  return props;
}

export default function ShopHydrator() {
  const [markers, setMarkers] = useState<Marker[]>([]);

  useEffect(() => {
    function scan() {
      const found: Marker[] = [];
      document.querySelectorAll("[data-shop-section]").forEach((el) => {
        const type = el.getAttribute("data-shop-section") ?? "";
        // Empty l'inner pour éviter le doublon (skeleton placeholder)
        if (!el.getAttribute("data-shop-hydrated")) {
          el.innerHTML = "";
          el.setAttribute("data-shop-hydrated", "1");
        }
        found.push({ el, type, props: readProps(el) });
      });
      setMarkers(found);
    }
    scan();
    const obs = new MutationObserver(scan);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  return (
    <>
      {markers.map((m, i) => {
        const Comp = m.type === "grid" ? ShopGrid : m.type === "featured" ? ShopFeatured : m.type === "categories" ? ShopCategories : null;
        if (!Comp) return null;
        const props: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(m.props)) {
          if (k === "limit" || k === "columns") props[k] = parseInt(v, 10);
          else props[k] = v;
        }
        return createPortal(<Comp {...props} />, m.el, "shop-" + i);
      })}
    </>
  );
}
`;
}

export function productPageFile(): string {
  return `import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE, fmtMoney, getSessionId } from "../shop-config";
import { useCart } from "../contexts/CartContext";

type Img = { url: string; alt: string | null };
type OptVal = { id: string; value: string; color?: string | null; imageUrl?: string | null };
type Opt = { id: string; name: string; values: OptVal[] };
type Variant = {
  id: string;
  sku: string | null;
  price: number;
  compareAt: number | null;
  available: number;
  inStock: boolean;
  options: Record<string, string>;
  imageUrl?: string | null;
};
type Product = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  excerpt: string | null;
  vendor: string | null;
  images: Img[];
  options: Opt[];
  variants: Variant[];
  categories: Array<{ slug: string; name: string }>;
  tags: string[];
};
type Shop = { currency: string; locale: string; name: string };
type ReviewItem = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  authorName: string | null;
  verifiedPurchase: boolean;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
};
type ReviewStats = { average: number | null; count: number };

const COLOR_MAP: Record<string, string> = {
  noir: "#111", black: "#111",
  blanc: "#fff", white: "#fff",
  gris: "#9ca3af", grey: "#9ca3af", gray: "#9ca3af",
  rouge: "#dc2626", red: "#dc2626",
  bleu: "#2563eb", blue: "#2563eb",
  vert: "#16a34a", green: "#16a34a",
  jaune: "#eab308", yellow: "#eab308",
  orange: "#ea580c",
  rose: "#ec4899", pink: "#ec4899",
  violet: "#7c3aed", purple: "#7c3aed",
  marron: "#78350f", brown: "#78350f",
  beige: "#d4a373",
  doré: "#d4af37", dore: "#d4af37", gold: "#d4af37",
  argenté: "#c0c0c0", argente: "#c0c0c0", silver: "#c0c0c0",
};
function colorFromName(value: string): string | null {
  const key = value.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
  return COLOR_MAP[key] ?? null;
}
function isColorOption(name: string): boolean {
  return /couleur|color|coloris/i.test(name);
}

// Rendu Markdown minimal (gras, italique, titres, listes, liens)
function renderMarkdown(text: string): string {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  html = html
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>");
  html = html
    .replace(/\\*\\*([^*]+)\\*\\*/g, "<strong>$1</strong>")
    .replace(/(?<!\\*)\\*([^*\\n]+)\\*(?!\\*)/g, "<em>$1</em>")
    .replace(/_([^_\\n]+)_/g, "<em>$1</em>");
  html = html.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  html = html.replace(/(?:^[-*] .+(?:\\n|$))+/gm, (block) => {
    const items = block.trim().split("\\n").map((l) => "<li>" + l.replace(/^[-*] /, "") + "</li>").join("");
    return "<ul>" + items + "</ul>";
  });
  html = html.replace(/(?:^\\d+\\. .+(?:\\n|$))+/gm, (block) => {
    const items = block.trim().split("\\n").map((l) => "<li>" + l.replace(/^\\d+\\. /, "") + "</li>").join("");
    return "<ol>" + items + "</ol>";
  });
  return html.split(/\\n\\n+/).map((p) => {
    const t = p.trim();
    if (!t) return "";
    if (/^<(h[1-3]|ul|ol|p|blockquote)/i.test(t)) return t;
    return "<p>" + t.replace(/\\n/g, "<br/>") + "</p>";
  }).join("\\n");
}

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <div className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24"
          fill={i <= Math.round(value) ? "#fbbf24" : "none"}
          stroke={i <= Math.round(value) ? "#fbbf24" : "#d1d5db"}
          strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [imgIndex, setImgIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [tab, setTab] = useState<"desc" | "infos" | "reviews">("desc");
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats>({ average: null, count: 0 });
  const [zoomed, setZoomed] = useState(false);
  const { cart, openDrawer, refresh } = useCart();

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    fetch(API_BASE + "/products/" + slug)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.ok ? r.json() : null;
      })
      .then((d) => {
        if (!d) return;
        setProduct(d.product);
        setShop(d.shop);
        if (d.product?.options?.length) {
          const init: Record<string, string> = {};
          for (const opt of d.product.options) {
            if (opt.values[0]) init[opt.name] = opt.values[0].value;
          }
          setSelected(init);
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    fetch(API_BASE + "/products/" + slug + "/reviews")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setReviews(d.reviews ?? []);
          setReviewStats(d.stats ?? { average: null, count: 0 });
        }
      })
      .catch(() => {});
  }, [slug]);

  const currentVariant = useMemo<Variant | null>(() => {
    if (!product) return null;
    if (!product.options.length) return product.variants[0] ?? null;
    return product.variants.find((v) =>
      Object.entries(selected).every(([name, val]) => v.options[name] === val),
    ) ?? null;
  }, [product, selected]);

  // Synchronise la photo principale avec la variante sélectionnée
  useEffect(() => {
    if (!currentVariant?.imageUrl || !product) return;
    const idx = product.images.findIndex((img) => img.url === currentVariant.imageUrl);
    if (idx >= 0) setImgIndex(idx);
  }, [currentVariant, product]);

  const fmt = (n: number) => fmtMoney(n, shop?.currency ?? "EUR", shop?.locale ?? "fr-FR");

  async function addToCart() {
    if (!currentVariant || !product) return;
    setAdding(true);
    try {
      const res = await fetch(API_BASE + "/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: getSessionId(),
          variantId: currentVariant.id,
          quantity: qty,
        }),
      });
      if (res.ok) {
        await refresh();
        openDrawer();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err?.error ?? "Ajout impossible");
      }
    } finally { setAdding(false); }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 grid md:grid-cols-2 gap-8 animate-pulse">
        <div className="aspect-square bg-gray-100 rounded-2xl" />
        <div className="space-y-3">
          <div className="h-8 bg-gray-100 rounded w-2/3" />
          <div className="h-4 bg-gray-100 rounded w-1/3" />
          <div className="h-24 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }
  if (notFound || !product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="text-6xl">🤷</div>
        <h1 className="text-2xl font-bold text-gray-900">Produit introuvable</h1>
        <Link to="/boutique" className="inline-block px-5 py-2.5 rounded-full bg-gray-900 text-white text-sm font-semibold">
          ← Retour à la boutique
        </Link>
      </div>
    );
  }

  const images = product.images.length ? product.images : [{ url: "", alt: product.title }];
  const inStock = currentVariant?.inStock ?? false;
  const onSale = currentVariant && currentVariant.compareAt && currentVariant.compareAt > currentVariant.price;
  // Combien de cette variante est déjà dans le panier
  const inCartCount = currentVariant && cart
    ? cart.items.filter((it: { variantId: string; quantity: number }) => it.variantId === currentVariant.id).reduce((s: number, it: { quantity: number }) => s + it.quantity, 0)
    : 0;
  const effectiveRemaining = currentVariant ? Math.max(0, currentVariant.available - inCartCount) : 0;
  const maxedOut = inStock && effectiveRemaining === 0;

  return (
    <div className="bg-white">
      <div className="max-w-6xl mx-auto px-5 py-10 md:py-16">
        <nav className="text-[11px] text-gray-400 mb-10 tracking-wide font-light">
          <Link to="/" className="hover:text-gray-700 transition-colors">Accueil</Link>
          <span className="mx-2 text-gray-300">·</span>
          <Link to="/boutique" className="hover:text-gray-700 transition-colors">Boutique</Link>
          {product.categories[0] && (
            <>
              <span className="mx-2 text-gray-300">·</span>
              <Link to={"/categorie/" + product.categories[0].slug} className="hover:text-gray-700 transition-colors">{product.categories[0].name}</Link>
            </>
          )}
          <span className="mx-2 text-gray-300">·</span>
          <span className="text-gray-600">{product.title}</span>
        </nav>

        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-20">
          {/* ─── Galerie ─── */}
          <div className="space-y-4">
            <motion.div
              key={imgIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="relative aspect-square bg-[#f7f6f3] overflow-hidden cursor-zoom-in group rounded-sm"
              onClick={() => setZoomed(true)}
            >
              {images[imgIndex]?.url ? (
                <>
                  <img src={images[imgIndex].url} alt={images[imgIndex].alt ?? product.title} style={{ width: "100%", height: "100%", objectFit: "contain" }} className="transition-transform duration-500 group-hover:scale-[1.02]" />
                  {onSale && (
                    <span className="absolute top-5 left-5 text-[10px] uppercase tracking-[0.25em] text-gray-900 font-medium">
                      <span className="border-b border-gray-900 pb-0.5">Sale</span>
                    </span>
                  )}
                  <div className="absolute top-5 right-5 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8" />
                      <path d="M21 21l-4.3-4.3M11 8v6M8 11h6" strokeLinecap="round" />
                    </svg>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 text-6xl">📷</div>
              )}
            </motion.div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIndex(i)}
                    className={"flex-shrink-0 w-20 h-20 overflow-hidden rounded-sm transition-all bg-[#f7f6f3] " + (i === imgIndex ? "" : "opacity-50 hover:opacity-100")}
                  >
                    {img.url && <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ─── Infos produit (sticky sur desktop) ─── */}
          <div className="lg:sticky lg:top-8 lg:self-start space-y-7">
            {product.vendor && (
              <div className="text-[10px] uppercase tracking-[0.3em] text-gray-500">{product.vendor}</div>
            )}
            <h1 className="text-3xl md:text-4xl font-light text-gray-900 leading-[1.1] tracking-tight">{product.title}</h1>

            {reviewStats.count > 0 && (
              <button onClick={() => setTab("reviews")} className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-gray-900 transition-colors">
                <Stars value={reviewStats.average ?? 0} size={14} />
                <span>({reviewStats.count})</span>
              </button>
            )}

            {currentVariant ? (
              <div className="flex items-baseline gap-3">
                <div className="text-2xl text-gray-900 font-light">{fmt(currentVariant.price)}</div>
                {onSale && (
                  <>
                    <div className="text-sm text-gray-400 line-through font-light">{fmt(currentVariant.compareAt!)}</div>
                    <div className="text-xs uppercase tracking-[0.2em] text-red-600 font-medium">
                      −{Math.round(((currentVariant.compareAt! - currentVariant.price) / currentVariant.compareAt!) * 100)}%
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-gray-500 text-sm">Sélectionne une variante</div>
            )}

            {product.excerpt && (
              <p className="text-gray-600 leading-relaxed text-sm font-light">{product.excerpt}</p>
            )}

            <div className="h-px bg-gray-200" />

            {/* Options */}
            <div className="space-y-6">
              {product.options.map((opt) => {
                const hasVisuals = opt.values.some((v) => v.color || v.imageUrl);
                const useSwatches = hasVisuals || isColorOption(opt.name);
                return (
                  <div key={opt.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-[0.25em] text-gray-500">{opt.name}</span>
                      {selected[opt.name] && (
                        <span className="text-sm text-gray-900 font-light">{selected[opt.name]}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {opt.values.map((val) => {
                        const active = selected[opt.name] === val.value;
                        if (useSwatches && val.imageUrl) {
                          return (
                            <button
                              key={val.id}
                              title={val.value}
                              onClick={() => setSelected({ ...selected, [opt.name]: val.value })}
                              className={"w-10 h-10 overflow-hidden rounded-full transition-all relative " + (active ? "ring-1 ring-gray-900 ring-offset-2" : "ring-1 ring-gray-200 hover:ring-gray-400")}
                            >
                              <img src={val.imageUrl} alt={val.value} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </button>
                          );
                        }
                        if (useSwatches) {
                          const color = val.color ?? colorFromName(val.value) ?? "#e5e7eb";
                          return (
                            <button
                              key={val.id}
                              title={val.value}
                              onClick={() => setSelected({ ...selected, [opt.name]: val.value })}
                              className={"w-9 h-9 rounded-full transition-all " + (active ? "ring-1 ring-gray-900 ring-offset-2" : "ring-1 ring-gray-200 hover:ring-gray-400")}
                              style={{ backgroundColor: color }}
                            />
                          );
                        }
                        return (
                          <button
                            key={val.id}
                            onClick={() => setSelected({ ...selected, [opt.name]: val.value })}
                            style={{
                              color: active ? "#fff" : "#111",
                              backgroundColor: active ? "#111" : "transparent",
                              borderColor: active ? "#111" : "#e5e7eb",
                            }}
                            className="min-w-[3rem] h-11 px-4 rounded-sm text-sm font-light transition-colors border"
                          >
                            {val.value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quantité + Add to cart */}
            <div className="space-y-3">
              <div className="flex items-stretch gap-2">
                <div className="inline-flex items-stretch border border-gray-200 rounded-sm">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="w-10 h-12 text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                  >−</button>
                  <input
                    type="number"
                    min={1}
                    max={currentVariant?.available ?? 99}
                    value={qty}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      if (Number.isNaN(n)) return;
                      const max = Math.max(1, effectiveRemaining || 1);
                      setQty(Math.max(1, Math.min(max, n)));
                    }}
                    className="w-12 h-12 text-center text-sm text-gray-900 focus:outline-none bg-transparent appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <button
                    onClick={() => setQty(Math.min(effectiveRemaining || 1, qty + 1))}
                    disabled={qty >= effectiveRemaining || maxedOut}
                    className="w-10 h-12 text-gray-500 hover:text-gray-900 hover:bg-gray-50 disabled:text-gray-300 disabled:hover:bg-transparent transition-colors"
                  >+</button>
                </div>
                <button
                  onClick={addToCart}
                  disabled={!inStock || !currentVariant || adding || maxedOut}
                  className="flex-1 h-12 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500 text-white text-xs uppercase tracking-[0.25em] font-medium rounded-sm transition-colors"
                >
                  {adding ? "Ajout…" : maxedOut ? "Maximum dans le panier" : inStock ? "Ajouter au panier" : currentVariant ? "Rupture" : "Indisponible"}
                </button>
              </div>

              {currentVariant && inStock && maxedOut && (
                <div className="text-xs text-amber-700 flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Tu as déjà {inCartCount} exemplaire{inCartCount > 1 ? "s" : ""} dans le panier (stock total : {currentVariant.available}).
                </div>
              )}
              {currentVariant && inStock && !maxedOut && effectiveRemaining <= 5 && (
                <div className="text-xs text-gray-500 flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Plus que {effectiveRemaining} disponible{effectiveRemaining > 1 ? "s" : ""}{inCartCount > 0 ? " (tu en as déjà " + inCartCount + " dans le panier)" : ""}
                </div>
              )}
              {currentVariant && inStock && !maxedOut && effectiveRemaining > 5 && (
                <div className="text-xs text-gray-500 flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  En stock — expédié sous 24-48h
                </div>
              )}
            </div>

            {/* Meta minimal */}
            <div className="pt-6 border-t border-gray-100 text-xs text-gray-400 space-y-1 font-light">
              {currentVariant?.sku && (
                <div>Réf. <span className="text-gray-600">{currentVariant.sku}</span></div>
              )}
              {product.categories.length > 0 && (
                <div>
                  {product.categories.map((c, i) => (
                    <span key={c.slug}>
                      <Link to={"/categorie/" + c.slug} className="text-gray-600 hover:text-gray-900 transition-colors">{c.name}</Link>
                      {i < product.categories.length - 1 ? " · " : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-20 md:mt-28">
          <div className="flex gap-6 sm:gap-10 border-b border-gray-100">
            {([
              { id: "desc", label: "Description" },
              { id: "infos", label: "Détails" },
              { id: "reviews", label: "Avis (" + reviewStats.count + ")" },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={"py-4 text-[11px] uppercase tracking-[0.25em] border-b transition-colors " + (tab === t.id ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-700")}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="py-8 min-h-[200px]">
            {tab === "desc" && (
              product.description ? (
                <div
                  className="prose prose-sm sm:prose max-w-3xl text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(product.description) }}
                />
              ) : (
                <p className="text-gray-500 italic">Pas encore de description détaillée.</p>
              )
            )}
            {tab === "infos" && (
              <div className="grid sm:grid-cols-2 gap-x-10 gap-y-4 max-w-3xl text-sm">
                <Spec label="Référence" value={currentVariant?.sku || "—"} />
                <Spec label="Disponibilité" value={inStock ? "En stock" : "Rupture"} />
                {product.vendor && <Spec label="Marque" value={product.vendor} />}
                {product.categories.length > 0 && <Spec label="Catégorie" value={product.categories.map((c) => c.name).join(", ")} />}
                {product.options.map((o) => (
                  <Spec key={o.id} label={o.name} value={o.values.map((v) => v.value).join(", ")} />
                ))}
                {product.tags.length > 0 && <Spec label="Tags" value={product.tags.join(", ")} />}
              </div>
            )}
            {tab === "reviews" && (
              <ReviewsBlock
                slug={slug!}
                productTitle={product.title}
                reviews={reviews}
                stats={reviewStats}
                onSubmitted={() => {
                  fetch(API_BASE + "/products/" + slug + "/reviews")
                    .then((r) => (r.ok ? r.json() : null))
                    .then((d) => { if (d) { setReviews(d.reviews ?? []); setReviewStats(d.stats ?? { average: null, count: 0 }); } });
                }}
              />
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 py-14 md:py-20 px-5">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-6">
          <Trust
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24"><path d="M3 8h13l3 4h2v6h-2a2 2 0 11-4 0H8a2 2 0 11-4 0H3V8z" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            title="Livraison rapide"
            desc="Expédition 24-48h"
          />
          <Trust
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24"><path d="M12 2l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6l8-4z" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            title="Paiement sécurisé"
            desc="SSL · Carte · Apple Pay"
          />
          <Trust
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24"><path d="M21 12a9 9 0 11-9-9M21 12l-3-3M21 12l-3 3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            title="Retours 14 jours"
            desc="Échange ou remboursement"
          />
        </div>
      </div>

      <AnimatePresence>
        {zoomed && images[imgIndex]?.url && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomed(false)}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          >
            <button onClick={() => setZoomed(false)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-2xl">×</button>
            <img src={images[imgIndex].url} alt={product.title} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-gray-500 font-semibold uppercase tracking-widest text-[10px]">{label}</span>
      <span className="text-gray-900 text-right">{value}</span>
    </div>
  );
}

function Trust({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="text-gray-900 flex-shrink-0 mt-0.5">{icon}</div>
      <div className="space-y-0.5">
        <div className="text-sm font-medium text-gray-900">{title}</div>
        <p className="text-xs text-gray-500 font-light">{desc}</p>
      </div>
    </div>
  );
}

function ReviewsBlock({
  slug, productTitle, reviews, stats, onSubmitted,
}: {
  slug: string;
  productTitle: string;
  reviews: ReviewItem[];
  stats: ReviewStats;
  onSubmitted: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return;
    setSubmitting(true);
    try {
      const res = await fetch(API_BASE + "/products/" + slug + "/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, title: title || undefined, body: body || undefined, authorName: authorName || undefined, authorEmail: authorEmail || undefined }),
      });
      if (res.ok) {
        setSubmitted(true);
        setRating(0); setTitle(""); setBody(""); setAuthorName(""); setAuthorEmail("");
        setShowForm(false);
        onSubmitted();
      }
    } finally { setSubmitting(false); }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          {stats.average != null ? (
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold text-gray-900">{stats.average.toFixed(1)}</span>
              <div>
                <Stars value={stats.average} size={18} />
                <div className="text-xs text-gray-500 mt-1">basé sur {stats.count} avis</div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Aucun avis pour le moment. Sois le premier à donner ton avis !</p>
          )}
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="px-5 py-2.5 rounded-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold">
            Laisser un avis
          </button>
        )}
      </div>

      {submitted && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
          ✓ Merci ! Ton avis a été envoyé. Il sera publié après modération.
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <h3 className="font-bold text-gray-900">Ton avis sur {productTitle}</h3>
          <div>
            <div className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-2">Note *</div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(i)}
                  className="text-3xl leading-none transition-transform hover:scale-110"
                  style={{ color: i <= (hover || rating) ? "#fbbf24" : "#d1d5db" }}
                >★</button>
              ))}
            </div>
          </div>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre (optionnel)" maxLength={100}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gray-900 focus:outline-none" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Partage ton expérience…" rows={4}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gray-900 focus:outline-none resize-y" />
          <div className="grid sm:grid-cols-2 gap-3">
            <input type="text" value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="Ton prénom"
              className="px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gray-900 focus:outline-none" />
            <input type="email" value={authorEmail} onChange={(e) => setAuthorEmail(e.target.value)} placeholder="Ton email (non publié)"
              className="px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gray-900 focus:outline-none" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={!rating || submitting} className="px-5 py-2.5 rounded-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white text-sm font-bold">
              {submitting ? "Envoi…" : "Publier"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-full bg-white border border-gray-300 hover:border-gray-900 text-sm font-bold">
              Annuler
            </button>
          </div>
        </form>
      )}

      {reviews.length > 0 && (
        <div className="space-y-5">
          {reviews.map((r) => (
            <article key={r.id} className="border-b border-gray-200 pb-5 last:border-0">
              <div className="flex items-center gap-3 mb-1">
                <Stars value={r.rating} />
                {r.verifiedPurchase && (
                  <span className="text-[10px] uppercase tracking-widest bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                    Achat vérifié
                  </span>
                )}
              </div>
              {r.title && <h4 className="font-bold text-gray-900 mb-1">{r.title}</h4>}
              {r.body && <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{r.body}</p>}
              <div className="text-xs text-gray-500 mt-2">
                Par <strong>{r.authorName || "Anonyme"}</strong>
                {" · "}
                {new Date(r.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
              </div>
              {r.reply && (
                <div className="mt-3 ml-4 pl-4 border-l-2 border-gray-300 bg-gray-50 rounded p-3">
                  <div className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-1">Réponse du marchand</div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.reply}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
`;
}

export function categoryPageFile(): string {
  return `import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { API_BASE } from "../shop-config";
import ProductCard from "../components/shop/ProductCard";
import type { ShopProduct, ShopInfo } from "../hooks/useShopProducts";

type Cat = { id: string; slug: string; name: string; description: string | null; imageUrl: string | null };

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<Cat | null>(null);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(API_BASE + "/categories").then((r) => (r.ok ? r.json() : null)),
      fetch(API_BASE + "/products?category=" + encodeURIComponent(slug ?? "")).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([cats, prods]) => {
        if (cats?.categories) {
          const found = cats.categories.find((c: Cat) => c.slug === slug);
          setCategory(found ?? null);
        }
        if (prods) {
          setProducts(prods.products ?? []);
          setShop(prods.shop ?? null);
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 md:py-14">
      <nav className="text-xs text-gray-500 mb-6">
        <Link to="/" className="hover:text-gray-900">Accueil</Link>
        <span className="mx-2">/</span>
        <Link to="/boutique" className="hover:text-gray-900">Boutique</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">{category?.name ?? "Catégorie"}</span>
      </nav>

      <header className="text-center mb-10 max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">{category?.name ?? slug}</h1>
        {category?.description && <p className="text-gray-600 leading-relaxed">{category.description}</p>}
      </header>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-gray-500">Aucun produit dans cette catégorie pour le moment.</p>
          <Link to="/boutique" className="inline-block mt-6 px-5 py-2.5 rounded-full bg-gray-900 text-white text-sm font-semibold">
            ← Retour à la boutique
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} shop={shop} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
`;
}
