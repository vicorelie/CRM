---
name: wanapush-seo-module
description: >
  Utilise cette skill pour tout travail sur le module SEO de WanaPush :
  auditer un site existant (crawl + score + Core Web Vitals), proposer/appliquer
  des fixes (via WordPress REST API ou SFTP), enrichir/réécrire le contenu via
  IA, gérer le sitemap discovery, intégrer Schema.org, ou faire du diagnostic
  de remédiation post-update Google. Déclencher quand l'utilisateur travaille
  sur lib/seo-audit.ts, lib/sitemap.ts, app/(dashboard)/seo/*, app/api/seo/*,
  ou demande conseil pour récupérer après un Helpful Content / Core Update,
  fixer INP, ou améliorer l'E-E-A-T d'un site.
license: proprietary
version: 1.0
last_reviewed: 2026-06-03
---

# SKILL — WanaPush SEO Module

> Skill **tactique** pour le module `/seo`. Complémentaire à :
> - `SKILL_digital_marketing_wanapush.md` (stratégie SEO globale + outils)
> - `SKILL_wanapush_site_generator.md` (SEO baked-in à la génération)
>
> **Spécificité de ce skill** : audit + fix + optimize de sites **EXISTANTS**
> (WordPress, statique, custom), avec workflow remédiation post-Google update.

## 🧭 Quand l'invoquer

- Modif `lib/seo-audit.ts` (crawl, score, types `Audit`/`SchemaOrgBreakdown`/`EeatSignals`)
- Modif `lib/sitemap.ts` (discovery, détection archives WordPress)
- Routes `app/api/seo/*` (13 endpoints — détaillés ci-dessous)
- UI `app/(dashboard)/seo/*` (`SeoAuditClient`, `EnrichContentModal`, `SeoModeSwitcher`, `SitewideOptimizer`)
- Conseil utilisateur : récupération après Helpful Content / Core Update Google
- Fix INP / LCP / CLS sur un site existant
- Implémentation Schema.org pour un type de business spécifique

## 🏗️ Architecture du module

```
lib/seo-audit.ts          ← crawl(url) → Audit (title, meta, h1, eeat, schemaOrg,
                            coreWebVitals, score, issues[]) — Cheerio + scoring
                            système de severity critical/warning/info

lib/sitemap.ts            ← discoverPages(rootUrl) : sitemap.xml + fallback crawl
                            isWordPressArchive() : skip catégories/tags/auteurs
                            (non éditables via wp/v2/pages|posts)

lib/pagespeed.ts          ← runPageSpeed(url) → CoreWebVitals (LCP/INP/CLS)
                            via PageSpeed Insights API ou crUX

lib/connectors/
  wordpress.ts            ← WordPress REST API : testWordpress(),
                            findPageByUrl(), applyFix()
  sftp.ts                 ← Fallback SFTP pour sites non-WP : applyFixSftp()
  sftp-paths.ts           ← Résolution chemin fichier depuis URL
  types.ts                ← FixId enum (les 10+ types de fix supportés)

lib/design-scanner.ts     ← scanPageDesign() : extraction palette + fonts
                            applyDesignToHtml() : injection style preset

app/api/seo/              ← 13 endpoints (cf section suivante)

app/(dashboard)/seo/      ← page.tsx + 4 composants :
                            SeoAuditClient (audit single page)
                            EnrichContentModal (ajout sections IA)
                            SeoModeSwitcher (audit vs refonte)
                            SitewideOptimizer (audit-all + auto-fix bulk)
```

## 📡 Les 13 endpoints `/api/seo/*`

### Audit & découverte

| Endpoint | Rôle | Notes |
|---|---|---|
| `POST /audit` | Audit single page (crawl + score + PageSpeed + commentaire IA) | `maxDuration: 90s`. AI commentary via `askWanapush` avec prompt référençant "Google règles mai 2026". |
| `POST /audit-all` | Audit en bulk (max 50 pages) | `maxDuration: 120s`. Renvoie `AuditSummary[]` (score, issuesCount, criticalCount par page). |
| `POST /discover` | Liste les pages d'un site (sitemap + fallback) | `maxDuration: 60s`. Max 100 pages. Renvoie aussi `kind: page|archive`. |
| `POST /site-health` | Vue globale (audit jusqu'à 15 pages + agrégation) | `maxDuration: 120s`. Calcule `avgScore` UNIQUEMENT sur pages éditables (exclut archives WP). |

### Fix & application

| Endpoint | Rôle | Notes |
|---|---|---|
| `POST /fix` | Applique un fix sur WordPress OU SFTP | `FixId` : `update-title`, `update-meta-description`, `add-canonical`, `add-og-tags`, `fix-image-alts`, `fix-h1`, `add-schema-article`, `add-schema-faq`, `enrich-content`, `rewrite-content`, `regenerate-content`. Connecteur déterminé via `siteId`. |
| `POST /optimize-page` | Audit + auto-fix orchestration (audit → suggest → apply) | `maxDuration: 180s`. Itère sur les `FixId` priorisés par impact. Skip si `isWordPressArchive()`. |

### Suggest IA (proposer sans appliquer)

| Endpoint | Rôle | Notes |
|---|---|---|
| `POST /suggest` | IA propose un fix pour un `FixId` donné | Renvoie la valeur suggérée + rationale. UI affiche, user valide → `/fix`. |
| `POST /suggest-content` | IA propose des sections H2 + paragraphes à AJOUTER | Cherche `targetKeyword` (déduit du title si absent). `SuggestedSection[]` avec rationale. |
| `POST /suggest-rewrite` | IA propose des réécritures de blocs `p`/`h2`/`h3` existants | `maxDuration: 90s`. `ExistingBlock` : id, type, original, suggested, why. Find&replace côté client. |

### Refonte / design

| Endpoint | Rôle | Notes |
|---|---|---|
| `POST /analyze-for-rebuild` | Analyse une page pour préparer une **refonte complète** (vs fix incrémentaux) | Vision IA sur le screenshot + extraction structure. Output utilisable par `/api/generate-site`. |
| `POST /preview-enrichment` | Aperçu d'un fix avant application | Renvoie HTML diff. |
| `POST /scan-design` | Extrait la palette/fonts/style d'une page | Pour réutilisation dans le site-generator. |
| `POST /screenshot` | Capture une page (puppeteer/playwright) | Utilisé par `scan-design` et `analyze-for-rebuild`. |

## 🔄 Workflow type recommandé

```
1. /discover                       → liste les pages éditables d'un site
                                     (exclut archives WP via isWordPressArchive)
     ↓
2. /audit-all (sur max 20 pages)   → tableau de bord : qui a besoin de fix
                                     en priorité (avgScore + criticalCount)
     ↓
3. /audit (page par page)          → diagnostic détaillé : title, meta,
                                     E-E-A-T signals, schemaOrg, CWV
                                     + commentaire IA top 5 actions
     ↓
4a. /suggest (FixId)               → IA propose un fix précis (ex: nouveau title)
4b. /suggest-content               → IA propose sections à ajouter
4c. /suggest-rewrite               → IA propose réécriture de blocs existants
     ↓
5. UI : user valide les suggestions
     ↓
6. /fix ou /optimize-page          → applique via WP REST API ou SFTP
     ↓
7. Re-audit pour vérifier le score
```

## 🩺 Best practices REMÉDIATION SEO 2026 (verified juin 2026)

Spécifique aux sites **EXISTANTS** déjà publiés (vs sites neufs couverts par
`SKILL_wanapush_site_generator.md`).

### Recovery après Google Helpful Content / Core Update mars-mai 2026

**Trois pièges majeurs** identifiés dans les sites WanaPush downrankés :

1. **Thin AI content au scale** : si une portion suffisante du site est templated/
   surface-level, le classifier supprime TOUTES les rankings (même les bonnes pages)
2. **Patterns de production masse** détectés : structures de phrases uniformes,
   absence de données originales, pas d'anecdotes ou détails case-specific
3. **Author bios 2024 ne suffisent plus** : Google mars 2026 weight les
   **verifiable experience signals** (auteurs nommés + profils externes liés +
   sources citées + expertise traçable)

### Plan de remédiation (3-6 mois, pas 3-6 semaines)

**⚠️ Surface-level edits ne suffisent PAS.** La récupération demande :

1. **Content consolidation, pas amélioration de tout** :
   - Identifier les pages thin/templated via `/audit-all`
   - **Supprimer** ou **rediriger 301** les pages overlapping vers la meilleure version
   - Raise le content quality floor : minimum de qualité absolu, pas moyenne
2. **Rebuild topical authority via clusters** :
   - Regrouper les pages par thème (`/discover` + analyse)
   - Pillar page principale + supporting pages internement linkées
3. **E-E-A-T renforcé** :
   - Auteur nommé avec profil externe vérifiable (LinkedIn, biographie professionnelle)
   - Sources citées avec liens sortants vers autorités du domaine
   - Date de publication + dernière mise à jour visibles
   - First-hand experience signals (cas réels, photos, témoignages)
4. **Schema.org renforcé** : `Article` + `Person` (auteur) + `Organization` + `Review`
   selon le type de page (cf playbook ci-dessous)

### Information Gain (mars 2026)

Google mesure « combien de neuf » apporte chaque page vs ce qui ranke déjà.
**Commodity content ne ranke plus.**

Pour les sites WanaPush :
- Injecter des **chiffres réels** du secteur (sources + dates)
- Inclure du **jargon métier précis** et des cas concrets locaux
- Éviter les structures « 5 conseils pour... » génériques

## 🚀 INP optimization 2026 (le piège Core Web Vitals)

**43% des sites échouent l'INP** — c'est le challenge #1 actuel.

### Seuils Google

| Métrique | Good | Needs improvement | Poor |
|---|---|---|---|
| **INP** | ≤ 200 ms | 200-500 ms | > 500 ms |

### Trois phases de l'INP

```
[Input Delay] → [Processing Time] → [Presentation Delay]
   (attente)     (event handlers JS)   (layout + paint)
```

### Solutions pratiques pour les sites WanaPush (Next.js 14 + React)

1. **Tâches JS > 50 ms bloquent le main thread** → casser en chunks
2. **`startTransition()` / `useTransition()`** : marquer les state updates
   non-critiques pour que React puisse les interrompre si l'user fait une autre
   interaction
   ```tsx
   const [isPending, startTransition] = useTransition();
   startTransition(() => {
     setSearchResults(filterHeavily(query)); // peut être interrompu
   });
   ```
3. **`scheduler.yield()` / `scheduler.postTask()`** : céder le main thread
   au bon moment pour les longues tâches synchrones
4. **Lazy hydration** : Next.js 14 hydration guidance → upgrader vers les
   versions récentes (INP-focused updates en 2024)
5. **Defer libs tierces** : tracking pixels, chat widgets, analytics → `defer`
   ou injection après interaction
6. **Reduce JS bundle initial** : `dynamic()` import pour les composants
   below-the-fold

### Quick diagnosis sur un site WanaPush

```
1. /audit avec withPageSpeed: true → renvoie coreWebVitals.inp
2. Si INP > 200ms : ouvrir DevTools → Performance → enregistrer
   une interaction (clic, scroll) → analyser Long Tasks
3. Cibler les tasks > 50 ms d'abord
```

## 📐 Schema.org playbook par type de business

| Type de page | Schema.org à inclure | Priorité |
|---|---|---|
| Article / blog post | `Article` + `Person` (auteur) + `BreadcrumbList` | Critique |
| Page entreprise locale | `LocalBusiness` + `Organization` + `PostalAddress` | Critique |
| Service spécifique | `Service` + `Offer` + `AggregateRating` (si avis) | Forte |
| Produit e-commerce | `Product` + `Offer` + `AggregateRating` + `Review` | Critique |
| FAQ | `FAQPage` (les questions/réponses) | Forte |
| Évènement | `Event` + `Place` + `Organization` | Forte |
| Recette | `Recipe` (nutrition, durée, etc.) | Forte (niche) |
| Profile auteur | `Person` + `sameAs` (LinkedIn, Twitter, etc.) | **NEW 2026 critique pour E-E-A-T** |

### Test rapide

- **Rich Results Test** : https://search.google.com/test/rich-results
- **Schema Markup Validator** : https://validator.schema.org

WanaPush `/audit` renvoie `schemaOrg.byType` : verifier que les types
critiques pour le business sont présents.

## 🔀 Différenciation avec le module Site Generator

| Aspect | `/seo` (ce skill) | `/generate` (site-gen) |
|---|---|---|
| Cible | Sites **existants** (WP, custom) | Sites **nouveaux** (from scratch) |
| Opération | Audit → fix → optimize incrémental | Génération complète d'un coup |
| Stockage | DB du site source (WordPress) | DB WanaPush (`GeneratedSite`) |
| Connecteurs | WordPress REST API, SFTP | N/A (output direct sur `/preview/`) |
| Output | Modif page-par-page, score evolutif | Site complet avec compositions |
| Quand cross-over | `/analyze-for-rebuild` peut feed `/api/generate-site` | Quand l'user veut tout recommencer plutôt que fixer |

## 🐛 Gotchas connus

- **Archives WordPress** : `/category/`, `/tag/`, `/author/`, `/YYYY/`, `/page/N/`
  → non-éditables via REST API. Toujours `isWordPressArchive(url)` avant fix/optimize.
- **Audit ≠ PageSpeed garanti** : si `withPageSpeed: true` mais la PageSpeed API
  est rate-limited → `coreWebVitals = null`, on dégrade gracieusement.
- **WordPress permissions** : application passwords doivent avoir `edit_posts`
  ET `edit_pages`. Sinon `applyFix` échoue silencieusement.
- **SFTP fallback** : `resolveSftpFilePath` ne couvre pas tous les CMS. Tester
  d'abord avec un fichier connu.
- **Score = signal, pas vérité absolue** : un score 95 peut quand même
  être downranké par Google si le contenu est thin. **L'audit ne capture pas
  la qualité éditoriale**.
- **Recovery timeline** : **3-6 mois**, pas 3-6 semaines. Ne pas promettre de
  miracle rapide après remédiation Helpful Content.
- **AI commentary cache** : pas de cache actuellement → coût IA peut exploser
  sur un `/audit-all` (1 call IA par page). Limiter en prod.

## ✅ TL;DR pour Claude

Quand l'user travaille sur le module SEO :

1. **Auditer d'abord, fixer ensuite** : `/audit-all` pour avoir la vue d'ensemble
   avant de toucher quoi que ce soit
2. **Archives WP = skip** : toujours vérifier `isWordPressArchive` avant fix/optimize
3. **Helpful Content recovery = 3-6 mois** : prévenir l'user, pas de
   miracle court terme
4. **Consolidation > amélioration** : pour un site impacté par update Google,
   supprimer/rediriger > essayer de fix toutes les pages
5. **E-E-A-T verifiable** : auteur nommé + profil externe + sources citées (pas
   juste "by Admin")
6. **INP > 200ms** : casser les longues tâches JS, `startTransition`,
   `scheduler.yield()`, defer libs tierces
7. **Schema.org** : adapter le type à la page (Article + Person + Organization
   minimum pour blog)
8. **AI commentary cher** : limiter `withCommentary: true` sur les bulk audits
9. **Score audit ≠ qualité réelle** : un 95 thin sera downranké, un 70 dense
   et expert peut très bien rester

## 📅 Maintenance & sources

**Données vérifiées juin 2026** :
- Helpful Content recovery : SEO Algorithm Recovery, Orange Monkey, Hobo Web,
  Digital Applied, BuildMVPFast, StyleFactoryProductions (recovery guides 2026)
- Core update mars 2026 + mai 2026 : Hobo, Evertune AI, SemiHuman, W3era
  (verified dans `SKILL_wanapush_site_generator.md`)
- INP optimization : CoreWebVitals.io, DebugBear, LinkGraph, Logos Web Designs,
  Google Codelabs (INP guide officiel 2026)
- Code : exploration directe `lib/seo-audit.ts`, `lib/sitemap.ts`,
  13 endpoints `/api/seo/*`

**Last verified : 2026-06-03**. À re-vérifier en septembre 2026 (post Google
core updates été).

**Skills associés** :
- [`SKILL_digital_marketing_wanapush.md`](./SKILL_digital_marketing_wanapush.md) — stratégie marketing globale
- [`SKILL_wanapush_site_generator.md`](./SKILL_wanapush_site_generator.md) — création sites WanaPush
- [`SKILL_wanapush_social_module.md`](./SKILL_wanapush_social_module.md) — module réseaux sociaux
