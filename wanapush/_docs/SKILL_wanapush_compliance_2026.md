---
name: wanapush-compliance-2026
description: >
  Skill transversale conformité 2026 — à lire dès qu'on génère du contenu IA
  (visuel/copy/vidéo), qu'on pose un tag de tracking (Pixel/CAPI/Google), ou
  qu'on envoie de l'email. Centralise les 3 chantiers réglementaires à échéance
  proche : EU AI Act Art. 50 (labellisation IA, 2 août 2026), Google Consent
  Mode v2 (bascule ad_storage 15 juin 2026), et l'auth/réputation email
  (SPF/DKIM/DMARC/BIMI). Source de vérité unique pour Ads, Social, Site-gen,
  Email, Analytics, CAPI.
license: proprietary
version: 1.0
last_reviewed: 2026-06-09
---

# SKILL — WanaPush Conformité 2026 (AI Act · Consent Mode v2 · Email auth)

> **Pourquoi une skill dédiée :** trois échéances réglementaires tombent dans les ~8 prochaines
> semaines et touchent **plusieurs modules à la fois**. Les laisser éparpillées garantit des
> incohérences et un risque (amendes + perte de mesurabilité). Cette skill est la référence ;
> les skills modules y pointent.

## 🧭 Quand l'invoquer
- Génération de contenu IA : `generate-image`, vidéo, copy ad/email/captions, sites générés.
- Pose/édition d'un tag de tracking : Pixel/CAPI, Google Ads/Analytics, sur un site `/preview/<slug>/`.
- Envoi d'email (campagnes, notifs leads, transactionnel shop).
- Toute question "est-ce conforme ?" / "deadline ?" sur l'IA, le consentement, l'email.

---

## 1. 🔴 EU AI Act — Article 50 (transparence du contenu IA)

