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

# SKILL — WanaPush Analytics Module

## ⚠️ MàJ 2026 best practices (sources officielles, audit 2026-06-09)

**🔴 GAP de framing — "cookieless" :** les cookies tiers **ne sont PAS dépréciés** sur Chrome (Google a fait marche arrière en 2024). MAIS efficacité en déclin (Safari/Firefox bloquent) et **Google a déprécié les 10 dernières APIs Privacy Sandbox en oct 2025** (Topics, Protected Audience…). → corriger tout wording "fin des cookies" ; stratégie = **first-party + server-side**, pas attendre une deadline qui n'arrivera pas. ([Jentis](https://www.jentis.com/blog/google-will-not-deprecate-third-party-cookies))

**GA4 + sGTM + Consent Mode v2 (standard 2026) :** sGTM = infra de prod. **Consent Mode v2 Advanced + modeling récupère 15-40 % des conversions** perdues au refus (conditions : ≥700 clics/7j/pays, taux consent ≥~20 %). **CMP certifiée Google obligatoire en EEE.** 🟠 GAP : le connecteur `ga4.ts` doit lire l'état de consentement (`gcs/gcd`) sinon data EU non conforme. ([Google consent SS](https://developers.google.com/tag-platform/tag-manager/server-side/consent-mode))

