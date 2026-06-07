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

- **Advantage+ Audience** (`targeting_automation: { advantage_audience: 1 }`) : -32% CPA vs targeting manuel. Activé par défaut. Les critères âge/genre/pays restent des **suggestions** (Meta peut dépasser).
- **Advantage+ Creative** (`use_page_actor_override: true`) : +14% CPR moyen. Désactivable via `input.advantageCreative = false`.
- **Advantage+ Placements** : non encore implémenté (Meta gère déjà via `publisher_platforms` absent = tout).

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
| Campaign Group obligatoire | `getOrCreateCampaignGroup()` gère ça automatiquement |
| `x-restli-id` header | LinkedIn retourne l'ID créé dans ce header (pas dans le body JSON) |
| PATCH format | Body : `{"patch": {"$set": {"field": "value"}}}` — format Restli |
| Image specs | Max 5 MB, JPG/PNG. LinkedIn Images API initialise l'upload avant PUT binaire |
| Token expire | LinkedIn refresh_token valide 60 jours — surveiller `tokenExpiresAt` |

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
