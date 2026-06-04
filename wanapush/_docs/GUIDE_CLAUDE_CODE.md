# 🚀 Guide Claude Code — Construire WanaPush dans VS Code

---

## ÉTAPE 0 — Prérequis avant de lancer Claude Code

1. Node.js 18+ installé
2. Claude Code installé : `npm install -g @anthropic-ai/claude-code`
3. Ouvrir VS Code dans un dossier vide `nexus/`
4. Lancer Claude Code depuis le terminal de VS Code : `claude`
5. **Copier le fichier `CLAUDE.md` à la racine du projet** (Claude Code le lira automatiquement)

---

## ÉTAPE 1 — Prompt d'initialisation (à donner en PREMIER)

```
Initialise le projet WanaPush complet. C'est une plateforme SaaS de marketing digital IA. 

Fais les actions suivantes dans l'ordre :
1. Crée le projet Next.js 14 avec TypeScript et Tailwind : npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
2. Installe toutes les dépendances nécessaires : prisma, @prisma/client, next-auth, @auth/prisma-adapter, @anthropic-ai/sdk, stripe, resend, zod, lucide-react, recharts, @radix-ui/react-dialog, @radix-ui/react-dropdown-menu, clsx, tailwind-merge
3. Installe et initialise shadcn/ui
4. Initialise Prisma avec PostgreSQL
5. Crée le schéma Prisma complet tel que défini dans CLAUDE.md
6. Crée la structure de dossiers complète définie dans CLAUDE.md
7. Crée le fichier .env.local avec toutes les variables d'environnement vides
8. Configure le fichier tsconfig.json avec les alias d'imports
9. Crée le layout principal de l'application avec la navigation dashboard

Dis-moi exactement ce que tu as fait et ce qui reste à configurer manuellement.
```

---

## ÉTAPE 2 — Auth et Onboarding

```
Implémente le système d'authentification complet :

1. Configure NextAuth.js avec :
   - Provider Google OAuth
   - Provider Email/Password (credentials)
   - Adapter Prisma pour stocker les sessions en base
   - Pages custom : /login, /register

2. Crée les pages suivantes :
   - /login : formulaire email + mot de passe + bouton "Continuer avec Google"
   - /register : formulaire création de compte
   - Design propre, professionnel, dark/light mode, logo WanaPush

3. Crée le middleware Next.js pour protéger toutes les routes /dashboard/*

4. Crée le flow d'onboarding après inscription (/onboarding) :
   - Étape 1 : Nom de l'entreprise, secteur d'activité, site web existant (optionnel)
   - Étape 2 : Objectifs principaux (checkboxes : Leads / Ventes / RDV / Notoriété / Downloads d'app)
   - Étape 3 : Budget marketing mensuel (slider : 0€ à 10000€+)
   - Étape 4 : Zone géographique cible
   - Sauvegarde en base via Prisma au submit final
   - Redirection vers /dashboard après complétion

5. API routes nécessaires :
   - POST /api/auth/[...nextauth]
   - POST /api/onboarding

Utilise Zod pour la validation. Gère tous les cas d'erreur.
```

---

## ÉTAPE 3 — Dashboard principal + WanaScore

```
Crée le dashboard principal (/dashboard) :

1. Layout dashboard avec :
   - Sidebar de navigation (icônes + labels) : Dashboard, Réseaux Sociaux, Publicité, SEO, Site Web, Google Business, Leads, Email, ASO, Analytics, Paramètres
   - Header avec nom du business, avatar utilisateur, notifications
   - Responsive : sidebar en drawer sur mobile

2. Page dashboard (/dashboard) :
   - WanaScore™ : grand chiffre circulaire /1000 avec animation, décomposé en 5 sous-scores (SEO, Social, Pub, Site, Réputation) chacun /200
   - Grille de métriques : trafic estimé, leads ce mois, campagnes actives, score moyen
   - Section "Quick Wins" : top 3 actions recommandées avec bouton "En savoir plus"
   - Section "Alertes WanaPush" : liste des problèmes détectés
   - Graphique d'évolution du WanaScore sur 12 semaines (Recharts LineChart)

3. Calcul initial du WanaScore à partir des données d'onboarding :
   - Si pas de site web → Score Site = 0
   - Si pas de réseaux connectés → Score Social = 0
   - Si pas de GBP renseigné → Score Réputation = 50
   - Calculer et sauvegarder en base

4. API route GET /api/dashboard/stats

Utilise des données mockées réalistes si les vraies APIs ne sont pas encore connectées.
```

