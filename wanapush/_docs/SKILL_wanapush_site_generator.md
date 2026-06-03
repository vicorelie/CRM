---
name: wanapush-site-generator
description: >
  Utilise cette skill pour tout travail sur le module Site Generator de WanaPush :
  modifier le pipeline de génération IA (prompt, compositions, design profiles,
  rendering), ajouter un secteur ou une variante, débugger le rendu, étendre
  l'éditeur WYSIWYG (site-editor.ts), ou conseiller sur les best practices 2026
  pour landing pages générées (conversion, SEO E-E-A-T, Core Web Vitals).
  Déclencher quand l'utilisateur touche à lib/site-gen/*, lib/site-editor.ts,
  app/api/sites/*, app/(dashboard)/generate/*, le modèle GeneratedSite, le
  servage /preview/<slug>/, ou demande conseil sur la qualité des sites générés.
license: proprietary
version: 1.0
last_reviewed: 2026-06-03
---

# SKILL — WanaPush Site Generator

> Module **central** de WanaPush. Génère des landing pages et multi-pages
> sectorielles via IA + compositions pré-définies, hébergées sur
> `wanapush.com/preview/<slug>/`, avec Pixel Meta auto-installé et éditeur
> WYSIWYG intégré.
>
> Ce skill **NE remplace PAS** le code — il documente les conventions, les
> pièges et les best practices 2026 pour ne pas casser l'existant.

## 🧭 Quand l'invoquer

- Modif de `lib/site-gen/{prompt,compositions,sector-detector,style-presets,jsx-generator,render-html,schema}.ts`
- Travail sur `lib/site-editor.ts` (~3 191 lignes — éditeur WYSIWYG)
- Routes `app/api/sites/*`, `app/api/generate-site/*`, `app/api/preview/*`
- UI `app/(dashboard)/generate/*` ou `app/(dashboard)/sites/*`
- Modèle Prisma `GeneratedSite` ou `SitePixel` (le Pixel CAPI lié)
- Conseil sur la qualité des sites générés (conversion, SEO, performance)

## 🏗️ Architecture du module

```
lib/site-gen/
  schema.ts              ← Brief Zod : brandName, sector, audience, goal,
                           keywords, lang, tone, colors, framework (html|react),
                           referenceDesign (visualAnalysis multimodal)
  sector-detector.ts     ← Détection auto du secteur depuis le prompt user
                           (artisan_urgence, creatif_visuel, restaurant, …)
  compositions.ts        ← 2-3 compositions par secteur :
                           heroType + designProfile + sections[] + defaultColors
  style-presets.ts       ← 8 designProfiles : minimal, bold-vibrant,
                           trust-corporate, luxury-elegant, playful-startup,
                           editorial, tech-modern, wellness-soft
                           → injection CSS Tailwind override
  prompt.ts              ← Construit le prompt Claude (avec REACT_CUSTOM_CSS_BLOCK)
  jsx-generator.ts       ← Transforme le plan IA en JSX React/Tailwind
  render-html.ts         ← Rendu HTML statique alternatif (framework="html")

lib/site-editor.ts       ← Script WYSIWYG injecté avec ?edit=1
                           data-edit-section + data-edit-field
                           Save → POST /api/sites/{slug}/edits → rebuild → refresh

prisma/                  ← GeneratedSite (slug unique, brief Json, pages Json)
                         ← SitePixel (1-1 avec GeneratedSite, lié à AdAccount)

app/api/sites/[slug]/    ← /edits (save WYSIWYG), /build (re-render)
app/api/generate-site/   ← endpoint principal de génération
app/(dashboard)/generate/ ← UI builder

Servage : wanapush.com/preview/<slug>/  (nginx → /public/preview/<slug>/index.html)
```

## ⚙️ Pipeline de génération

```
1. User fournit brief (UI ou API)
     ↓
2. detectSector(prompt) → un de ~12 secteurs
     ↓
3. Pick random parmi les 2-3 compositions du secteur
   → impose heroType + designProfile + sections[]
     ↓
4. prompt.ts construit le prompt avec :
   - Brief enrichi (colors, tone, keywords)
   - REACT_CUSTOM_CSS_BLOCK (sélecteurs Tailwind cibles)
   - Composition imposée à REMPLIR (pas à choisir)
   - referenceDesign si l'user a fourni un site exemple
     ↓
5. askAi() → renvoie GenerationPlan (Zod-validé)
     ↓
6. jsx-generator.ts : Plan → JSX React + Tailwind
     ↓
7. Inject style-preset (CSS du designProfile) + custom CSS de l'IA
     ↓
8. Sauve en DB (GeneratedSite.pages) + écrit sur disque (/public/preview/<slug>/)
     ↓
9. Sprint 1 CAPI : si user a configuré un Pixel, on l'auto-installe via SitePixel
     ↓
10. Site servi sur wanapush.com/preview/<slug>/ + éditable via ?edit=1
```

## 🎯 Best practices LANDING PAGES 2026 (verified juin 2026)

### Structure & UX

- **Un seul segment d'audience par page + un seul CTA primaire.** Ne pas mélanger les profils.
- **Decision sequence** : relevance → credibility → action (Above the fold doit cocher les 3)
- **Hero section** : pas de langage clever. Trois éléments seulement :
  1. Audience context (« Pour les déménageurs en IdF »)
  2. Practical outcome (« Trouvez 10 leads qualifiés / semaine »)
  3. Timeline ou mechanism cue (« En 14 jours sans Google Ads »)
- **Match headline word-for-word** avec l'ad qui amène le user (cohérence message = +conversion)
- **Stable section architecture** : garder un ordre type pour pouvoir A/B tester section par section

### Formulaires

- **3 champs = optimal**. Passer de 4 à 3 → **jusqu'à +50% conversion**.
- Réduire à 2 si lead magnet faible engagement (newsletter), garder 3-4 pour devis/RDV
- Toujours mobile-first (83% du trafic landing en 2026)

### Performance

- **5s+ de chargement = 3× plus de bounce**. Viser <2s LCP.
- **Core Web Vitals 2026** (seuils Google) :
  - **LCP ≤ 2,5 s** (Largest Contentful Paint)
  - **INP ≤ 200 ms** (Interaction to Next Paint — 43% des sites échouent !)
  - **CLS ≤ 0,1** (Cumulative Layout Shift)
- INP est devenu le **principal challenge** : réduire le JS bloquant, défer les libs tierces
- Mobile-first design (pas responsive shrinking d'un desktop)

### Cadence de test

- **Top performers : 2-3 tests/mois** (compound improvements)
- IA = prototype, **PAS publish-ready**. Toujours review humain sur claims/positioning.

## 🔎 SEO 2026 — Ce qui change pour les sites IA (verified juin 2026)

Update Google de **mars 2026** + **mai 2026** ont reweighté plusieurs signaux. Très impactant pour les sites WanaPush (générés IA).

### E-E-A-T renforcé

- **Experience** (1er E) ajouté en déc 2022, **devenu critère majeur** en 2026
- Pour les sites générés : injecter des **éléments d'expérience réelle** (témoignages signés, photos avant/après, années d'activité, certifications)
- AI content **pas pénalisé en soi**, mais doit être « substantially edited by a named human expert »
- Sites avec **fort ratio AI brut = -25 à -35% rankings** sur niches concurrentielles (update mai 2026)

### Information Gain (mars 2026)

- Google mesure maintenant « combien de neuf » apporte un contenu vs ce qui ranke déjà
- **Commodity content ne ranke plus** (« générique, widely available, anyone could have written it »)
- Pour WanaPush : intégrer dans le prompt des éléments **sectoriels précis** (chiffres réels du secteur, jargon métier, cas concrets locaux)

### Stratégie pour les sites générés

1. **Inputs riches** : forcer le user à fournir un brief détaillé (pas juste « plombier paris »)
2. **Injection d'éléments humains** : champ "expérience" obligatoire dans le brief, intégré dans Hero/About
3. **Schema.org** auto-généré : LocalBusiness, Service, Review (si applicable)
4. **Pas de boilerplate** : varier les structures de paragraphe entre secteurs
5. **Mention humaine** : « Cette page a été rédigée avec l'assistance IA puis revue par [Nom] » (en footer, transparence Google-friendly)

## 🎨 Conventions code WanaPush

### Compositions par secteur

```ts
// Une composition = un plan déterministe que l'IA REMPLIT.
// L'IA ne choisit jamais la structure, juste le contenu.
type Composition = {
  heroType: "hero" | "hero_split" | "hero_slider" | "hero_blob";
  designProfile: "minimal" | "bold-vibrant" | "trust-corporate" | ...;
  sections: string[]; // ordre exact : ["hero", "stats", "process", "faq", ...]
  defaultColors: { primary: string; secondary: string };
};
```

**Pourquoi** : éviter l'inconsistance des outputs IA. L'IA est créative sur le CONTENU mais pas sur la STRUCTURE — d'où la pré-décision côté code.

**Ajout d'un secteur** :
1. Ajouter le type dans `Sector` (`sector-detector.ts`)
2. Ajouter au moins **2-3 compositions distinctes** dans `compositions.ts`
3. Ajouter une règle de détection dans `RULES[]`
4. Tester avec `detectSector("nouveau prompt user")`

### Design profiles (8 actuellement)

Chaque profile injecte un CSS preset qui **override Tailwind** par sélecteur :

| Profile | Quand l'utiliser | Signature visuelle |
|---|---|---|
| `minimal` | SaaS, B2B premium | Inter, lignes fines, peu d'ombres, radius 0.5 |
| `bold-vibrant` | DTC, jeunes marques | Plus Jakarta, gradients, ombres marquées, radius 1.5 |
| `trust-corporate` | Pro, urgence, médical | Source Sans, structuré, ombres subtiles, radius 0.5 |
| `luxury-elegant` | Haut de gamme, beauté | Serifs, peu de couleur, ombres profondes |
| `playful-startup` | Apps, fun, jeunesse | Rounded, couleurs vibrantes, micro-interactions |
| `editorial` | Studios créatifs, magazines | Black/or, layouts asymétriques, gros titres |
| `tech-modern` | SaaS techy, dev tools | Mono fonts, dark mode friendly |
| `wellness-soft` | Yoga, coaching, beauté | Pastel, douceur, beaucoup d'espace |

### Prompt engineering — les pièges

Le `REACT_CUSTOM_CSS_BLOCK` du prompt force l'IA à cibler les **sélecteurs Tailwind réels** présents dans le JSX (`.bg-primary`, `.font-heading`, `[class*="rounded-2xl"]`, etc.). **Sans ça**, l'IA invente des `.wp-*` qui n'existent pas dans le DOM → CSS invisible.

⚠️ **Ne JAMAIS supprimer ce block du prompt** sans avoir une stratégie de remplacement.

### Site editor WYSIWYG (`lib/site-editor.ts`, ~3 191 lignes)

S'active uniquement avec `?edit=1` dans l'URL. **Ne touche rien en prod normale**.

- `data-edit-section="hero"` : identifiant de section
- `data-edit-field="title"` ou `"items.0.title"` : chemin du champ éditable
- Edits accumulés en Map mémoire → `Save` POST `/api/sites/{slug}/edits`
- Backend mute la `pages` JSON dans `GeneratedSite` puis rebuild

**Si tu touches l'editor** : tester avec `?edit=1` ET sans pour vérifier zéro régression en prod.

## 🌐 Hébergement & Pixel

- Site servi sur `https://wanapush.com/preview/<slug>/` (redirection 301 depuis l'ancien `wanatest.com` depuis 2026-05-27)
- nginx rewrite : `location ~ ^/wanapush(/.*)?$` → `rewrite ^/wanapush(/.*)?$ $1 break;` (rétrocompat appels relatifs hardcodés)
- **Sprint 1 CAPI** : le Pixel Meta s'auto-installe si user lie un `AdAccount` au site. `SitePixel.events` = ["PageView", "Lead", "ViewContent", …]
- Pour Ads Meta avec destination = site WanaPush → Pixel déjà actif, optimisation LEADS possible immédiatement

## 🐛 Gotchas connus

- **Image absente** = AdSet Meta refusé (subcode 2446496) — toujours mettre une image hero
- **Customs CSS .wp-*** : si l'IA invente des classes en `.wp-*` (au lieu de cibler `.bg-primary` etc.), le CSS sera invisible. Vérifier que `REACT_CUSTOM_CSS_BLOCK` est bien dans le prompt.
- **Conflits CSS thème** : règles `!important` du preset peuvent surcharger des classes Tailwind du JSX → utiliser des styles inline en dernier recours
- **3 191 lignes du site-editor** : ne jamais refactor en une passe, segmenter par fonction (text edit / image edit / color picker / save flow)
- **Slugs collisions** : `GeneratedSite.slug` est unique. Au create, retry avec suffixe `-2`, `-3` si conflit.
- **Build endpoint long** : un rebuild de site avec beaucoup d'images peut dépasser le timeout par défaut. Streamer les progrès si UX critique.

## ✅ TL;DR pour Claude

Quand l'user travaille sur le site generator :

1. **Composition décide la structure**, l'IA ne touche qu'au contenu — ne pas casser ce principe
2. **REACT_CUSTOM_CSS_BLOCK est sacré** dans le prompt — sans ça, le CSS de l'IA est invisible
3. **8 design profiles, 12 secteurs, 2-3 compos chacun** — étendre, pas refactor
4. **Best practice 2026** : Hero = audience + outcome + timeline (PAS de clever), formulaires 3 fields, CTA unique
5. **Core Web Vitals** : LCP ≤ 2,5 s, INP ≤ 200 ms (le piège), CLS ≤ 0,1
6. **SEO E-E-A-T** : injecter de l'expérience humaine réelle dans les sites pour ne pas être downranké par les updates mars/mai 2026
7. **Site editor 3 191 lignes** : segmenter les modifs par responsabilité
8. **Pixel** : si user veut destination Meta Ads = site généré, vérifier que `SitePixel` est configuré
9. **AI content** : revue humaine **obligatoire** sur claims et positioning — ne jamais publier brut

## 📅 Maintenance & sources

**Données vérifiées contre les sources de référence juin 2026** :
- Best practices conversion : Perspective, Unicorn Platform, ALM Corp, Foundry CRO, Genesys Growth (2026 guides landing pages)
- SEO E-E-A-T : Hobo Web, Evertune AI, SemiHuman, SEOPress, W3era, SEOProfy (updates Google mars + mai 2026)
- Core Web Vitals : Mewa Studio, Ideafueled, Digital Applied, ALM Corp (INP comme principal challenge 2026)

**Last verified : 2026-06-03**. À re-vérifier en septembre 2026 (post Google core updates été).

**Skills associés** :
- [`SKILL_digital_marketing_wanapush.md`](./SKILL_digital_marketing_wanapush.md) — stratégie marketing globale
- [`SKILL_wanapush_social_module.md`](./SKILL_wanapush_social_module.md) — module réseaux sociaux
