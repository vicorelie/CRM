---
name: wanapush-email-module
description: >
  Utilise cette skill quand l'utilisateur travaille sur le module Email marketing
  de WanaPush. ARCHITECTURE 2026 : WanaPush ORCHESTRE une plateforme pro (Brevo en
  premier) via une couche provider ouverte (lib/email-providers/), il ne réenvoie
  plus lui-même les campagnes marketing. Le module Resend natif (lib/email/) reste
  pour le transactionnel Shop + base historique. Couvre : connexion provider,
  audiences, compose/envoi via Brevo, deliverability, conformité.
license: proprietary
version: 0.2
last_reviewed: 2026-06-12
---

# SKILL — WanaPush Email Module

## 🧭 Architecture 2026 — orchestration d'une plateforme pro (pivot 2026-06-12)

**Décision produit (fondateur) :** ne PAS reconstruire un Brevo/Mailchimp maison.
WanaPush **orchestre** une plateforme d'emailing pro et devient le cerveau au-dessus
(sync audiences + rédaction IA + analytics). Brevo en premier, archi ouverte.

**Couche provider — `lib/email-providers/`** :
- `types.ts` : interface `EmailProvider` (validate, getLists, getSenders, importContacts,
  getCampaigns, createCampaign, sendCampaign) + types (`ProviderList`, `ProviderSender`,
  `ProviderCampaign`, `CreateCampaignInput`). `ProviderError` = message lisible user.
- `brevo.ts` : connecteur Brevo **API v3** (base `https://api.brevo.com/v3`, header `api-key`).
  Endpoints clés : `GET /account`, `GET /contacts/lists`, `GET /senders`, `POST /contacts/import`,
  `GET|POST /emailCampaigns`, `POST /emailCampaigns/{id}/sendNow`.
- `index.ts` : registre `getProvider(id)` + `getUserEmailConnection(userId)` (déchiffre la clé).
- `html.ts` : `wrapProviderCampaignHtml()` — footer avec **`{{ unsubscribe }}`** (tag Brevo,
  PAS le lien WanaPush). Brevo gère le désabo + List-Unsubscribe RFC 8058.

**DB** : `EmailProviderConnection` (userId, provider, **apiKey chiffrée AES-256-GCM**,
accountEmail/Name/plan, status CONNECTED|ERROR, `@@unique([userId, provider])`).
JAMAIS renvoyer la clé en clair.

**API** : `/api/email/providers` (GET status / DELETE disconnect) · `/connect`
(POST {provider, apiKey} → valide via `provider.validate()` PUIS chiffre) ·
`/campaigns` (POST → createCampaign + sendNow, Markdown→HTML via `renderMarkdownToHtml`).

**UI** `app/(dashboard)/email/` : `page.tsx` (server, `getUserEmailConnection` →
`EmailConnect` si non connecté, sinon fetch lists/senders/campaigns Brevo →
`EmailDashboard`). Connect-first **guidé** (lien direct `app.brevo.com/settings/keys/api`).
Compose impose un **sender vérifié Brevo** (`getSenders`, jamais un email tapé au hasard)
+ sélection d'audiences (listes Brevo). Bouton « brouillon » ET « créer + envoyer ».

**Auto-pilote** : opportunité `CONNECT_EMAIL` (`lib/agent/actions.ts`) quand
`emailProviderConnection.count(CONNECTED) === 0` → deep-link `/email`.

**Pièges Brevo** :
- L'**import contacts est asynchrone** (`POST /contacts/import` renvoie un processId, pas un count).
- Le **sender doit être vérifié** côté Brevo sinon création campagne refusée → on liste `GET /senders`.
- `createCampaign` crée un **brouillon** (status draft) ; l'envoi nécessite `/sendNow` séparé.
- Les listes vivent dans des **folders** (folderId 1 = défaut) à la création.
- Stats dans `campaign.statistics.globalStats` (sent/delivered/uniqueViews/uniqueClicks).

