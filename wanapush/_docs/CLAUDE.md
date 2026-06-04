# WanaPush — Plateforme Marketing Digital IA

**Site web** : https://wanapush.net

## Contexte du projet
Application SaaS B2B de marketing digital full-stack. Permet à des professionnels de gérer leur présence digitale complète : réseaux sociaux, publicité payante, SEO, site web, Google Business Profile, génération de leads, ASO, analytics.

## Stack technique
- **Frontend** : Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend** : Next.js API Routes + Node.js
- **Base de données** : MySQL/MariaDB via Prisma ORM
- **Auth** : NextAuth.js (OAuth Google, email/password)
- **Cache** : Redis (Upstash)
- **Stockage** : AWS S3 ou Cloudflare R2
- **Emails** : Resend
- **Paiement** : Stripe (abonnements SaaS)
- **IA** : Anthropic Claude API (claude-sonnet-4-20250514)
- **Déploiement** : serveur dédié `wanatest.com` derrière nginx, `basePath: "/wanapush"` (cf `next.config.mjs`). Sites générés servis sur `https://wanatest.com/preview/{slug}/`.

## Structure du projet
```
wanapush/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Pages auth (login, register)
│   ├── (dashboard)/            # Dashboard utilisateur connecté
│   │   ├── dashboard/          # Vue principale
│   │   ├── social/             # Module réseaux sociaux
│   │   ├── ads/                # Module publicité payante
│   │   ├── seo/                # Module SEO
│   │   ├── website/            # Module site web & CRO
│   │   ├── gbp/                # Google Business Profile
│   │   ├── leads/              # Génération de leads
│   │   ├── email/              # Email marketing
│   │   ├── aso/                # App Store Optimization
│   │   └── analytics/          # Analytics & reporting
│   ├── api/                    # API Routes
│   │   ├── auth/               # NextAuth endpoints
│   │   ├── ai/                 # Endpoints Claude API
│   │   ├── social/             # Intégrations réseaux sociaux
│   │   ├── ads/                # Intégrations Ads APIs
│   │   └── webhooks/           # Webhooks Stripe etc.
│   └── layout.tsx
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── dashboard/              # Layout et navigation
│   ├── modules/                # Composants par module
│   └── shared/                 # Composants partagés
├── lib/
│   ├── anthropic.ts            # Client Claude API
│   ├── prisma.ts               # Client Prisma
│   ├── stripe.ts               # Client Stripe
│   └── utils.ts
├── prisma/
│   └── schema.prisma           # Schéma base de données
├── hooks/                      # React hooks custom
├── types/                      # TypeScript types
└── CLAUDE.md                   # Ce fichier
```

## Modèle de données principal (Prisma)
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  plan          Plan      @default(STARTER)
  businesses    Business[]
  createdAt     DateTime  @default(now())
}

model Business {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  name          String
  sector        String?
  website       String?
  socialAccounts SocialAccount[]
  campaigns     Campaign[]
  wanapushScore    Int       @default(0)
  createdAt     DateTime  @default(now())
}

model SocialAccount {
  id            String    @id @default(cuid())
  businessId    String
  business      Business  @relation(fields: [businessId], references: [id])
  platform      Platform  // INSTAGRAM | TIKTOK | YOUTUBE | FACEBOOK | LINKEDIN | TWITTER
  accessToken   String    @db.Text
  refreshToken  String?   @db.Text
  accountId     String
  username      String?
  connectedAt   DateTime  @default(now())
}

model Campaign {
  id            String    @id @default(cuid())
  businessId    String
  business      Business  @relation(fields: [businessId], references: [id])
  name          String
  type          CampaignType // META_ADS | GOOGLE_ADS | TIKTOK_ADS | SEO | EMAIL
  status        Status    @default(DRAFT)
  budget        Float?
  results       Json?
  createdAt     DateTime  @default(now())
}

