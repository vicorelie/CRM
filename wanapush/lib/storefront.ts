// Script de runtime pour la VITRINE e-commerce sur le site généré.
// Activé par la présence de `data-storefront` sur une section.
//
// Détecte le siteSlug depuis l'URL (/preview/{slug}/) et :
//   1. Pour chaque [data-storefront="grid"|"featured"]   → fetch products et render des cards
//   2. Pour chaque [data-storefront="categories"]        → fetch categories et render des tuiles
//   3. Injecte un bouton panier flottant + drawer avec items
//   4. Gère sessionId (localStorage) pour persister le panier anonyme
//   5. Bouton "Ajouter au panier" sur chaque card → POST /cart
//
// Le script est livré sous forme d'IIFE auto-exécutable injecté dans
// index.html (similaire à site-editor.ts) via reactTemplate.ts.

export function storefrontScript(slug: string): string {
  return `<script data-storefront-injected>
(function () {
  if (window.__wpStorefrontLoaded) return;
  window.__wpStorefrontLoaded = true;
  var SLUG = ${JSON.stringify(slug)};
  var API_BASE = "/api/storefront/" + SLUG;

  // ────────────────────────────────────────────────────────────────────
  // Session ID pour le panier anonyme
  // ────────────────────────────────────────────────────────────────────
  function getSessionId() {
    var sid = localStorage.getItem("wp_sf_session");
    if (!sid) {
      sid = "sf_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("wp_sf_session", sid);
    }
    return sid;
  }

  // ────────────────────────────────────────────────────────────────────
  // État local (cache)
  // ────────────────────────────────────────────────────────────────────
  var SHOP_INFO = null;     // { currency, locale, ... }
  var CART = null;          // { items, subtotal, total, itemCount }

  function fmtMoney(amount) {
    if (!SHOP_INFO) return amount.toString();
    try {
      return new Intl.NumberFormat(SHOP_INFO.locale || "fr-FR", {
        style: "currency",
        currency: SHOP_INFO.currency || "EUR",
      }).format(Number(amount));
    } catch (e) {
      return Number(amount).toFixed(2) + " " + (SHOP_INFO.currency || "EUR");
    }
  }

  // ────────────────────────────────────────────────────────────────────
  // CSS injecté (cards, drawer, bouton flottant)
  // ────────────────────────────────────────────────────────────────────
  var style = document.createElement("style");
  style.textContent = [
    ".wp-sf-card { display:flex; flex-direction:column; background:white; border-radius:14px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.06); transition:transform 0.18s, box-shadow 0.18s; }",
    ".wp-sf-card:hover { transform:translateY(-2px); box-shadow:0 10px 25px rgba(0,0,0,0.08); }",
    ".wp-sf-card-img { aspect-ratio:1/1; background:#f3f4f6; position:relative; overflow:hidden; }",
    ".wp-sf-card-img img { width:100%; height:100%; object-fit:cover; display:block; }",
    ".wp-sf-badge { position:absolute; top:8px; left:8px; background:#ef4444; color:white; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; padding:3px 8px; border-radius:999px; }",
    ".wp-sf-card-body { padding:14px; display:flex; flex-direction:column; gap:8px; flex:1; }",
    ".wp-sf-card-title { font-size:14px; font-weight:600; color:#111827; line-height:1.3; min-height:36px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }",
    ".wp-sf-card-price { font-size:16px; font-weight:700; color:#111827; }",
    ".wp-sf-card-compare { font-size:12px; color:#9ca3af; text-decoration:line-through; margin-left:6px; }",
    ".wp-sf-card-btn { margin-top:auto; padding:8px 12px; background:var(--color-primary, #6366f1); color:white; border:none; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; transition:background 0.15s; }",
    ".wp-sf-card-btn:hover { background:var(--color-primary-dark, #4f46e5); filter:brightness(0.95); }",
    ".wp-sf-card-btn:disabled { opacity:0.5; cursor:not-allowed; }",
    ".wp-sf-empty { text-align:center; padding:40px; color:#9ca3af; grid-column:1/-1; }",
    /* Cart button floating */
    ".wp-sf-cart-btn { position:fixed; bottom:24px; right:24px; z-index:9998; width:60px; height:60px; border-radius:50%; background:var(--color-primary, #6366f1); color:white; border:none; cursor:pointer; box-shadow:0 8px 24px rgba(0,0,0,0.2); display:flex; align-items:center; justify-content:center; transition:transform 0.15s; }",
    ".wp-sf-cart-btn:hover { transform:scale(1.05); }",
    ".wp-sf-cart-count { position:absolute; top:-4px; right:-4px; background:#ef4444; color:white; font-size:11px; font-weight:700; min-width:22px; height:22px; border-radius:11px; display:flex; align-items:center; justify-content:center; padding:0 5px; border:2px solid white; }",
    /* Drawer */
    ".wp-sf-drawer { position:fixed; top:0; right:0; bottom:0; width:100%; max-width:420px; background:white; z-index:9999; box-shadow:-8px 0 32px rgba(0,0,0,0.16); transform:translateX(100%); transition:transform 0.3s; display:flex; flex-direction:column; }",
    ".wp-sf-drawer.open { transform:translateX(0); }",
    ".wp-sf-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:9997; opacity:0; pointer-events:none; transition:opacity 0.3s; }",
    ".wp-sf-overlay.open { opacity:1; pointer-events:auto; }",
    ".wp-sf-drawer-head { padding:20px; border-bottom:1px solid #e5e7eb; display:flex; align-items:center; justify-content:space-between; }",
    ".wp-sf-drawer-title { font-size:18px; font-weight:700; color:#111827; }",
    ".wp-sf-drawer-close { background:none; border:none; cursor:pointer; padding:4px; color:#6b7280; }",
    ".wp-sf-drawer-body { flex:1; overflow-y:auto; padding:16px 20px; }",
    ".wp-sf-line { display:grid; grid-template-columns:60px 1fr auto; gap:12px; padding:12px 0; border-bottom:1px solid #f3f4f6; align-items:center; }",
    ".wp-sf-line-img { width:60px; height:60px; border-radius:8px; object-fit:cover; background:#f3f4f6; }",
    ".wp-sf-line-info { min-width:0; }",
    ".wp-sf-line-title { font-size:13px; font-weight:600; color:#111827; line-height:1.3; }",
    ".wp-sf-line-variant { font-size:11px; color:#6b7280; margin-top:2px; }",
    ".wp-sf-line-qty { display:inline-flex; align-items:center; gap:8px; margin-top:6px; }",
    ".wp-sf-qty-btn { width:24px; height:24px; border-radius:6px; border:1px solid #e5e7eb; background:white; cursor:pointer; font-size:14px; color:#374151; }",
    ".wp-sf-qty-btn:hover { background:#f9fafb; }",
    ".wp-sf-line-price { font-size:14px; font-weight:700; color:#111827; text-align:right; }",
    ".wp-sf-line-remove { display:block; font-size:11px; color:#ef4444; margin-top:4px; background:none; border:none; cursor:pointer; }",
    ".wp-sf-drawer-foot { padding:20px; border-top:1px solid #e5e7eb; background:#fafafa; }",
    ".wp-sf-foot-row { display:flex; justify-content:space-between; padding:4px 0; font-size:13px; color:#6b7280; }",
    ".wp-sf-foot-total { display:flex; justify-content:space-between; padding:12px 0; font-size:18px; font-weight:700; color:#111827; border-top:1px solid #e5e7eb; margin-top:8px; }",
    ".wp-sf-checkout-btn { width:100%; margin-top:12px; padding:14px; background:var(--color-primary, #6366f1); color:white; border:none; border-radius:10px; font-weight:700; font-size:15px; cursor:pointer; transition:filter 0.15s; }",
    ".wp-sf-checkout-btn:hover { filter:brightness(0.95); }",
    ".wp-sf-checkout-btn:disabled { opacity:0.5; cursor:not-allowed; }",
    ".wp-sf-cat-card { position:relative; display:block; aspect-ratio:1/1; border-radius:14px; overflow:hidden; text-decoration:none; color:white; }",
    ".wp-sf-cat-card img { width:100%; height:100%; object-fit:cover; }",
    ".wp-sf-cat-overlay { position:absolute; inset:0; background:linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.7)); display:flex; align-items:flex-end; padding:16px; }",
    ".wp-sf-cat-name { font-weight:700; font-size:16px; color:white; }",
  ].join("\\n");
  document.head.appendChild(style);

  // ────────────────────────────────────────────────────────────────────
  // Render product cards
  // ────────────────────────────────────────────────────────────────────
  function renderProductCards(container, products) {
    if (!products || products.length === 0) {
      container.innerHTML = '<div class="wp-sf-empty">Aucun produit pour le moment.</div>';
      return;
    }
    container.innerHTML = products.map(function (p) {
      var minP = p.minPrice != null ? Number(p.minPrice) : 0;
      var maxP = p.maxPrice != null ? Number(p.maxPrice) : minP;
      var compare = p.compareAt != null ? Number(p.compareAt) : null;
      var priceHtml = minP === maxP
        ? '<span class="wp-sf-card-price">' + fmtMoney(minP) + '</span>'
        : '<span class="wp-sf-card-price">' + fmtMoney(minP) + ' – ' + fmtMoney(maxP) + '</span>';
      if (compare && compare > minP) {
        priceHtml += '<span class="wp-sf-card-compare">' + fmtMoney(compare) + '</span>';
      }
      var onSale = compare && compare > minP;
      return ''
        + '<div class="wp-sf-card" data-product-id="' + p.id + '">'
        +   '<a href="#product/' + p.slug + '" class="wp-sf-card-img">'
        +     (onSale ? '<span class="wp-sf-badge">Promo</span>' : '')
        +     (p.image ? '<img src="' + p.image + '" alt="' + (p.imageAlt || p.title).replace(/"/g, '&quot;') + '" loading="lazy" />' : '')
        +   '</a>'
        +   '<div class="wp-sf-card-body">'
        +     '<div class="wp-sf-card-title">' + escapeHtml(p.title) + '</div>'
        +     '<div>' + priceHtml + '</div>'
        +     '<button class="wp-sf-card-btn" data-add-to-cart data-variant="' + (p.firstVariantId || '') + '"' + (p.variantCount > 1 ? '' : '') + '>'
        +       (p.variantCount > 1 ? 'Voir options' : 'Ajouter au panier')
        +     '</button>'
        +   '</div>'
        + '</div>';
    }).join("");
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  // ────────────────────────────────────────────────────────────────────
  // Hydration des sections shop
  // ────────────────────────────────────────────────────────────────────
  async function loadShopInfo() {
    try {
      var res = await fetch(API_BASE + "/products?limit=1");
      if (!res.ok) return;
      var data = await res.json();
      SHOP_INFO = data.shop;
    } catch (e) { console.warn("[storefront] shop info failed", e); }
  }

  async function hydrateGrids() {
    var grids = document.querySelectorAll("[data-storefront-grid]");
    for (var i = 0; i < grids.length; i++) {
      var grid = grids[i];
      var kind = grid.getAttribute("data-storefront-grid"); // "all" | "featured" | category slug
      var limit = parseInt(grid.getAttribute("data-limit") || "12", 10);
      var params = new URLSearchParams();
      params.set("limit", String(limit));
      if (kind === "featured") params.set("featured", "1");
      else if (kind !== "all") params.set("category", kind);
      try {
        var res = await fetch(API_BASE + "/products?" + params.toString());
        var data = await res.json();
        if (!SHOP_INFO && data.shop) SHOP_INFO = data.shop;
        renderProductCards(grid, data.products || []);
      } catch (e) {
        grid.innerHTML = '<div class="wp-sf-empty">Impossible de charger les produits.</div>';
        console.warn("[storefront] grid load failed", e);
      }
    }
  }

  // ────────────────────────────────────────────────────────────────────
  // Cart panier
  // ────────────────────────────────────────────────────────────────────
  async function refreshCart() {
    try {
      var res = await fetch(API_BASE + "/cart?sessionId=" + encodeURIComponent(getSessionId()));
      if (!res.ok) return;
      var data = await res.json();
      CART = data.cart;
      updateCartUI();
    } catch (e) { console.warn("[storefront] cart load failed", e); }
  }

  async function addToCart(variantId, qty) {
    try {
      var res = await fetch(API_BASE + "/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: getSessionId(), variantId: variantId, quantity: qty || 1 }),
      });
      if (!res.ok) {
        var err = await res.json();
        alert("Erreur : " + (err.error || "ajout impossible"));
        return;
      }
      var data = await res.json();
      CART = data.cart;
      updateCartUI();
      openDrawer();
    } catch (e) { console.warn("[storefront] add to cart failed", e); }
  }

  async function updateItemQty(itemId, qty) {
    try {
      var res = await fetch(API_BASE + "/cart/items/" + itemId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: getSessionId(), quantity: qty }),
      });
      if (res.ok) await refreshCart();
    } catch (e) { console.warn("[storefront] update qty failed", e); }
  }

  async function removeItem(itemId) {
    try {
      var res = await fetch(API_BASE + "/cart/items/" + itemId + "?sessionId=" + encodeURIComponent(getSessionId()), {
        method: "DELETE",
      });
      if (res.ok) await refreshCart();
    } catch (e) { console.warn("[storefront] remove item failed", e); }
  }

  // ────────────────────────────────────────────────────────────────────
  // UI : bouton panier flottant + drawer
  // ────────────────────────────────────────────────────────────────────
  var cartBtn = null;
  var cartCount = null;
  var drawer = null;
  var overlay = null;

  function ensureCartUI() {
    if (cartBtn) return;
    cartBtn = document.createElement("button");
    cartBtn.className = "wp-sf-cart-btn";
    cartBtn.setAttribute("aria-label", "Ouvrir le panier");
    cartBtn.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg><span class="wp-sf-cart-count" hidden>0</span>';
    cartCount = cartBtn.querySelector(".wp-sf-cart-count");
    document.body.appendChild(cartBtn);
    cartBtn.addEventListener("click", openDrawer);

    overlay = document.createElement("div");
    overlay.className = "wp-sf-overlay";
    document.body.appendChild(overlay);
    overlay.addEventListener("click", closeDrawer);

    drawer = document.createElement("aside");
    drawer.className = "wp-sf-drawer";
    drawer.innerHTML = ''
      + '<div class="wp-sf-drawer-head">'
      +   '<div class="wp-sf-drawer-title">Mon panier</div>'
      +   '<button class="wp-sf-drawer-close" aria-label="Fermer">'
      +     '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>'
      +   '</button>'
      + '</div>'
      + '<div class="wp-sf-drawer-body" data-drawer-body></div>'
      + '<div class="wp-sf-drawer-foot" data-drawer-foot></div>';
    document.body.appendChild(drawer);
    drawer.querySelector(".wp-sf-drawer-close").addEventListener("click", closeDrawer);
  }

  function openDrawer() { ensureCartUI(); overlay.classList.add("open"); drawer.classList.add("open"); renderDrawer(); }
  function closeDrawer() { if (overlay) overlay.classList.remove("open"); if (drawer) drawer.classList.remove("open"); }

  function updateCartUI() {
    ensureCartUI();
    var n = CART && CART.itemCount ? CART.itemCount : 0;
    cartCount.textContent = String(n);
    if (n > 0) cartCount.removeAttribute("hidden");
    else cartCount.setAttribute("hidden", "");
    if (drawer && drawer.classList.contains("open")) renderDrawer();
  }

  function renderDrawer() {
    if (!drawer || !CART) return;
    var body = drawer.querySelector("[data-drawer-body]");
    var foot = drawer.querySelector("[data-drawer-foot]");
    if (CART.items.length === 0) {
      body.innerHTML = '<div class="wp-sf-empty" style="padding:60px 20px;">Ton panier est vide.</div>';
      foot.innerHTML = "";
      return;
    }
    body.innerHTML = CART.items.map(function (it) {
      return ''
        + '<div class="wp-sf-line">'
        +   (it.image ? '<img class="wp-sf-line-img" src="' + it.image + '" alt="" />' : '<div class="wp-sf-line-img"></div>')
        +   '<div class="wp-sf-line-info">'
        +     '<div class="wp-sf-line-title">' + escapeHtml(it.productTitle) + '</div>'
        +     (it.variantTitle && it.variantTitle !== "Default" ? '<div class="wp-sf-line-variant">' + escapeHtml(it.variantTitle) + '</div>' : '')
        +     '<div class="wp-sf-line-qty">'
        +       '<button class="wp-sf-qty-btn" data-decrease="' + it.id + '">−</button>'
        +       '<span>' + it.quantity + '</span>'
        +       '<button class="wp-sf-qty-btn" data-increase="' + it.id + '">+</button>'
        +       '<button class="wp-sf-line-remove" data-remove="' + it.id + '">Retirer</button>'
        +     '</div>'
        +   '</div>'
        +   '<div class="wp-sf-line-price">' + fmtMoney(it.totalPrice) + '</div>'
        + '</div>';
    }).join("");
    foot.innerHTML = ''
      + '<div class="wp-sf-foot-row"><span>Sous-total</span><strong>' + fmtMoney(CART.subtotal) + '</strong></div>'
      + (CART.shipping > 0 ? '<div class="wp-sf-foot-row"><span>Livraison</span><strong>' + fmtMoney(CART.shipping) + '</strong></div>' : '')
      + (CART.tax > 0 ? '<div class="wp-sf-foot-row"><span>TVA</span><strong>' + fmtMoney(CART.tax) + '</strong></div>' : '')
      + (CART.discount > 0 ? '<div class="wp-sf-foot-row"><span>Remise</span><strong style="color:#10b981;">-' + fmtMoney(CART.discount) + '</strong></div>' : '')
      + '<div class="wp-sf-foot-total"><span>Total</span><strong>' + fmtMoney(CART.total) + '</strong></div>'
      + '<button class="wp-sf-checkout-btn" data-checkout>Procéder au paiement</button>';
  }

  // Event delegation : add-to-cart, qty, remove, checkout
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!(t instanceof Element)) return;
    var addBtn = t.closest("[data-add-to-cart]");
    if (addBtn) {
      var vid = addBtn.getAttribute("data-variant");
      if (vid) { addToCart(vid, 1); }
      return;
    }
    if (t.matches("[data-decrease]")) {
      var id = t.getAttribute("data-decrease");
      var item = CART && CART.items.find(function (x) { return x.id === id; });
      if (item) updateItemQty(id, Math.max(0, item.quantity - 1));
      return;
    }
    if (t.matches("[data-increase]")) {
      var id2 = t.getAttribute("data-increase");
      var item2 = CART && CART.items.find(function (x) { return x.id === id2; });
      if (item2) updateItemQty(id2, item2.quantity + 1);
      return;
    }
    if (t.matches("[data-remove]")) {
      removeItem(t.getAttribute("data-remove"));
      return;
    }
    if (t.matches("[data-checkout]")) {
      alert("Le checkout sera disponible une fois Stripe configuré dans les paramètres de la boutique.");
      return;
    }
  });

  // ────────────────────────────────────────────────────────────────────
  // Bootstrap
  // ────────────────────────────────────────────────────────────────────
  async function bootstrap() {
    // Skip en mode édition (l'éditeur a son propre système)
    if (location.search.indexOf("edit=1") !== -1) return;
    // Active uniquement si au moins une section storefront existe
    if (!document.querySelector("[data-storefront]")) return;
    await loadShopInfo();
    await hydrateGrids();
    ensureCartUI();
    await refreshCart();
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(bootstrap, 100);
  } else {
    window.addEventListener("DOMContentLoaded", function () { setTimeout(bootstrap, 100); });
  }
})();
</script>`;
}
