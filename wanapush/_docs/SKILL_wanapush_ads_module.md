---
name: wanapush-ads-module
description: >
  Utilise cette skill pour tout travail sur le module Ads de WanaPush :
  campagnes Meta Ads (push E2E Advantage+), Google Ads (Search + Performance Max,
  API v24), TikTok Ads, LinkedIn Ads, PushModal unifié, auto-config IA,
  destination intelligente (site WanaPush → Pixel auto vs externe), sync KPIs,
  audiences, ROAS optimizer. Déclencher quand on travaille sur lib/ads/*,
  app/(dashboard)/ads/*, app/api/ads/*, ou les modèles Prisma AdAccount/Campaign/
  AdMetrics/AdAudience.
license: proprietary
version: 1.0
last_reviewed: 2026-06-06
---

# SKILL — WanaPush Ads Module

> Module Ads : connecteurs pub pour Meta, Google, TikTok, LinkedIn.
> Meta Ads v25 = push E2E production + Creative Fatigue. Google Ads v24 = push Search + Pmax (negative kw PMax inclus). TikTok v1.3 = push + sync + Events API serveur. LinkedIn v202605 = push + sync.

## 🧭 Quand l'invoquer

- `lib/ads/{meta,google,tiktok,linkedin,index,sync,types}.ts`
- `app/(dashboard)/ads/*` (AdsClient, CampaignBuilder, GoogleAdsBuilder, CampaignsList, PushModal, RoasOptimizer, AudiencesTab, AccountsTab)
- `app/api/ads/{accounts,campaigns,audiences,sync,generate-copy,generate-image,optimize,auto-config,destination-options,verify-pixel,meta/*,oauth,cron}/*`
- Modèles Prisma `AdAccount`, `Campaign`, `AdMetrics`, `AdAudience`
- Toute feature touchant à la création / sync / push de campagne payante

## 🏗️ Architecture du module

```
lib/ads/
  types.ts (269 l)     ← AdsConnector interface, AdAccountInfo, CampaignSync,
                          AdPushInput (champs communs + extensions par plateforme),
                          PushResult, MetricsResult
  index.ts (140 l)     ← getConnector(platform), ensureFreshAdAccount(),
                          ADS_PLATFORMS (meta_ads, google_ads, tiktok_ads,
                          linkedin_ads)
  meta.ts (844 l)      ← Meta Marketing API v22 (GRAPH_V22). Push E2E,
                          Advantage+ Audience, Advantage+ Creative,
                          CBO daily_budget, mapObjective (v17 Outcomes), retry
                          sans Advantage+ si erreur #1885543
  google.ts (1108 l)   ← Google Ads API v24 (GOOGLE_ADS_API). Search + PMAX,
                          Conversion Tracking, negative keywords, batch mutate
  tiktok.ts (~390 l)       ← TikTok Ads API v1.3. Push (Campaign→AdGroup→Ad) + sync + metrics.
                              SINGLE_IMAGE. resolveLocationIds() via /tool/region/. billingEvent
                              per objective (CPC/OCPM/CPM). Nécessite Standard API Approval en prod.
  tiktok-events.ts (~210 l) ← TikTok Events API (CAPI côté serveur). trackTikTokEvent(),
                              batchTrackTikTokEvents(). Hash SHA-256 PII. Dédup sur event_id.
  linkedin.ts (560 l)       ← LinkedIn Marketing API v202605. Push + sync.
  sync.ts (133 l)            ← syncAdAccount(accountId) : refresh + listCampaigns +
                          upsert Campaign + fetchMetrics + upsert AdMetrics

app/(dashboard)/ads/
  AdsClient.tsx (46 l)         ← shell avec 5 onglets
  AccountsTab.tsx              ← connexion OAuth + liste comptes
  CampaignBuilder.tsx (512 l)  ← Builder Meta Ads (brief → copy IA → push)
  GoogleAdsBuilder.tsx (640 l) ← Builder Google Ads (Search + Pmax + conversions)
  CampaignsList.tsx (1173 l)   ← tableau campagnes + métriques + duplication
  AudiencesTab.tsx             ← bibliothèque audiences réutilisables
  RoasOptimizer.tsx            ← suggestions optimisation basées sur AdMetrics
  _components/
    PushModal.tsx (1478 l)     ← MODAL PUSH UNIFIÉE (cf. section dédiée)
    types.ts / utils.ts        ← types partagés PushModal + helpers formatMoney
    geo-search/                ← composant autocomplete villes (Geonames API)
    pixels/                    ← liste pixels disponibles depuis un AdAccount

app/api/ads/
  oauth/[platform]/{start,callback}/   ← flow OAuth 4 plateformes (state HMAC ADS_)
  accounts/route.ts                    ← GET liste + DELETE
  campaigns/route.ts                   ← GET liste + POST création
  campaigns/[id]/route.ts              ← GET + PUT + DELETE
  campaigns/[id]/push/route.ts         ← POST push vers plateforme
  audiences/route.ts                   ← CRUD AdAudience
  sync/route.ts                        ← POST sync manuel (1 compte)
  cron/route.ts                        ← GET cron sync toutes les 30 min
  generate-copy/route.ts               ← POST IA copywriting (3 variantes A/B/C)
  generate-image/route.ts              ← POST IA visuels (Ideogram/Midjourney/Nano)
  auto-config/route.ts                 ← POST IA propose config optimale Meta
  optimize/route.ts                    ← POST suggestions ROAS optimizer
  destination-options/route.ts         ← GET sites WanaPush + pixels dispo
  verify-pixel/route.ts                ← POST vérifie qu'un URL a le Pixel installé
  meta/pixels/route.ts                 ← GET pixels dispo depuis un AdAccount Meta
  meta/geo-search/route.ts             ← GET recherche géographique (Geonames)
```

## 🗄️ Modèles Prisma

```prisma
model AdAccount {
  id            String   @id @default(cuid())
  userId        String
  platform      String   // "meta_ads" | "google_ads" | "tiktok_ads" | "linkedin_ads"
  accountId     String   // ID externe plateforme
  name          String
  currency      String   @default("EUR")
  accessToken   String   @db.Text   // ⚠️ AES-256-GCM via lib/crypto
  refreshToken  String?  @db.Text   // ⚠️ AES-256-GCM
  tokenExpiresAt DateTime?
  meta          Json?    // { pageId?, instagramActorId?, ... }
  status        String   @default("active")
  sitePixels    SitePixel[]
  @@unique([userId, platform, accountId])
}

model Campaign {
  id            String   @id @default(cuid())
  userId        String
  adAccountId   String
  adAccount     AdAccount @relation(...)
  externalId    String?  // ID plateforme après push
  name          String
  status        String   @default("DRAFT")  // DRAFT | ACTIVE | PAUSED | ARCHIVED
  platform      String
  objective     String
  dailyBudget   Float?   // en devise du compte
  targeting     Json?    // pays, âge, genres, villes
  brief         Json?    // données Campaign Builder
  lastSyncAt    DateTime?
  adMetrics     AdMetrics[]
  @@index([userId, platform])
  @@index([adAccountId, status])
}

model AdMetrics {   // snapshot quotidien
  id          String   @id @default(cuid())
  campaignId  String
  date        DateTime
  spend       Float
  impressions Int
  clicks      Int
  conversions Int
  revenue     Float
  @@unique([campaignId, date])
  @@index([campaignId, date])
}

model AdAudience {
  id          String   @id @default(cuid())
  userId      String
  name        String
  description String?
  targeting   Json     // mêmes champs que Campaign.targeting
  platform    String?
  @@index([userId])
}
```

## 🔵 Meta Ads — Push E2E

### Flow complet (meta.ts `pushCampaign`)

```
1. Résoudre pageId → getDefaultPageId() si absent du account.meta
2. Résoudre instagramActorId (page → instagram_business_account)
3. POST /{act_ACCOUNT}/campaigns (Outcomes, CBO daily_budget, bid_strategy)
4. POST /{act_ACCOUNT}/adsets (Advantage+ Audience, pixel_id si LEADS/SALES,
   targeting âge/genre/pays, attribution_spec 7d_click)
5. POST /{act_ACCOUNT}/adimages (upload image base64)
6. POST /{act_ACCOUNT}/adcreatives (Advantage+ Creative si activé,
   object_story_spec page+IG, link + cta)
7. POST /{act_ACCOUNT}/ads (status=PAUSED)
```

### Points critiques Meta

| Situation | Solution |
|-----------|----------|
| `pixel_id` manquant sur objectif LEADS/SALES | Erreur #1815143 → `promotedObject` DOIT avoir `pixel_id` + `custom_event_type` |
| Advantage+ Audience bug LANDING_PAGE_VIEWS | Erreur #1885501 → retry sans `custom_event_type` |
| Advantage+ Creative erreur | Erreur #1885543 → retry sans `use_page_actor_override` |
| CBO 2025+ | `daily_budget` et `bid_strategy` UNIQUEMENT au niveau Campaign, PAS AdSet |
| **Version API** | `GRAPH = "https://graph.facebook.com/v25.0"` (sorti fév 2026). Mettre à jour tous les 6 mois. |
| Token Meta | Long-lived ~60j, **pas de refresh token** → surveiller `tokenExpiresAt`, alerter user |
| Attribution windows supprimées (jan 2026) | `7-day view` et `28-day view` SUPPRIMÉS par Meta. Utiliser `7-day click + 1-day view` uniquement. |

### Creative Fatigue (Meta)

```ts
// lib/ads/meta.ts
const report = await getCreativeFatigue(account, campaignExternalId);
// report.level: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN"
// report.frequency7d: nombre moyen de fois que la pub a été vue sur 7j
// report.recommendation: string lisible par l'utilisateur
```

Seuils (Meta Andromeda 2026 — dégradation en 5-7j, plus rapide qu'avant) :
- `< 2.5/semaine` → LOW → pas d'action
- `2.5–4.0` → MEDIUM → préparer de nouveaux visuels cette semaine
- `≥ 4.0` → HIGH → renouveler immédiatement

**Auto-optimizer** : action `REFRESH_CREATIVE` déclenchée automatiquement pour les campagnes Meta en MEDIUM/HIGH.
**API endpoint** : `GET /api/ads/campaigns/[id]/fatigue` → retourne `CreativeFatigueReport`.

### `mapObjective` (v17 Outcomes)

```ts
// Ancienne → Nouvelle API Outcomes (MANDATORY depuis v17)
"CONVERSIONS" → "OUTCOME_SALES"
"LEAD_GENERATION" → "OUTCOME_LEADS"
"BRAND_AWARENESS" → "OUTCOME_AWARENESS"
"REACH" → "OUTCOME_AWARENESS"
"TRAFFIC" → "OUTCOME_TRAFFIC"
"LINK_CLICKS" → "OUTCOME_TRAFFIC"
"APP_INSTALLS" → "OUTCOME_APP_PROMOTION"
"VIDEO_VIEWS" → "OUTCOME_ENGAGEMENT"
"POST_ENGAGEMENT" → "OUTCOME_ENGAGEMENT"
```

### Advantage+ (best practices 2026)

- **Advantage+ Audience** (`targeting_automation: { advantage_audience: 1 }` au AdSet) : -32% CPA vs targeting manuel. Activé par défaut. Les critères âge/genre/pays restent des **suggestions** (Meta peut dépasser).
- **Advantage+ Creative** (`degrees_of_freedom_spec` au AdCreative) : +14% CPR moyen. Désactivable via `input.advantageCreative = false`. Fallback automatique sans ce flag si Meta refuse.
- **Advantage+ Placements** : implicite — on N'ENVOIE PAS `publisher_platforms` au AdSet (= Meta utilise toutes les surfaces). Restriction de placement casse Advantage+ et coûte en performance.
- **Advantage+ Budget** : CBO via `daily_budget` + `bid_strategy: "LOWEST_COST_WITHOUT_CAP"` au niveau Campaign (déjà en place).

### Advantage+ unifié v25 (Fév 2026 — campagnes ASC/AAC)

> **Breaking change** : depuis Marketing API v25.0, le flag `smart_promotion_type` (qui servait à créer ASC/AAC en v24) est **supprimé en write**. La nouvelle approche : passer `advantage_state` au niveau Campaign avec les valeurs `ADVANTAGE_PLUS_SALES` (e-commerce/ASC) ou `ADVANTAGE_PLUS_LEADS` (lead gen/AAC). Le champ `existing_customer_budget_percentage` est aussi supprimé (utiliser 2 AdSets avec Custom Audiences).

**Implémentation `lib/ads/meta.ts`** :
- Mapping `objective → advantageState` :
  - `OUTCOME_SALES` → `ADVANTAGE_PLUS_SALES`
  - `OUTCOME_LEADS` → `ADVANTAGE_PLUS_LEADS`
  - autres → omis (campagne classique)
- Helper interne `buildCampaignBody(objective, withAdvantageState)` réutilisé pour la création + les retries
- Cascade try/catch :
  1. Tentative avec `advantage_state`
  2. Si refusé (compte non éligible ASC/AAC, message contenant `advantage_state` ou `ADVANTAGE_PLUS` ou `not eligible`) → retry sans le flag
  3. Si Outcome rejeté → fallback `mapLegacyObjective` (rare, comptes legacy)
- Sur succès avec `advantage_state` : stocké dans `resources.advantageState`

**Impact mesuré** (Meta officiel + études 2026) : **+16-22% ROAS** vs campagnes Standard quand CAPI bien configuré (ce qui est notre cas — module `lib/capi`).

### Boost post existant (`object_story_id`)

Mode alternatif à `object_story_spec` (creative from scratch). Permet de booster un post organique de la Page comme creative payant.

**Trigger** : `input.boostPostId` au format `"{pageId}_{postId}"` (ex: `"1234567_9876543"`).

**Comportement** :
- AdCreative POST avec `object_story_id` au lieu de `object_story_spec` (Meta utilise le contenu du post organique tel quel — texte, image, lien, CTA)
- `picture`/`imageUrl` non requis (le post organique contient déjà son visuel)
- A/B multi-variant (`copyVariants`) **désactivé en boost mode** (un seul post réutilisé, pas de creative alternatif)
- Instagram actor auto-detect skip (pas nécessaire)
- `resources.boostPost` stocké pour traçabilité

**Pourquoi pro 2026** :
- Preuve sociale conservée : likes/comments/shares du post organique cumulent avec l'engagement payant → **+20-40% CTR** vs creative identique créé from scratch (sources agences PPC 2025-2026)
- UX user simplifiée : "boost ce post" >>> "génère copy + visuel + creative"
- Cohérence avec TikTok Spark Ads (pattern symétrique)

## 🟢 Google Ads — API v24

> **v24 (avr 2026, patch v24.1 mai 2026). Sunset ~mai 2027. v20 sunsetté le 2026-06-10 ✓.**

```ts
const GOOGLE_ADS_API = "https://googleads.googleapis.com/v24";
```

### Campagnes Search (pushCampaign)

Flow :
1. `mutate` → Campaign + Budget (via `googleAds.customers/{id}/campaigns:mutate`)
2. `mutate` → AdGroup
3. `mutate` → AdGroup Ads (Responsive Search Ads : 3+ headlines, 2+ descriptions)
4. `mutate` → Keywords (positive + negative)
5. `mutate` → ConversionAction link si `conversionActionIds` fournis

### Performance Max (`pushPmaxCampaign`)

- Crée Campaign + Budget + AdGroup + Listing Group en **une seule requête `googleAdsMutateBatch`**
- Ressources temporaires avec noms `~` (ex: `~budget_1`) pour les références croisées
- Assets : headlines (≥3, ≤30 chars), descriptions (≥2, ≤90 chars), finalUrl obligatoire
- `selective_optimization` si `conversionActionIds` fournis

### AI Max for Search (`input.enableAiMax`)

- Active l'IA Google qui génère/teste automatiquement variantes de titres, descriptions, URLs
- Activé après création campagne via `aiMaxSetting.enableAiMax: true` + `updateMask: "aiMaxSetting.enableAiMax"`
- **Coexiste avec RSA** (compatible, n'écrase pas les assets manuels)
- Remplace progressivement Dynamic Search Ads (DSA sunset sept 2026)
- **Best practice 2026** : activer dès qu'on a >100 conversions/mois (l'IA a besoin d'historique)
- Non-bloquant : si AI Max échoue (compte trop neuf, feature non disponible), campagne reste fonctionnelle

### Demand Gen (`pushDemandGenCampaign`)

Successeur de Discovery Ads (sunset déc 2026). Couvre YouTube Shorts/in-stream, Google Discover, Gmail.

Flow :
1. Budget non-shared (`explicitlyShared: false`) — Demand Gen rejette les budgets partagés
2. Campaign `advertisingChannelType: "DEMAND_GEN"` + bidding (MAXIMIZE_CONVERSIONS par défaut)
3. CampaignCriterion geo (si `countries` fournis)
4. AdGroup `type: "DEMAND_GEN_MULTI_ASSET_AD"` + `demandGenAdGroupSettings.channelControls.channelStrategy: "ALL_CHANNELS"`
5. **Best-effort** : upload Image Assets (MARKETING, SQUARE, LOGO) puis création `demandGenMultiAssetAd` si assets minimum réunis

Assets minimum pour créer l'annonce automatiquement :
- 3+ titres ≤ 40 chars
- 2+ descriptions ≤ 90 chars
- 1 image MARKETING (1.91:1) + 1 SQUARE (1:1)
- LOGO optionnel
- `finalUrl` obligatoire

Sinon : campagne créée PAUSED sans annonce (`resources.adHint` indique ce qui manque).

Branche déclenchée par `campaignType === "DEMAND_GEN"` (ou `"DISCOVERY"` pour rétrocompat).

### Conversion Tracking

```ts
// Lister les conversions d'un compte
listConversionActions(account: AdAccountInfo): Promise<ConversionAction[]>

// Créer une nouvelle action de conversion (ex: Lead from Website)
createConversionAction(account, { name, category, type, countingType }): Promise<string>
// → retourne le resourceName "customers/{id}/conversionActions/{id}"

// getConversionAction : détail d'une action existante
```

`ConversionAction.category` : `PAGE_VIEW`, `PURCHASE`, `SIGNUP`, `LEAD`, `SUBMIT_LEAD_FORM`, `BOOK_APPOINTMENT`, `CONTACT`, `DOWNLOAD`

### 🔴 Enhanced Conversions for Leads via Data Manager API (CRITIQUE 2026-06-15)

**Module `lib/ads/google-data-manager.ts`** + endpoint `POST /api/ads/google/enhanced-conversions/upload`.

**Pourquoi c'est critique** :
- Ancien endpoint `customers/{id}/conversionUploadService:uploadClickConversions` BLOQUÉ depuis **15 juin 2026** pour les developer tokens qui n'ont pas envoyé de requête legacy entre janv-juin 2026.
- Tous les nouveaux comptes WanaPush DOIVENT passer par Data Manager API.
- Sans ça : upload offline conversions impossible → ROAS Smart Bidding mal calibré.

**Endpoint Data Manager API** :
```
POST https://datamanager.googleapis.com/v1/events:ingest
Authorization: Bearer <accessToken (scope datamanager)>
```

**Scopes OAuth** (déjà ajoutés à `SCOPES` dans `lib/ads/google.ts`) :
- `https://www.googleapis.com/auth/adwords` (push + GAQL)
- `https://www.googleapis.com/auth/datamanager` (Data Manager — **SENSITIVE**, Google OAuth verification requise pour la prod)

**Format hash PII** : SHA-256 (HEX) sur valeur normalisée :
- Email : lowercase + trim (Gmail : retire les `.` avant `@` et `+suffix`)
- Phone : E.164 (`+33612345678`, retire espaces/séparateurs)
- Nom : lowercase + trim + retire diacritiques (é→e) + retire chars non-alpha
- Country/postal : NON hashés (envoyés en clair dans `address.regionCode` / `address.postalCode`)

**Body Data Manager** :
```json
{
  "destinations": [{
    "operatingAccount": { "accountType": "GOOGLE_ADS", "accountId": "1234567890" },
    "loginAccount": { "accountType": "GOOGLE_ADS", "accountId": "1234567890" },
    "productDestinationId": "<conversionActionId>"
  }],
  "encoding": "HEX",
  "events": [{
    "eventTimestamp": "2026-06-07T15:07:01Z",
    "transactionId": "<id unique>",
    "eventSource": "WEB",
    "conversionValue": 49.99,
    "currency": "EUR",
    "adIdentifiers": { "gclid": "..." },
    "userData": { "userIdentifiers": [{ "emailAddress": "<SHA256-hex>", "phoneNumber": "...", "address": { ... } }] }
  }],
  "validateOnly": false
}
```

**Limites** :
- Max **2000 events** par requête (batch côté caller si nécessaire)
- Au moins 1 identifiant par event : `gclid`/`gbraid`/`wbraid` OU PII (`email`/`phone`/`name`)
- `transactionId` unique pour dédup (réutiliser l'ID de la conversion en DB)

**API WanaPush** : `POST /api/ads/google/enhanced-conversions/upload`
- Auth via `session.user.email`
- Body : `{ adAccountId, conversionActionId, events: [...], validateOnly? }`
- Hash PII server-side via `buildUserIdentifier()` — NE JAMAIS pré-hasher côté client
- Retourne `{ ok, uploaded, errors? }` (partial failure possible)

**Impact mesuré** (sources Google + études 2026) :
- +5 à +15% conversions captées (post-cookie attribution)
- -8 à -12% CPA observé sur Smart Bidding (l'IA Google a plus de signal)

**Cas d'usage WanaPush** :
- Lead form : stocker `gclid` à l'arrivée, upload la conversion quand le lead devient client en CRM
- E-commerce : enrichir la conversion server-side avec PII hashée

**Erreurs typiques** :
- `403 ACCESS_TOKEN_SCOPE_INSUFFICIENT` → user n'a pas le scope `datamanager`, déclencher re-OAuth
- `400 INVALID_ARGUMENT` → payload mal formé (timestamp futur, PII non hashée, etc.)
- `404 NOT_FOUND` → `conversionActionId` n'existe pas sur ce customerId

### 🤖 Pipeline auto-pilote Enhanced Conversions

Module : `lib/ads/enhanced-conversions-pipeline.ts`

**Fonctions exportées** :
- `parseClickIdsFromUrl(url)` → `{ gclid?, gbraid?, wbraid? }` — parse les click identifiers depuis une URL
- `triggerLeadConversionForFormSubmission(submissionId)` — fire-and-forget, upload Lead
- `triggerSaleConversionForOrder(orderId)` — fire-and-forget, upload Sale

**Résolution auto AdAccount + ConversionAction** :
1. Trouve l'AdAccount Google CONNECTED du user (via `userId` résolu depuis `siteSlug` → `GeneratedSite` ou `Shop`)
2. Liste les `ConversionActions` du compte
3. Prend la 1ère ENABLED de la category demandée (LEAD pour form, PURCHASE pour Order)
4. Si manque AdAccount OU ConversionAction → `ecStatus: "SKIPPED"`

**Capture gclid côté landing/storefront** :
- **Lead forms** : `parseClickIdsFromUrl(payload.pageUrl)` dans `POST /api/forms/submit`. L'URL `pageUrl` envoyée par la landing contient déjà `?gclid=...` (Google auto-tagging).
- **Storefront e-commerce** : `CartProvider` (dans `cartContextFile()`) capture URL params au mount et écrit cookies `wp_gclid` / `wp_gbraid` / `wp_wbraid` (max-age 90 jours, SameSite=Lax, Secure HTTPS). `CartDrawer.startCheckout()` lit URL params ET cookies, envoie au `/api/storefront/[slug]/checkout` qui propage vers Stripe Checkout Session `metadata`.

**Schéma DB** (migrations cumulées 2026-06-07) :
- `FormSubmission.{gclid, gbraid, wbraid, liFatId, ttclid, ecStatus, ecSentAt, ecError, liStatus, liSentAt, liError, ttStatus, ttSentAt, ttError}`
- `Order.{gclid, gbraid, wbraid, liFatId, ttclid, ecStatus, ecSentAt, ecError, liStatus, liSentAt, liError, ttStatus, ttSentAt, ttError}`
- Enum `EnhancedConversionStatus` : `PENDING | SENT | FAILED | SKIPPED`
- Index sur chaque `{ec,li,tt}Status` (cron retry rapide)

**Triple pipeline cross-platform** : chaque event business déclenche en parallèle :
1. `ecStatus` ← Google Data Manager API (gclid/gbraid/wbraid + PII)
2. `liStatus` ← LinkedIn Conversions API (li_fat_id + SHA256_EMAIL + userInfo)
3. `ttStatus` ← TikTok Events API (ttclid + PII hashées)

**Hooks** :
- `POST /api/forms/submit` : parse gclid de `pageUrl` + ttclid (URL OR cookie), save, déclenche les 3 triggers async en parallèle
- `POST /api/webhooks/stripe/[siteSlug]` : lit `session.metadata.{gclid/gbraid/wbraid/liFatId/ttclid}`, save sur Order, déclenche les 3 triggers async après `financialStatus: "PAID"`
- `POST /api/storefront/[siteSlug]/checkout` : accepte les 5 identifiants dans le body, les propage à `stripe.checkout.sessions.create` via `metadata`

**Capture côté storefront** (`CartProvider` dans `cartContextFile()`) :
- URL params → cookies `wp_gclid`/`wp_gbraid`/`wp_wbraid` (90j), `wp_ttclid` (7j)
- Cookie `li_fat_id` (LinkedIn Insight Tag natif) → mirroré sous `wp_li_fat_id` (90j)
- `CartDrawer.startCheckout()` lit tous les cookies + URL params → POST checkout

**Cron retry** : `POST/GET /api/ads/cron/retry-conversions` (auth `x-cron-secret`/`CRON_SECRET`)
- Re-traite les `{ec,li,tt}Status = "FAILED"` créés >24h et <7j
- 50 max par plateforme/type/run (garde-fou)
- Fenêtres : Google/LinkedIn 7j, TikTok 6.5j (avant expiry 7j strict)
- À schedule toutes les 6h en prod : `0 */6 * * *`

**Sans branchement** : chaque helper retourne `SKIPPED` proprement (pas d'erreur). Le système est dégradé gracieusement si le user n'a pas connecté un AdAccount.

### 📦 Product Feed Sync — Meta Catalog + Google Merchant API (DPA-ready)

Module : `lib/ads/product-feed-sync.ts`. Sync les produits Prisma `Shop` vers les 2 plateformes de catalog en un seul appel, pour débloquer Meta Advantage+ Catalog Ads (DPA, ROAS 2-5× retargeting standard) et Google Shopping/PMax produits.

**Pourquoi critique 2026** :
- **Google Content API for Shopping sunset 18 août 2026** → migration vers Merchant API v1 (v1beta shutdown 28 fév 2026 déjà fait)
- **Meta DPA / Advantage+ Catalog Ads** = format e-commerce avec le meilleur ROAS

**API Meta Catalog Batch** : `POST https://graph.facebook.com/v25.0/{catalog_id}/items_batch`
- Body : `{ access_token, item_type: "PRODUCT_ITEM", requests: [{method, retailer_id, data}], allow_upsert: true }`
- Max 5000 requests/batch
- `retailer_id` = `ProductVariant.id` (cuid) — pas besoin de cache d'IDs externes
- Scope OAuth : `catalog_management` (ajouté à `META_ADS_SCOPES`)