**Échéance : applicable le 2 août 2026.** Pour le contenu déjà en prod avant cette date, la deadline
de marquage est repoussée au **2 décembre 2026** (AI Omnibus). Amendes jusqu'à **7,5 M€ ou 1,5 % du CA**.
([Article 50](https://artificialintelligenceact.eu/article/50/), [Commission UE](https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content))

**Ce que WanaPush DOIT faire** (tout contenu généré par IA est du "contenu synthétique") :
- **Marquage machine-readable** (métadonnées C2PA / Content Credentials signées) sur tout **visuel/vidéo**
  généré par IA : module Ads (`generate-image`), Site-gen (hero), Social (visuels).
- **Label visible** pour les **deepfakes** et contenu manipulé (mention "IA" en français).
- **Label IA natif par plateforme** lors de la publication : `is_ai_generated: true` (TikTok),
  AI-content label (IG/FB), équivalent LinkedIn. Ne PAS l'omettre (TikTok shadow-ban sinon).
- **Copy/sujets email générés par IA** : marquage Art. 50(2) (contenu synthétique).
- **Sites générés** : la mention E-E-A-T "rédigé avec assistance IA, revu par [Nom]" couvre le **texte** ;
  vérifier que les **visuels IA** portent aussi metadata/label.

**Périmètre :** un outil de créa/automation marketing SMB n'est **pas** classé high-risk (Annexe III) ;
ses obligations mi-2026 = **Art. 50 (transparence) + AI-literacy**, pas le régime high-risk complet
(repoussé à déc 2027). Confirmer qu'on reste hors Annexe III.

**À faire :** [ ] helper `tagAiAsset()` (C2PA/metadata) appelé par tous les générateurs de média IA ;
[ ] propager le label IA natif dans chaque `publish()` plateforme ; [ ] mention IA sur copy email/sites.

## 2. 🔴 Google Consent Mode v2 (bascule `ad_storage`)

**Échéance : 15 juin 2026.** À partir de cette date, **`ad_storage` devient le contrôle exclusif** du
flux de données publicitaires côté Google Ads (les réglages GA/Google Signals ne pilotent plus le
partage ad). Sans signal de consentement correctement transmis → **Smart Bidding + Enhanced
Conversions / Data Manager API + CAPI perdent le signal**, et le **ROAS se dégrade silencieusement**.
([uniconsent](https://www.uniconsent.com/blog/google-ads-consent-mode-change-2026), [Google consent SS](https://developers.google.com/tag-platform/tag-manager/server-side/consent-mode))

**4 signaux à passer** (default + update) : `ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization`.
**Consent Mode v2 Advanced + modeling récupère 15-40 %** des conversions perdues au refus
(conditions : ≥700 clics/7j/pays, ≥7j de données, taux consent ≥~20 %). **CMP certifiée Google
obligatoire dans l'EEE.**

**Ce que WanaPush DOIT faire :**
- ✅ **FAIT (mode ADVANCED — ne pénalise pas sur « Non »)** — `lib/capi/pixel-script.ts` :
  - **Google** : `gtag('consent','default',{denied×4, wait_for_update:500})` AVANT le Pixel + `update`
    au clic → sur refus, *cookieless pings* + **modélisation** (récupère 30-50 %+ là où le trafic
    atteint les seuils Google : ≥700 clics ad/7j, ≥1000 events/7j). Forward-compatible (no-op sans tag Google).
  - **Meta** : `fbq('consent','revoke')` avant `init` tant que pas de consentement, `fbq('consent','grant'|'revoke')`
    au clic → sur refus, Meta **modélise** (Aggregated Event Measurement) au lieu de zéro. ✅ **Conforme** :
    on n'envoie **aucune** donnée perso à Meta sur refus (la route CAPI drop sur `wp-no-track`) — le « non-pénalisé »
    vient de la modélisation, pas d'events refusés.
  - **`SitePixel.consentRequired` défaut = `true`** (migration `20260611…`) + tous les SitePixels existants
    passés à `true` → bandeau sur tous les sites. Le snippet est injecté **dynamiquement** par
    `app/sites/[slug]/[[...page]]/route.ts` → les sites servis par cette route prennent le nouveau snippet
    au prochain chargement. ⚠️ Les sites servis en **statique `/preview/`** (via `lib/capi/inject-built-site.ts`)
    nécessitent une **re-injection** pour propager le bandeau.
  - Caveat honnête : sous les seuils de modélisation (petits sites), un refus réduit quand même la mesure —
    c'est inévitable sous RGPD (on ne piste pas qui dit non). La modélisation minimise la perte, pas plus.
- ⏳ **Reste (server-side)** : propager l'état de consentement vers les uploads **CAPI (flag LDU
  EEA/UK/Californie)** et **Google Enhanced Conversions / Data Manager** (aujourd'hui déclenchés sur
  commande sans lecture du consentement). Connecteur `ga4.ts` : lire `gcs/gcd` quand il existera.

**À faire :** [ ] forcer `consentRequired=true` + re-injection pour les sites EU ; [ ] LDU sur les
events CAPI selon le consentement ; [ ] gate des Enhanced Conversions server-side sur le consentement.

> Rappel deadline voisine (Google Ads API) : **v20 sunset 10/06/2026**, Enhanced Conversions offline/leads
> **migrent vers Data Manager API et sont bloquées dans l'Ads API à partir du 15/06/2026**. Cf. skill Ads.

## 3. Email — authentification & réputation (deliverability)

Backbone d'envoi conforme 2026 (Google/Yahoo/Microsoft) — détails opérationnels dans le skill Email :
- **SPF + DKIM + DMARC alignés** (From aligné SPF ou DKIM), DKIM ≥ 1024 bits, SPF < 10 lookups.
- **DMARC `p=quarantine` ou `p=reject` + `pct=100`** : prérequis BIMI **et** exigence Microsoft.
- **BIMI + VMC/CMC** pour le logo vérifié (checkmark bleu Gmail = VMC only).
- **RFC 8058 one-click unsub**, désabo honoré **< 48 h**, taux de plaintes **< 0,3 %** (viser < 0,1 %).
- **Warmup** domaine/IP ; ⚠️ sous-domaine partagé `<slug>@wanapush.com` = **réputation mutualisée**
  entre clients (un spammeur dégrade tout le monde) → **kill-switch auto si spam > 0,3 %** (Postmaster v1 API).
- Non-conforme depuis nov 2025 = **rejet SMTP permanent (550)**, plus juste "spam folder".

([Google bulk](https://support.google.com/a/answer/81126?hl=en), [Microsoft high-volume](https://techcommunity.microsoft.com/blog/microsoftdefenderforoffice365blog/strengthening-email-ecosystem-outlook%e2%80%99s-new-requirements-for-high%e2%80%90volume-senders/4399730))

## 4. RGPD (rappels transversaux)
- **Consentement granulaire** : capture ≠ nurturing. Sync marketing **uniquement** sur opt-in explicite
  (case non pré-cochée). Form `contact` = base légale "réponse à une demande". B2B cold = LIA documentée.
- **PII** : hash SHA-256 avant stockage (CAPI `userDataHashed`, leads `ipHash`).
- **Server-side ≠ bypass consentement** : CAPI/sGTM ne contournent pas le besoin de base légale.
- **Mesure EU** : privilégier l'agrégé/server-side (MMM nativement privacy-safe — cf. skill Analytics).

## ✅ Checklist conformité avant de shipper
- [ ] Le feature génère-t-il du média/copy IA ? → `tagAiAsset()` + label natif plateforme (Art. 50)
- [ ] Le feature pose-t-il un tag tracking ou un site ? → bandeau + Consent Mode v2 + propagation signal
- [ ] Le feature envoie-t-il de l'email ? → SPF/DKIM/DMARC alignés, unsub <48h, monitoring spam-rate
- [ ] Données perso ? → base légale + consentement granulaire + PII hashée
- [ ] Échéances : Consent Mode 15/06 · Ads API v20 10/06 · Data Manager 15/06 · AI Act Art. 50 02/08
