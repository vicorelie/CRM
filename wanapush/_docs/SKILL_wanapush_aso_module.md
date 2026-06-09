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

## ⚠️ MàJ 2026 best practices (sources officielles, audit 2026-06-09)

**Apple — algorithme sémantique LLM (2026) :** l'App Store interprète l'intention → optimiser le **champ sémantique** (synonymes/intention), pas le keyword-stuffing. ([Demircode](https://www.demircode.com/en/blog/app-store-optimization-aso-guide))

**Custom Product Pages (iOS) = levier conversion #1 :** limite 35 → **70 CPP** (oct 2025), **discoverables** via keywords assignés (sans re-review), Apple annonce **+156 % de conversion** vs page par défaut. ([RespectASO](https://respectaso.com/blog/custom-product-pages-app-store-guide-2026/))

**Métadonnées Apple :** title 30 / subtitle 30 / keywords 100 / description 4000 / **promo text 170 (modifiable sans nouvelle version)**. **Nouveau 2026 : Apple extrait les keywords des captions de screenshots** → les screenshots font de la découverte. ([char limits](https://www.appconnecttranslate.com/tools/app-store-character-limits/))

**Screenshots iOS — specs à jour (la skill liste du 6.7" obsolète) :** 6,9" = 1290×2796 **ou** 1320×2868 ; 6,5" = 1284×2778 ou 1242×2688. ([Apple specs](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/))

**Google Play — I/O 2026 :** **Custom Store Listings générées par Gemini** (1 clic + localisation auto) ; **Gemini App Discovery + "Ask Play"** → copy lisible humain **ET** LLM. Les CSL ne donnent **aucun boost ASO** (pertinence/conversion seulement). ([Android Dev Blog](https://android-developers.googleblog.com/2026/05/io-2026-whats-new-in-google-play.html))

**Policy Q2-2026 :** features IA-assistées = cadrage user-facing clair ; cohérence privacy/comportement in-app ; localisation reviewée plus agressivement.

**À faire :** [ ] corriger ratios screenshots ; [ ] CPP iOS + CSL Play comme features first-class ; [ ] scorer "keywords dans captions screenshots" ; [ ] `suggestKeywords()` matching sémantique (pas exact-match) ; [ ] copy humain+LLM ; [ ] checklist policy Q2-2026. Label IA des visuels générés → cf. `SKILL_wanapush_compliance_2026.md`.

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