**API Google Merchant v1** : `POST https://merchantapi.googleapis.com/products/v1/accounts/{accountId}/productInputs:insert?dataSource=accounts/{accountId}/dataSources/{dataSourceId}`
- Pas de batch natif → on appelle en série (rate limit élevé sur supplemental data sources)
- `offerId` = `ProductVariant.id`
- `contentLanguage` + `feedLabel` dérivés du `Shop.locale` (ex: "fr-FR" → `fr` + `FR`)
- `price.amountMicros` en micros (`price * 1_000_000`)
- Scope OAuth : `https://www.googleapis.com/auth/content` (ajouté à `SCOPES` Google)

**Configuration AdAccount.meta requise** :
```jsonc
// Meta
{ "metaCatalog": { "id": "1234567890" } }
// Google
{ "googleMerchant": { "accountId": "1234567", "dataSourceId": "9876543" } }
```

**Fonctions exportées** :
- `syncProductCrossPlatform(productId, operation="UPDATE")` : sync 1 produit (toutes ses variantes) vers Meta + Google en parallèle. Best-effort par plateforme (un échec n'impacte pas l'autre). Retourne `{ productId, meta, google }` avec stats détaillées.
- `syncAllShopProducts(shopId, operation="UPDATE")` : bulk sync de tous les produits `ACTIVE`. Fan-out 5 produits en // pour ne pas saturer.
- `syncToMetaCatalog()` + `syncToGoogleMerchant()` : helpers bas niveau.

