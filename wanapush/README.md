# WanaPush

Plateforme SaaS B2B de marketing digital tout-en-un : générateur de sites IA,
réseaux sociaux multi-plateformes, publicité payante (Meta/Google/TikTok/LinkedIn),
SEO, e-commerce intégré, capture de leads, tracking Pixel + Conversions API.

**Site** : https://wanapush.com — déployé derrière nginx sur `wanatest.com` avec
`basePath: "/wanapush"` (cf `next.config.mjs`).

## Stack

- **Frontend** : Next.js 14 (App Router) + React 18 + TypeScript 5 + Tailwind 3
- **Backend** : Next.js Route Handlers + Node.js (runtime)
- **DB** : MariaDB / MySQL via Prisma 6 (`engineType = "binary"` obligatoire)
- **Auth** : NextAuth v4 (Google OAuth + credentials)
- **IA** : Anthropic Claude (principal) + OpenAI (fallback / image)
- **Paiement** : Stripe (Connect côté Shop)
- **Email** : Resend (transactionnel)
- **Storage** : disque local actuellement (à migrer S3/R2 — cf `public/uploads`)

## Quickstart (fresh clone)

```bash
# 1. Cloner et installer
git clone <repo-url>
cd wanapush
npm install

# 2. Variables d'environnement
cp .env.example .env.local
# → remplir les valeurs (DB, NEXTAUTH_SECRET, ENCRYPTION_KEY, etc.)

# 3. Base de données
npx prisma generate         # client TypeScript
npx prisma migrate deploy   # applique toutes les migrations en BDD

# 4. Lancer en dev
npm run dev
# → http://localhost:3000 (ou /wanapush si basePath actif)

# 5. Build prod
npm run build
npm start
```

⚠️ **`ENCRYPTION_KEY`** ne doit **jamais** être changée en prod : tous les
tokens chiffrés en BDD deviendraient illisibles. Générer une fois pour toutes
avec `openssl rand -hex 32`.

## Structure

```
wanapush/
├── app/
│   ├── (auth)/           ← login + register
│   ├── (dashboard)/      ← /social, /ads, /seo, /shop, /sites, /leads, /gbp, ...
│   ├── api/              ← Route Handlers (Next.js Server)
│   ├── layout.tsx        ← root layout
│   └── page.tsx          ← landing
├── lib/                  ← code partagé (prisma, auth, crypto, ai, ...)
│   ├── ads/              ← connecteurs Meta/Google/TikTok/LinkedIn Ads
│   ├── social/           ← connecteurs FB/IG/TT/LI/YT
│   ├── capi/             ← Conversions API Meta (60+ tests)
│   ├── site-gen/         ← générateur de sites IA
│   ├── connectors/       ← WordPress + SFTP pour le SEO
│   ├── onboarding/       ← wizards de connexion par plateforme
│   └── i18n/             ← traductions UI
├── prisma/
│   ├── schema.prisma     ← 30+ modèles (User, Business, Shop, Order, ...)
│   └── migrations/
├── components/           ← shared, ui, dashboard, onboarding
├── public/               ← logos + vérifs domaine (uploads/ ignoré)
├── scripts/              ← migrations one-shot + tests E2E manuels
├── wp-plugin/            ← plugin WordPress livré au client (SEO)
├── _docs/                ← documentation interne + SKILL_*.md
└── website-extraction/   ← (gitignored) sites Vite générés servis par nginx
```

## Skills (docs internes)

Le projet documente ses modules via des fichiers `_docs/SKILL_*.md` —
contexte technique + conventions par module :

- `SKILL_digital_marketing_wanapush.md` — stratégique (ton, méthodologie)
- `SKILL_wanapush_stack_best_practices.md` — patterns Next/Prisma/Zod
- `SKILL_wanapush_social_module.md` — 5 plateformes
- `SKILL_wanapush_seo_module.md` — audit + plugin WP + SFTP
- `SKILL_wanapush_site_generator.md` — moteur de génération IA
- `SKILL_wanapush_shop_module.md` — e-commerce + Stripe Connect
- `SKILL_wanapush_leads_module.md` — capture publique + dashboard
- `SKILL_wanapush_capi_module.md` — Pixel + Conversions API + RGPD
- `SKILL_wanapush_gbp_module.md` — Google Business Profile (stub + cahier des charges)
- `SKILL_wanapush_analytics_module.md` — agrégation cross-modules (stub)
- `SKILL_wanapush_email_module.md` — marketing par-dessus Resend (stub)
- `SKILL_wanapush_aso_module.md` — App Store Optimization (stub)

## Tests

```bash
npm test           # tous les tests Node (tsx --test, suite CAPI principalement)
npm run test:capi  # uniquement le module CAPI (60+ tests)
```

Coverage actuel : **CAPI à 100 %, les autres modules ~0 %**. Sprint tests à
ouvrir selon priorités.

## CI

GitHub Actions exécute automatiquement `tsc --noEmit` + `npm test` sur chaque
push/PR qui touche à `wanapush/`. Voir `.github/workflows/wanapush-ci.yml`.

## Audit + roadmap

`_docs/AUDIT_REPORT_2026-06-03.md` recense les choix architecturaux et la dette
technique. Audit suivant prévu **septembre 2026** (post-Google core updates +
Next.js 15 stable).

## Conventions

- TypeScript strict
- Validation Zod systématique sur les API routes (entrée utilisateur)
- Tokens externes chiffrés via `lib/crypto.ts` (AES-256-GCM) avant BDD
- Commentaires en français (équipe FR)
- Imports absolus via `@/`
- Tailwind, pas de CSS-in-JS

## Licence

Proprietary. © WanaPush 2026.
