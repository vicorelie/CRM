# Module Publicité payante (Ads) — guide setup

> **Last verified : 2026-06-03**. Vérifié contre Meta Developers Blog, LinkedIn Microsoft Learn (versions li-lms-2026-05).

Le module `/ads` permet de connecter les **Ad Managers** Meta / Google / TikTok / LinkedIn pour piloter les campagnes depuis WanaPush : génération de copies par l'IA, audit ROAS, **création/édition de campagnes Meta en direct** (livré en juin 2026 via [PR 2cbd233a](#)).

## Vue d'ensemble

```
app/(dashboard)/ads/                    # 5 onglets : Comptes / Builder / Campagnes / Audiences / Optimiseur
app/api/ads/
  oauth/[platform]/start/               # redirige vers le consent screen
  oauth/[platform]/callback/            # échange code → token → DB
  accounts/                             # GET liste, DELETE par id
  campaigns/                            # GET (avec metrics agrégées) + POST création manuelle
  campaigns/[id]/                       # PATCH / DELETE / POST=duplicate
  generate-copy/                        # IA : 3 variantes A/B par plateforme
  optimize/                             # IA : audit ROAS + leviers
  audiences/                            # CRUD bibliothèque d'audiences
  sync/                                 # POST sync manuel (1 ou tous comptes)
  cron/sync/                            # cron horaire (X-Cron-Secret)
lib/ads/
  index.ts                              # registry + helpers DB + token refresh
  types.ts                              # AdsConnector, AdAccountInfo, COPY_LIMITS
  sync.ts                               # logique sync campagne + métriques
  meta.ts / google.ts / tiktok.ts / linkedin.ts
```

DB : `AdAccount` (tokens chiffrés AES-256-GCM), `Campaign` (étendu avec `externalId`, `dailyBudget`, `objective`, `targeting`, `lastSyncAt`, FK `adAccountId`), `AdMetrics` (snapshot quotidien spend/impressions/clicks/conversions/revenue), `AdAudience` (bibliothèque réutilisable).

## Setup OAuth par plateforme

### Meta Ads (Marketing API) — mis à jour juin 2026

**WanaPush App ID** : `1984786402139484` (Live mode depuis 2026-06-02)

1. https://developers.facebook.com/apps → app **WanaPush**
2. **Cas d'utilisation** → ajouter "Créer et gérer les publicités avec l'API Marketing" (apporte `ads_management`, `ads_read`, `business_management`) — déjà actif
3. Redirect URI à ajouter dans **Facebook Login for Business → Settings** :
   `https://wanapush.com/api/ads/oauth/meta_ads/callback`
4. Permissions critiques : `ads_management`, `ads_read`, `business_management`

**🆕 Marketing API Access Tier** (effectif **4 mai 2026**, ex-"AMSA Ads Management Standard Access") :
- Renommé en **"Marketing API Access Tier"** pour éviter la confusion avec la permission `ads_management`
- Minimum API calls qualifiant : **500 calls / 15 jours** (baissé de 1 500)
- Error rate threshold : < 15% sur les **500 derniers calls** (rolling, plus de fenêtre fixe)
- **Screen recording n'est PLUS requis** lors de la review
- Requirements visibles dans App Dashboard → Permissions & Features

**Standard Access** (notre tier actuel) :
- Permet de gérer les Ad Accounts dont on est admin/advertiser
- Ne permet PAS d'agir comme outil tiers pour d'autres businesses (besoin de Tier supérieur via review)

**App Live depuis 2026-06-02** : on peut créer des ads sur nos AdAccounts (WEBAMA) sans App Review supplémentaire.

### Google Ads API

1. https://ads.google.com/aw/apicenter → demander un **Developer Token** (Test puis Standard, peut prendre quelques semaines pour Standard)
2. Google Cloud Console → activer **Google Ads API**
3. OAuth client web → Redirect URI :
   `https://wanapush.com/api/ads/oauth/google_ads/callback`
4. Scope : `https://www.googleapis.com/auth/adwords`
5. Variables d'env :
   ```
   GOOGLE_ADS_CLIENT_ID=...
   GOOGLE_ADS_CLIENT_SECRET=...
   GOOGLE_ADS_DEVELOPER_TOKEN=...
   ```
   (peut réutiliser `GOOGLE_CLIENT_ID/SECRET` si une seule app Google)

