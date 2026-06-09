---
name: wanapush-social-module
description: >
  Utilise cette skill pour tout travail sur le module Social de WanaPush :
  ajout/modification d'un connecteur réseau social (Facebook, Instagram, TikTok,
  LinkedIn, YouTube), planification (ScheduledPost / cross-posting), OAuth flows,
  publication de contenu, analytics par plateforme. Déclencher quand l'utilisateur
  travaille sur lib/social/*, app/(dashboard)/social/*, app/api/social/*,
  le composer de posts, le scheduler/cron, ou demande des conseils sur les specs
  techniques d'une plateforme (dimensions, durées, limites de caractères) ou
  l'algorithme 2026 d'une plateforme.
license: proprietary
version: 1.0
last_reviewed: 2026-06-03
---

# SKILL — WanaPush Social Module

## ⚠️ MàJ 2026 best practices (sources officielles, audit 2026-06-09)

**Versions API actuelles (la skill cite des versions obsolètes) :**
- **Meta Graph API : v25.0** (18 fév 2026) → bumper `lib/social/{facebook,instagram}.ts`. ([blog v25](https://developers.facebook.com/blog/post/2026/02/18/introducing-graph-api-v25-and-marketing-api-v25/))
- **LinkedIn : versionné mensuel `YYYYMM`, dernière `202605`**, header `LinkedIn-Version` obligatoire. `UGC Posts v202310` est **mort** → migrer vers **Posts API**. ([recent-changes](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/recent-changes?view=li-lms-2026-05))
- **YouTube `videos.insert` = ~100 unités/upload** (déc 2025, plus 1 600) → corriger le gotcha quota dans la skill + `social-oauth.md`. ([quota](https://developers.google.com/youtube/v3/determine_quota_cost))

**Déprécations métriques 2026 :** Meta Reach/Video/Story Impressions dépréciées juin 2026 ; IG `impressions`/`plays` déjà supprimés → adopter `views`, `reposts_count`, `saved_count`, `shares_count`. Réécrire `fetchMetrics`/`PostAnalytics`. ([changelog IG](https://developers.facebook.com/docs/instagram-platform/changelog/))

**TikTok — divergence majeure :** app non auditée = **tout post forcé en `SELF_ONLY`** (pas juste DRAFT) ; audit requis pour publier public. Rate limit 6 req/min. **Flag `is_ai_generated` requis** dans l'init publish (sinon shadow-ban). ([content-sharing](https://developers.tiktok.com/doc/content-sharing-guidelines))

**X/Twitter :** free tier supprimé (fév 2026), pay-per-use, post avec URL = 0,20 $ (+1900 %) → pénaliser l'auto-post de liens si on branche X.

**À faire :** [ ] bump Graph v25 + LinkedIn Posts API ; [ ] corriger quota YouTube ; [ ] refondre métriques Meta/IG ; [ ] `is_ai_generated` TikTok ; [ ] **label IA par plateforme** (EU AI Act Art. 50, en vigueur 2 août 2026 — cf. `SKILL_wanapush_compliance_2026.md`) ; [ ] poll container IG (`status_code=FINISHED`) + backoff expo + idempotency-key par target.

> Skill **tactique** complémentaire à `SKILL_digital_marketing_wanapush.md` (stratégique).
> Couvre les conventions code + specs techniques 2026 + algorithmes par plateforme.

## 🧭 Quand l'invoquer

Cette skill est pertinente quand on travaille sur :
- `lib/social/{facebook,instagram,tiktok,linkedin,youtube,publisher,index,types}.ts`
- `app/(dashboard)/social/*` (composer, tabs, setup)
- `app/api/social/*` (oauth, publish, schedule, upload, cron)
- Modèles Prisma `SocialAccount`, `ScheduledPost`, `ScheduledPostTarget`, `PostAnalytics`
- Tout ajout d'une nouvelle plateforme ou refonte du flow de publication

## 🏗️ Architecture du module

```
lib/social/
  index.ts           ← getConnector(), ensureFreshAccount(), toConnectorAccount()
  types.ts           ← Media, PublishInput, PublishResult, ConnectorAccount
  publisher.ts       ← runScheduledPost(postId) : itère sur les targets, gère retry
  facebook.ts        ← Facebook Pages publish (single connecteur)
  instagram.ts       ← IG Business via Graph API (sub-app dédiée)
  tiktok.ts          ← TikTok Content Posting API (upload + Direct Post OFF)
  linkedin.ts        ← LinkedIn UGC posts (org + personal)
  youtube.ts         ← YouTube Data API resumable upload

app/api/social/
  oauth/[platform]/start
  oauth/[platform]/callback
  publish/route.ts   ← publication immédiate
  schedule/route.ts  ← création d'un ScheduledPost + targets
  upload/route.ts    ← upload de média (FormData → /public/uploads/<userId>/)
  cron/publish/route.ts ← appelé toutes les minutes par cron, lit les SCHEDULED
                          dont scheduledAt <= now, appelle runScheduledPost()
```

## 🗄️ Modèles Prisma

- **`SocialAccount`** : 1 par couple (user, platform, accountId). Tokens chiffrés AES-256-GCM (`lib/crypto.ts`). Status : CONNECTED / EXPIRED / REVOKED / ERROR.
- **`ScheduledPost`** : 1 post planifié (caption + media). Status : DRAFT / SCHEDULED / PUBLISHING / PUBLISHED / FAILED / CANCELED.
- **`ScheduledPostTarget`** : N targets par ScheduledPost (cross-posting). Chaque target a son propre status + externalId + lastError + attempts (max 3).
- **`PostAnalytics`** : KPIs snapshots quotidiens par (account, externalId).

## 📐 Specs techniques 2026 — Cheatsheet par plateforme

### Facebook Pages
- **Caption** : 63 206 chars (mais hook dans les 80 premiers)
- **Image** : 1200×630 px (1.91:1), max 30 MB
- **Vidéo** : 4K possible, durée 1s-240min, max 10 GB, MP4/MOV, ratio 16:9 ou 9:16
- **Carousel** : jusqu'à 10 cards
- **API** : Graph API v22+, scope `pages_manage_posts`, `pages_read_engagement`
- **First comment** : possible via `/{post_id}/comments` après publication

### Instagram (Business/Creator) — mis à jour juin 2026
- **Caption** : 2 200 chars, **3 à 5 hashtags ciblés** (Meta a supprimé le hashtag follow en déc 2024, hashtags = signal de catégorisation, plus de discovery)
- **Image Feed** : 1080×1080 (1:1), **1080×1350 (4:5) recommandé** en 2026 (occupe plus l'écran), max 30 MB
- **Story** : 1080×1920 (9:16), max 4 GB, durée 1-60s
- **Reels** : 1080×1920 (9:16), durée 3-90s, **sweet spot 30-60s** (les 7-15s marchent pour hooks rapides aussi)
- **Signal #1 de distribution Reels en 2026 : les DMs/partages**, plus que likes/comments
- **Caption = signal algo** : l'algo lit caption + texte on-screen + auto-captions → rédige en langage naturel keyword-rich, pas en chaîne de hashtags
- **Watermark TikTok détecté → throttle agressif** depuis 2025. Toujours uploader la version sans watermark.
- **API** : Graph API + sub-app dédiée (`wanapush-IG`), scope `instagram_content_publish`
- **Flow upload** : créer un media container (POST `/{ig_user_id}/media`) → poll status (READY) → POST `/{ig_user_id}/media_publish`
- **Limite** : 50 posts API par 24h
- **Pas de tags @ ni location via API** : géré seulement via app native

### TikTok — mis à jour juin 2026
- **Caption** : 4 000 chars (mais sweet spot 60-90 chars)
- **Vidéo** : 9:16 (1080×1920), durée 3s-10min, **max 4 GB en prod** (~1 GB en sandbox), MP4/MOV/WEBM/AVI
- **API** : Content Posting API v2 (developers.tiktok.com), scopes `user.info.basic` + `video.upload`
- **Direct Post OFF** par défaut en sandbox → vidéos arrivent en **DRAFT** dans l'app TikTok du target user, à publier manuellement. En prod (post-review), Direct Post peut être activé pour publication directe.
- **Sandbox** : target user obligatoire (`@spotifone_app` chez WanaPush). Production review demande validation TikTok (2-4 semaines, démo vidéo requise).
- **Upload** : `/post/publish/inbox/video/init` → upload chunks → status polling
- **Hashtags** : direct dans la caption, max 5-7 efficaces

**🔥 Algorithme TikTok 2026 — règles dures :**
- **Completion rate ≥ 70%** nécessaire pour viral (vs 50% en 2024). Les 3 premières secondes décident tout.
- **Watch time > views** explicitement dans le ranking
- **Niche consistency** : creators postant sur 3+ topics non liés ont -45% reach. **Reste sur un thème.**
- **Anti-AI strong** : algo détecte et **downrank les vidéos AI-generated** (text-to-video, voix synthétiques). Favorise creators humains authentiques.
- **Shares + repeat watches** = signaux les plus pondérés (au-dessus de likes)

### LinkedIn — mis à jour juin 2026 (gros changements)
- **Caption** : 3 000 chars — **NEW : sweet spot 1 000-1 300 chars** (le "150-300 chars" est obsolète, c'était la donnée 2023). Les posts texte de cette longueur engagent le mieux.
- **Image** : 1200×627 (1.91:1), max 10 MB
- **Vidéo** : 16:9 (1920×1080) ou 1:1, durée 3s-10min, max 5 GB. **Vidéos <30s = +200% completion rate**.
- **Document/PDF carousel** : jusqu'à 300 pages — **format roi en 2026 : 6,6% engagement rate, le plus haut tous formats confondus**. Carousels éducatifs 8-12 slides = sweet spot.
- **API** : UGC Posts v202310+, scope `w_member_social` (personal) ou `w_organization_social` (page entreprise)
- **Liens externes — données 2026 nuancées :**
  - 1 lien externe dans le body : **-18,8% reach médian** (analyse LinkBoost Q1 2026)
  - Certaines analyses montrent jusqu'à **-60% sur les company pages**
  - Liens dans les commentaires : **-80% visibilité du commentaire**
  - ⚠️ Conflicting data : analyse Saywhat Q1 2026 montre que des posts multi-liens performent parfois MIEUX que sans liens — donc **A/B tester**, ne pas appliquer la règle aveuglément.
  - **Stratégie safe** : URL en 1er commentaire reste un bon défaut pour les company pages.
- **Premières 60 minutes décident** : algo LinkedIn juge la traction initiale très tôt. Mobiliser ton réseau direct pour les premiers engagements.
- **70% des users LinkedIn sont des "ghost scrollers"** en 2026 (consomment sans interagir) → écrire pour eux aussi (hooks forts, valeur immédiate).
- **Generic AI content = downrank** : algo détecte les patterns ChatGPT évidents. Personnaliser fortement.
- **Organic reach company pages : -60 à -66% entre 2024-2026**. Compenser par employee advocacy ou newsletters.
- **Pas de scheduling natif via API** : tout passe par notre `ScheduledPost` interne
- **Mentions** : `@[urn:li:person:XXX]` dans la caption

### YouTube — mis à jour juin 2026
- **Titre** : 100 chars (60-70 pour SEO mobile)
- **Description** : 5 000 chars
- **Tags** : 500 chars total (jusqu'à ~15 tags)
- **Vidéo** : 4K/8K OK, max 256 GB ou 12h, MP4/MOV/AVI/WMV/MKV/WebM
- **Thumbnail custom** : 1280×720, max 2 MB, JPG/PNG/GIF
- **Shorts** : 9:16 (ou 1:1), **jusqu'à 3 minutes** depuis octobre 2024 (avant : 60s). Le hashtag `#shorts` dans le titre n'est plus obligatoire mais aide la classification.
  - **Sweet spot performance** : 20-45s. **Viral médian = 25-35s.** Les 3 min restent rarement optimaux malgré la limite plus haute.
- **API** : Data API v3, scope `https://www.googleapis.com/auth/youtube.upload`
- **Upload resumable** : init endpoint → PUT chunks de 256KB-100MB
- **Quotas 2026** : 10 000 unités/jour. ⚠️ **Coût upload changé** : la doc Google annonce maintenant ~100 unités/upload (vs 1 600 anciennement). À vérifier dans le Quota Calculator avant production massive.
- **Privacy** : `public` / `unlisted` / `private` (option `ytPrivacy` dans `options`)

## 🤖 Algorithme 2026 — Cheatsheet par plateforme (verified juin 2026)

| Plateforme | Algorithme valorise | À éviter |
|---|---|---|
| **Facebook** | Conversations dans les commentaires, vidéos natives, groupes engagés | Liens externes en post primaire, clickbait, posts > 80 mots sans hook |
| **Instagram** | **DMs/partages** (signal #1 Reels 2026), saves, hook 0-3s, captions keyword-rich, watch-through 90%, format 4:5 sur Feed | Watermark TikTok (throttle agressif), chaînes de 30+ hashtags, posts statiques sans carousel |
| **TikTok** | **Completion rate ≥70%**, repeat watches/boucles, shares > likes, niche consistency, **contenu humain authentique** | **AI-generated obvious** (downrank), watermarks tiers, hop entre 3+ niches, edits choppy, sons non-trending |
| **LinkedIn** | **PDF carousels 8-12 slides** (6,6% engagement rate), texte 1 000-1 300 chars, vidéo <30s (200% completion), **premiers 60 min** de traction | URLs externes (-18 à -60% reach), generic AI content (algo détecte ChatGPT), reposts sans value-add |
| **YouTube** | CTR thumbnail/titre, watch time absolu, bingewatching, **Shorts 20-45s**, retention curve élevée | Mots-clés bourrés, durée artificielle (Shorts ≠ obligation 3min), end screens vides, AI voiceover généré |

**🎯 Règle d'or 2026 cross-platform** :
1. **Hook des 3 premières secondes** (vidéo) ou **80 premiers caractères** (texte) décident >60% du reach
2. **Anti-AI movement** : depuis 2025, TikTok et LinkedIn downrankent les patterns AI évidents (voix synthétiques, structures ChatGPT). Personnaliser fortement, ne pas publier la sortie GPT brute.
3. **Niche consistency >> volume** : 3+ topics non liés = -45% reach (TikTok confirmé)
4. **DMs/shares > likes** comme signal de qualité, sur toutes les plateformes vidéo
5. **Watch time/completion rate > raw views** universellement

## 🛠️ Conventions code WanaPush

### Contrat d'un connecteur

Chaque plateforme dans `lib/social/*.ts` exporte un objet conforme à `SocialConnector` (voir `types.ts`) avec au minimum :

```ts
export const fooConnector: SocialConnector = {
  platform: "FOO",
  authorizeUrl(state, redirectUri): string;
  exchangeCode(code, redirectUri): Promise<ConnectorAccount[]>;  // peut renvoyer plusieurs comptes (FB Pages)
  refreshToken?(account): Promise<ConnectorAccount>;
  publish(account, input): Promise<PublishResult>;
  fetchMetrics?(account, externalId): Promise<Metrics>;
};
```

### Ajout d'une nouvelle plateforme — Checklist

1. Ajouter `PLATFORM` enum dans `prisma/schema.prisma` (Platform)
2. Créer `lib/social/<platform>.ts` qui implémente le contrat ci-dessus
3. Enregistrer dans `lib/social/index.ts` → `CONNECTORS`
4. Créer routes OAuth `/api/social/oauth/<platform>/{start,callback}/route.ts` (utiliser `state.ts` HMAC pour CSRF)
5. Ajouter logo + label dans `app/(dashboard)/social/types.ts` PLATFORM_META
6. Tester avec un compte sandbox dédié
7. Documenter dans `_docs/social-oauth.md` (callback URIs, scopes, app reviews requis)

### Gotchas connus

- **Tokens chiffrés AES-256-GCM** : utilise `encrypt()` / `decrypt()` de `lib/crypto.ts`. Le rotation key vit dans `WANAPUSH_CRYPTO_KEY` (base64). NE JAMAIS stocker en clair.
- **TikTok sandbox vs prod** : sandbox refuse les comptes non-listés. Production review = 2-4 semaines, exige démo vidéo.
- **Instagram = sub-app dédiée** (`wanapush-IG`, ID `1349599410343521`) séparée de l'app Meta principale. Redirect URI distinct.
- **LinkedIn URLs en commentaire** : si `caption` contient une URL externe, publier le post sans, puis créer un comment avec l'URL via `/posts/{id}/comments` (réduit la perte de reach de ~40%).
- **YouTube quotas** : 10k unités/jour, upload coûte 1 600. Si on push 7+ vidéos/jour, prévoir un message d'erreur clair ou un retry au lendemain.
- **Facebook Pages = N comptes** : exchangeCode peut renvoyer un tableau (l'user a plusieurs Pages). Le UI doit gérer la sélection.

### Flow de publication

```
UI Composer → POST /api/social/schedule
  → crée ScheduledPost (status: SCHEDULED) + N ScheduledPostTarget (1 par compte ciblé)
  
Cron toutes les minutes → GET /api/social/cron/publish
  → query : status=SCHEDULED AND scheduledAt <= now
  → pour chaque post : runScheduledPost(post.id)
    → maj post → PUBLISHING
    → pour chaque target :
      → ensureFreshAccount() (refresh token si expiré)
      → getConnector(platform).publish(account, input)
      → maj target → PUBLISHED | FAILED (avec lastError)
      → si toutes les targets ont fini → maj post → PUBLISHED ou FAILED
```

### Image upload

- Endpoint : `POST /api/social/upload` (FormData : `file`)
- Stockage local : `public/uploads/<userId>/<timestamp>-<hash>.<ext>`
- URL publique : `${NEXTAUTH_URL}/uploads/<userId>/<filename>`
- Types autorisés : JPEG, PNG, WebP, GIF, MP4, MOV, WebM
- Limite : 100 MB
- Réutilisable côté Ads (cf `CampaignsList.tsx → modalUpload`)

## 📊 Analytics (PostAnalytics)

Stockage des métriques par target/jour. Sources :
- **Facebook/Instagram** : `/{post_id}/insights?metric=impressions,reach,engaged_users`
- **TikTok** : `/research/video/query/` (production seulement, sandbox = pas de métriques)
- **LinkedIn** : `/socialActions/{urn}/likesSummary` + organic metrics endpoint
- **YouTube** : Data API `videos.list?part=statistics`

Cron quotidien recommandé : `/api/social/cron/analytics` (à créer si pas encore en place).

## ✅ TL;DR pour Claude

Quand l'user travaille sur le social :
1. Lire l'algorithme de la plateforme cible AVANT de générer une caption
2. Respecter les limites de caractères/dimensions (cheatsheet ci-dessus)
3. **LinkedIn** → URLs dans le 1er commentaire (safe default), texte ~1 200 chars, privilégier carrousel PDF pour engagement max
4. **TikTok** → completion rate ≥70% obligatoire, niche consistency, éviter les patterns AI évidents. Sandbox → vidéos en DRAFT côté app.
5. **Instagram** → 3-5 hashtags ciblés (pas 30), Reels 30-60s, format Feed 4:5, optimiser pour DMs/partages
6. **YouTube Shorts** → 20-45s sweet spot malgré la limite à 3 min
7. **Anti-AI** : si génération IA → personnaliser fortement avant publication, éviter les structures "1/ 2/ 3/" trop ChatGPT
8. Toujours déchiffrer tokens via `decrypt()` avant les appels API
9. Erreurs OAuth → status SocialAccount = EXPIRED/REVOKED selon le sub-code
10. Ne jamais hardcoder un account ID — toujours résoudre via SocialAccount

## 📅 Maintenance & dates de vérification

**Specs et algorithmes changent vite** — à revoir trimestriellement :
- Q1 : YouTube + Facebook (changements annuels en début d'année)
- Q2 : Instagram + TikTok (post-Q1 dev conferences)
- Q3-Q4 : LinkedIn (rythme propre, surveiller les changements algo annoncés)

### Sources de vérité actuelles (juin 2026)

Les données ci-dessus ont été vérifiées le **2026-06-03** sur :
- Instagram : Buffer, Later, Hootsuite, Metadata Reactor, SellerPic (algo + specs Reels 2026)
- TikTok : Echotik, OpusClip, PostEverywhere, Socialync, Zernio (algo 2026, Content Posting API)
- LinkedIn : LinkBoost, GrowLeads, DataSlayer, MelanieGoodman, Saywhat (algo 2026, external link penalty)
- YouTube : Phyllo, Toptal, Turrboo, AdCreate, Google revision history (Shorts 3min, quotas 2026)

**Last verified : 2026-06-03**. À re-vérifier en septembre 2026 (post-conférences dev été).