---

## ÉTAPE 4 — Chat IA WanaPush

```
Crée l'interface de chat avec l'agent WanaPush :

1. Page /dashboard/chat avec :
   - Interface conversationnelle style ChatGPT (messages utilisateur à droite, WanaPush à gauche)
   - Avatar WanaPush avec logo
   - Zone de saisie avec bouton envoi + Entrée pour envoyer
   - Suggestions rapides sous la zone de saisie : "Audit complet", "Stratégie réseaux sociaux", "Plan publicité", "Améliorer mon SEO"
   - Historique des conversations dans la sidebar (dernières 10)
   - Support Markdown dans les réponses WanaPush (gras, listes, emojis)
   - Affichage en streaming (les mots apparaissent un à un)

2. API route POST /api/ai/chat avec :
   - Streaming via Response stream
   - Injection automatique du contexte business de l'utilisateur dans le system prompt
   - Prompt système WanaPush complet (tel que défini dans CLAUDE.md)
   - Sauvegarde des messages en base (model Message dans Prisma à créer)
   - Limite selon le plan (Starter : 50 messages/mois, Growth : 500, Scale : illimité)

3. Ajoute dans le schéma Prisma :
   model Conversation { id, businessId, title, messages Message[], createdAt }
   model Message { id, conversationId, role (USER|ASSISTANT), content, createdAt }

Utilise @anthropic-ai/sdk avec streaming. Modèle : claude-sonnet-4-20250514. Max tokens : 2000.
```

---

## ÉTAPE 5 — Module SEO

```
Crée le module SEO (/dashboard/seo) :

1. Page principale avec 4 onglets : Audit, Mots-clés, Contenu, Backlinks

2. Onglet Audit :
   - Formulaire : saisie URL du site à analyser
   - Bouton "Lancer l'audit IA"
   - Appel à Claude API pour générer un audit SEO structuré basé sur l'URL fournie
   - Affichage des résultats en cards : Score technique /100, Score On-page /100, Score Off-page /100
   - Liste de recommandations priorisées (icône rouge/orange/vert selon urgence)
   - Bouton "Exporter en PDF" (placeholder pour l'instant)

3. Onglet Mots-clés :
   - Tableau avec colonnes : Mot-clé, Volume estimé, Difficulté, Intention, Position actuelle
   - Bouton "+ Ajouter un mot-clé"
   - Bouton "Générer des idées via IA" → appelle Claude pour suggérer 20 mots-clés selon le secteur
   - Modèle Prisma : KeywordTracking { id, businessId, keyword, targetUrl, currentPosition, volume }

4. Onglet Contenu :
   - Générateur de brief SEO : saisir un sujet → Claude génère un brief complet (structure H1-H6, mots-clés, longueur recommandée, angle éditorial)
   - Historique des briefs générés

5. API routes :
   - POST /api/seo/audit
   - GET/POST /api/seo/keywords
   - POST /api/seo/brief
```

---

## ÉTAPE 6 — Module Publicité (Meta Ads + Google Ads)

```
Crée le module Publicité (/dashboard/ads) :

1. Page principale avec tabs : Vue d'ensemble, Meta Ads, Google Ads, TikTok Ads

2. Vue d'ensemble :
   - KPIs consolidés : Dépenses totales, Leads générés, Coût par lead moyen, ROAS moyen
   - Graphique dépenses vs résultats par plateforme (BarChart Recharts)

3. Tab Meta Ads :
   - Générateur de campagne IA : 
     * Saisir : objectif, budget, cible démographique, secteur
     * Claude génère : structure complète (Campagne > Ad Set > Annonce), définition des audiences, 3 variantes de copy (headline + primary text + CTA), recommandations de ciblage
   - Affichage en cards avec bouton "Copier" pour chaque élément
   - Section "Bibliothèque de copies" : historique des copies générées

4. Tab Google Ads :
   - Générateur d'annonces Search RSA :
     * Saisir : produit/service, URL destination, mots-clés principaux
     * Claude génère : 15 headlines (30 car max), 4 descriptions (90 car max), extensions recommandées
   - Compteur de caractères en temps réel
   - Prévisualisation de l'annonce (desktop + mobile)

5. API routes :
   - POST /api/ads/meta/generate
   - POST /api/ads/google/generate
   - Utiliser Claude API avec des prompts spécialisés par plateforme
```

