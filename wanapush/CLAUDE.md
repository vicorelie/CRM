# WanaPush — Plateforme SaaS Marketing Digital Auto-Piloté

**Production** : https://wanapush.com (domaine propre depuis 2026-05-26)
**Hébergement** : serveur dédié `wanatest.com` (141.95.221.24), nginx reverse proxy → Next.js :3000
**Last updated** : 2026-06-06

---

## Stack technique (vérifié juin 2026)

| Couche | Technologie | Notes critiques |
|--------|-------------|-----------------|
| Framework | Next.js 14.2.35 (App Router) | PPR experimental SEULEMENT, pas en prod |
| Langage | TypeScript 5 strict | `satisfies` préféré à `as` ; `z.infer` source de vérité |
| UI | Tailwind CSS 3.4.1 + shadcn/ui | v3 (pas v4) |
| ORM | Prisma 6.19.3 | **`engineType = "binary"` OBLIGATOIRE** dans schema.prisma |
| DB | MariaDB locale | Base `wanapush`, shadow `wanapush_shadow` (pour `prisma migrate dev`) |
| Auth | NextAuth v4.24.14 | JWT strategy, pas de DB sessions |
| IA | @anthropic-ai/sdk 0.92.0 | Modèles : Sonnet 4.6 (défaut), Opus 4.7 (tasks complexes), Haiku 4.5 (rapide) |
| Chiffrement | AES-256-GCM via `lib/crypto.ts` | TOUS les tokens OAuth/API au repos |
| Validation | Zod v4.4.3 | Sur TOUTES les routes API |

## Structure des modules

```
app/(dashboard)/
├── ads/          ← 4 plateformes pub (Meta E2E, Google v24, TikTok/LinkedIn sync)
├── social/       ← 5 réseaux sociaux (FB, IG, TikTok, LinkedIn, YouTube)
├── sites/        ← Gestion sites générés
├── generated-sites/ ← Builder WYSIWYG + config Pixel CAPI
├── shop/         ← E-commerce complet (type Shopify)
├── seo/          ← Audit SEO + optimizer
├── gbp/          ← Google Business Profile
├── leads/        ← Génération leads
├── email/        ← Email marketing
├── aso/          ← App Store Optimization
├── analytics/    ← Analytics & reporting
└── dashboard/    ← Vue principale

lib/
├── ads/          ← Connectors pub (meta.ts 844l, google.ts 1108l, ...)
├── social/       ← Connectors social (facebook, instagram, tiktok, ...)
├── capi/         ← Meta Conversions API (client, hash, enrich, pixel-script, ...)
├── site-gen/     ← Générateur de sites (schema, jsx-generator, ...)
├── site-editor.ts (3191l) ← Moteur WYSIWYG
├── react-template.ts (3277l) ← React → HTML statique
├── crypto.ts     ← AES-256-GCM
├── auth.ts       ← authOptions NextAuth
├── prisma.ts     ← Singleton PrismaClient
└── ai.ts         ← askAi() wrapper Claude API
```

## Skills disponibles (lire AVANT de coder)

Les fichiers `_docs/SKILL_*.md` documentent les conventions, pitfalls et architectures
de chaque module. **Toujours lire la skill pertinente avant de modifier un module.**

| Skill | Module |
|-------|--------|
| `SKILL_wanapush_ads_module.md` | Ads (Meta/Google/TikTok/LinkedIn) + PushModal |
| `SKILL_wanapush_capi_module.md` | Meta Pixel + Conversions API serveur |
| `SKILL_wanapush_social_module.md` | Réseaux sociaux |
| `SKILL_wanapush_site_generator.md` | Site Generator + Builder WYSIWYG |
| `SKILL_wanapush_shop_module.md` | E-commerce + Stripe Connect |
| `SKILL_wanapush_stack_best_practices.md` | Patterns React/Next.js/Prisma/TS |
| `SKILL_digital_marketing_wanapush.md` | Vision produit + stratégie marketing |
| `SKILL_wanapush_seo_module.md` | Module SEO |
| `SKILL_wanapush_leads_module.md` | Module Leads |
| `SKILL_wanapush_email_module.md` | Module Email |
| `SKILL_wanapush_gbp_module.md` | Google Business Profile |
| `SKILL_wanapush_aso_module.md` | App Store Optimization |
| `SKILL_wanapush_analytics_module.md` | Analytics |