**Endpoint API** : `POST /api/shop/[siteSlug]/products/sync-feeds`
- Auth via `session.user.email` + vérif ownership Shop
- Body : `{ operation?: "CREATE" | "UPDATE" | "DELETE" }` (défaut UPDATE — Meta/Google upsert)
- Response : `{ total, summary: { meta: {ok, fail}, google: {ok, fail} }, results: [...] }`

**Branchement incrémental** : appeler `syncProductCrossPlatform(productId)` depuis tes endpoints CRUD produit existants (fire-and-forget). Le sync individuel ≠ bulk endpoint.

**Mapping Prisma → format externe** :
- `Product.title` → `title`
- `Product.description` → `description`
- `Product.status === "ACTIVE"` → `in stock` / `out of stock`
- `Product.vendor ?? Shop.name` → `brand`
- `ProductVariant.price` → `price` (devise depuis `Shop.currency`)
- `ProductVariant.compareAt > price` → `sale_price` (Meta) / `salePrice` (Google)
- `ProductVariant.sku` → `gtin`
- `Product.images[0].url` → `image_link`/`imageLink`
- Link auto-construit : `https://wanapush.com/preview/{siteSlug}/products/{slug}`

**Dégradé gracieux** : si `metaCatalog.id` ou `googleMerchant.{accountId,dataSourceId}` non configurés → erreur explicite dans `result.{meta,google}.error`, l'autre plateforme tourne normalement.

