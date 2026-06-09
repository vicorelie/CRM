---
name: wanapush-gbp-module
description: >
  Utilise cette skill quand l'utilisateur travaille sur le module Google Business
  Profile (GBP) de WanaPush : audit fiche, posts hebdo programmés, réponses IA
  aux avis, sync horaires/photos/attributs, insights. Module STUB en juin 2026 —
  cette skill décrit le scope cible et le pattern d'implémentation à suivre.
license: proprietary
version: 0.1
last_reviewed: 2026-06-04
---

# SKILL — WanaPush GBP Module (STUB)

## ⚠️ MàJ 2026 best practices (sources officielles, audit 2026-06-09)

**APIs GBP (juin 2026) :** les 8 APIs de 2021 restent **actives**, pas de nouveau sunset 2025-2026. Performance v1 (`fetchMultiDailyMetricsTimeSeries`) remplace bien `reportInsights` v4 ✅. **🔴 GAP CRITIQUE : l'API Q&A (`mybusinessqanda`) a été arrêtée le 3 nov 2025**, sans remplacement (Google bascule vers Ask Maps + Gemini) → **retirer Q&A du scope phase 2**. ([Q&A change log](https://developers.google.com/my-business/content/qanda/change-log))

**Quota :** post-validation prod = **300 QPM** (~5 req/s), Business Information 10 edits/min/fiche. La note "≈10 req/jour" n'est vraie qu'**avant** validation (sandbox). ([limits](https://developers.google.com/my-business/content/limits))

**Réponses IA aux avis :** non pénalisées **si validées/autorisées par le titulaire** → garder un **human-in-the-loop / opt-in explicite** sur le cron auto-reply (filtre confidence ≥ 0.85). **Nouveaux interdits (policy avr 2026) :** demander de **citer un employé par nom**, solliciter un avis **on-premise**, **review gating** (filtrage par sentiment), **incitation** (cadeaux/remises). Bannir ces patterns des templates de sollicitation. ([review policy 2026](https://www.threechaptermedia.com/blog/google-review-policy-2026))

**Local SEO 2026 :** poids GBP 32 % / on-page 19 % / avis 16 % / liens 15 %. **Review velocity > volume** (10 avis frais/mois > 200 vieux) ; seuil de citation IA (AI Overviews) ≈ **150+ avis/établissement**. FTC : faux avis jusqu'à 51 744 $/infraction.

**À faire :** [ ] retirer Q&A du scope (API morte) ; [ ] ajouter `reviewVelocity` (avis/30j) à `GbpLocation` + flag "<150 avis = invisible AI Overviews" ; [ ] corriger note quota (300 QPM) ; [ ] guardrails policy avis dans les templates ; [ ] validation humaine/opt-in sur l'auto-reply IA.

> **État 2026-06-08 : Backend MVP shippé.** Schema Prisma + lib/gbp/ + 8 endpoints
> API + cron daily. UI dashboard reste à brancher (squelette ModulePage existant).

## ✅ Backend shippé (2026-06-08)

**5 APIs Google utilisées (toutes actives juin 2026)** :
- **Account Management v1** : `mybusinessaccountmanagement.googleapis.com/v1/accounts`
- **Business Information v1** : `mybusinessbusinessinformation.googleapis.com/v1/{account}/locations`
- **Performance v1** : `businessprofileperformance.googleapis.com/v1/{location}:fetchMultiDailyMetricsTimeSeries` (remplace ancien `reportInsights` v4 sunset)
- **Reviews (v4 legacy actif)** : `mybusiness.googleapis.com/v4/accounts/{a}/locations/{l}/reviews` — list + reply
- **Local Posts (v4 legacy actif)** : `mybusiness.googleapis.com/v4/accounts/{a}/locations/{l}/localPosts` — create

**Scope OAuth** : `https://www.googleapis.com/auth/business.manage`

⚠️ **Quota Google** : sans accès production (formulaire de vérification dans Google Cloud Console, 2-4 semaines), quota ≈ 10 req/jour.

**Modèles Prisma** (migration `add_gbp_module`) :
- `GbpAccount` (tokens AES-256-GCM, status CONNECTED/EXPIRED/REVOKED/ERROR)
- `GbpLocation` (title, address, lat/lng, primaryCategory, regularHours JSON, reviewsCount, averageRating, auditScore /100)
- `GbpPost` (topicType STANDARD/EVENT/OFFER/ALERT, summary ≤1500 chars, callToAction JSON, status DRAFT/SCHEDULED/PUBLISHED/FAILED, scheduledAt)
- `GbpReview` (googleReviewId refresh 30j car migration 2026, starRating 1-5, replyText, replyStatus PENDING/AUTO_REPLIED/MANUAL_REPLIED, replyAiConfidence)
- `GbpInsight` (date unique par location, impressions cumulés desktop/mobile maps/search + websiteClicks + callClicks + directionClicks + bookings)

**Module core (`lib/gbp/`)** :
- `types.ts` : types API Google
- `index.ts` : OAuth (buildAuthorizeUrl, exchangeCode, refreshAccessToken, getValidAccessToken auto-refresh) + sub-API clients (listAccounts, listLocations, fetchInsights, listReviews, replyToReview, createLocalPost) + `syncGbpAccount(id)` orchestrator

**Endpoints API (8)** :
- `GET /api/gbp/oauth/google/start` : redirect Google consent + state HMAC
- `GET /api/gbp/oauth/google/callback` : exchange code, upsert tous les GbpAccount fetché
- `GET/POST /api/gbp/locations` : GET list DB, POST trigger sync all
- `GET/POST /api/gbp/posts` : GET list, POST create (immédiat OU SCHEDULED si `scheduledAt` futur)
- `GET /api/gbp/reviews` : list avec filtres (replyStatus, minStars, locationId)
- `POST /api/gbp/reviews/[id]/reply` : `{ comment }` manuel ou `{ generate: true, tone: "professional"|"warm"|"apologetic", businessName? }` IA Claude
- `GET /api/gbp/insights?locationId=&days=30` : fetch + upsert cache GbpInsight
- `POST/GET /api/gbp/cron/sync` : auth CRON_SECRET. Sync all + publie SCHEDULED dont scheduledAt<now (max 50/run). Schedule `0 6 * * *`.

**Auto-reply IA reviews** :
- 3 tons : `professional` / `warm` / `apologetic`
- Prompt adapté starRating ≤3 (reconnaître problème) vs ≥4 (remercier)
- Max 400 chars (best practice Google : réponses courtes mieux lues)
- Pas d'emoji (ton formel Google)
- `replyAiConfidence` 0.9 normal, 0.5 si <50 chars

**Vars d'env** : `GBP_GOOGLE_CLIENT_ID/SECRET` (peut réutiliser `GOOGLE_CLIENT_ID/SECRET`), `NEXT_PUBLIC_BASE_URL`, `NEXTAUTH_SECRET`, `CRON_SECRET`, `ANTHROPIC_API_KEY` ou `OPENAI_API_KEY`.

⚠️ **Configurer Google Cloud Console** :
1. Activer les 5 APIs
2. OAuth consent screen avec scope `business.manage`
3. Demander accès production (sinon quota ridicule)

## 🚧 Restant phase 2

- UI dashboard `/gbp` : checklist audit + tabs Posts/Reviews/Insights
- Audit score /100 calculé (completeness photos/horaires/attributs/description, posts/mois)
- Upload photos (media items v4)
- Q&A management (mybusinessqanda v1)
- Auto-reply IA en mode cron avec filtre confidence ≥ 0.85

## 🧭 Quand l'invoquer

- L'utilisateur demande "ajoute GBP", "connecte Google Business", "réponses
  automatiques aux avis Google", "post Google My Business hebdo"
- Travail dans `app/(dashboard)/gbp/`, `app/api/gbp/*`, `lib/gbp/*` (à créer)
- Discussion sur la stratégie SEO local (GBP est l'asset n°1 du SEO local)

## 📋 Scope cible (depuis l'audit + WANAPUSH_MASTER_PROMPT)

4 features prévues :
1. **Connexion API GBP** (OAuth)
2. **Audit complet de la fiche** : photos, horaires, attributs, posts, NAP cohérence
3. **Réponses IA aux avis** (positifs ET négatifs, ton réglable par le user)
4. **Posts hebdomadaires programmés** (offres, événements, actus)

## 🔌 API Google à utiliser

**Choix recommandé** : **Google Business Profile API** (release 2022, anciens
endpoints My Business API en sunset progressif).

- Endpoint racine : `https://mybusinessbusinessinformation.googleapis.com/v1`
- Account management : `https://mybusinessaccountmanagement.googleapis.com/v1`
- Posts (Local Posts) : `https://mybusiness.googleapis.com/v4` (legacy, encore actif
  pour les posts au moment du dernier check — à revérifier)
- Reviews : via le v4 legacy aussi (`{accountId}/locations/{locationId}/reviews`)
- Insights : `https://businessprofileperformance.googleapis.com/v1` (depuis 2022,
  remplace l'ancien `reportInsights`)

**Scope OAuth** : `https://www.googleapis.com/auth/business.manage`

⚠️ **Pré-requis Google** : créer une OAuth app séparée dédiée GBP (ou multi-scope
sur l'app actuelle), puis demander l'**accès production** auprès de Google
(formulaire de vérification, lent — compter 2-4 semaines). Sans validation, le
quota est ridiculement bas (≈ 10 requêtes / jour).

## 🏗️ Architecture à monter (pattern social/ads)

```
lib/gbp/
  index.ts          ← getGbpClient(), ensureFreshAccount()
  types.ts          ← GbpLocation, GbpPost, GbpReview, GbpInsight
  google.ts         ← client HTTP Google Business Profile API + retry
  state.ts          ← OAuth state HMAC signé, TTL 10 min (cf lib/social/state.ts)
  redirect.ts       ← redirect_uri builder

app/api/gbp/
  oauth/google/start/        ← redirect Google consent + state
  oauth/google/callback/     ← échange code → tokens, encrypt, save
  locations/                 ← GET liste, POST sync
  posts/                     ← GET, POST create (+ programmer)
                  [id]/      ← GET, DELETE
  reviews/                   ← GET liste avec replies
                  [id]/      ← POST reply (texte ou IA)
  photos/                    ← GET, POST upload
  insights/                  ← GET metrics (views, calls, directions, clicks)
  cron/sync/                 ← daily : refresh locations + reviews + insights

app/(dashboard)/gbp/
  page.tsx             ← Server Component (auth + load gbpAccount)
  GbpClient.tsx        ← dashboard avec score /100 + checklist + tabs
  posts/PostComposer.tsx
  reviews/ReviewManager.tsx
```

## 🗄️ Modèles Prisma à créer

```prisma
model GbpAccount {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(...)
  googleAccountId String  // resourceName Google "accounts/{id}"
  accessToken   String   @db.Text  // ⚠️ AES-256-GCM lib/crypto
  refreshToken  String   @db.Text
  expiresAt     DateTime
  scopes        String   @db.Text
  status        GbpStatus @default(CONNECTED)  // CONNECTED | EXPIRED | REVOKED | ERROR
  lastSyncAt    DateTime?
  lastError     String?
  locations     GbpLocation[]
  createdAt     DateTime @default(now())
}

model GbpLocation {
  id              String   @id @default(cuid())
  gbpAccountId    String
  gbpAccount      GbpAccount @relation(...)
  googleLocationId String  // resourceName "locations/{id}"
  title           String
  address         Json     // { line1, city, postalCode, country }
  phone           String?
  websiteUrl      String?
  primaryCategory String?
  openingHours    Json?
  attributes      Json?
  posts           GbpPost[]
  reviews         GbpReview[]
  insights        GbpInsight[]
  @@unique([gbpAccountId, googleLocationId])
}

model GbpPost {
  id              String   @id @default(cuid())
  gbpLocationId   String
  gbpLocation     GbpLocation @relation(...)
  externalId      String?  // resourceName Google après publication
  type            String   // "STANDARD" | "EVENT" | "OFFER" | "ALERT"
  summary         String   @db.Text
  mediaUrls       Json?
  ctaType         String?  // BOOK | ORDER | SHOP | LEARN_MORE | CALL | SIGN_UP
  ctaUrl          String?
  scheduledAt     DateTime?
  publishedAt     DateTime?
  status          PostStatus  // DRAFT | SCHEDULED | PUBLISHING | PUBLISHED | FAILED
  lastError       String?
  createdAt       DateTime @default(now())
}

model GbpReview {
  id              String   @id @default(cuid())
  gbpLocationId   String
  gbpLocation     GbpLocation @relation(...)
  externalId      String   // resourceName Google
  reviewerName    String?
  reviewerPhoto   String?
  rating          Int      // 1-5
  body            String?  @db.Text
  reply           String?  @db.Text
  repliedAt       DateTime?
  state           ReviewState  // PENDING | REPLIED | IGNORED
  createdAt       DateTime
  @@unique([gbpLocationId, externalId])
}

model GbpInsight {
  id              String   @id @default(cuid())
  gbpLocationId   String
  gbpLocation     GbpLocation @relation(...)
  date            DateTime  // jour
  views           Int
  searches        Int
  calls           Int
  directions      Int
  websiteClicks   Int
  @@unique([gbpLocationId, date])
}
```

## ✅ TL;DR pour Claude

Si l'user demande de l'aide GBP **avant l'implémentation** :
1. Confirmer que le module est un stub (UI 17 lignes, rien d'autre).
2. Proposer le plan ci-dessus + estimer 3-4 sprints (OAuth + locations sync,
   reviews + reply IA, posts + scheduler, insights).
3. **Pré-requis** : avertir que la validation OAuth Google production prend
   2-4 semaines — démarrer le formulaire en parallèle du code.
4. Pattern à suivre : copier-coller la structure `lib/social/` (idem connecteur,
   idem state.ts, idem encryption).
5. **NE PAS** réutiliser la même OAuth app que le login Google → créer une app
   GBP dédiée (clean separation, scopes différents).
6. **IA pour les réponses aux avis** : passer par `lib/ai/` (cf Anthropic
   wrapper) avec un prompt qui module le ton (Direct/Premium/Friendly) + détecte
   le sentiment (1-2 étoiles = excuse + escalade, 4-5 = remerciement).

## 📚 Docs de référence existantes

- `_docs/CLAUDE.md` (modules planifiés, phase 1)
- `_docs/WANAPUSH_MASTER_PROMPT.md` — MODULE 5 checklist (12 items)
- `_docs/GUIDE_CLAUDE_CODE.md` — étape 8 (UI cible : score /100 + checklist)
- `_docs/WANAPUSH_AGENTS.md` — GBP_AGENT spec (rôle expert, prompt, livrables)
