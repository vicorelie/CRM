---
name: wanapush-shop-module
description: >
  Utilise cette skill pour tout travail sur le module Shop e-commerce de
  WanaPush (Shopify-like custom) : modèles produits/variants/inventaire, cart
  + checkout, Stripe Connect (clés par boutique chiffrées AES-256-GCM),
  webhooks Stripe (signature + idempotency), magic-link customer auth,
  storefront public, abandoned cart recovery, discount/tax/shipping zones,
  refunds + fulfillments. Déclencher quand l'utilisateur travaille sur
  lib/shop*.ts, lib/stripe*.ts, lib/customer-auth.ts, app/api/shop/*,
  app/api/storefront/*, app/api/webhooks/stripe/*, app/(dashboard)/shop/*,
  ou demande conseil sur l'architecture commerce, Stripe Connect, magic-link,
  ou cart abandonment 2026.
license: proprietary
version: 1.0
last_reviewed: 2026-06-03
---

# SKILL — WanaPush Shop Module

> Module **e-commerce complet** style Shopify, custom (pas headless Shopify
> backend). 30+ tables Prisma, Stripe Connect par boutique, storefront public
> avec magic-link customer auth, paniers + commandes + refunds + expéditions
> + taxes + codes promo + avis + abandoned cart recovery.

## 🧭 Quand l'invoquer

- Modif `lib/shop.ts`, `lib/shop-email.ts`, `lib/shop-react-components.ts`
- Modif `lib/stripe-shop.ts`, `lib/stripe.ts`, `lib/customer-auth.ts`
- Routes `app/api/shop/*` (admin) ou `app/api/storefront/*` (public)
- Webhooks `app/api/webhooks/stripe/[siteSlug]/route.ts`
- UI `app/(dashboard)/shop/*` (admin du shop)
- Modèles Prisma e-commerce (cf liste ci-dessous)
- Question sur Stripe Connect, magic-link, abandoned cart, product variants

## 🏗️ Architecture du module

```
lib/
  shop.ts                       ← getShopForUser, ensureShopForSite,
                                  helpers ownership (scope par siteSlug)
  shop-email.ts                 ← emails transactionnels (order confirmation,
                                  shipped, refund, magic-link)
  shop-react-components.ts      ← composants storefront injectés dans les
                                  sites générés (ProductCard, Cart, Checkout)
  stripe.ts                     ← client Stripe global (clé .env, pour
                                  webhooks plateforme niveau WanaPush)
  stripe-shop.ts                ← stripeForShop(shop) : client Stripe avec
                                  clé secrète CHIFFRÉE par boutique
                                  webhookSecretForShop(shop) : déchiffre webhook secret
  customer-auth.ts              ← magic-link customer auth (HMAC-SHA256,
                                  cookie HTTP-only, séparé de NextAuth admin)

app/api/shop/                   ← Admin (auth NextAuth requise)
  route.ts                      ← liste / créer un Shop
  [siteSlug]/
    products / categories / collections / customers / orders / discounts /
    options / reviews / shipping/zones / shipping/zones/[id]/methods /
    taxes / analytics

app/api/storefront/[siteSlug]/  ← Public (auth magic-link customer optionnelle)
  products / products/[slug] / products/[slug]/reviews
  categories
  cart / cart/items/[id] / cart/discount
  checkout                      ← crée Stripe Checkout Session
  customer/login / customer/verify / customer/me / customer/logout
  sitemap

app/api/webhooks/stripe/[siteSlug]/route.ts
                                ← reçoit checkout.completed, refund,
                                  payment_failed → mute Order + envoie emails

app/(dashboard)/shop/[siteSlug]/  ← UI admin
  products / categories / orders / customers / reviews / discounts /
  shipping / taxes / options / analytics
```

## 🗄️ Modèles Prisma (30+ tables)

### Core
- **`Shop`** : 1 par `siteSlug`. Contient clés Stripe chiffrées (`stripeSecretKey`, `stripeWebhookSecret`), currency, devise par défaut.
- **`Product`** : produit principal (titre, slug, description). Lié à variants/images/options/categories.
- **`ProductImage`** : URL + alt + ordre.
- **`ProductOption`** : ex "Taille", "Couleur" — non-éditable après création des variants.
- **`ProductOptionValue`** : ex "S", "M", "L" pour l'option "Taille".
- **`ProductVariant`** : SKU + prix + stock + barcode. Une combinaison unique d'options.
- **`ProductVariantOptionValue`** : table de jointure many-to-many (variant ↔ option value).
- **`ShopOption`** : settings globaux par boutique (clé/valeur).

### Taxonomie
- **`Category`** + **`ProductCategory`** : taxonomie hiérarchique.
- **`Collection`** (MANUAL / SMART) + **`ProductCollection`** : groupements marketing.
- **`ProductTag`** : tags libres.
- **`ProductUpsell`** : suggestions cross-sell.

### Stock
- **`StockLocation`** : entrepôt physique ou virtuel.
- **`StockLevel`** : quantité par variant × location.

### Clients
- **`Customer`** : email, nom, téléphone. Scope au Shop.
- **`Address`** : shipping + billing.
- **`WishlistItem`** : favoris.

### Panier
- **`Cart`** : statut `ACTIVE | ABANDONED | COMPLETED | EXPIRED`.
- **`CartItem`** : variant + quantité + prix snapshot.

### Commandes
- **`Order`** : orderNumber + status + financialStatus (`PENDING | AUTHORIZED | PAID | PARTIALLY_REFUNDED | REFUNDED | FAILED`) + fulfillmentStatus (`UNFULFILLED | PARTIAL | FULFILLED`).
- **`OrderItem`** : **snapshot** du productTitle / variant / prix au moment de la commande (immutable même si le produit change après).

### Logistique
- **`Refund`** : amount + reason + status.
- **`Fulfillment`** : trackingNumber + carrier.
- **`ShippingZone`** : `countries` JSON ISO codes.
- **`ShippingMethod`** (`FLAT | WEIGHT_BASED | PRICE_BASED | FREE | PICKUP`).
- **`TaxRate`** : par zone × type produit.

### Promotion
- **`Discount`** (`PERCENTAGE | FIXED_AMOUNT | FREE_SHIPPING | BUY_X_GET_Y`).
- **`DiscountUsage`** : audit par customer/order.

### Social proof
- **`Review`** : status `PENDING | APPROVED | REJECTED`.

### Tech
- **`StripeEvent`** : log des webhooks pour **idempotency** (cf section Stripe).
- **`AuditLog`** : log général d'actions admin.

## 🔄 Flow type d'une commande

```
1. Storefront : user ajoute à son panier
     POST /api/storefront/<slug>/cart/items
     → crée Cart (status: ACTIVE) si n'existe pas, CartItem snapshot prix

2. User entre un code promo (optionnel)
     POST /api/storefront/<slug>/cart/discount
     → validation : Discount actif + expiry + maxUses + customer eligibility
     → snapshot dans Cart.discountId

3. Checkout
     POST /api/storefront/<slug>/checkout
     → re-calcul TOTAL côté serveur (prix variant + shipping + tax - discount)
     → création Stripe Checkout Session via stripeForShop(shop)
     → metadata: { cartId, shopId, siteSlug }
     → return session.url → redirect

4. Stripe Checkout (hosted)
     → user paie
     → succès : redirection vers /success-url
     → Stripe envoie webhook checkout.session.completed

5. Webhook /api/webhooks/stripe/<siteSlug>
     → verify signature avec webhookSecretForShop(shop)
     → check StripeEvent : si event.id déjà traité → return 200 (idempotency)
     → crée Order (financialStatus: PAID, fulfillmentStatus: UNFULFILLED)
     → copie CartItems → OrderItems (snapshot)
     → mute StockLevel (decrement)
     → mute Cart.status = COMPLETED
     → log StripeEvent.id
     → trigger shop-email : order confirmation

6. Admin : créer un Fulfillment
     POST /api/shop/<slug>/orders/<orderId>/fulfill
     → mute Order.fulfillmentStatus
     → trigger shop-email : shipped + trackingNumber

7. Optionnel : Refund
     POST /api/shop/<slug>/orders/<orderId>/refund
     → stripe.refunds.create(...)
     → mute Order.financialStatus
     → trigger shop-email : refund
```

## 💳 Stripe Connect 2026 — Best practices

### Choix du type de compte (verified juin 2026)

**Express recommandé pour 99% des marketplaces** — c'est ce que WanaPush utilise.

| Type | Quand | WanaPush |
|---|---|---|
| **Standard** | Sellers veulent contrôle total Stripe | ❌ |
| **Express** | Onboarding rapide hosté Stripe, dashboard léger | ✅ |
| **Custom** | UI 100% custom, full responsabilité PCI | ❌ |

### 🆕 Accounts v2 (déc 2025)

Stripe a livré **Accounts v2** en décembre 2025. Pour les **nouvelles**
intégrations en 2026, recommandation officielle = **Accounts v2** :
- Au lieu de locker un compte à 1 type, on attache des **configurations**
  (merchant, customer, recipient)
- Un Account peut avoir plusieurs configurations à la fois
- API : `accounts.v2.create()`

⚠️ WanaPush actuel est probablement sur **v1 (legacy)**. À migrer pour les
nouvelles boutiques. Anciennes boutiques continuent à fonctionner.

### Destination charges + application fees

```ts
// Pattern WanaPush : la boutique a sa propre clé Stripe (chiffrée),
// donc on n'utilise PAS de destination charges classiques.
//
// Chaque Shop = un compte Stripe à elle SEPARE, géré par le user.
// WanaPush ne prend pas de cut côté Stripe (peut être facturé via SaaS sub).
//
// Si on veut adopter Stripe Connect Express (deferred onboarding) :
//   1. accounts.create({ type: "express", country: "FR" })
//   2. accountLinks.create() pour onboarding URL
//   3. Tous les charges : { transfer_data: { destination: connectedAccountId },
//                           application_fee_amount: 100 } // 1€ pour WanaPush
```

### Pricing Stripe 2026 (verified avril-juin 2026)

- **US cards** : 2.9% + 30¢ par charge réussie
- **Connect Express payout** : 0.25% + $0.25 par payout
- **EU cards** : 1.5% + 25c (standard SEPA)
- **3D Secure** : auto-déclenché selon le risque

## 🔐 Webhooks Stripe — Sécurité critique

### 1. Raw body OBLIGATOIRE

```ts
// ❌ ANTI-PATTERN : si Express ou Next.js parse le body avant la verif,
//    la signature échoue à chaque fois
const body = await req.json(); // ← détruit le raw body

// ✅ PATTERN Next.js 14 App Router
export async function POST(req: Request) {
  const rawBody = await req.text();  // raw body intact
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "no sig" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "invalid sig" }, { status: 400 });
  }
  // ...
}
```

### 2. Idempotency via `event.id`

Stripe **peut renvoyer le même webhook plusieurs fois** (retry après timeout,
network glitch, etc.). Sans idempotency → double commande, double refund.

**Pattern WanaPush** (table `StripeEvent`) :

```ts
// Au début du handler, avant toute mutation :
const existing = await prisma.stripeEvent.findUnique({
  where: { id: event.id },
});
if (existing) return NextResponse.json({ ok: true, idempotent: true });

// ... traitement de l'event ...

// À la fin, marquer comme traité :
await prisma.stripeEvent.create({
  data: { id: event.id, type: event.type, processedAt: new Date() },
});
```

### 3. Events à gérer minimum

- `checkout.session.completed` → crée Order, mute Cart, décrément stock
- `payment_intent.payment_failed` → mute Cart, log, email retry possible
- `charge.refunded` → mute Order.financialStatus
- `account.updated` (Connect) → mute Shop.stripeAccountStatus
- `customer.subscription.*` (si SaaS sub WanaPush)

## ✉️ Magic-link customer auth — Patterns 2026

WanaPush utilise un système **séparé de NextAuth** (qui gère les Users
WanaPush admin). Les customers d'une boutique ont leur propre flow.

### Implémentation (lib/customer-auth.ts)

- **Token format** : `HMAC-SHA256({ customerId, shopId, exp }, NEXTAUTH_SECRET)`
- **Storage** : cookie HTTP-only `customer_token`
- **TTL** : 30 minutes (le memory dit "magic-link 30 min")
- **Renewal** : à chaque visite authentifiée, on peut re-générer si exp < 5 min

### Best practices 2026 (verified juin 2026)

- **Expiration 10-15 min** sur le lien magic (pas 30 min — réduire à 10-15)
- **Single-use** : invalider le token dès qu'il sert
- **Patterns d'usage typiques** : 67% des users cliquent <5 min, 89% <15 min,
  94% <1h → 15 min suffit largement
- **Higher sensitivity = stronger auth** : admin = passkey/cryptographic.
  Customer storefront = magic-link OK (low risk).

### Anti-patterns à bannir

- ❌ Token dans l'URL passé en GET (visible dans logs, referrer, history)
  → préférer POST + token en body, ou redirect immédiat avec consume
- ❌ Token réutilisable plusieurs fois
- ❌ Pas d'expiration server-side (juste un check côté client)

## 🛒 Abandoned Cart Recovery 2026

**Globalement 75,38% des paniers sont abandonnés** — la récup est un levier
de revenu massif.

### Stratégie séquence 2026 (verified juin 2026)

| Moment | Canal | Performance |
|---|---|---|
| **T+15 min** | **SMS** | 98% open rate, 15-20% conv |
| T+1h | Email 1 | 50% open rate (avg), 10,7% conv (top : 65% open) |
| T+24h | Email 2 (avec social proof) | dégradé |
| T+48-72h | Email 3 (offre limitée) | last resort |

### Best practices contenu

- ✅ **Images dynamiques des produits abandonnés** dans l'email
- ✅ **Star ratings + review snippets** dans l'email
- ✅ **Recently browsed alternatives** (cross-sell)
- ❌ **Pas d'offre de discount d'office** (forme les users à attendre l'abandon)

### Implémentation WanaPush — TODO

État actuel : `Cart.status = ABANDONED` existe dans le schéma mais probablement
**pas de cron** qui le set + envoie les emails. À implémenter :

```ts
// /api/shop/cron/abandoned-carts
// Cron toutes les 15 min :
// 1. UPDATE Cart WHERE updatedAt < NOW - 15min AND status = ACTIVE
//    SET status = ABANDONED
// 2. Pour chaque cart abandonné neuf : trigger email/SMS séquence
```

## 📦 Product Variants — Pattern WanaPush

Pattern Shopify-like avec **3 tables** au lieu d'une seule :

```
Product ─┬─< ProductOption (Taille, Couleur)
         │      └─< ProductOptionValue (S, M, L / Rouge, Bleu)
         │
         └─< ProductVariant (SKU, prix, stock)
              └─< ProductVariantOptionValue (join : variant × option value)
```

**Pourquoi cette complexité** :
- Permet N options avec M valeurs chacune → variants = produit cartésien
- Snapshot des combinaisons (T-shirt S Rouge = un SKU stable)
- Stock par variant indépendant
- Prix peuvent varier par combinaison (T-shirt L coûte +2€)

**Gotcha** : ProductOption non-éditable après création des variants (sinon
les combinaisons cassent). Pour ajouter une option, recréer le produit.

## ⚠️ Gotchas connus

- **Raw body Stripe webhook** : Next.js 14 App Router → `req.text()`,
  PAS `req.json()`. Sinon signature verify fail.
- **Idempotency StripeEvent** : indispensable, Stripe retry plusieurs fois.
- **Currency par Shop** : ne pas faire d'arithmétique cross-shop. Chaque shop
  a sa devise dans `Shop.currency`.
- **Order.items = snapshot** : ne JAMAIS rejoindre `OrderItem.product` pour
  afficher le titre. Toujours utiliser `OrderItem.productTitle` (le snapshot
  immutable du moment de la commande).
- **Per-shop Stripe keys** : `stripeForShop(shop)` peut renvoyer `null` si
  le shop n'a pas configuré ses clés. **Toujours** check.
- **Magic-link cookie** : `httpOnly: true, sameSite: "lax", secure: true`
  en prod. Voir `lib/customer-auth.ts`.
- **Stock racing** : 2 customers ajoutent le dernier item au même moment.
  Au checkout, re-vérifier `StockLevel` dans une `$transaction` avant
  créer l'Order.
- **Tax / Shipping** : recalculer SERVEUR au checkout, jamais trust client.
- **Devise Stripe** : `Math.round(amount * 100)` pour passer en cents.
  ⚠️ pas tous les currencies sont en cents (JPY = pas de décimales).

## ✅ TL;DR pour Claude

1. **Tout est scopé par `Shop`** (1 par siteSlug). Toujours vérifier
   ownership via `getShopForUser(email, siteSlug)`.
2. **Stripe per-shop** : `stripeForShop(shop)` — clés chiffrées AES-256-GCM.
3. **Webhook Stripe** : `req.text()` (raw body) + signature verify +
   idempotency via `StripeEvent.id`.
4. **OrderItem = snapshot** immutable, ne pas rejoindre Product.
5. **Magic-link customer** : séparé de NextAuth, HTTP-only cookie, 15 min TTL.
6. **Abandoned cart** : SMS 15 min + email séquence (à implémenter via cron).
7. **Stock** : décrement dans `$transaction` au checkout, pas avant.
8. **Tax + Shipping + Discount** : recalcul SERVEUR systématique.
9. **Accounts v2 Stripe Connect** (déc 2025) : préférer pour nouvelles
   boutiques. Anciennes en v1 = OK pour l'instant.
10. **Per-currency** : pas tous en cents (JPY, etc.), check `Stripe.zeroDecimalCurrencies`.

## 📅 Maintenance & sources

**Données vérifiées juin 2026** :
- Stripe Connect : docs.stripe.com/connect, GreenMoov, Vipra Sol, FeeTrace,
  Hooklistener (Express + Accounts v2 + Connect fees 2026)
- Webhooks security : docs.stripe.com/webhooks, Hooklistener, HookRay,
  Dev Community (raw body + signature + idempotency 2026)
- Cart abandonment : BigCommerce, VWO, Foursixty, Top Growth Marketing
  (SMS 98% open, séquence 2026)
- Magic-link : SuperTokens, Engagelab, FusionAuth, Pangea, Razoyo
  (TTL 10-15min, single-use, sensitivity-based auth 2026)
- Code WanaPush : exploration directe lib/shop.ts, lib/stripe-shop.ts,
  lib/customer-auth.ts, prisma/schema.prisma (30+ models)

**Last verified : 2026-06-03**. À re-vérifier en septembre 2026
(post Stripe Sessions + nouvelles features Connect).

**Skills associés** :
- [`SKILL_wanapush_site_generator.md`](./SKILL_wanapush_site_generator.md) —
  hébergement storefront sur wanapush.com/preview/<slug>/
- [`SKILL_wanapush_stack_best_practices.md`](./SKILL_wanapush_stack_best_practices.md) —
  Prisma `select`, `$transaction`, Zod validation, Server Actions
- [`SKILL_wanapush_seo_module.md`](./SKILL_wanapush_seo_module.md) —
  optimization pages produits (LCP, INP, Schema.org Product/Review)
- [`SKILL_digital_marketing_wanapush.md`](./SKILL_digital_marketing_wanapush.md) —
  email marketing transactionnel (Resend), abandoned cart copywriting