### Points critiques Google Ads

| Situation | Solution |
|-----------|----------|
| `developer-token` header obligatoire | `GOOGLE_ADS_DEVELOPER_TOKEN` dans `.env.local` (Standard access — prend semaines à obtenir) |
| `login-customer-id` | Header requis si MCC (manager account). PAS requis pour comptes directs. |
| Refresh token | `refreshTokenFn()` auto via `lib/ads/google.ts`. Token stocké chiffré. |
| RSA headlines | Min 3, min 2 descriptions — sinon `RESPONSIVE_SEARCH_AD_ASSETS_INVALID` |
| PMAX assets | Status PAUSED par défaut → activer manuellement dans Google Ads |
| **PMax negative keywords** | Supportés depuis jan 2025 via `campaignCriterionOperation` (EXACT/PHRASE/BROAD). Implémenté dans `pushPmaxCampaign` via `input.negativeKeywords`. 2ème mutate après le batch principal. |
| Smart Bidding PMax | `MAXIMIZE_CONVERSIONS` par défaut (learning phase). Ajouter `targetCpaMicros` pour Target CPA, ou `maximizeConversionValue.targetRoas` pour Target ROAS. |

## 🟡 TikTok Ads — Push + Sync + Events API

### TikTok Events API (CAPI côté serveur)