**Incrément 2 (shippé 2026-06-12)** :
- `lib/email-providers/sync.ts` → `syncAudiencesToBrevo(userId)` : pousse `EmailContact`
  (status ACTIVE = prospects) + `Customer` (clients boutique, `where: { shop: { userId } }`,
  `distinct: ["email"]`) dans 2 listes Brevo dédiées (« WanaPush — Prospects » / « … Clients
  boutique »), upsert idempotent (listes retrouvées par nom sinon créées, chunks 500).
  API `POST /api/email/providers/sync-audiences`. UI : bouton « 🔄 Synchroniser mes audiences ».
- `lib/email-providers/ai-draft.ts` → `draftCampaign(userId, brief)` : `askAi` (lib/ai.ts,
  provider réel = OpenAI cf [[wanapush-ai-provider]]) renvoie JSON `{subject, preheader,
  bodyMarkdown}`, contexte `Business` (name/sector/website) injecté, `extractJson` tolère les
  fences. API `POST /api/email/providers/draft`. UI : bloc « ✨ Rédiger avec l'IA ».

**Incrément 3 (shippé 2026-06-12)** :
- **Win-back auto-pilote** : `detectOpportunities` (lib/agent/actions.ts) pousse
  `WINBACK_CAMPAIGN` quand ≥10 clients ont leur dernière commande **PAYÉE > 90 j**
  (`order.groupBy(by:[customerEmail], _max:createdAt)`), uniquement si Brevo connecté.
  Deep-link `/email?intent=winback` → `page.tsx` préremplit `WINBACK_BRIEF` (best practice
  ci-dessous) → l'utilisateur clique « ✨ Rédiger » → relit → envoie. JAMAIS d'envoi auto.
- **Cron** `/api/email/providers/cron/sync` (GET, `x-cron-secret` timing-safe, maxDuration 300) :
  pour chaque connexion CONNECTED → `syncAudiencesToBrevo` + `snapshotProviderStats`. Erreur
  par-user → status=ERROR + lastError. **Planifier** `0 5 * * *`.
- **Stats Analytics** : `lib/email-providers/stats.ts` `snapshotProviderStats(userId)` écrit
  un agrégat 30j dans `EmailProviderConnection.statsJson`. `getEmailEngagement` (aggregators.ts)
  le fusionne **uniquement si la range demandée ≈ 30 j** (overview) — lecture DB, AUCUN appel
  API live (anti-latence). Pour des ranges custom → stats natives seules.

**Best practices win-back 2026** (MailerLite/Omnisend/Iterable, vérifié 2026-06-11) :
seuil inactivité **90 j** (ajuster au cycle produit) ; séquence 3 temps « we miss you »
→ offre de retour → dernière chance/suppression ; **« tu nous manques » > « reviens »** ;
**livraison gratuite > % de remise** (+8% open, +12% conv) ; supprimer les inactifs
chroniques **protège la délivrabilité**. Récupération typique 20–40 %, 3–5× ROI.

**Incrément 4 (idées)** : séquence win-back multi-emails (J0/J+5/J+10) au lieu d'un envoi
unique ; A/B subject via Brevo ; carte auto-pilote sur d'autres signaux (panier abandonné,
post-achat cross-sell) ; labelliser le contenu IA (Art. 50, cf. [[wanapush-compliance]]).

**Extension d'un nouveau provider** : implémenter `EmailProvider` dans
`lib/email-providers/<x>.ts`, l'enregistrer dans `PROVIDERS` (index.ts), ajouter l'id
au type `ProviderId`. Le reste (UI, API, auto-pilote) est agnostique.

> Note deliverability : avec Brevo, SPF/DKIM/DMARC, warmup, List-Unsubscribe et
> suppression list sont **gérés par Brevo** → la majorité des « À faire » deliverability
> ci-dessous (réputation mutualisée, warmup, kill-switch spam) ne concernent QUE le
> module Resend natif. Côté Brevo : vérifier le domaine d'envoi + activer le double
> opt-in dans Brevo. La conformité Art. 50 (copies IA) reste à notre charge.

