---
name: wanapush-agentic-approval-ux
description: >
  Pattern PRODUIT transversal (2026) : l'IA FAIT le travail, l'utilisateur APPROUVE.
  À lire pour toute feature où WanaPush exécute une action à la place du founder
  (poster, lancer une campagne, modifier un budget, envoyer un email, répondre à un
  avis). Définit les 4 niveaux d'autonomie, le contenu d'une carte d'approbation,
  la gouvernance par taux de correction, et le mapping par type d'action. Source de
  vérité pour transformer le copilot de "répond aux questions" → "prépare des décisions".
license: proprietary
version: 1.0
last_reviewed: 2026-06-11
---

# SKILL — WanaPush UX Agentique « l'IA fait, tu approuves »

> **Le pattern le plus important de la plateforme.** Un founder PME ne veut pas un
> chatbot qui *suggère* ni une boîte noire qui agit sans contrôle. Il veut une **file
> de décisions déjà préparées** : l'agent a fait le travail (collecte, rédaction,
> orchestration), il ne reste qu'à valider. Boucle canonique 2026 :
> **l'agent détecte → présente des options + tradeoffs → l'humain choisit → l'agent exécute.**
> ([getclaw HITL 2026](https://getclaw.sh/blog/human-in-the-loop-ai-agents-approvals-2026), [Fuselab Agent UX](https://fuselabcreative.com/ui-design-for-ai-agents/))

## 🧭 Quand l'invoquer
- Toute feature où la plateforme exécute une action pour l'utilisateur (ads, social, email, GBP, leads, shop, site-gen).
- Évolution du copilot / cockpit / file d'actions.
- Question "est-ce qu'on auto-fait ou on demande confirmation ?".

## 1. Les 4 niveaux d'autonomie (calibrer sur réversibilité × € en jeu × impact client/légal)

| Niveau | Comportement | Exposition | Exemples WanaPush |
|--------|-------------|-----------|-------------------|
| **1. Autopilot** | Fait automatiquement, audit échantillon hebdo | 0–100 € | Résumés read-only, scoring lead, détection anomalies, sync analytics, classification |
| **2. Batch approval** | Brouillons réversibles, validés en lot | 100–1 000 € | **Posts GBP/social brouillons, réponses avis IA, captions, copy email** |
| **3. One-by-one** | Validation unitaire, carte d'évidence complète | 1 000–10 000 € | **Dépense ads / changement budget, lancement campagne, édition audience, envoi email de masse** |
| **4. Human-only** | Jamais automatisé | 10 000 €+ | **Facturation, juridique, structure de compte, changement bancaire** |

**Règle d'or :** tout ce qui est *customer-facing* est **draft-first** par défaut, quel que soit le montant.

## 2. Contenu OBLIGATOIRE d'une carte d'approbation
Chaque action proposée affiche :
1. **L'action** (verbe clair : "Mettre en pause la campagne X", "Poster sur GBP").
2. **Le pourquoi** (rationale) — pas un slogan, le raisonnement.
3. **L'évidence source** (la data qui justifie : "ROAS −22 % sur 7j", citée et cliquable).
4. **L'exposition €** (budget en jeu / coût si erreur).
5. **Le downside** si on se trompe.
6. **Le résultat attendu** ("récupération projetée +Z €").
7. **Undo / override** à tout moment.

> Une carte sans évidence source = une boîte noire = pas de confiance. Toujours **citer la source**
> et exposer un "voir le contexte" avec le niveau de confiance.

## 3. Gouvernance par taux de correction (élargir l'autonomie quand la confiance est prouvée)
- **Track le `correction rate`** par type d'action (taux de rejets/modifs humaines). **Cible < 5 %.**
- Un type d'action passe d'un niveau **2 (batch) → 1 (autopilot)** uniquement quand son correction rate
  reste < 5 % sur un volume significatif. À l'inverse, on **resserre** si ça dérive.
- **Boucle de feedback** : chaque rejet/modif ré-entraîne (few-shot / prompt) le préparateur d'action.
- **Audit log immuable horodaté** de chaque décision + chaque intervention humaine (WanaPush a déjà
  `AuditLog` + webhooks signés HMAC + mémoire conversation copilot → étendre en *agent action log*).

## 4. Mapping concret par type d'action WanaPush
| Action | Niveau par défaut | Notes |
|--------|-------------------|-------|
| Détection anomalie, scoring lead, sync KPIs | **Autopilot** | read-only / interne |
| Réponse avis GBP, post social/GBP, caption, copy email | **Batch** (→ Autopilot si correction <5 %) | draft-first, customer-facing |
| Pause/budget campagne, lancement campagne, audience, envoi email masse | **One-by-one** | carte d'évidence + € en jeu |
| Connexion paiement, facturation plan, suppression compte | **Human-only** | jamais auto |

## 5. Évolution du copilot (de "répond" → "prépare des décisions")
Le copilot (9 tools, `lib/copilot/`) doit produire des **actions préparées**, pas que du texte :
- Quand une anomalie/opportunité est détectée → générer une **carte d'action** (§2) prête à approuver.
- Tools "write" (créer campagne, programmer post, envoyer email) = **gatés par scope MCP `read:write`**
  (déjà en place, audit H9) + le niveau d'autonomie ci-dessus.
- Provider-agnostique : marche avec le stack réel **OpenAI gpt-4o** (cf. `wanapush-ai-provider`) — l'Agents
  SDK OpenAI a un HITL natif (pause/approve/resume). Côté Anthropic, tool-use + confirmation manuelle.

## ✅ Checklist avant de shipper une action agentique
- [ ] Niveau d'autonomie choisi selon réversibilité × € × impact client ?
- [ ] Customer-facing → draft-first ?
- [ ] Carte d'approbation complète (action/pourquoi/évidence/€/downside/résultat/undo) ?
- [ ] Action loggée dans l'audit log (immuable, horodaté, avec l'acteur) ?
- [ ] `correction_rate` trackable pour ce type d'action ?
- [ ] Write-tool gaté (scope MCP + niveau d'autonomie) ?

## 📈 Sources
- [getclaw — HITL approvals 2026 (framework 4 niveaux)](https://getclaw.sh/blog/human-in-the-loop-ai-agents-approvals-2026)
- [Fuselab — Agent UX 2026](https://fuselabcreative.com/ui-design-for-ai-agents/) · [ParallelHQ — AI transparency & trust](https://www.parallelhq.com/blog/designing-ai-transparency-trust)
- [AWS — HITL constructs for agentic workflows](https://aws.amazon.com/blogs/machine-learning/human-in-the-loop-constructs-for-agentic-workflows-in-healthcare-and-life-sciences/)