Équivalent de la Meta Conversions API pour TikTok. Impact mesuré : **+19% événements capturés, -15% CPA**.

```ts
// lib/ads/tiktok-events.ts
import { trackTikTokEvent, batchTrackTikTokEvents } from "@/lib/ads/tiktok-events";

// Événement unique
await trackTikTokEvent({
  pixelCode: "XXXXX",
  accessToken: decryptedToken,
  eventName: "CompletePayment",
  eventId: "evt_unique_uuid",  // MÊME ID que dans le Pixel browser pour dédup
  pageUrl: "https://...",
  email: "user@example.com",  // hashé SHA-256 automatiquement
  phone: "+33612345678",       // hashé SHA-256 automatiquement
  value: 49.99,
  currency: "EUR",
});

// Batch (jusqu'à 1000 événements)
await batchTrackTikTokEvents({ pixelCode, accessToken, events: [...] });
```

**Déduplication** : TikTok fusionne Pixel browser + Events API sur `event_id` identique (fenêtre 48h). Toujours passer le même `event_id` dans les deux.

**PII hashing** : email et phone envoyés en clair → hashés SHA-256 (lowercase + trim) avant envoi. Ne jamais pré-hasher côté client avant de passer à `trackTikTokEvent`.

**Endpoint API WanaPush** : `POST /api/ads/tiktok/events`
- Enrichissement auto : IP et User-Agent extraits des headers si non fournis
- Résolution token : via `adAccountId` (DB) ou `TIKTOK_EVENTS_ACCESS_TOKEN` (.env)

