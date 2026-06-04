---
name: wanapush-aso-module
description: >
  Utilise cette skill quand l'utilisateur travaille sur le module ASO (App Store
  Optimization) de WanaPush : recherche de mots-clés App Store / Play Store, audit
  de fiche, suivi de positions, génération de screenshots IA. Module STUB en juin
  2026 — niche fonctionnelle uniquement pour les users qui ont une app mobile.
license: proprietary
version: 0.1
last_reviewed: 2026-06-04
---

# SKILL — WanaPush ASO Module (STUB)

> ⚠️ **État juin 2026** : module non implémenté (UI stub 17 lignes). Module de
> niche : ne concerne que les users avec une app mobile (publiée App Store
> et/ou Play Store).

## 🧭 Quand l'invoquer

- L'user demande "ASO", "mes mots-clés App Store", "audit fiche Play Store",
  "screenshots app", "rank tracking app"
- Travail dans `app/(dashboard)/aso/`, `app/api/aso/*`, `lib/aso/*`
- ⚠️ Si l'user n'a PAS d'app mobile, **rediriger vers SEO web** au lieu
  d'implémenter ASO (économie de scope).

## 📋 Scope cible

1. **Audit fiche** : title, subtitle, description, keywords (iOS), screenshots,
   app icon. Score /100 avec recommandations.
2. **Recherche de mots-clés** : difficulty, search volume, suggestions de longue
   traîne, gap analysis vs concurrents.
3. **Suivi de positions** : rank tracking quotidien pour N mots-clés (paid
   feature).
4. **Screenshots IA** : génération de mockups optimisés (claim + visuel +
   contexte) via DALL-E ou MidJourney, format App Store + Play Store
   (différents devices).
5. **Suivi des reviews** + réponses (similaire à GBP pour avis).

## 🔌 Sources de données — pas d'API officielle gratuite

⚠️ **Apple App Store et Google Play n'exposent PAS d'API publique pour les
métriques ASO** (rankings, search volume, etc.). Toutes les data ASO sérieuses
viennent de scrapers + estimations.

**Options pour les data marché** :
1. **Sensor Tower / Data.ai / AppFigures** : API enterprise (cher, contrat),
   inclut rank tracking + estimations downloads + reviews scraping
2. **AppTweak / AppRadar / MobileAction** : API mid-market (50-200 €/mois),
   focus ASO, plus simple à intégrer
3. **Scraping custom** : faisable mais fragile (Apple détecte et bloque),
   plus de maintenance

**Recommandation** : commencer avec AppTweak ou AppRadar comme provider,
abstraire derrière un connector `lib/aso/provider.ts` pour pouvoir switcher.

**Pour les données *de l'app du user***, accès direct possible :
- **App Store Connect API** : `https://api.appstoreconnect.apple.com/v1/`
  scope `app_store_connect_api`. Permet d'accéder à sa propre fiche + reviews
  + analytics.
- **Google Play Developer API** : `https://androidpublisher.googleapis.com/`
  scope `https://www.googleapis.com/auth/androidpublisher`. Idem côté Android.

## 🏗️ Architecture cible

```
lib/aso/
  index.ts          ← getAsoClient(), providers registry
  types.ts          ← Keyword, Ranking, AppMetadata, ReviewItem
  providers/
    appstore-connect.ts  ← API officielle Apple (sa propre app)
    google-play.ts       ← API officielle Google (sa propre app)
    apptweak.ts          ← provider tiers pour rank tracking + keyword research
  audit.ts          ← scoreApp(metadata) → { score, recommendations }
  keywords.ts       ← suggestKeywords(seed) + difficulty estimation
  screenshots.ts    ← generateScreenshotMockup(claim, image) via lib/ai/ad-image

app/api/aso/
  apps/              ← CRUD apps suivies
  audit/             ← POST audit on-demand
  keywords/          ← CRUD keywords trackés, GET suggestions
  rankings/          ← GET historique positions
  reviews/           ← GET liste avec replies
  screenshots/       ← POST generate
  cron/sync/         ← daily : rank tracking + reviews refresh

app/(dashboard)/aso/
  page.tsx
  AsoClient.tsx       ← dashboard avec score + onglets
  apps/AppPicker.tsx  ← sélecteur d'app à analyser
```

## 🗄️ Modèles Prisma à créer

```prisma
model AsoApp {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(...)
  store           String   // "ios" | "android"
  appId           String   // bundle ID iOS ou package name Android
  name            String
  iconUrl         String?
  currentVersion  String?
  rating          Float?
  ratingCount     Int?
  metadata        Json     // snapshot fiche (title, subtitle, description, keywords...)
  keywords        AsoKeyword[]
  reviews         AsoReview[]
  rankings        AsoRanking[]
  lastSyncAt      DateTime?
  @@unique([userId, store, appId])
}

model AsoKeyword {
  id              String   @id @default(cuid())
  asoAppId        String
  asoApp          AsoApp   @relation(...)
  keyword         String
  language        String   // "fr-FR", "en-US", ...
  country         String   // "FR", "US", ...
  searchVolume    Int?     // estimation provider
  difficulty      Int?     // 0-100, estimation provider
  trackedSince    DateTime @default(now())
  @@unique([asoAppId, keyword, language, country])
}

model AsoRanking {
  id              String   @id @default(cuid())
  asoKeywordId    String
  asoKeyword      AsoKeyword @relation(...)
  date            DateTime
  position        Int      // 1-250, 0 = pas dans le top 250
  @@unique([asoKeywordId, date])
  @@index([asoKeywordId, date])
}

model AsoReview {
  id              String   @id @default(cuid())
  asoAppId        String
  asoApp          AsoApp   @relation(...)
  externalId      String
  author          String?
  rating          Int      // 1-5
  title           String?
  body            String?  @db.Text
  version         String?
  country         String
  language        String
  reply           String?  @db.Text
  repliedAt       DateTime?
  createdAt       DateTime
  @@unique([asoAppId, externalId])
}
```

## ✅ TL;DR pour Claude

Si l'user demande d'implémenter ASO :
1. **Vérifier d'abord qu'il a une app** mobile. Sinon, c'est SEO web qu'il
   veut, pas ASO.
2. **Pas d'API gratuite pour les data marché**. Choisir AppTweak ou AppRadar
   (mid-market) ou Sensor Tower (enterprise). Provider abstrait derrière
   `lib/aso/providers/`.
3. **App Store Connect + Google Play Developer API** = data de SA PROPRE app
   (gratuit). À utiliser pour l'audit, les reviews et les downloads/installs.
4. **Rank tracking** = cron quotidien (provider mid-market a un quota /mois
   à respecter — pricing).
5. **Screenshots IA** : réutiliser `lib/ai/ad-image.ts` (déjà câblé pour Ads).
   Ratios spécifiques :
   - iPhone 6.7" : 1290×2796
   - iPhone 6.5" : 1242×2688
   - Play Store : 1080×1920 minimum
6. **Audit score** = pondéré : title (30 %) + subtitle iOS (20 %) + description
   (15 %) + keywords iOS (15 %) + screenshots (10 %) + icon (5 %) + reviews
   (5 %).
7. **Réponses aux reviews** : pareil que GBP — passer par `lib/ai/` avec
   un prompt qui module ton + escalation 1-2 étoiles.

## 📅 Évolutions

- Visual mockup template library (cf `lib/site-templates/` Shop pattern)
- A/B testing screenshots via App Store Connect Custom Product Pages
- Pre-launch keyword research (avant publication app)
- Concurrents tracking (top apps par catégorie + benchmarks)
