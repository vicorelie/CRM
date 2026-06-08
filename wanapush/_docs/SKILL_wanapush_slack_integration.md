---
name: wanapush-slack-integration
description: >
  Utilise cette skill quand l'utilisateur travaille sur l'intégration Slack
  de WanaPush : alertes CRITICAL dans Slack, weekly digest dans Slack, Block
  Kit format, futur slash command /wanapush ask. V1 (incoming webhooks) shippée
  2026-06-08.
license: proprietary
version: 1.0
last_reviewed: 2026-06-08
---

# SKILL — WanaPush Slack Integration

> V1 shippée 2026-06-08 : incoming webhooks Block Kit pour alertes CRITICAL +
> weekly digest. V2 (phase 2) : OAuth app full avec bot token + slash
> commands HMAC-signed.

## 🧭 Quand l'invoquer

- L'user demande "intégrer Slack", "alertes dans Slack", "/wanapush ask"
- Travail dans `lib/notifications/slack.ts`, `app/api/integrations/slack/*`
- Modèle Prisma `SlackIntegration`

## 🏗️ Architecture V1 (incoming webhooks)

```
lib/notifications/
  slack.ts          ← sendSlackMessage + Block Kit builders + send helpers

app/api/integrations/slack/
  route.ts                   ← GET list, POST create (URL chiffrée)
  [id]/route.ts              ← PATCH (toggle enabled, name), DELETE
  [id]/test/route.ts         ← POST test ping (vérifier URL après création)
```

## 🔌 Pattern incoming webhooks

- **URL = secret** (Slack n'a pas de signing mechanism sur les incoming) →
  chiffrée AES-256-GCM via `lib/crypto.ts`
- **Channel-specific + identity-locked** : URL ne peut poster que dans LE
  channel choisi par l'user, en tant que app Slack
- **Validation regex** : `https://hooks.slack.com/services/...` côté Zod
- **Rate limit Slack** : 1 message/seconde par webhook (Slack docs)

## 🎨 Block Kit (format moderne 2026)

`formatAnomalyAlertBlocks(anomalies)` :
- Header "🚨 N alertes WanaPush"
- 1 section par anomalie (max 5) avec emoji severity (🔴/🟠/🟡)
- Bouton "Voir le dashboard" (action primary)

`formatWeeklyDigestBlocks(ownerName, rangeDays, overview, anomalies)` :
- Header "📊 Récap WanaPush — N derniers jours"
- Context "Hello *founder* 👋"
- Section anomalies si présentes
- Sections par module ACTIF (skip si data=0) :
  - 📢 Publicité (4 fields : Dépense / ROAS / Revenue / Top plateforme)
  - 🎯 Leads (Total / HOT-WARM-COLD / Score moyen / Conversion)
  - 🛒 Boutique (CA brut/net / Commandes / Panier moyen)
  - ✉️ Email (Campagnes / Destinataires / Open / Click)
  - 💰 Unit Economics (CAC / LTV / Ratio ✅/⚠️ / LVR)
- Bouton "Ouvrir le dashboard"

**Fallback text obligatoire** : Slack utilise `text` pour les notifications mobiles
si Block Kit non rendu — toujours fournir un résumé court.

## 🔧 Hooks crons existants

`POST /api/analytics/cron/daily-anomalies` :
- En plus de `sendCriticalAnomalyAlert()` email → appelle `sendAnomalyAlertToSlack(userId, anomalies)` en parallèle
- Skip auto si pas de CRITICAL (cohérent avec email)
- Output JSON inclut `slackSent` + `slackSkipped`

`POST /api/analytics/cron/weekly-digest` :
- En plus de `sendWeeklyDigest()` email → appelle `sendWeeklyDigestToSlack()` en parallèle
- Skip auto si overview totalement vide
- Output JSON inclut `slackSent` + `slackSkipped`

## 🗄️ Schéma Prisma (migration `add_slack_integration`)

- `SlackIntegration` :
  - `webhookUrl` chiffrée Text (AES-256-GCM)
  - `channelName` cache (affichage UI)
  - `receiveAnomalyAlerts` + `receiveWeeklyDigest` toggles indépendants
  - `enabled` toggle global
  - Stats : `totalSent`, `totalFails`, `lastSentAt`, `lastError`
  - 1 user peut avoir N intégrations (un channel #alerts + un channel #digest, par ex)

## 📊 Endpoints API (4)

| Endpoint | Méthode | Description |
|---|---|---|
| `/api/integrations/slack` | GET | List intégrations du user |
| `/api/integrations/slack` | POST | Body `{ name, webhookUrl, channelName?, receiveAnomalyAlerts?, receiveWeeklyDigest? }`. URL chiffrée avant store. |
| `/api/integrations/slack/[id]` | PATCH | Toggle enabled / receive* / rename |
| `/api/integrations/slack/[id]` | DELETE | Supprimer |
| `/api/integrations/slack/[id]/test` | POST | Envoie message test "✅ Intégration WanaPush testée" pour valider URL |

## 🔒 Sécurité (best practices Slack 2026)

- ❌ JAMAIS de webhook URL en log/error message (= leak total)
- ✅ Chiffrement AES-256-GCM avant DB store
- ✅ Cleanup automatique : DELETE supprime de DB + revoke côté Slack si app OAuth (V2)
- ✅ Channel-specific (URL ne peut pas poster ailleurs)
- ❌ Pas de signing secret côté incoming webhooks (V2 OAuth nécessaire pour ça)

## 🚧 V2 phase 2 — OAuth app + slash commands

- OAuth installation flow (`/auth/slack/install` + `/auth/slack/callback`)
- Bot token chiffré + scope `commands` + `chat:write`
- Slash command `/wanapush ask <question>` :
  - Verify HMAC `x-slack-signature` (signing secret + `v0:timestamp:body`)
  - Anti-replay timestamp <5min
  - Appelle `askCopilot(userId, question)` → réponse dans Slack
- `/wanapush stats` : envoie overview courant
- `/wanapush leads --hot` : liste leads HOT recent
- Bot peut DM le user pour alertes (vs channel)
- App listing dans Slack App Directory pour distribution publique

## 📈 Sources

- [Slack security best practices](https://docs.slack.dev/security)
- [Slack signing secret HMAC verification](https://api.slack.com/authentication/verifying-requests-from-slack)
- [Slack Block Kit](https://api.slack.com/block-kit)
- Hookdeck — Guide to Slack Webhooks