## Règles absolues

### Sécurité
- **Tokens OAuth / clés API** → AES-256-GCM via `lib/crypto.ts` AVANT prisma insert/update
- **JAMAIS** retourner un token dans une réponse API (select explicite sans `accessToken`)
- **PII (email, phone)** → SHA256 avant tout stockage dans `CapiEvent.userDataHashed`
- **Validation Zod** sur toutes les routes API, même si validé côté client

### Base de données
- **`engineType = "binary"`** dans le bloc `generator` de `prisma/schema.prisma` — OBLIGATOIRE
- Prisma CLI lit `.env` (pas `.env.local`) → `DATABASE_URL` + `SHADOW_DATABASE_URL` dans `.env`
- Utiliser `select` explicite dans les queries (ne pas récupérer tout un record)
- `$transaction` pour toute mutation multi-tables

### React / Next.js
- **Server Components par défaut** — `"use client"` seulement si vraiment nécessaire
- **`Promise.all`** pour les fetches parallèles (pas séquentiels)
- **`revalidatePath`** après chaque mutation sinon cache stale
- **Granular `<Suspense>`** — une par section indépendante, pas une seule globale
- **`startTransition`** pour les state updates lourds (fix INP #1)

### Pas de duplication
Le Site Generator + Builder WYSIWYG existent déjà (`lib/site-editor.ts`, `lib/react-template.ts`,
`lib/site-gen/`). Ne JAMAIS reconstruire from scratch — étendre l'existant.

Le module Shop e-commerce (30+ tables Prisma, Stripe Connect, storefront) est complet.
Ne pas réinventer Cart/Order/Refund — étendre les tables existantes.

## Domaine + nginx

- **wanapush.com** → nginx `/etc/nginx/sites-available/wanapush.com` → proxy :3000
- **Preview sites générés** : `wanapush.com/preview/<slug>/` → `/var/www/wanapush/website-extraction/<slug>/dist/`
- **Rétrocompat** : bloc `location ~ ^/wanapush(/.*)?$` dans `conf.d/secretariat.conf` → strip préfixe + proxy :3000 (pour sites générés avec anciens hardcodes `/wanapush/api/...`)
- **Redirection** : `wanatest.com/preview/<slug>/` → 301 → `wanapush.com`

## Commandes utiles

```bash
# Dev
npm run dev

# Build
npm run build

# Prisma
npx prisma migrate dev --name <nom>   # nouvelle migration (crée + applique)
npx prisma generate                   # regénérer client après modif schema
npx prisma studio                     # UI DB

# Tests
npm test                              # 120 tests lib/capi — NE PAS CASSER
```

## Variables d'environnement clés (`.env.local`)

```env
DATABASE_URL=mysql://wanapush_user:...@localhost/wanapush
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://wanapush.com
NEXT_PUBLIC_BASE_URL=https://wanapush.com
ENCRYPTION_KEY=...            # AES-256-GCM base64
CRON_SECRET=...               # protège les routes /api/*/cron/*

META_APP_ID=1984786402139484  # App WanaPush (mode Live)
META_APP_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_ADS_DEVELOPER_TOKEN=...
TIKTOK_APP_ID=...             # Social (sbawowxgq4m4gas2l0)
TIKTOK_APP_SECRET=...
ANTHROPIC_API_KEY=...
```

## Vision produit (non-négociable)

WanaPush = **auto-pilote complet** pour campagnes PME.
Le client final décrit son activité + objectif → WanaPush fait TOUT :
landing page + Pixel + visuels IA + copy IA + push campagne + optimisation continue.

→ Ne JAMAIS proposer au fondateur (Victor) de faire quelque chose manuellement.
Toujours raisonner niveau plateforme : "quelle feature construire pour que SES clients
finaux obtiennent ce résultat automatiquement ?"
