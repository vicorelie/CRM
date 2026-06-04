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

> ⚠️ **État juin 2026** : module non implémenté. UI = page stub de 17 lignes.
> Aucune route API, aucun modèle Prisma, aucun connecteur Google. Cette skill
> sert de cahier des charges pour l'implémentation à venir.

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