### 🤖 Branchement auto-pilote (TikTok Events API)

Module : `enhanced-conversions-pipeline.ts` — fonctions `triggerTikTokLeadForFormSubmission` + `triggerTikTokSaleForOrder`.

**Configuration AdAccount.meta** :
```json
{
  "tiktokPixel": {
    "code": "C1234567890ABCDEF",
    "accessToken": "<chiffré AES-256-GCM>"
  }
}
```
- `code` : Pixel ID depuis Events Manager TikTok
- `accessToken` : token Events API généré dans Events Manager (Settings > Generate Access Token). **SÉPARÉ du token Marketing API** (peut être identique sur certains setups récents avec scopes unifiés). Stocké chiffré côté caller via `lib/crypto.ts`.

**Mapping eventName** :
- FormSubmission type=`"newsletter"` → `Subscribe`
- FormSubmission type=`"contact"` → `Contact`
- Order Stripe payé → `CompletePayment` (+ `value` + `currency`)

**Capture `ttclid`** :
- URL param `?ttclid=...` au moment du clic ad TikTok (valide 7 jours côté plateforme)
- Storefront : `CartProvider` persiste cookie `wp_ttclid` 7 jours (≃ window TikTok)
- Form submit : `parseTtclidFromUrl(pageUrl)` OU payload.ttclid (cookie persisté)

**Dégradé gracieux** : si `meta.tiktokPixel` absent → `ttStatus: "SKIPPED"` avec message explicite.

### Push flow (tiktok.ts `pushCampaign`)

```
1. POST /campaign/create/  → objective_type, BUDGET_MODE_DAY, status=DISABLE
2. resolveLocationIds()    → GET /tool/region/ pour mapper ISO → TikTok location_id
3. POST /adgroup/create/   → placement AUTOMATIC, optimization_goal, billing_event
4a. uploadImageFromUrl()   → POST /file/image/ad/upload/ avec upload_type=UPLOAD_BY_URL (si input.imageUrl)
4b. uploadVideoFromUrl()   → POST /file/video/ad/upload/ avec upload_type=UPLOAD_BY_URL (si input.videoUrl)
5. POST /ad/create/        → ad_format auto-détecté : SINGLE_VIDEO si videoId, sinon SINGLE_IMAGE si imageId, sinon texte
                              ad_text, call_to_action, landing_page_url, status=DISABLE
```

Tout est créé en **DISABLE** (TikTok = PAUSED). Image + vidéo sont best-effort (annonce texte seule si échec des deux).

Pour SINGLE_VIDEO : `image_ids` reste optionnel — TikTok extrait auto un frame en miniature, mais on peut passer un `imageId` pour surcharger.

**Vidéo specs** : 9:16 (1080×1920 recommandé), 5-60s, MP4/MOV, max 500 MB.

### Push flow Smart+ (tiktok.ts `pushSmartPlusCampaign`)

Smart+ = équivalent TikTok du Meta Advantage+ ou Google PMax. L'IA TikTok gère ciblage + créatifs + bid automatiquement.

Branche déclenchée par `campaignType` commençant par `"SMART_PLUS"` (ex: `"SMART_PLUS_CONVERSIONS"`).

```
1. POST /smart_plus/campaign/create/  → request_id (UUID) OBLIGATOIRE pour idempotence
2. POST /smart_plus/adgroup/create/   → targeting_spec.location uniquement, le reste géré par l'IA
3. uploadImage / uploadVideo          → best-effort (Smart+ peut accepter plusieurs créatifs)
4. POST /smart_plus/ad/create/        → creative_list[] (A/B testing géré par l'IA)
```

**Critique** : utiliser `/smart_plus/` namespace dédié — l'ancien flag `is_smart_performance_campaign` sur l'endpoint standard a été déprécié 2026-03-31.

