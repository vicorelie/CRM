---
name: wanapush-capi-module
description: >
  Utilise cette skill pour tout travail sur le module CAPI + Meta Pixel de WanaPush :
  tracking serveur Meta Conversions API, injection du Pixel JS dans les sites
  générés, dédup event_id, hashage SHA-256 des PII, RGPD opt-out, retention GDPR.
  Déclencher quand l'utilisateur travaille sur lib/capi/*, app/api/capi/*,
  app/(dashboard)/generated-sites/[id]/pixel/*, ou les modèles Prisma SitePixel
  et CapiEvent.
license: proprietary
version: 1.0
last_reviewed: 2026-06-04
---

# SKILL — WanaPush CAPI + Meta Pixel Module

> Tracking double Pixel + Conversions API pour les sites WanaPush. Production-ready,
> 60+ tests unitaires, encryption AES-256-GCM des tokens, RGPD compliant.

## 🧭 Quand l'invoquer

Cette skill est pertinente quand on travaille sur :
- `lib/capi/{client,enrich,hash,pixel-script,rate-limit,types,fetch-pixels}.ts`
- `lib/capi/__tests__/*.test.ts` (60+ tests à ne pas casser)
- `app/api/capi/[slug]/{event,opt-out}/route.ts` + `app/api/capi/cron/retention/route.ts`
- `app/api/sites/[id]/pixel/route.ts` (CRUD config)
- `app/(dashboard)/generated-sites/[id]/pixel/{page,PixelConfigClient}.tsx`
- Modèles Prisma `SitePixel`, `CapiEvent`
- Injection du Pixel dans le HTML des sites générés (cf `pixel-script.ts`)

## 🏗️ Architecture du module

```
lib/capi/
  types.ts (206 l)         ← STANDARD_EVENTS (17), ServerEvent, CapiPayload,
                              UserDataInput (raw) vs UserDataHashed
  client.ts (255 l)        ← HTTP client Meta CAPI : retry 3 fois (1s/2s/4s + jitter
                              ±25 %), catégorise les erreurs (auth/validation/
                              rate_limit/transient)
  enrich.ts (136 l)        ← Extrait IP (X-Forwarded-For > X-Real-IP > CF-Connecting-IP,
                              filtre les IPs privées), UA, cookies _fbp/_fbc,
                              construit fbc depuis fbclid en URL
  hash.ts (138 l)          ← SHA-256 spec Meta : email/phone/name/city/state/zip/
                              country/dob/gender (lowercase + trim, phone strip
                              non-digits). Champs RAW (client_ip, client_ua,
                              fbp, fbc) passthrough.
  pixel-script.ts (264 l)  ← Génère le snippet HTML + JS injecté dans les sites :
                              Meta Pixel base + window.wpTrack bridge + RGPD
                              consent banner + opt-out cookies. XSS guards :
                              assertSafeSlug, assertSafePixelId, jsString.
  rate-limit.ts (99 l)     ← Sliding window in-memory : 100/min/slug + 50/min/(slug,ip).
                              GC périodique par cron retention.
  fetch-pixels.ts (72 l)   ← GET /{adAccountId}/adspixels via Graph API
                              (helper pour le dropdown UI)

app/api/capi/
  [slug]/event/route.ts (269 l)     ← POST public ingestion (CORS *)
  [slug]/opt-out/route.ts (76 l)    ← GET/POST cookie wp-no-track
  cron/retention/route.ts (76 l)    ← purge GDPR (SENT 90j, FAILED/RETRIED 365j)

app/api/sites/[id]/pixel/route.ts   ← CRUD SitePixel (GET/PUT/DELETE)

app/(dashboard)/generated-sites/[id]/pixel/
  page.tsx (98 l)              ← Server Component : charge site + sitePixel
                                   + adAccounts du user
  PixelConfigClient.tsx (395 l) ← formulaire : adAccount → fetch pixels → pixelId,
                                   capiAccessToken (password, jamais pré-rempli),
                                   testEventCode, enabled, events checklist (9),
                                   consentRequired
```

## 🗄️ Modèles Prisma

### `SitePixel` (1:1 avec GeneratedSite)
```prisma
model SitePixel {
  id                String   @id @default(cuid())
  generatedSiteId   String   @unique
  generatedSite     GeneratedSite @relation(...)
  adAccountId       String
  adAccount         AdAccount @relation(...)
  pixelId           String   // numérique 6-30 chars
  pixelName         String?
  capiAccessToken   String   @db.Text  // ⚠️ AES-256-GCM via lib/crypto
  testEventCode     String?  // regex /^TEST\d+$/
  enabled           Boolean  @default(true)
  events            Json     // STANDARD_EVENTS activés
  consentRequired   Boolean  @default(false)  // gate RGPD
  lastEventAt       DateTime?
  lastErrorAt       DateTime?
  lastError         String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  @@index([adAccountId])
  @@index([enabled, lastEventAt])
}
```

### `CapiEvent` (audit log, N:1 SitePixel, cascade delete)
```prisma
model CapiEvent {
  id              String   @id @default(cuid())
  sitePixelId     String
  sitePixel       SitePixel @relation(..., onDelete: Cascade)
  eventName       String   // "PageView", "Lead", "Purchase", ...
  eventId         String   // shared avec Pixel JS pour dédup
  eventTime       DateTime
  eventSourceUrl  String?  @db.Text
  userDataHashed  Json     // ⚠️ JAMAIS de PII raw — uniquement SHA256
  customData      Json
  status          EventStatus  // SENT | FAILED | RETRIED
  metaResponse    Json?    // { events_received, fbtrace_id, messages, attempts }
  errorMessage    String?  @db.Text
  createdAt       DateTime @default(now())
  @@index([sitePixelId, createdAt])
  @@index([eventName, createdAt])
  @@index([status, createdAt])
}
```

## 🔁 Flow end-to-end d'un événement

1. **Browser charge le site généré** → `pixel-script.ts` injecté dans le HTML.
2. **Pixel JS init** : `fbq('init', '<pixelId>')` + définit `window.wpTrack(name, data)`.
3. **Trigger** (auto PageView au load, ou wpTrack manuel sur Lead/Purchase) :
   - Génère `event_id` (UUID v4)
   - `fbq('track', name, customData, { eventID })` ← côté client (cookie 3rd-party)
   - `POST /api/capi/<slug>/event` avec `ClientEventInput` ← côté serveur
4. **`/api/capi/[slug]/event`** :
   - Check opt-out (`wp-no-track` cookie) → `204` silencieux
   - `checkRateLimit(slug, ip)` → `429` si dépassé
   - Zod parse body
   - Lookup `SitePixel` enabled + event dans la whitelist
   - `enrichUserData(req, body.user_data)` : ajoute IP/UA/fbp/fbc, construit fbc
   - `hashUserData(...)` : SHA256 tous les PII selon spec Meta
   - `decrypt(sitePixel.capiAccessToken)` puis `sendEvents()` avec retry
   - `prisma.capiEvent.create({ data: { userDataHashed, ..., status } })`
   - Update `lastEventAt` / `lastError`
   - Toujours `204` (opaque au client → pas de signal de blocage)
5. **Meta dédup** : même `event_id` côté Pixel + CAPI = 1 seule conversion comptée
   (avec amélioration du Match Quality Score grâce au serveur).

## 📋 STANDARD_EVENTS (17)

PageView, ViewContent, Lead, CompleteRegistration, AddToCart, InitiateCheckout,
AddPaymentInfo, Purchase, Subscribe, StartTrial, Schedule, Contact, Donate,
FindLocation, Search, CustomizeProduct, AddToWishlist.

→ Liste exhaustive dans `lib/capi/types.ts` (`STANDARD_EVENTS`). 9 sont activables
par défaut dans le formulaire UI.

## 🔒 Sécurité + RGPD

| Mécanisme | Implémentation |
|---|---|
| **Token CAPI** | `lib/crypto.ts` AES-256-GCM avant `prisma.sitePixel.create/update` |
| **PII raw** | JAMAIS en BDD : `userDataHashed` est strictement SHA256 |
| **Opt-out** | Cookie `wp-no-track=1` (1 an, SameSite=Lax, path=/) bloque pixel JS + CAPI server |
| **Consent banner** | Auto-injecté si `consentRequired=true`. Cookies : `wp-consent=1` ou `wp-no-track=1` |
| **Retention** | Cron `app/api/capi/cron/retention/route.ts` : SENT 90j, FAILED/RETRIED 365j (protégé par `CRON_SECRET`) |
| **CORS** | `Access-Control-Allow-Origin: *` (cohérent avec un endpoint public mirror Pixel JS). Rate-limit comme protection DoS. |
| **Match Quality Score** | Cibler ≥7/10 dans Meta Events Manager. Enrichissement IP + UA + fbp + fbc essentiel. |

## 🧪 Tests (`lib/capi/__tests__/`, 7 fichiers, 923 lignes)

- `rate-limit.test.ts` : per-slug + per-(slug,ip) + window expiry + GC
- `client.test.ts` : retry backoff, parsing erreurs Meta (auth/validation/
  rate-limit/transient), test event code, partner_agent
- `hash.test.ts` : 40+ tests, normalizers email/phone/name/city/etc., arrays,
  RAW fields passthrough
- `enrich.test.ts` : 20+ tests, IP extraction (filtre IPs privées), fbclid → fbc,
  cookie parsing
- `pixel-script.test.ts` : snippet generation, replace si présent, XSS guards

⚠️ **120/120 tests doivent passer** (cf `npm test`). C'est le seul module avec
une couverture sérieuse — ne pas casser.

## 📚 Docs liées

- `_docs/CAPI-QA-PROCEDURE.md` (114 l) : checklist QA E2E manuelle Sprint 1
  (génération token Meta → config form → trigger event → vérif Events Manager
  → check DB → opt-out → consent banner).

## ✅ TL;DR pour Claude

Quand l'user travaille sur CAPI :
1. **Token = encrypted**. JAMAIS log/expose `capiAccessToken` brut. La route
   `GET /api/sites/[id]/pixel` l'OMet volontairement.
2. **PII = hashed**. Avant tout `prisma.capiEvent.create`, passer par
   `hashUserData()`. Audit logs n'ont JAMAIS de PII clair.
3. **`event_id` partagé** entre Pixel JS et CAPI server est CRITIQUE pour la
   dédup Meta. Toujours générer côté client une fois (UUID v4) et le passer
   aux deux canaux.
4. **`wp-no-track` cookie** = kill switch. Vérifié AVANT le rate-limit dans
   `/api/capi/[slug]/event`. Retourne 204 silencieux.
5. **Rate-limit in-memory** : suffit MVP. Migrer vers Upstash si scale horizontal.
6. **Retry 3 fois sur transient only** (5xx + connect errors). PAS de retry sur
   `auth` (token expiré → marquer SitePixel comme erreur) ni `validation`
   (payload broken → fix code, pas retry).
7. **Tests = filet de sécurité**. Toute modif sur `client.ts`, `hash.ts`,
   `enrich.ts`, `pixel-script.ts` → `npm test` AVANT de commit.
8. **Match Quality Score** se vérifie dans Meta Events Manager. Cible ≥7/10.
   Si <5, vérifier que fbp/fbc/IP/UA sont bien envoyés (check `enrich.ts`).
9. **`consentRequired=true`** = banner injecté + tracking bloqué tant qu'aucun
   choix. Pour la France, juridiquement requis.
10. **`testEventCode`** : pour debug Meta Events Manager → Tests Events. Format
    `TEST12345`. Permet de voir les events sans polluer les vrais conversions.

## 📅 Maintenance & évolutions

- **Conversions API spec** : à revoir tous les 6 mois (Meta publie des updates
  trimestriels).
- **Match Quality Score** : monitorer trimestriellement par client.
- **Rate-limit Redis** : migrer quand on a plus de 1 instance Next.
- **Retention GDPR** : la durée 90j/365j peut être tunée si requirements client
  changent (avocat à consulter pour B2B vs B2C).
- **Server-side Pixel JS** : Meta pousse vers Conversions API Gateway (proxy
  Cloud) — à envisager si on a un client gros volume.