⚠️ Le Developer Token est obligatoire à chaque requête API. Sans token Standard, l'API ne lit que les comptes test.

### TikTok Ads (Marketing API)

1. https://business-api.tiktok.com/portal → Create app
2. Login Kit + Marketing API : ajouter Redirect URI :
   `https://wanapush.com/api/ads/oauth/tiktok_ads/callback`
3. Demander **Standard API Approval** (sandbox = quelques campagnes test seulement)
4. Variables :
   ```
   TIKTOK_ADS_APP_ID=...
   TIKTOK_ADS_APP_SECRET=...
   ```
   (peut réutiliser `TIKTOK_APP_ID/SECRET` du social si même app)

### LinkedIn Ads (Marketing Solutions) — mis à jour juin 2026

1. https://www.linkedin.com/developers/apps → app
2. **My Apps → Products → Advertising API** : remplir l'accès form (legal entity verification + use case détaillé). Review prend des semaines à plusieurs mois.
3. Scopes :
   - **Lecture** : `r_ads`, `r_ads_reporting` (campagnes + reporting)
   - **Création/édition** : `rw_ads` (review supplémentaire requise)
   - Doc Microsoft Learn versionnée : `li-lms-2026-05`+
4. Redirect URI :
   `https://wanapush.com/api/ads/oauth/linkedin_ads/callback`
5. Variables :
   ```
   LINKEDIN_ADS_CLIENT_ID=...
   LINKEDIN_ADS_CLIENT_SECRET=...
   ```
   (peut réutiliser `LINKEDIN_CLIENT_ID/SECRET` du social)

## Cron sync

```
30 * * * * curl -H "X-Cron-Secret: $CRON_SECRET" https://wanapush.com/api/ads/cron/sync
```

Tourne toutes les heures à `:30` pour ne pas se chevaucher avec les crons social. Pull les campagnes + 7 jours de métriques pour tous les comptes CONNECTED.

Sync manuel d'un compte spécifique :

```
POST /api/ads/sync { accountId: "..." }
```

## État actuel (juin 2026)

### ✅ Livré
- **Meta Ads — création de campagnes complètes en direct** (Campaign + AdSet + AdCreative + Ad) en PAUSED par sécurité. Pipeline robuste avec cascade fallback (OFFSITE_CONVERSIONS → LANDING_PAGE_VIEWS → LINK_CLICKS) pour Pixel sans data conversion. Best practices Meta 2026 silencieuses (Advantage+ Audience/Creative, attribution 7d-click/1d-view, Multi-advertiser ads, IG cross-platform, DSA UE).
- **Modale wizard unifiée** (`+ Nouvelle campagne` dans `/ads/Mes campagnes`) : brief + auto-config IA + variantes A/B/C + destination intelligente + image upload/IA + ciblage géo Meta + Advantage+ toggles.
- **Destination intelligente à 3 modes** :
  - A. Site WanaPush généré (Pixel auto-injecté)
  - B. Site externe avec Pixel déjà installé + vérification fbq init
  - C. Site externe + snippet HTML d'installation copy-paste
- **Auto-config IA** (`/api/ads/auto-config`) : propose texte + ciblage + démographie depuis le brief
- **Recherche géo Meta** (`/api/ads/meta/geo-search`) : pays/régions/villes/codes postaux + radius
- **Pixel auto-detect** : récupère le 1er Pixel de l'AdAccount pour LEADS/SALES

### ⏳ TODO / Phase 2
- Push Google Ads / TikTok Ads / LinkedIn Ads (actuellement Meta seul)
- Lecture seule pour les comptes synchronisés (sync auto des campagnes externes existantes)
- A/B test deployer multi-AdSet
- Sync vers Custom Audiences Meta/Google (audiences = texte libre seulement)
- Edit/pause direct des campagnes externes (besoin `rw_ads` LinkedIn + review supplémentaire)

## Sécurité

- Tokens chiffrés AES-256-GCM via `lib/crypto.ts` (clé `ENCRYPTION_KEY`)
- State OAuth signé HMAC sur `NEXTAUTH_SECRET` (TTL 10 min, prefix `ADS_` pour distinguer du social)
- Cron protégé par `CRON_SECRET`
- Refresh token auto pour Google/LinkedIn ; Meta utilise des long-lived tokens (~60j)