`bid_type: BID_TYPE_NO_BID` recommandé en Smart+ (laisser l'IA gérer le bid).

### Spark Ads (boost contenu créateur organique)

Branche dans `pushCampaign` quand `input.sparkAuthCode` + `input.sparkPostId` fournis.

**Workflow** :
1. **Code d'autorisation créateur** : le créateur génère un Auth Code dans son app TikTok (Ad Settings → Ad authorization → durée 7/30/60/180/365 jours). Tu reçois ce code via input.
2. **Identity** : `POST /identity/create/` avec `identity_type: "AUTH_CODE"` + `auth_code` → retourne `identity_id`.
3. **Ad** : `POST /ad/create/` avec `ad_format: "SPARK_ADS"`, `identity_type: "AUTH_CODE"`, `identity_id`, `tiktok_item_id` (= ID du post organique à booster).

**Skip imageUrl/videoUrl** en mode Spark : le post organique du créateur fait office de creative entièrement.

**Pourquoi pro 2026** :
- Engagement organique conservé : likes/comments/shares vont au compte du créateur (et restent visibles)
- CTR documenté **+134%** vs in-feed ads classiques SINGLE_VIDEO froides (sources Status/Insense)
- Completion rate +30%, conversion rate +30%
- C'est le standard creator-led ads 2026 (B2C + B2B grandissant)

**Identity types** (TikTok Marketing API v1.3) :
- `AUTH_CODE` (créateur via Spark Code) — celui qu'on utilise
- `TT_USER` (compte advertiser lié)
- `BC_AUTH_TT` (via Business Center)
- `CUSTOMIZED_USER` (en phase-out)

### Objectifs → billing_event

| objective_type | optimization_goal | billing_event |
|---|---|---|
| TRAFFIC | CLICK | CPC |
| WEB_CONVERSIONS | CONVERT | OCPM |
| LEAD_GENERATION | LEAD | OCPM |
| REACH | REACH | CPM |
| VIDEO_VIEWS | VIDEO_VIEW | CPM |

### Points critiques TikTok

| Situation | Solution |
|-----------|----------|
| `location` (adgroup standard) ≠ ISO codes | `resolveLocationIds()` appelle `/tool/region/?advertiser_id=...&placements=...&objective_type=...` → retourne numeric IDs. Fallback ISO si échec. **⚠️ `location_ids` = réservé aux adgroups R&F seulement** |
| objective_type | `WEB_CONVERSIONS` (pas `CONVERSIONS`) pour website conversions. `mapObjective()` gère la conversion. |
| Standard API Approval | En Sandbox : fonctionne sur comptes test TikTok Ads Manager. En prod : demander approval sur business-api.tiktok.com |
| Image specs | 1080×1080 ou 1200×628, JPG/PNG, max 500 KB recommandé |
| `BID_TYPE_NO_BID` | = "Lowest Cost" (volume max sans bid cap) — idéal nouvelles campagnes sans historique |
| Token TikTok | Pas de refresh token → expire. Surveiller `tokenExpiresAt` |

### `updateCampaignStatus` / `updateCampaignBudget`

```ts
// Pause / activation
POST /campaign/status/update/ { campaign_ids: [id], operation_status: "ENABLE"|"DISABLE" }

// Budget
POST /campaign/budget/update/ { budget_list: [{ campaign_id: id, budget: amount }] }
```

Utilisés par l'auto-optimizer (`lib/ads/auto-optimizer.ts`).

## 🔵 LinkedIn Ads — Push + Sync

### Push flow (linkedin.ts `pushCampaign`)

```
1. getOrCreateCampaignGroup()  → GET /rest/adAccounts/{id}/adCampaignGroups (liste)
                                  ou POST si aucun groupe ACTIVE — LinkedIn exige un groupe
2. POST /rest/adAccounts/{id}/adCampaigns  → Campaign DRAFT (type SPONSORED_UPDATES)
3. uploadImageFromUrl()         → POST /rest/images?action=initializeUpload
                                  puis PUT binaire sur uploadUrl retourné
4. POST /rest/adAccounts/{id}/adCreatives → Creative DRAFT (SINGLE_IMAGE)
```

Tout est créé en **DRAFT**. L'image upload est optionnel (fallback creative texte seul).

### Objectifs → costType

| objectiveType | costType | unitCost défaut |
|---|---|---|
| WEBSITE_VISITS | CPC | 2.00 |
| WEBSITE_CONVERSIONS | CPC | 2.00 |
| LEAD_GENERATION | CPC | 2.00 |
| BRAND_AWARENESS | CPM | 8.00 |
| VIDEO_VIEWS | CPV | 0.05 |

### Geo targeting — URN map statique

LinkedIn ne supporte pas les codes ISO directement : il faut des `urn:li:geo:{id}`.

```ts
// Pays principaux embarqués dans linkedin.ts (GEO_URN)
FR → urn:li:geo:105015875
BE → urn:li:geo:100565514
CH → urn:li:geo:106693272
US → urn:li:geo:103644278
// ... (voir linkedin.ts pour la liste complète)
```

Pour des pays non listés : appeler `/rest/adTargetingFacets/locations?q=typeahead&query={name}`.

### Points critiques LinkedIn

| Situation | Solution |
|-----------|----------|
| `LinkedIn-Version` header | Constante `LI_VERSION = "202605"`. LinkedIn sunset les versions ~12 mois après release (rolling). **Mettre à jour chaque année.** |
| Scope `rw_ads` manquant | Utilisateurs connectés SANS `rw_ads` doivent se reconnecter (scope ajouté en juin 2026) |
| Scope `rw_conversions` (NEW) | Requis pour Conversions API server-side. Ajouté à `SCOPES` en juin 2026 — comptes legacy doivent re-OAuth. |
| Campaign Group obligatoire | `getOrCreateCampaignGroup()` gère ça automatiquement |
| `x-restli-id` header | LinkedIn retourne l'ID créé dans ce header (pas dans le body JSON) |
| PATCH format | Body : `{"patch": {"$set": {"field": "value"}}}` — format Restli |
| Image specs | Max 5 MB, JPG/PNG. LinkedIn Images API initialise l'upload avant PUT binaire |
| Token expire | LinkedIn refresh_token valide 60 jours — surveiller `tokenExpiresAt` |

### 🔴 LinkedIn Conversions API (CAPI server-side)

**Module** : `lib/ads/linkedin-conversions.ts`. Stream les conversions B2B server-side pour optimiser le delivery sur les leads convertissants (cookieless + iOS Safari ITP) et débloquer `optimizationTargetType: MAX_QUALIFIED_LEAD` (depuis 202602) qui pousse le budget vers les leads que le CRM marque qualifiés.

**Workflow** (auto-pilote via `enhanced-conversions-pipeline.ts`) :
1. Lazy-create de la conversion rule au premier event : `POST /rest/conversions?autoAssociationType=ALL_CAMPAIGNS` avec `conversionMethod: "CONVERSIONS_API"`, `type: LEAD`/`PURCHASE`/`QUALIFIED_LEAD`/etc., attribution window 90j/30j. Cache l'URN `urn:lla:llaPartnerConversion:{id}` dans `AdAccount.meta.linkedinConversionRules[type]`.
2. Stream events : `POST /rest/conversionEvents` (single) ou avec header `X-RestLi-Method: BATCH_CREATE` (jusqu'à 5000).

**Headers obligatoires** :
- `Authorization: Bearer <token>`
- `Content-Type: application/json`
- `X-Restli-Protocol-Version: 2.0.0`
- `Linkedin-Version: 202605`

**Identifiants supportés** (envoyer le maximum dispo, ↑ match rate) :
- `SHA256_EMAIL` (lowercase + trim, pas de Gmail dot-stripping spécifique LinkedIn)
- `LINKEDIN_FIRST_PARTY_ADS_TRACKING_UUID` (= cookie `li_fat_id` déposé par Insight Tag)
- `PLAINTEXT_IP_ADDRESS` (en clair, non hashée)
- `GOOGLE_AID` / `IDFA` (mobile ad IDs)
- `userInfo` : `firstName`, `lastName`, `title`, `companyName`, `countryCode` (boost match rate enrichi)
- `externalIds` : ID interne CRM/DB (match secondaire)

**Capture `li_fat_id`** :
- Storefront : `CartProvider` lit le cookie `li_fat_id` (déposé par le LinkedIn Insight Tag) au mount et le persiste sous `wp_li_fat_id` (90 jours). `CartDrawer.startCheckout()` lit les 2 cookies et envoie au checkout.
- Forms : `pageUrl`/`payload.liFatId` envoyés par la landing → DB.

**Hooks pipeline** (`lib/ads/enhanced-conversions-pipeline.ts`) :
- `triggerLinkedInLeadForFormSubmission(submissionId)` : appelé en // de Google EC depuis `POST /api/forms/submit`
- `triggerLinkedInSaleForOrder(orderId)` : appelé en // de Google EC depuis `POST /api/webhooks/stripe/[siteSlug]` quand `financialStatus = PAID`
- Auto-résolution AdAccount LinkedIn CONNECTED du user (via siteSlug → userId) + lazy-create conversion rule

**Schéma DB** (migration `add_linkedin_capi_tracking`) :
- `FormSubmission.{liFatId, liStatus, liSentAt, liError}`
- `Order.{liFatId, liStatus, liSentAt, liError}`
- `AdAccount.meta.linkedinConversionRules` : cache `{ "LEAD": "urn:lla:...", "PURCHASE": "urn:lla:..." }`

**Limites** :
- 600 req/min, 500k/jour par token (rate limits)
- 90 jours window (`conversionHappenedAt` doit être <90j)
- Batch tout-ou-rien : 1 record invalide → toute la batch rejetée

**Erreurs typiques** :
- 400 `INVALID_CONVERSION_TIME_FIELD_VALUE` → timestamp >90j ou futur
- 400 `INVALID_USER_IDENTIFICATION_FIELD_VALUE` → aucun identifier match valide
- 401 `EMPTY_ACCESS_TOKEN` → token expiré, refresh
- 403 `USER_NOT_AUTHORIZED` → manque rôle `CAMPAIGN_MANAGER` ou scope `rw_conversions`

### `updateCampaignStatus` / `updateCampaignBudget`

```ts
PATCH /rest/adAccounts/{id}/adCampaigns/{campaignId}
{ "patch": { "$set": { "status": "ACTIVE" | "PAUSED" } } }
{ "patch": { "$set": { "dailyBudget": { "amount": "50.00", "currencyCode": "EUR" } } } }
```

Utilisés par l'auto-optimizer (`lib/ads/auto-optimizer.ts`).

## 🎛️ PushModal — 3 modes de destination

Le composant `PushModal.tsx` (1478 l) est la pièce centrale du push Meta.

```ts
type DestinationMode =
  | "wanapush_site"       // Site WanaPush → Pixel auto (SitePixel)
  | "external_with_pixel" // URL externe avec Pixel déjà installé (verify)
  | "external_no_pixel"   // URL externe sans Pixel (notoriété / trafic)
```

### `wanapush_site`

Récupère les sites via `GET /api/ads/destination-options` :
- `sitesReady` : ont `sitePixel.enabled = true` + `pixelId` → prêts
- `sitesNoPixel` : pas de SitePixel → lien vers `/generated-sites/[id]/pixel` pour configurer

Côté push (`campaigns/[id]/push`) : injecte `pixelId` depuis `SitePixel`, `linkUrl` = `previewUrl` du site.

### `external_with_pixel`

Bouton « Vérifier » appelle `POST /api/ads/verify-pixel` (fetch l'URL, cherche `fbq('init', '<pixelId>')` dans le HTML). Si trouvé → `detectedPixel` affiché en vert.

### `external_no_pixel`

URL libre, objectifs limités (Notoriété/Trafic — pas besoin de Pixel).

## 🤖 Auto-config IA (`/api/ads/auto-config`)

Prend `campaignId`, lit le brief existant, appelle Claude (`lib/ai`) et retourne :
- `primaryText` (≤125), `headline` (≤40), `description` (≤30)
- `cta` (enum 12 valeurs)
- `countries[]`, `ageMin`, `ageMax`, `genders[]`
- `suggestedCity` + `rationale`

Validé via Zod contre `aiOutputSchema`. `maxDuration = 60s`.

## 📊 Métriques affichées (CampaignsList)

| Colonne | Calcul |
|---------|--------|
| Spend | somme `AdMetrics.spend` sur la période |
| Impressions | somme `AdMetrics.impressions` |
| CTR | clicks / impressions |
| CPC | spend / clicks |
| CPA | spend / conversions |
| ROAS | revenue / spend |

Bandeau totaux globaux en bas du tableau. Export CSV disponible.

## 🔒 Sécurité

- `accessToken` + `refreshToken` → AES-256-GCM via `lib/crypto.ts` avant insert/update
- JAMAIS renvoyés dans les réponses API (select explicite avec exclusion)
- State OAuth prefixé `ADS_` (différencie social OAuth) + HMAC sur `NEXTAUTH_SECRET` + TTL 10 min
- Toutes les routes : `getServerSession` → 401 si non auth

## ✅ TL;DR pour Claude

1. **Meta = seule plateforme avec push E2E** : 7 appels Graph API séquentiels, gérer les 3 fallbacks Advantage+.
2. **Google Ads v24** : v20 sunset 2026-06-10 (déjà migré). RSA = 3+ headlines + 2+ desc. PMAX = batch atomique.
3. **Pixel Meta + push** : objectifs LEADS/SALES EXIGENT `pixel_id` dans `promotedObject` → vérifier que `SitePixel.pixelId` ou `externalPixelId` est passé.
4. **PushModal 3 modes** : wanapush_site (auto) > external_with_pixel (vérif) > external_no_pixel (notoriété).
5. **TikTok** = push implémenté (Campaign→AdGroup→SINGLE_IMAGE). `resolveLocationIds()` résout ISO→TikTok numeric IDs. billing_event par objectif. Standard API Approval requis en prod. **LinkedIn** = push implémenté (CampaignGroup→Campaign→Images API→Creative DRAFT). Scope `rw_ads` requis + Marketing Developer Platform approval. `GEO_URN` map statique pour 16 pays.
6. **Tokens chiffrés** : toujours via `lib/crypto.ts`. JAMAIS log/expose `accessToken`/`refreshToken`.
7. **Refresh token Google** : auto via `ensureFreshAdAccount()` → appelle `refreshTokenFn()`. Meta : pas de refresh, token expire ~60j.
8. **`auto-config`** : utilise `askAi()` de `lib/ai`, `maxDuration = 60s`, validation Zod stricte du output.
9. **Duplication de campagne** : `POST /api/ads/campaigns/[id]` (sans `externalId` = DRAFT).
10. **Cron sync** : `30 * * * *` sur `/api/ads/cron` — décalé de 30 min vs social cron (évite chevauchement).

## 📅 Roadmap Ads

- **TikTok Standard API Approval** : soumettre demande sur business-api.tiktok.com (push fonctionne déjà côté code)
- **LinkedIn push** : code prêt. Demander Marketing Developer Platform approval + scope `rw_ads` sur app LinkedIn
- **Google PMAX complet** : assets image/vidéo upload via UI
- **Meta Reels / Stories** : formats verticaux dans l'Ad creative
- **TikTok vidéo ads** : uploader vidéo via `/file/video/ad/upload/` pour format principal TikTok
- **TikTok Smart+ campaigns** : `is_smart_performance_campaign: true` — IA TikTok gère ciblage + créatif

**Sources vérifiées 2026-06-06** :
- Meta Marketing API v22 (developers.facebook.com/docs/marketing-api)
- Google Ads API v24 (developers.google.com/google-ads/api)
- TikTok Marketing API v1.3 (business-api.tiktok.com)
- LinkedIn Marketing API v2 (learn.microsoft.com/linkedin)
