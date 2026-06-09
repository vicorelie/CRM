---
name: wanapush-payments
description: >
  Architecture de paiement du Shop WanaPush (Stripe + PayPal). À lire pour tout
  travail sur le checkout, les webhooks de paiement, la création de commande, les
  remboursements, ou l'ajout d'un provider. Couvre le helper de commande atomique
  partagé (lib/shop-order.ts), les flux Stripe et PayPal Orders v2, et les règles
  de sécurité paiement (prix server-side, clés chiffrées, $transaction, idempotence).
license: proprietary
version: 1.0
last_reviewed: 2026-06-09
---

# SKILL — WanaPush Paiements (Stripe + PayPal)

> Deux providers branchés sur **une seule logique de création de commande atomique**.
> Ne JAMAIS dupliquer la création d'Order par provider : passer par le helper partagé.

## 🧭 Quand l'invoquer
- Checkout storefront, webhooks `app/api/webhooks/*`, routes `app/api/storefront/[siteSlug]/{checkout,paypal}/*`
- `lib/shop-order.ts`, `lib/stripe-shop.ts`, `lib/paypal-shop.ts`
- Modèles `Order`, `OrderItem`, `Refund`, `StripeEvent`, `Cart`, `Shop`
- Ajout d'un provider de paiement, gestion remboursement/litige

## 🏗️ Architecture

```
lib/shop-order.ts        ← createPaidOrderFromCart() : SOURCE UNIQUE de création de commande
  └─ $transaction { incrément orderNumberSeq, upsert Customer, create Order+Items,
                    Cart→COMPLETED, décrément stock, DiscountUsage, AuditLog }
  └─ post-commit (fire-and-forget) : conversions (Google/LinkedIn/TikTok) + email confirmation

Stripe :
  app/api/storefront/[siteSlug]/checkout/route.ts   ← crée une Checkout Session (hosted)
  app/api/webhooks/stripe/[siteSlug]/route.ts       ← vérifie signature → createPaidOrderFromCart("stripe")
  lib/stripe-shop.ts                                ← stripeForShop() (clé déchiffrée), toMinorUnit()

PayPal (Orders API v2) :
  app/api/storefront/[siteSlug]/paypal/create/route.ts    ← crée l'ordre (montant server-side), renvoie orderID
  app/api/storefront/[siteSlug]/paypal/capture/route.ts   ← capture → createPaidOrderFromCart("paypal")
  lib/paypal-shop.ts   ← creds déchiffrées + mode sandbox/live, getAccessToken, createPayPalOrder, capturePayPalOrder
```

## 🔒 Règles de sécurité paiement (non négociables)
1. **Prix calculé SERVER-SIDE** depuis le panier — jamais depuis le client. (Stripe: line_items serveur ; PayPal: `amount` calculé dans `/paypal/create`.)
2. **Clés chiffrées AES-256-GCM** par boutique (`stripeSecretKey`, `paypalClientId/Secret`, `stripeWebhookSecret`). Déchiffrées uniquement dans `*-shop.ts`.
3. **Création de commande ATOMIQUE** (`$transaction` dans `shop-order.ts`, audit H5) — sinon un échec milieu laisse order sans stock décrémenté, ou seq incrémenté sans order.
4. **Idempotence** : (a) `Cart.status === COMPLETED` re-checké DANS la tx → pas de double commande sur retry/double-capture ; (b) au niveau webhook, dédup sur l'id d'event via **`StripeEvent.eventId @unique`** (Stripe) et **`PayPalEvent.eventId @unique`** (PayPal) → un retry déjà traité est ignoré.
5. **Résolution du panier server-trusted** : PayPal lit le `cartId` depuis le `custom_id` posé au create (pas depuis le body client). Stripe via `session.metadata.cartId` (posé au checkout serveur).
6. **Webhook = raw body avant parse** : Stripe `constructEvent(rawBody, sig, secret)`. PayPal (si ajouté) signe en **RSA-SHA256** sur un CRC32 du **raw body** → ne jamais re-sérialiser le JSON avant vérif.

## 💸 Flux PayPal (Orders v2)
1. Client clique PayPal → `POST /paypal/create` (montant server-side, `custom_id = cartId`) → `orderID`.
2. Le **PayPal JS SDK** (côté site généré) rend les boutons avec cet `orderID` et fait approuver l'acheteur.
3. `POST /paypal/capture { orderID, clickIds }` → `capturePayPalOrder` → si `status === "COMPLETED"` → `createPaidOrderFromCart("paypal")`.
4. `paymentRef` = id de capture PayPal (sert au rapprochement remboursement).

Sandbox vs live : `Shop.paypalMode` ("sandbox"|"live") → base URL `api-m.sandbox.paypal.com` / `api-m.paypal.com`.

## ✅ PayPal — intégration complète (bout en bout)
- ✅ Backend : create + capture (`lib/paypal-shop.ts`, routes `paypal/{create,capture}`), montants server-side, clés chiffrées, commande atomique partagée.
- ✅ Config marchand : `Shop.paypalClientId/Secret/Mode/WebhookId` (settings shop).
- ✅ **UI storefront** : bouton PayPal dans le cart drawer généré (`lib/shop-react-components.ts` → `cartDrawerFile`). Charge le **PayPal JS SDK** via `/paypal/config` (client-id publishable), `createOrder` → `/paypal/create`, `onApprove` → `/paypal/capture`. N'apparaît que si PayPal est configuré (`paypalEnabled`).
- ✅ **Webhook remboursements** : `app/api/webhooks/paypal/[siteSlug]` — vérif **postback** RSA-SHA256 (`verifyPayPalWebhook`, `Shop.paypalWebhookId`), `PAYMENT.CAPTURE.REFUNDED` → `Refund` + statut. Le happy path (capture) crée déjà la commande sans webhook.
- ✅ **Idempotence forte** : table **`PayPalEvent`** (miroir `StripeEvent`) — dédup sur l'id d'event PayPal (`WH-…`), persistant → survit à toute la fenêtre de retry PayPal (≈3j). Un retry déjà traité ressort en 200 sans re-rembourser.
- ⏳ Reste optionnel : litiges `CUSTOMER.DISPUTE.*` au besoin.

> **Règle webhook (best practice 2026)** : vérifier la signature → **dédup sur l'id d'event stable** (table persistante, pas un TTL Redis qui expirerait avant la fin de la fenêtre de retry) → marquer `processed` à la fin → toujours répondre 2xx. PayPal ne garantit ni l'ordre ni l'unicité de livraison : les handlers doivent être idempotents quel que soit l'ordre d'arrivée (s'appuyer sur `create_time`/`update_time` si l'ordre compte).

## ⚠️ Conformité
- PayPal/Stripe gèrent le **PCI-DSS** (on ne touche jamais le numéro de carte). Garder cette frontière (pas de champ carte custom).
- RGPD : email/nom client stockés sur l'Order = base légale "exécution du contrat". Pas de consentement marketing implicite (cf. `SKILL_wanapush_compliance_2026.md`).
- Conversions server-side (Google/LinkedIn/TikTok) déclenchées post-commande → respecter le Consent Mode (cf. compliance).

## Sources
- [PayPal Orders API v2](https://developer.paypal.com/docs/api/orders/v2/) · [PayPal Webhooks (verify signature)](https://developer.paypal.com/api/rest/webhooks/rest/)
