---
name: wanapush-onboarding-activation
description: >
  Pattern PRODUIT transversal (2026) : "tout à portée de main, on automatise ce qui
  peut l'être, on ne demande/dirige que quand c'est nécessaire". À lire pour toute UI
  d'onboarding, d'activation, d'écran d'accueil/cockpit, ou de collecte d'info. Définit
  l'artefact-en-60s, le profilage just-in-time, l'empty-state par enrichissement, la
  file d'actions priorisées, et les métriques north-star (résultats livrés, pas usage).
license: proprietary
version: 1.0
last_reviewed: 2026-06-11
---

# SKILL — WanaPush Onboarding & Activation (auto-pilote 2026)

> Objectif founder : **quand l'utilisateur arrive, tout est à portée de main ; ce qui peut
> être fait automatiquement EST déjà fait ; on ne lui demande une info que si elle est
> (a) impossible à inférer ET (b) bloquante pour une action à fort ROI maintenant.**
> Le but n'est pas "l'utilisateur a fait sa 1re campagne" → c'est **"la plateforme l'a déjà
> faite"**. ([DigitalApplied TTV 2026](https://www.digitalapplied.com/blog/customer-onboarding-time-to-value-2026-saas-metrics-framework), [Userpilot 2026](https://userpilot.com/blog/user-onboarding/))

## 🧭 Quand l'invoquer
- UI d'onboarding / setup / "premier écran".
- Tout formulaire ou collecte d'info utilisateur.
- Écran d'accueil / cockpit / dashboard.
- Question "qu'est-ce qu'on demande à l'inscription ?".

## 1. Artefact fini en < 60 s (jamais d'écran vide)
À l'inscription, ne demander **que le nom/URL de l'activité** → **auto-enrichir** depuis le
footprint existant (fiche GBP, FB/Insta, logo, adresse, horaires, produits, domaine) → le **premier
écran montre du travail FINI** : landing page générée + visuels + brouillon de campagne.
- **Time-to-value cible < 24 h** (idéalement < 60 s pour le 1er artefact). L'activation B2B moyenne
  n'est que ~37,5 % → battre ça est la barre ; >98 % des users qui n'atteignent pas la valeur churnent en 2 sem.
- **Empty-state = bug perçu.** On ne montre jamais un dashboard vide : pré-population par enrichissement,
  templates plutôt que canvas blanc, empty-states interactifs (agir directement).

## 2. Profilage just-in-time (ne demander que le nécessaire)
- **UNE question JTBD à l'inscription** ("Que veux-tu accomplir ?"), pas un formulaire rôle/taille/budget.
- **Enrichissement silencieux** : pré-remplir tout ce qu'on peut déduire (GBP, socials, data publique).
  Si on connaît déjà un champ → le **remplacer** par une question utile (champ dynamique).
- **Demande contextuelle au moment du besoin** : la clé Stripe seulement quand on veut publier une boutique
  payante ; l'OAuth ad-account seulement quand on lance une pub ; la voix de marque quand on génère du copy.
  (Cf. mémoire `elite-demenagement` : en attente Stripe/Brevo/logo/adresse = exactement ce pattern blocking-only.)
- **Règle :** ne JAMAIS afficher un long écran de settings d'emblée. Chaque donnée est demandée
  *au moment où elle débloque une action*.

## 3. File d'actions priorisées = le cœur du cockpit (« la seule chose à faire maintenant »)
L'écran d'accueil n'est pas une arborescence de nav → c'est un **cockpit** :
- **En haut : UN chiffre north-star** (revenu attribuable / leads qualifiés sur la période).
- **Au centre : une file d'actions classées** par **impact × effort × confiance**. WanaPush a déjà la
  matière première : `lib/analytics/` (6 agrégateurs cross-modules + détection d'anomalies ROAS/leads/spend).
  Chaque anomalie/opportunité → **une carte d'action rankée**, **idéalement déjà exécutée en attente
  d'approbation** (cf. `SKILL_wanapush_agentic_approval_ux.md`).
- Chaque carte **deep-link** vers l'action exacte (pas de chasse dans les menus).
- **⌘K command palette** (find-and-run) pour sauter à n'importe quel module/action (social/ads/email/
  GBP/leads/shop/site-gen — beaucoup de modules → indispensable).
