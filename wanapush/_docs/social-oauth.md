# Module Réseaux sociaux — guide setup

> **Last verified : 2026-06-03**. URIs migrées de `wanatest.com/wanapush` → `wanapush.com` (basePath retiré le 2026-05-26).

Le module `/social` permet à tes utilisateurs de connecter leurs comptes Instagram,
Facebook, LinkedIn, YouTube, TikTok pour planifier et publier des posts depuis
WanaPush, et consulter les analytics agrégées.

## Vue d'ensemble

```
app/(dashboard)/social/                  # 3 onglets : Comptes / Calendrier / Analytics
app/api/social/
  oauth/[platform]/start/                # redirige vers le consent screen
  oauth/[platform]/callback/             # échange code → token → DB
  accounts/                              # GET liste, DELETE par id
  posts/                                 # GET liste, POST créer ; [id] DELETE / POST publier
  analytics/                             # agrégats par période/plateforme/compte
  cron/publish/                          # à appeler par cron toutes les minutes
  cron/analytics/                        # à appeler par cron toutes les heures
  ai-caption/                            # génération IA de captions par plateforme
lib/social/
  index.ts                               # registry + helpers DB + token refresh
  types.ts                               # SocialConnector, PublishInput, Metrics
  state.ts                               # state OAuth signé HMAC
  redirect.ts                            # construit la redirect_uri
  publisher.ts                           # exécute un ScheduledPost
  facebook.ts / linkedin.ts / youtube.ts / tiktok.ts
```

Tokens stockés chiffrés AES-256-GCM via `lib/crypto.ts` (clé dans `ENCRYPTION_KEY`).
Status DB : `CONNECTED | EXPIRED | REVOKED | ERROR`. Refresh auto via `ensureFreshAccount`.

## Configurer les 5 plateformes

Pour chacune, ajouter les credentials dans `.env.local` puis redémarrer Next.

### Meta — Facebook + Instagram Business (mis à jour juin 2026)

**App principale WanaPush** : ID `1984786402139484` (Live depuis 2026-06-02)
**Sub-app Instagram dédiée** : `wanapush-IG`, ID `1349599410343521` (Instagram Business Login séparé)

1. App principale (Facebook + WhatsApp + Meta Marketing) :
   - Produits actifs : **Facebook Login for Business**, **Instagram Graph API**, **Marketing API**
   - Settings → Basic → `META_APP_ID` / `META_APP_SECRET`
   - Facebook Login → Settings → **Valid OAuth Redirect URIs** :
     - `https://wanapush.com/api/social/oauth/facebook/callback`
2. Sub-app Instagram (`wanapush-IG`) :
   - Instagram Business Login dédié (sub-app séparée évite les conflits Meta SSO)
   - Redirect URI : `https://wanapush.com/api/social/oauth/instagram/callback`
   - Scopes : `instagram_business_basic`, `instagram_business_content_publish`, `instagram_business_manage_insights`
3. App Review : maintenant simplifié (juin 2026), permissions `pages_manage_posts`,
   `instagram_content_publish`, `instagram_manage_insights`, `pages_read_engagement`,
   `pages_show_list`, `business_management` — accordées en mode Live sur la sub-app

**Note Instagram** : le compte Instagram doit être **Business** ou **Creator** ET
attaché à une Page Facebook. Le connecteur récupère automatiquement les comptes
IG attachés à chaque Page lors du callback.

### LinkedIn

1. https://www.linkedin.com/developers/apps → **Create app**
2. Lier à une Company Page (obligatoire)
3. Auth → **Authorized redirect URLs** :
   `https://wanapush.com/api/social/oauth/linkedin/callback`
4. Products : activer **Sign In with LinkedIn using OpenID Connect** + **Share on LinkedIn**
5. Copier Client ID / Secret → `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET`

Scopes utilisés : `openid profile email w_member_social`.
Les posts sont publiés au nom du membre connecté (pas d'une page d'entreprise — pour
les pages il faudrait `w_organization_social` qui demande review LinkedIn Marketing).

### YouTube

1. https://console.cloud.google.com → API & Services → **Library** : activer
   **YouTube Data API v3** + **YouTube Analytics API**
2. Credentials → **Create Credentials** → OAuth client ID, type "Web application"
3. Authorized redirect URI :
   `https://wanapush.com/api/social/oauth/youtube/callback`
4. Copier Client ID / Secret → `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET`
   (sinon le connecteur retombera sur `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`)
5. OAuth consent screen : ajouter les scopes
   `youtube.upload`, `youtube.readonly`, `yt-analytics.readonly`
6. **App publishing** : tant que ton app est en "Testing", seuls les comptes ajoutés
   en Test Users pourront se connecter. Soumettre pour vérification pour activer
   les uploads sans warning de scopes sensibles.

### TikTok (mis à jour juin 2026)

**App principale Social** : "WanaPush" sur developers.tiktok.com
- Sandbox actif : `wanapush-dev`, target user `@spotifone_app`
- Client key : `sbawowxgq4m4gas2l0`
- Validation production **pas demandée** encore (review 2-4 semaines avec démo vidéo)

1. https://developers.tiktok.com → **Manage apps** → Create
2. Login Kit : ajouter le redirect
   `https://wanapush.com/api/social/oauth/tiktok/callback`
3. Activer les produits **Login Kit** + **Content Posting API**
4. Scopes : `user.info.basic` + `video.upload` (Direct Post **OFF** en sandbox, vidéos arrivent en DRAFT)
5. Copier Client Key / Client Secret → `TIKTOK_APP_ID` / `TIKTOK_APP_SECRET`

**Sandbox vs prod** (juin 2026) :
- **Sandbox** : seuls les target users ajoutés peuvent se connecter. Vidéos arrivent en DRAFT dans l'app du target user, max ~1 GB.
- **Production** : exige review TikTok (2-4 semaines, démo vidéo requise). Direct Post activable. Max 4 GB par vidéo.

## Cron — publication des posts planifiés

Le cron handler scanne tous les `ScheduledPost.scheduledAt <= now AND status=SCHEDULED`
et lance la publication sur chaque cible. Auth via `X-Cron-Secret`.

### Setup cron système (recommandé)

```bash
# crontab -e (root ou user qui a accès à curl)
* * * * * curl -s -H "X-Cron-Secret: $CRON_SECRET" https://wanapush.com/api/social/cron/publish > /dev/null
0 * * * * curl -s -H "X-Cron-Secret: $CRON_SECRET" https://wanapush.com/api/social/cron/analytics > /dev/null
```

### Alternative : Upstash QStash

Si on veut éviter le cron système, configurer un cron Upstash QStash qui POST sur
ces endpoints avec le header secret.

## Sécurité

- Tokens d'accès chiffrés AES-256-GCM en DB (`SocialAccount.accessToken/refreshToken`)
- State OAuth signé HMAC (TTL 10 min) — voir `lib/social/state.ts`
- Cron endpoints protégés par secret partagé (`CRON_SECRET`)
- Scope minimal demandé par plateforme

## Limitations connues / TODO

- Médias passés par URL publique (pas d'upload direct depuis le navigateur ;
  utiliser un bucket S3 / R2 — déjà dans deps `@aws-sdk/client-s3`)
- LinkedIn analytics limitées (member API ne donne que likes/comments)
- TikTok publish en mode `PULL_FROM_URL` uniquement (l'autre mode `FILE_UPLOAD`
  demande un upload chunked plus complexe)
- First-comment Instagram non implémenté (faisable via container `comment` post-publish)
- Pas encore de retry exponentiel sur échec — chaque cron tick re-tente les FAILED si on
  remet le status à SCHEDULED manuellement