---

## ÉTAPE 7 — Module Réseaux Sociaux

```
Crée le module Réseaux Sociaux (/dashboard/social) :

1. Page de connexion des comptes :
   - Cards pour chaque réseau : Instagram, TikTok, YouTube, Facebook, LinkedIn, Twitter/X
   - Bouton "Connecter" avec logo de la plateforme
   - Status : Connecté (vert) / Non connecté (gris)
   - Placeholder OAuth (bouton fonctionnel mais flow OAuth à implémenter plus tard)

2. Générateur de contenu IA :
   - Sélecteur de réseau (dropdown)
   - Sélecteur de type de contenu : Post, Reel/Vidéo, Story, Carrousel
   - Saisie du sujet/thème
   - Bouton "Générer avec WanaPush"
   - Claude génère : caption optimisée, hashtags recommandés (5-10), hook pour vidéo si applicable, timing de publication recommandé
   - Bouton "Générer une variante"
   - Bouton "Copier"

3. Calendrier éditorial :
   - Vue calendrier mensuel (utilise un composant calendrier ou grille simple)
   - Affichage des posts planifiés par jour avec icône du réseau
   - Modal de création de post : sélection du réseau, contenu, date/heure, image (upload placeholder)
   - Statuts : Brouillon, Planifié, Publié

4. Analytics (données mockées pour l'instant) :
   - Graphiques : évolution followers, engagement rate, reach par réseau
   - Top 3 posts les plus performants

5. Modèles Prisma :
   model ScheduledPost { id, businessId, platform, content, hashtags, scheduledAt, status, createdAt }

6. API routes :
   - POST /api/social/generate
   - GET/POST/DELETE /api/social/posts
```

---

## ÉTAPE 8 — Google Business Profile + Analytics

```
Crée le module Google Business Profile (/dashboard/gbp) :

1. Page principale :
   - Score d'optimisation GBP /100 avec détail par critère
   - Checklist d'optimisation : 
     ✅ Description renseignée (750 car)
     ✅ Photos (minimum 20)
     ✅ Horaires complets
     ✅ Catégorie principale
     ✅ Posts hebdomadaires
     ⚠️ Réponses aux avis (< 48h)
   - Chaque item cliquable pour voir les recommandations détaillées

2. Générateur de description GBP :
   - Saisir : nom entreprise, secteur, services, USP
   - Claude génère une description optimisée de 750 caractères avec compteur
   - Bouton "Régénérer"

3. Générateur de posts GBP :
   - Type : Offre / Actualité / Événement / Produit
   - Claude génère le texte optimisé + suggestions de photo
   - Calendrier de publication (1 post/semaine recommandé)

4. Module Analytics complet (/dashboard/analytics) :
   - Tableau de bord avec métriques : Sessions, Conversions, CPL, ROAS par canal
   - Graphiques : trafic par source (Pie chart), évolution conversions (Line chart), performance campagnes (Bar chart)
   - Filtres : période (7j, 30j, 90j, personnalisé)
   - Tableau des campagnes actives avec performances
   - Section "Rapport mensuel" avec bouton de génération IA
   - API route POST /api/analytics/report → Claude génère un rapport narratif en Markdown

Utilise des données mockées réalistes. Ajoute un bouton "Connecter Google Analytics" (placeholder).
```

---

## ÉTAPE 9 — Système de plans + Stripe

