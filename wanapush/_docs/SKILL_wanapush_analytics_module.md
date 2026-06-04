---
name: wanapush-analytics-module
description: >
  Utilise cette skill quand l'utilisateur travaille sur le module Analytics central
  de WanaPush : agrégation cross-modules (Social + Ads + Shop + SEO + GBP), GA4
  integration, dashboard ROAS/CAC/LTV, rapports PDF mensuels, alertes anomalies.
  Module STUB en juin 2026 — cette skill décrit le scope cible + les sources
  d'analytics déjà existantes par module à agréger.
license: proprietary
version: 0.1
last_reviewed: 2026-06-04
---

# SKILL — WanaPush Analytics Module (STUB + agrégation)

> ⚠️ **État juin 2026** : module central non implémenté (UI stub 17 lignes).
> MAIS : chaque module métier a ses propres analytics → la skill liste ce qui
> existe déjà et qu'on doit agréger.

## 🧭 Quand l'invoquer

- L'user demande "dashboard global", "rapport mensuel PDF", "vue 360 business",
  "intégrer GA4", "alerte anomalie ROAS"
- Travail dans `app/(dashboard)/analytics/` ou un futur `app/api/analytics/*`

## 📊 Sources d'analytics existantes (à agréger)

### Social — déjà implémenté
- Modèle Prisma `PostAnalytics` (KPIs par target/jour)
- Source par plateforme :
  - Facebook/Instagram : `/{post_id}/insights?metric=impressions,reach,engaged_users`
  - TikTok : `/research/video/query/` (prod only)
  - LinkedIn : `/socialActions/{urn}/likesSummary` + organic
  - YouTube : `videos.list?part=statistics`
- Cron quotidien : `app/api/social/cron/analytics/` (à confirmer si actif)

### Ads — déjà implémenté
- Modèle `AdMetrics` : spend/impressions/clicks/conversions/revenue par jour
- Sync via `app/api/ads/cron/sync/route.ts` (toutes les heures)
- Calculs dérivés dans `lib/ads/sync.ts` : CTR, CPC, CPA, ROAS

### Shop — déjà implémenté
- Modèles `Order`, `OrderItem`, `Refund` → permet de calculer CA, panier moyen,
  taux de retour
- Modèle `Customer.totalSpent` / `ordersCount` / `lastOrderAt`
- Stripe Events (`StripeEvent`) → idempotence audit
- Pas de dashboard d'agrégation natif (route `app/api/shop/[siteSlug]/analytics/route.ts`
  à créer si pas encore)

### SEO — déjà implémenté (partiel)
- `SiteConnection` + résultats d'audits via `app/api/seo/audit*` (untracked module)
- Pas de modèle "snapshot" historique → tous les audits sont one-shot

### CAPI/Pixel — déjà implémenté
- Modèle `CapiEvent` : log de tous les events server-side avec status
- Compte d'events PageView/Lead/Purchase/etc. par site sur N jours

### GBP — pas encore implémenté
- Modèle planifié `GbpInsight` (cf `SKILL_wanapush_gbp_module.md`)

## 🏗️ Architecture cible

```
lib/analytics/
  aggregators.ts    ← getOverview(userId, range) : agrège toutes les sources
  ga4.ts            ← client GA4 Data API (si l'user veut linker son GA4)
  reports.ts        ← buildMonthlyPdfReport() : génération PDF via puppeteer
                      ou un service externe (Browserless, Gotenberg)
  anomalies.ts      ← détection (ROAS qui chute, traffic divisé par 2, etc.)
                      basée sur écart-type sur 30j glissants

app/api/analytics/
  overview/          ← GET : KPIs cross-modules pour la home
  reports/monthly/   ← POST : générer PDF + email (Resend)
                       GET : lister rapports passés
  alerts/            ← CRUD règles d'alertes user-defined
  ga4/connect/       ← OAuth GA4

app/(dashboard)/analytics/
  page.tsx           ← Server Component : charge l'overview
  AnalyticsClient.tsx  ← tabs : Overview / Social / Ads / Shop / SEO / GBP
                          + range picker (7j / 30j / 90j)
                          + export PDF button
```

## 🗄️ Modèles Prisma à créer (minimal)

```prisma
model AnalyticsSnapshot {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(...)
  date        DateTime  // jour
  source      String   // "social" | "ads" | "shop" | "seo" | "capi" | "gbp"
  data        Json     // KPIs structurés selon la source
  @@unique([userId, date, source])
  @@index([userId, date])
}

model AnalyticsAlert {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(...)
  metric      String   // "ads.roas" | "shop.conversion_rate" | "social.reach"
  threshold   Float
  direction   String   // "below" | "above"
  window      Int      // jours
  enabled     Boolean  @default(true)
  lastTrigger DateTime?
}

model MonthlyReport {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(...)
  month       String   // "2026-06"
  pdfUrl      String   @db.Text  // S3/R2 URL signée
  summary     Json     // résumé exécutif structuré
  generatedAt DateTime @default(now())
}
```

## ✅ TL;DR pour Claude

Si l'user demande d'implémenter Analytics :
1. **Ne pas créer une nouvelle source de données**. Tout existe déjà éparpillé
   dans `PostAnalytics`, `AdMetrics`, `Order`, `CapiEvent`. La skill = un
   AGGREGATOR, pas un collecteur.
2. **Snapshot quotidien** dans `AnalyticsSnapshot` via un cron (idempotent),
   pour éviter de retaper des queries lourdes sur 90j à chaque render.
3. **GA4 = nice-to-have**, pas critique. Beaucoup d'users n'ont pas de GA4
   ou n'ont pas envie de connecter. Le dashboard doit fonctionner sans.
4. **PDF mensuel** : pas de dépendance lourde si possible. Tester d'abord un
   render HTML/CSS print + puppeteer-core en serverless function. Sinon
   Browserless/Gotenberg en service externe.
5. **Anomalies** : commencer simple — écart-type 30j glissants. Surcouche ML
   plus tard si besoin.
6. **Page d'overview = Server Component**. Lourd à charger, donc cache via
   `revalidate = 3600` (1h). Le bouton refresh force une nouvelle agrégation.

## 📚 Sources à interroger

| Source | Query Prisma exemple |
|---|---|
| Social | `prisma.postAnalytics.aggregate({ where: { account: { userId } } })` |
| Ads | `prisma.adMetrics.aggregate({ where: { campaign: { user: { id: userId } } } })` |
| Shop | `prisma.order.aggregate({ where: { shop: { user: { id: userId } } } })` |
| CAPI | `prisma.capiEvent.groupBy({ by: ['eventName', 'status'], where: { sitePixel: { generatedSite: { user: { id: userId } } } } })` |

## 📅 Évolutions

- WanaScore™ (audit Master Prompt) = composite cross-modules à calculer ici.
- Benchmark sectoriel : si on a assez de users, anonymiser et offrir des
  moyennes par secteur (cf `Business.sector`).
- Connecteur Mixpanel / PostHog si demande d'un user enterprise.