enum Plan { STARTER GROWTH SCALE ENTERPRISE }
enum Platform { INSTAGRAM TIKTOK YOUTUBE FACEBOOK LINKEDIN TWITTER PINTEREST }
enum CampaignType { META_ADS GOOGLE_ADS TIKTOK_ADS LINKEDIN_ADS SEO EMAIL ASO }
enum Status { DRAFT ACTIVE PAUSED COMPLETED }
```

## Agent IA — Identité et comportement
L'agent s'appelle **WanaPush**. C'est un consultant marketing digital senior. Quand un utilisateur interagit avec le chat IA de la plateforme, WanaPush doit :

1. Analyser le contexte du business (secteur, objectifs, actifs existants)
2. Proposer des recommandations concrètes et actionnables avec KPIs
3. Générer du contenu directement utilisable (scripts, captions, copies pub)
4. Produire des audits structurés avec scoring
5. Créer des roadmaps 30/60/90 jours

**Prompt système WanaPush** (à injecter dans chaque appel Claude API) :
```
Tu es WanaPush, un expert senior en marketing digital full-stack. Tu opères au sein d'une plateforme SaaS dédiée aux professionnels qui souhaitent construire, optimiser ou accélérer leur présence digitale.

Tu incarnes simultanément : Directeur Marketing Digital (15 ans d'expérience), Expert SEO/SEM certifié, Stratège Réseaux Sociaux (Meta, TikTok, YouTube, LinkedIn, X), Expert Google Ads & Meta Ads orienté ROAS, Consultant Growth Hacking & Lead Generation, Expert ASO.

Pour chaque recommandation, fournis : l'action concrète, l'outil recommandé, la timeline, le KPI de succès, et l'impact estimé (Faible/Moyen/Fort/Critique).

Priorise selon la matrice Effort/Impact. Propose toujours 3 niveaux de budget : gratuit, PME (200-2000€/mois), Scale-up (2000€+).

Format de réponse :
📊 DIAGNOSTIC : [état actuel]
🎯 OBJECTIF : [ce qu'on vise]
⚡ ACTIONS PRIORITAIRES : [top 3]
📋 PLAN COMPLET : [roadmap]
🛠️ OUTILS : [stack recommandé]
📈 KPIS : [métriques]
💰 BUDGET : [3 niveaux]
```

## Modules à développer (par ordre de priorité)

### Phase 1 — MVP
1. **Auth & Onboarding** : inscription, connexion, création du business, questionnaire initial
2. **Dashboard principal** : WanaScore, métriques clés, alertes, accès modules
3. **Chat IA WanaPush** : interface conversationnelle avec Claude, historique, contexte business
4. **Module SEO** : audit basique, suivi mots-clés, recommandations
5. **Google Business Profile** : connexion API, optimisation guidée, suivi avis
6. **Rapport mensuel auto** : génération PDF avec résumé des performances

### Phase 2 — Croissance
7. **Module Réseaux Sociaux** : connexion OAuth, planification posts, analytics
8. **Module Publicité** : structure campagnes Meta Ads + Google Ads, copies générées par IA
9. **WanaScore™** : calcul automatique hebdomadaire, évolution, benchmark sectoriel
10. **Multi-utilisateurs** : invitations, rôles (Admin/Manager/Viewer)

### Phase 3 — Scale
11. **Mode Agence** : multi-clients, white-label, rapports personnalisés
12. **ASO** : optimisation App Store + Play Store
13. **Veille concurrentielle** : monitoring automatisé
14. **Simulateur ROI** : projections avant lancement de campagne

## Variables d'environnement nécessaires
```env
# Base de données
DATABASE_URL=

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# IA
ANTHROPIC_API_KEY=

# Paiement
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Réseaux sociaux
META_APP_ID=
META_APP_SECRET=
GOOGLE_ADS_DEVELOPER_TOKEN=
TIKTOK_APP_ID=
TIKTOK_APP_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

# Emails
RESEND_API_KEY=

# Storage
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BUCKET_NAME=

# Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## Conventions de code
- TypeScript strict mode activé
- Composants React en fonctionnel uniquement (pas de class components)
- Nommage : PascalCase pour composants, camelCase pour fonctions/variables, kebab-case pour fichiers
- Imports absolus avec alias `@/`
- Validation avec Zod sur toutes les API routes
- Gestion d'erreurs avec try/catch systématique
- Commentaires en français

## Commandes utiles
```bash
npm run dev          # Démarrer en développement
npm run build        # Build production
npx prisma studio    # Interface base de données
npx prisma migrate dev --name <nom>  # Nouvelle migration
npx prisma generate  # Régénérer le client Prisma
```

## Notes importantes
- Toujours valider les données côté serveur (API routes) même si validé côté client
- Ne jamais exposer les tokens OAuth ou clés API dans les réponses API
- RGPD : consentement requis pour tracking, données EU en EU
- Responsive mobile-first sur tous les composants
- Dark mode supporté via Tailwind (dark:)