---

## 📦 Module Resend natif (lib/email/) — transactionnel Shop + historique

> ⚠️ La section ci-dessous décrit le module d'envoi **maison** (Resend). Il n'est plus
> la voie principale pour les campagnes marketing (→ Brevo). Il sert encore aux emails
> transactionnels et reste documenté pour maintenance.

## ⚠️ MàJ 2026 best practices (sources officielles, audit 2026-06-09)

**Deliverability (Google/Yahoo/Microsoft) :** bulk = 5 000/j/domaine → classification *permanente*. Requis : SPF+DKIM+DMARC **alignés** (From aligné SPF ou DKIM), DKIM ≥ 1024 bits. **Taux plaintes < 0,30 %** (viser < 0,1 %). Durcissement nov 2025→2026 : non-conforme = **rejet SMTP 550** (plus juste spam). Microsoft (>5 000/j depuis 5 mai 2025) : mêmes règles, `550 5.7.515`. ([Google](https://support.google.com/a/answer/81126?hl=en), [Microsoft](https://techcommunity.microsoft.com/blog/microsoftdefenderforoffice365blog/strengthening-email-ecosystem-outlook%e2%80%99s-new-requirements-for-high%e2%80%90volume-senders/4399730))

**Nouveautés :** **BIMI+CMC** (Gmail accepte les CMC sans marque déposée ; checkmark bleu = VMC seulement ; prérequis **DMARC p=quarantine/reject + pct=100**). **Postmaster Tools v2** = dashboard Compliance, mais **l'API reste v1** → monitoring auto via API v1. **AMP email** : Outlook l'a désactivé → ne pas prioriser, fallback HTML. **Dark mode + AA** : contraste ≥ 4,5:1, texte réel (pas image de texte) dans `wrapHtmlTemplate()`. ([Redsift BIMI](https://redsift.com/guides/bimi-in-2026-verified-logos-cmcs-and-the-fastest-path-to-inbox-display))

**Écarts vs skill :** ❌ pas de monitoring deliverability ni de **kill-switch auto si spam > 0,3 %** ; ❌ **warmup domaine/IP** non documenté (sous-domaine partagé `<slug>@wanapush.com` = **réputation mutualisée** entre clients = risque) ; ❌ dark mode/accessibilité absents ; ⚠️ copies générées par IA = contenu synthétique → marquage Art. 50 (cf. `SKILL_wanapush_compliance_2026.md`).

**✅ Idempotence webhook (audit M6, 2026-06-09)** : `lib/email/webhooks.ts` ne double-compte plus opens/clicks sur retry Svix — incrément atomique via `updateMany` conditionnel sur `firstOpenedAt`/`firstClickedAt` null (compteurs = ouvertures/clics **uniques**).

**À faire :** [ ] Postmaster v1 API + alerte/pause si spam approche 0,3 % ; [ ] forcer DMARC p=quarantine/reject pct=100 ; [ ] warmup progressif + documenter risque réputation mutualisée ; [ ] honorer désabos **< 48 h** (vérifier `sendCampaign`) ; [ ] `wrapHtmlTemplate()` dark-mode-safe + AA ; [ ] double opt-in (DE).

> **État 2026-06-08 : MVP backend complet shippé.** Schema Prisma + lib/email/
> + 5 endpoints API. UI dashboard reste à brancher (squelette ModulePage existant).
> Base transactionnelle Shop (`lib/shop-email.ts`) reste séparée pour les
> emails de commande.

## 🎯 Backend MVP (shippé 2026-06-08)

**Modèles Prisma** :
- `EmailContact` : userId, email, firstName/lastName, tags JSON, attributes JSON, source, status (ACTIVE/PENDING/UNSUBSCRIBED/BOUNCED/COMPLAINED), consentedAt, unsubscribedAt, lastEngagedAt, bounceReason. Unique (userId, email).
- `EmailCampaign` : userId, name, subject, preheader, fromName, fromEmail, replyTo, bodyMarkdown, bodyHtmlSnapshot, segmentJson, status (DRAFT/SCHEDULED/SENDING/SENT/FAILED/CANCELLED), scheduledAt, sentAt, stats JSON, A/B (abVariantSubject + abSamplePercent).
- `EmailSend` : campaignId, contactId, abVariant, resendId (cache pour webhooks), status (QUEUED→SENT→DELIVERED→OPENED/CLICKED/BOUNCED/COMPLAINED), openCount, clickCount, firstOpenedAt, firstClickedAt, etc.

**Module core** (`lib/email/`) :
- `index.ts` : `sendEmail(input)`, `sendBatch(inputs[100])`, `sendCampaign(campaignId)` (orchestrator full broadcast avec chunk 100, EmailSend pre-created pour token unsub unique). `renderMarkdownToHtml()` + `wrapHtmlTemplate()` avec footer RGPD obligatoire (adresse postale + lien unsub manuel).
- `unsubscribe.ts` : `genUnsubToken(contactId, sendId?)` + `verifyUnsubToken(token)` HMAC-SHA256 stateless (pas de DB lookup pour valider). `buildUnsubHeaders()` retourne `List-Unsubscribe: <mailto:>, <https:>` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click` — RFC 8058 compliant (Gmail/Yahoo exigent depuis fév 2024, Apple Mail aussi).
- `webhooks.ts` : `verifyResendSignature(rawBody, headers, secret)` HMAC-SHA256 Svix avec anti-replay 5min. Supporte plusieurs sigs séparées par espace (rotation). `applyResendEvent(event)` update EmailSend + EmailContact status (hard bounce → BOUNCED, complaint → COMPLAINED + désabo auto) + agrège `EmailCampaign.stats` (recipients, delivered, opens/uniqueOpens, clicks/uniqueClicks, bounces, complaints, unsubscribes).

**Endpoints API** :
- `POST/GET /api/email/contacts` : CRUD basique + pagination cursor.
- `POST /api/email/contacts/import` : bulk import 10k max, CSV (header `email,firstName,lastName,tags`) ou array JSON. `assumeConsent: true` → ACTIVE direct, sinon PENDING (double-opt-in séparé).
- `POST/GET /api/email/campaigns` : create DRAFT/SCHEDULED + list.
- `POST /api/email/campaigns/[id]/send` : déclenche `sendCampaign()`. Refuse si déjà SENT/SENDING.
- `GET/POST /api/email/unsubscribe/[token]` : POST = RFC 8058 one-click (Gmail/Yahoo). GET = lien footer (page HTML de confirmation).
- `POST /api/email/webhooks/resend` : Svix-signed (`RESEND_WEBHOOK_SECRET`). Reçoit `email.sent/delivered/opened/clicked/bounced/complained/failed`.

**Variables d'env requises** :
- `RESEND_API_KEY` : déjà présent (Shop transactionnel)
- `RESEND_WEBHOOK_SECRET` : à configurer Resend Dashboard > Webhooks > Signing secret (whsec_...)
- `NEXTAUTH_SECRET` : réutilisé pour HMAC tokens unsub
- `NEXT_PUBLIC_BASE_URL` : pour construire URLs unsub absolues
- `EMAIL_FROM_DEFAULT` (optionnel) : email mailto: dans List-Unsubscribe, défaut `noreply@wanapush.com`

⚠️ **Base** : `lib/shop-email.ts` (147 lignes) gère les emails transactionnels de
commande via Resend → laisser tranquille. Le nouveau module `lib/email/` est
séparé pour le marketing.

## 🧭 Quand l'invoquer

- L'user demande "newsletter", "campagne email", "séquence welcome", "panier
  abandonné", "automation email"
- Travail dans `app/(dashboard)/email/`, `app/api/email/*`, `lib/email/*`
- Différencier de l'email transactionnel Shop (`lib/shop-email.ts`) : laisse
  celui-là tranquille, c'est pour les confirmations de commande.

## 📋 Scope cible

1. **Liste de contacts** : import CSV, segmentation par tags + filtres dynamiques
   (acheté X, n'a pas ouvert depuis Y, etc.)
2. **Templates** : éditeur drag-and-drop OU markdown-to-html simple (cf
   `MarkdownTextarea` déjà extrait dans `_components/Primitives.tsx` Shop)
3. **Broadcast** : envoyer une campagne ad-hoc à un segment
4. **Séquences** : welcome (J+0/J+3/J+7), panier abandonné (H+1/H+24), inactif
   (J+30/J+60), trigger-based via Prisma events ou cron
5. **A/B testing** : 2 variantes de subject ou de body, split 50/50, gagnante
   sélectionnée après N% d'opens
6. **Analytics** : open rate, click rate, bounce, unsubscribe, par campagne + global

## 🔌 Provider : Resend (déjà câblé)

- Env var : `RESEND_API_KEY` (existe pour le transactionnel Shop)
- Client : `npm i resend` (à vérifier si déjà installé via `lib/shop-email.ts`)
- Pattern d'envoi (cf `lib/shop-email.ts`) :
  ```ts
  await resend.emails.send({
    from: "WanaPush <noreply@wanapush.com>",
    to: [customerEmail],
    subject: "...",
    html: renderTemplate(...)
  });
  ```
- **Limites Resend Free** : 100 emails/jour, 3 000/mois. Au-delà : passer au plan
  Pro (20€/mois pour 50k emails) ou ajouter un fallback SendGrid/Postmark.

⚠️ **DKIM/SPF** : à configurer côté DNS pour chaque domaine d'envoi. Si l'user
veut envoyer depuis `marketing@son-site.com`, il faut un setup Resend Domains
par site → complique le routing. Recommandation MVP : envoyer depuis
`<userSlug>@wanapush.com` (sous-domaine partagé, DKIM/SPF déjà OK).

## 🏗️ Architecture cible

```
lib/email/
  index.ts          ← getEmailClient(), sendBroadcast(), sendSequence()
  templates.ts      ← render markdown → HTML (réutiliser renderMd de
                      _components/Primitives.tsx Shop)
  segments.ts       ← buildSegmentQuery(criteria) : compile en Prisma where
  sequences.ts      ← Engine séquence : trigger → délai → step → next step
  unsubscribe.ts    ← gestion liens unsub (cf RGPD : un clic obligatoire)
  webhooks.ts       ← Resend webhooks : open/click/bounce/spam_report

app/api/email/
  contacts/          ← CRUD + import CSV
  segments/          ← CRUD règles
  templates/         ← CRUD templates
  campaigns/         ← CRUD + send (broadcast)
              [id]/  ← stats
  sequences/         ← CRUD + activate/pause
  unsubscribe/[token]/ ← GET endpoint public lien unsub (1-click)
  webhooks/resend/   ← reçoit les events Resend (open, click, bounce)
                       protégé par signature Svix

app/(dashboard)/email/
  page.tsx
  contacts/ContactsClient.tsx
  campaigns/CampaignEditor.tsx
  sequences/SequenceBuilder.tsx
```

## 🗄️ Modèles Prisma à créer

```prisma
model EmailContact {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(...)
  email       String
  firstName   String?
  lastName    String?
  tags        Json     // ["client", "vip", ...]
  attributes  Json     // custom fields
  source      String?  // "shop:order" | "forms:newsletter" | "import:csv:..."
  status      EmailContactStatus  // ACTIVE | UNSUBSCRIBED | BOUNCED | COMPLAINED
  unsubscribedAt DateTime?
  lastOpenAt  DateTime?
  lastClickAt DateTime?
  createdAt   DateTime @default(now())
  @@unique([userId, email])
  @@index([userId, status])
}

model EmailCampaign {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(...)
  name        String
  subject     String
  fromName    String
  fromEmail   String
  bodyHtml    String   @db.MediumText
  bodyMarkdown String? @db.MediumText
  segmentId   String?
  status      CampaignStatus  // DRAFT | SCHEDULED | SENDING | SENT | FAILED
  scheduledAt DateTime?
  sentAt      DateTime?
  stats       Json     // { sent, delivered, opens, uniqueOpens, clicks, ... }
  createdAt   DateTime @default(now())
}

model EmailSequence {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(...)
  name        String
  trigger     String   // "shop:order:created" | "forms:submission:newsletter" | "manual"
  steps       Json     // [{ delayHours, subject, body, conditions }, ...]
  enabled     Boolean  @default(false)
  createdAt   DateTime @default(now())
}

model EmailSend {
  id           String   @id @default(cuid())
  campaignId   String?
  sequenceId   String?
  stepIndex    Int?
  contactId    String
  contact      EmailContact @relation(...)
  resendId     String?  // id côté Resend pour matcher les webhooks
  status       EmailSendStatus  // QUEUED | SENT | DELIVERED | BOUNCED | OPENED | CLICKED
  openCount    Int      @default(0)
  clickCount   Int      @default(0)
  sentAt       DateTime?
  openedAt     DateTime?
  clickedAt    DateTime?
  @@index([contactId])
  @@index([campaignId])
  @@index([sequenceId])
}
```

## 🔒 RGPD + conformité

- **Double opt-in** : minimum pour la newsletter (envoyer un mail de confirmation
  avant `status: ACTIVE`)
- **Lien unsub 1-clic obligatoire** (RFC 8058 + List-Unsubscribe header)
- **Stocker la source de consentement** dans `EmailContact.source` + horodatage
- **Suppression sur demande** : DELETE contact + purge `EmailSend` rattachés
- **DPA Resend** : signer le DPA Resend (déjà signé pour le transactionnel ?
  à vérifier avec l'avocat)

## ✅ TL;DR pour Claude

Si l'user demande d'implémenter Email marketing :
1. **Réutiliser Resend** déjà câblé pour le Shop transactionnel — pas besoin
   d'un autre provider sauf si dépasse 50k emails/mois.
2. **`lib/shop-email.ts` est pour le transactionnel uniquement** : ne pas
   l'élargir. Créer `lib/email/index.ts` séparé.
3. **`EmailContact` est mono-user** (pas de Business multi-tenant). Si l'user
   a plusieurs sites, leurs contacts se mélangent — c'est OK car le user reste
   propriétaire.
4. **Segments = Prisma where compilé**. Pas de DSL custom — un objet JSON qui
   se traduit directement en `prisma.emailContact.findMany({ where: ... })`.
5. **Sequences = trigger + step engine**. Au début, simple cron qui scrute
   les contacts éligibles à chaque step. Plus tard, queue (BullMQ + Upstash)
   pour le scale.
6. **Webhooks Resend = source de vérité** pour `status` et `openCount`.
   Endpoint protégé par signature Svix (Resend utilise Svix pour ses webhooks).
7. **A/B test = simple** : 2 variantes de `subject`, split 50/50 sur 10 % du
   segment, gagnant (open rate) envoyé aux 90 % restants après 4h.
8. **Anti-spam** : limiter à 1 broadcast/jour/segment pour le MVP, sinon les
   bounces explosent et Resend peut suspendre le compte.

## 📅 Évolutions

- Visual drag-and-drop editor (cf react-email-editor de Unlayer) à terme
- Integration GMass/Mailchimp si l'user a déjà sa base ailleurs
- AI subject line generator (utilise `lib/ai/` Anthropic wrapper)
- Predictive send time (heure optimale par contact basée sur ouvertures passées)