```
Implémente la gestion des abonnements :

1. Page Tarifs (/pricing) accessible publiquement :
   - 4 plans : Starter (99€/mois), Growth (299€/mois), Scale (799€/mois), Enterprise (sur devis)
   - Toggle mensuel/annuel (-20%)
   - Tableau comparatif des fonctionnalités
   - Bouton "Commencer" → redirige vers Stripe Checkout

2. Intégration Stripe :
   - Création des produits et prix dans Stripe
   - Route POST /api/stripe/create-checkout → Stripe Checkout Session
   - Route POST /api/webhooks/stripe → gérer checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
   - Mise à jour du champ `plan` en base après paiement réussi

3. Gating des fonctionnalités selon le plan :
   - Créer un hook usePlan() qui retourne le plan actuel
   - Créer un composant <PlanGate plan="GROWTH"> qui affiche un lock et invite à upgrader si le plan est insuffisant
   - Appliquer sur : nombre de messages IA, nombre de réseaux connectés, rapport white-label (Scale+)

4. Page /dashboard/settings :
   - Section "Abonnement" : plan actuel, date de renouvellement, bouton "Gérer l'abonnement" (Stripe Customer Portal)
   - Section "Profil" : nom, email, avatar
   - Section "Business" : modifier les infos du business
   - Section "Membres d'équipe" (Growth+) : inviter par email, définir rôle
```

---

## ÉTAPE 10 — Finitions et déploiement

```
Finalise la plateforme :

1. Mode sombre/clair :
   - Vérifier que tous les composants supportent dark: Tailwind
   - Toggle dark/light dans le header

2. Notifications :
   - Système de toast (Sonner ou react-hot-toast) pour toutes les actions
   - Page /dashboard/notifications : liste des alertes WanaPush (score en baisse, nouveau concurrent, etc.)

3. Responsive mobile :
   - Vérifier et corriger tous les problèmes mobile
   - Sidebar → bottom navigation sur mobile

4. SEO de la landing page :
   - Crée une landing page marketing à / (page publique) :
     * Hero : "Votre plateforme marketing IA complète"
     * Section fonctionnalités (les 10 modules avec icônes)
     * Section WanaScore expliqué
     * Section tarifs
     * CTA : "Démarrer gratuitement 14 jours"
     * Footer

5. Performance :
   - Ajouter loading.tsx sur chaque route dashboard
   - Ajouter error.tsx global
   - Images optimisées avec next/image
   - Lazy loading des composants lourds

6. Configuration Vercel :
   - Créer vercel.json
   - Variables d'environnement à configurer sur Vercel
   - Expliquer comment déployer : `vercel --prod`

Fais un audit final du code : TypeScript errors, console.log oubliés, TODO non résolus.
```

---

## PROMPTS BONUS — Pour aller plus loin

### Générer un rapport PDF
```
Implémente la génération de rapports PDF :
- Utilise la librairie @react-pdf/renderer
- Template de rapport mensuel avec : logo WanaPush, données du business, métriques du mois, graphiques, recommandations générées par Claude
- Route API GET /api/reports/monthly?businessId=xxx qui retourne un PDF
- Bouton "Télécharger le rapport" dans /dashboard/analytics
```

### Ajouter le simulateur ROI
```
Crée un simulateur ROI interactif dans /dashboard/ads/simulator :
- Formulaire : plateforme, budget mensuel, secteur d'activité, objectif
- Claude calcule et retourne : CPC estimé, clics estimés, taux de conversion moyen du secteur, leads estimés, CPA estimé, ROAS projeté
- Affichage en dashboard avec graphique de projection sur 6 mois
- Option "Sauvegarder cette simulation"
```

### Mode agence
```
Implémente le mode agence (plan Scale+) :
- /dashboard/clients : liste des clients avec WanaScore de chacun
- Bouton "Ajouter un client" : créer un nouveau Business rattaché au même User
- Switcher de client dans le header pour naviguer entre les clients
- Rapport white-label : remplacer le logo WanaPush par le logo de l'agence dans les PDF
- Page de rapport client partageable via lien public (token unique)
```

---

## ORDRE DE TRAVAIL RECOMMANDÉ

```
1. CLAUDE.md placé à la racine ✅
2. Étape 1 : Init projet (30 min)
3. Étape 2 : Auth + Onboarding (2h)
4. Étape 3 : Dashboard + Score (3h)
5. Étape 4 : Chat IA WanaPush (2h) ← MVP déjà utilisable ici
6. Étape 5 : Module SEO (2h)
7. Étape 6 : Module Publicité (2h)
8. Étape 7 : Réseaux Sociaux (3h)
9. Étape 8 : GBP + Analytics (2h)
10. Étape 9 : Stripe + Plans (2h)
11. Étape 10 : Finitions + Deploy (2h)

Total estimé : ~20-25h de développement assisté par Claude Code
```
