---
name: wanapush-leads-module
description: >
  Utilise cette skill pour tout travail sur le module Leads/Forms de WanaPush :
  capture publique de leads depuis les sites générés, validation/anti-spam, tableau
  de bord propriétaire (filtres, export CSV, marquer lu/supprimer), modèle
  FormSubmission. Déclencher quand l'utilisateur travaille sur app/(dashboard)/leads/*,
  app/api/forms/*, lib/form-*, ou ajoute une intégration CRM/email sur capture lead.
license: proprietary
version: 1.0
last_reviewed: 2026-06-04
---

# SKILL — WanaPush Leads / Forms Module

> Capture publique de leads depuis les sites générés WanaPush + tableau de bord
> propriétaire. Module fonctionnel et en prod (juin 2026).

## 🧭 Quand l'invoquer

Cette skill est pertinente quand on travaille sur :
- `app/(dashboard)/leads/{page.tsx,LeadsClient.tsx}` (UI dashboard)
- `app/api/forms/{submit,list,[id]}/route.ts` (3 routes)
- `lib/form-fields-catalog.ts` + `lib/form-field-insert-templates.ts` (registry HTML)
- Modèle Prisma `FormSubmission`
- Intégration future : email de notif au propriétaire, transfert vers CRM externe,
  webhooks sortants

## 🏗️ Architecture

```
app/(dashboard)/leads/
  page.tsx                  ← Server Component : auth + LeadsClient
  LeadsClient.tsx (254 l)   ← filtres (site, type), unread count, toggle read,
                              delete, export CSV (100 % client-side)

app/api/forms/
  submit/route.ts (81 l)    ← PUBLIC POST — capture depuis le site généré
  list/route.ts (75 l)      ← GET auth — submissions des sites du user
  [id]/route.ts (69 l)      ← PATCH read / DELETE — owned only

lib/
  form-fields-catalog.ts (90 l)            ← registry des types (text, email,
                                              tel, textarea, select, ...)
  form-field-insert-templates.ts (79 l)    ← HTML Tailwind générable pour insertion
                                              dans les sites
```

## 🗄️ Modèle Prisma — `FormSubmission`

```prisma
model FormSubmission {
  id        String   @id @default(cuid())
  siteSlug  String   // FK faible vers GeneratedSite.meta.siteSlug (non-enforced)
  type      String   // "contact" | "newsletter"
  data      Json     // payload arbitraire { nom, email, message, ... }
  email     String?  // extrait de data via regex (recherche/CRM)
  pageUrl   String?  // URL d'origine (max 500 chars)
  ipHash    String?  // SHA256(ip + NEXTAUTH_SECRET).slice(0, 32) — pas d'IP raw
  read      Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([siteSlug, createdAt])
  @@index([siteSlug, read])
}
```

**Choix de design** :
- `siteSlug` est une FK *faible* (pas de relation Prisma vers `GeneratedSite`).
  Raison : la table est écrite avant que l'auth user existe (capture publique).
  L'ownership est vérifiée à la lecture via `parseSiteMeta(site.meta).siteSlug`.
- `data` est Json arbitraire : pas de validation côté schéma → flexibilité totale
  pour les forms custom. La validation Zod côté `/api/forms/submit` impose
  uniquement le shape : keys `string`, values `string | number | boolean | null`.
- `ipHash` : pas d'IP en clair en BDD (RGPD). Salé avec `NEXTAUTH_SECRET`.

## 🔁 Flow end-to-end

1. **Site généré** (Vite/React servi par nginx sous `/preview/<slug>/`) :
   - `Contact.tsx` collecte les champs, ajoute un honeypot `hp`, POST `/wanapush/api/forms/submit`
   - Payload : `{ siteSlug, type, data, pageUrl, hp }`
2. **`/api/forms/submit`** (public, sans auth) :
   - Zod validation (`SubmitSchema`)
   - Honeypot : si `hp` non vide → retourne `200 ok: true` mais **sans stocker**
     (anti-bot silencieux)
   - Rate-limit : compte les `FormSubmission` `(siteSlug, ipHash)` des 60 dernières
     minutes. ≥ 5 → `429`
   - Hash IP via `hashIp()`
   - `extractEmail(data)` : regex sur les keys `/e?mail/i` ou sur les valeurs qui
     ressemblent à un email
   - `prisma.formSubmission.create(...)`
   - `revalidatePath("/leads")` puis `200 ok: true`
3. **Dashboard `/leads`** :
   - `GET /api/forms/list` retourne toutes les submissions des sites possédés
     (limit 200, ordre desc). Enrichi avec `brandName` côté serveur.
   - `LeadsClient` filtre côté client par `site` (refetch) et `type` (local +
     `startTransition`)
   - `PATCH /api/forms/[id]` toggle `read`
   - `DELETE /api/forms/[id]`
   - Export CSV = client-side : `URL.createObjectURL(new Blob(...))`

## 🔒 Sécurité

- **Pas d'auth sur submit** (capture publique). Compense avec :
  - Honeypot field `hp` (anti-bot basique mais efficace)
  - Rate-limit IP+slug (5/h)
  - Zod validation stricte sur `siteSlug` (`/^[a-z0-9-]+$/`)
  - Pas d'IP raw stockée (SHA256 salé)
- **Auth NextAuth requise** sur list/patch/delete + ownership check (le siteSlug
  doit appartenir à un `GeneratedSite` du user connecté)
- **Pas de CSRF token** côté form public — on se repose sur l'origin du browser
  et le honeypot. Acceptable car la BDD ne fait que stocker.

## ⚠️ Limites et trous connus

- **Pas d'email de notification** au propriétaire à chaque soumission. Le seul
  email service intégré est `lib/shop-email.ts` (Resend) utilisé pour les
  confirmations de commande Shop — réutilisable mais pas câblé.
- **Pas de webhook sortant** ni d'intégration CRM (HubSpot, Salesforce, etc.).
  Le projet `CNK-DEM/cron/auto_transfer_leads.php` (VTiger) est un projet
  séparé, *pas* intégré dans WanaPush.
- **Pas de gestion `multipart/form-data`** : le catalogue accepte le type
  `file` côté HTML mais `/api/forms/submit` ne parse que du JSON. Un upload
  de fichier échouerait silencieusement (champ ignoré).
- **Rate-limit en BDD** (count query), pas dans Redis/Upstash. Tient pour le
  MVP. À migrer si on scale horizontalement.

## ✅ TL;DR pour Claude

Quand l'user travaille sur les leads :
1. **Capture publique** = `POST /api/forms/submit`, *sans auth*, honeypot + rate-limit.
   Ne JAMAIS ajouter d'auth dessus, ça casse les sites générés.
2. **Dashboard** = `GET /api/forms/list` + filtres client. L'auth + ownership
   check passe par `parseSiteMeta(s.meta).siteSlug` (cf `lib/generated-site-schema.ts`).
3. **siteSlug est une FK faible** : ne pas ajouter de `@relation` Prisma sans
   migration plan car les FormSubmission peuvent exister sans GeneratedSite
   parent (legacy).
4. **Email/CRM intégration** = à câbler dans `/api/forms/submit` après le
   `create`. Pattern : appel non-bloquant style `sendNotif(...).catch(console.error)`.
5. **honeypot `hp`** : ne JAMAIS retourner `400` quand rempli — répondre `200 ok`
   pour ne pas signaler au bot qu'il est détecté.
6. **Rate-limit** : 5/h/(slug,IP). Tuner via `recentCount >= 5` dans `submit/route.ts`.
7. **`extractEmail()` est best-effort** : si l'user ne nomme pas son champ
   `email`, on cherche le 1er string qui ressemble à un email dans `data`.
   Ne pas casser ce comportement (utilisé par le tri/recherche client).

## 📅 Évolutions à prévoir

- Email de notif au propriétaire (Resend, template par type contact/newsletter)
- Webhook outbound configurable par site (Zapier, Make, n8n)
- Connecteur HubSpot/Pipedrive optionnel
- Upload de fichier (multipart) avec stockage S3/R2
- Rate-limit Redis pour scale horizontal
- Index full-text MySQL sur `data` (extraction recherche améliorée)