**Attribution 2026 — le modèle unique est mort :** norme = **dual model** (data-driven/MTA pour le tactique + **MMM** pour l'allocation budget). Adoption MMM ×3 (boostée par **Meridian**, le MMM open-source de Google). MMM = nativement privacy-safe (données agrégées) → idéal PME EU. 🟠 GAP : la skill agrège des KPIs mais n'a pas de couche attribution/incrementality. ([Deducive](https://www.deducive.com/blog/2025/12/12/our-guide-to-marketing-attribution-incrementality-and-mmm-for-2026))

**Détection d'anomalies :** l'écart-type 30j (±1.5/2/3σ) est sain ✅ — ajouter un **ajustement saisonnier (jour de semaine)** pour éviter les faux CRITICAL le week-end.

**À faire :** [ ] corriger le framing "cookieless" ; [ ] lecture Consent Mode v2 dans `ga4.ts` + note CMP certifiée EEE ; [ ] documenter dual-model (DDA + MMM open-source Meridian) ; [ ] note privacy-safe (mesure agrégée/server-side pour users EU) ; [ ] saisonnalité dans `anomalies.ts`. Voir `SKILL_wanapush_compliance_2026.md` (Consent Mode v2).

> **État 2026-06-08 : Backend MVP shippé.** `lib/analytics/{aggregators,anomalies}.ts`
> + 2 endpoints API. UI dashboard reste à brancher (squelette ModulePage existant).

## ✅ Backend shippé (2026-06-08)

**KPIs cross-modules agrégés** (best practices SaaS 2026) :

| Section | KPIs | Source DB |
|---|---|---|
| **Leads Funnel** | total, byTemperature (HOT/WARM/COLD/INVALID), byStatus, conversionRate, averageScore | FormSubmission |
| **Email Engagement** | campaignsSent, totalDelivered, uniqueOpens/Clicks, openRate/clickRate/bounceRate/unsubRate | EmailCampaign.stats |
| **Ads ROI** | totalSpend/Impressions/Clicks/Conversions/Revenue, ROAS, CTR, CPA, **byPlatform** breakdown | AdMetrics + Campaign.adAccount.platform |
| **Shop Revenue** | totalRevenue, paidOrders, AOV, refundedAmount, netRevenue, uniqueCustomers, repeatCustomersRate | Order + Refund + Customer |
| **GBP Visibility** | totalImpressions, websiteClicks, callClicks, directionClicks, averageRating, totalReviews, averageAuditScore | GbpInsight + GbpLocation |
| **Unit Economics** | CAC, LTV, **LTV:CAC ratio** (cible 3:1+), CAC Payback months, Lead Velocity Rate (LVR) | Calculé : Ads spend ÷ new customers Stripe |

**Détection d'anomalies** (`anomalies.ts`) :
- Algorithme : écart-type sur 30j glissants, comparaison dernier datapoint vs distribution baseline
- Seuils : ±1.5σ (INFO), ±2σ (WARNING), ±3σ (CRITICAL)
- 3 détecteurs : `ROAS_DROP` (chute ROAS Ads), `LEAD_INFLOW_DROP` (chute leads/jour), `AD_SPEND_SPIKE` (sur-dépense Ads — alerte scaling/auto-bidding)
- `Promise.allSettled` → best-effort par détecteur

**Endpoints API (2)** :
- `GET /api/analytics/overview?days=30` : tout-en-un, charge les 6 sections en parallèle via `Promise.all`
- `GET /api/analytics/anomalies` : liste les anomalies actuelles, triées CRITICAL → WARNING → INFO

**Pattern d'architecture** :
- 1 fonction `getX(userId, range)` par section dans `aggregators.ts`
- Orchestrator `getOverview()` lance tout en parallèle
- Best-effort par section : retourne zeros si pas de data (pas de throw)
- Helper `defaultRange(days)` + `daysAgo(n)` + type `DateRange`

**Sources benchmarks SaaS 2026** :
- LTV:CAC ratio cible 3:1+ (Baremetrics, Phoenix Strategy Group)
- CAC Payback : médian 15-18 mois, elite <12 mois
- NRR (Net Revenue Retention) cible 106%+
- Churn 3-5% target
- 138% ROI avec scoring lead vs 78% sans

## 📧 Founder Digest auto-pilote (shippé 2026-06-08)

**Module `lib/analytics/digest.ts`** — génère HTML markdown du récap + envoie via `lib/email.sendEmail()` (List-Unsubscribe RFC 8058 + footer RGPD).

**2 fonctions exportées** :
- `sendWeeklyDigest(ownerEmail, ownerName, overview, anomalies)` : récap complet 6 sections + bandeau anomalies. Skip auto si overview vide (pas de spam aux comptes inactifs).
- `sendCriticalAnomalyAlert(ownerEmail, ownerName, anomalies)` : email court SEULEMENT si CRITICAL présent. Skip sinon.

**Format digest weekly** : 7 sections markdown
- 🚨 Anomalies (si présentes) — colorées 🔴 CRITICAL / 🟠 WARNING / 🟡 INFO
- 📢 Publicité (Spend + Revenue + ROAS + CPA + top plateforme)
- 🎯 Leads (total + byTemperature + score moyen + taux conversion)
- ✉️ Email marketing (envois + open/click/unsub rates)
- 🛒 Boutique (CA + AOV + net + repeat customers %)
- 📍 Google Business Profile (impressions + clicks + appels + itinéraires + note ★)
- 💰 Unit Economics (CAC + LTV + ratio + payback + LVR)

**Cron crons (`app/api/analytics/cron/`) auth CRON_SECRET** :
- `POST/GET /api/analytics/cron/weekly-digest` : Schedule `0 8 * * 1` (lundi 8h UTC). Sélectionne users avec ≥1 module actif (GeneratedSite OR AdAccount CONNECTED OR Shop OR EmailCampaign SENT). Skip si overview vide.
- `POST/GET /api/analytics/cron/daily-anomalies` : Schedule `0 9 * * *` (9h UTC). Email ALERTE SEULEMENT si CRITICAL détecté. Sinon skip (pas de fatigue email).

**Best practice 2026 cadence (sources Klipfolio, Eleken, Thoughtspot)** :
- **Daily** : alertes CRITICAL only (fast-moving metrics : CAC, engagement, conversion)
- **Weekly** : récap complet (sweet spot PME — pas trop bruyant)
- **Monthly** : revenue + retention focus (à shipper phase 2)
- **Quarterly** : performance + ROI strategic (à shipper phase 2)

**Variables d'env** : `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM_DEFAULT` (défauts `analytics@wanapush.com` / `alerts@wanapush.com`).

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