- **Inbox unifiée** : leads + réponses email + avis GBP + commentaires social dans un seul flux.

## 4. Auto-run des fondamentaux à fort ROI (sur des rails, sans que le founder initie)
Classés par ROI prouvé (les magnitudes vendeur sont gonflées — c'est le **ranking** qui compte) :
1. **Email segmenté + flows déclenchés** (panier abandonné, high-intent) — levier #1. (Resend + RFC 8058 déjà shippé.)
2. **Follow-up lead instantané** : scorer + router + relancer en temps réel. (Module Leads : scoring hybride + notif + webhooks.)
3. **GBP : posts ≥ 2/sem + demande/réponse d'avis** (la fréquence de post est un signal de ranking local 2026 ; vélocité d'avis > volume). (Module GBP : auto-reply + sync daily → étendre au scheduling de posts.)
4. **Nurture / drip** + segmentation propre.
5. **Landing page + Pixel live** automatiques. (Site-gen + CAPI déjà là.)

Le travail n'est pas de construire ces modules (ils existent) — c'est de les faire **tourner tout seuls**.

## 5. Métriques : mesurer les RÉSULTATS livrés (pas l'usage)
- **North star** = **résultats attribuables par compte** (€ revenu + # leads qualifiés générés par les
  actions automatiques / compte actif / mois). Pas une vanity metric d'usage.
- **Leading indicators** : time-to-first-automated-result (< 24 h), % d'actions recommandées approuvées/
  auto-exécutées, **correction rate < 5 %** (double comme métrique de confiance), activation %, rétention M1 (~47 % = benchmark).
- **Niveau compte** (B2B), pas user. 4 instruments : event d'activation validé, funnel horodaté
  signup→setup→aha→habit, rétention par cohorte de TTV, NRR segmenté par statut d'activation.

## 6. Everboarding
Introduire les features **au moment de readiness** (contextuel), pas en firehose au jour 1.
Tours opt-in, skippables, < 5 étapes, déclenchés par une *action* utilisateur, chaque étape = bénéfice immédiat.

## ✅ Checklist d'une UI d'onboarding/cockpit
- [ ] Premier écran = artefact FINI (pas de formulaire, pas d'empty-state) ?
- [ ] Inscription = nom/URL + 1 question JTBD max, le reste auto-enrichi ?
- [ ] Toute demande d'info est *just-in-time* (inférable=non + bloquante=oui) ?
- [ ] Cockpit : 1 north-star en haut + file d'actions priorisées (impact×effort×confiance) + deep-links ?
- [ ] ⌘K + inbox unifiée ?
- [ ] Fondamentaux à fort ROI tournent en auto (email/leads/GBP/nurture/landing) ?
- [ ] On mesure les résultats livrés (north-star) + correction rate, au niveau compte ?

## 📈 Sources
- [DigitalApplied — TTV & measurement stack 2026](https://www.digitalapplied.com/blog/customer-onboarding-time-to-value-2026-saas-metrics-framework)
- [Userpilot — user onboarding 2026](https://userpilot.com/blog/user-onboarding/) · [Sparkle — progressive profiling 2026](https://sparkle.io/blog/progressive-profiling)
- [Teneo — Next-Best-Action 2026](https://www.teneo.ai/blog/next-best-action-software) · [UXPin — dashboard principles 2026](https://www.uxpin.com/studio/blog/dashboard-design-principles/)
- [Statspresso — B2B North Star 2026](https://www.statspresso.com/blog/b-2-b-saa-s-north-star-metrics-list)
