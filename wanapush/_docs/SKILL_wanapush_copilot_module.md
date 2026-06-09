---
name: wanapush-copilot-module
description: >
  Utilise cette skill quand l'utilisateur travaille sur le module AI Marketing
  Copilot de WanaPush : assistant IA conversationnel qui exploite les data
  business du founder via tool use Claude. Architecture pattern Anthropic Tool
  Use 2026, conversation memory en DB, max 5 iterations par tour.
license: proprietary
version: 1.0
last_reviewed: 2026-06-08
---

# SKILL — WanaPush AI Marketing Copilot

> Assistant IA stratégique du founder PME, qui répond aux questions business
> en exploitant les **vraies données** via tool use Claude. Backend MVP
> shippé 2026-06-08.

## ⚠️ MàJ IA mi-2026 (corrige des findings d'audit)

- **Model IDs** : `claude-opus-4-8` (idéal pour la boucle tool-use multi-tours du copilot),
  `claude-sonnet-4-6` (défaut coût), `claude-haiku-4-5` (rapide). ⚠️ `claude-sonnet-4-20250514`
  est **retiré le 2026-06-15** → corrigé en `claude-sonnet-4-6` dans `lib/copilot/index.ts`.
  **Plus de `budget_tokens`** sur 4.7/4.8 (400) → adaptive thinking + `output_config.effort`.
- **Structured outputs** (`output_config.format`, GA) : remplacer le `safeJsonParse`/regex fragile
  par un schéma validé — fiabilise la sortie des tools et du parsing.
- **Prompt caching** : le system prompt (stable) doit porter `cache_control` (reads 0.1×).
  Ordre `tools → system → messages`, breakpoint sur le dernier bloc stable. Pré-warm au boot.
- **Tool Search** (`defer_loading`) : garder 3-5 tools chauds, défer le reste → contexte préservé.
- **Sécurité (cf. `SKILL_wanapush_security_hardening.md`)** : ✅ **rate-limit (20/min) + budget
  tokens/jour** par user posés dans `app/api/copilot/ask/route.ts` (audit H8 — `DAILY_TOKEN_BUDGET`
  via env, somme des `CopilotMessage` sur 24h). Restent : **résumer l'historique** (pas de replay
  intégral = coût quadratique), et **fencer** tout input user passé au modèle.
- **Auto-pilote (vision produit)** : pour des agents long-horizon, évaluer **Managed Agents**
  (Anthropic héberge la boucle + Outcomes gradés par rubric).

## 🧭 Quand l'invoquer

- L'user demande "ajoute un copilot IA", "chat assistant", "AI marketing strategist"
- Travail dans `lib/copilot/*`, `app/api/copilot/*`
- Modèles Prisma `CopilotConversation`, `CopilotMessage`

## 🏗️ Architecture

```
lib/copilot/
  index.ts          ← askCopilot(userId, question, conversationId?) : main entry
  tools.ts          ← 9 tools exposés à Claude (JSON Schema + handlers)

app/api/copilot/
  ask/route.ts                          ← POST { question, conversationId? }
  conversations/route.ts                ← GET list (cursor pagination)
  conversations/[id]/route.ts           ← GET transcript / DELETE
```

## 🔧 Tools exposés (lib/copilot/tools.ts)

Tous appellent les aggregators existants de `lib/analytics/` ou les connectors :

| Tool | Description | Handler |
|---|---|---|
| `get_overview` | KPIs cross-modules N jours | `getOverview()` |
| `get_anomalies` | Anomalies détectées 30j glissants | `detectAnomalies()` |
| `get_leads_funnel` | Leads avec breakdown HOT/WARM/COLD + status + score | `getLeadsFunnel()` |
| `get_ads_roi` | ROAS + breakdown par plateforme (Meta/Google/TikTok/LinkedIn) | `getAdsROI()` |
| `get_email_engagement` | Opens/clicks/désabo rates | `getEmailEngagement()` |
| `get_shop_revenue` | CA, AOV, retention | `getShopRevenue()` |
| `get_gbp_visibility` | Impressions + clicks + appels + note | `getGbpVisibility()` |
| `get_unit_economics` | CAC, LTV, ratio, payback, LVR | `getUnitEconomics()` |
| `get_top_campaigns` | Top N campagnes par ROAS | Prisma query + agg |

**Pattern d'ajout d'un nouveau tool** :
```ts
{
  tool: {
    name: "my_tool",
    description: "Court (ce que ça fait + quand l'utiliser)",
    input_schema: { type: "object", properties: { ... }, required: [...] },
  },
  handler: async (userId, input) => {
    // Exécute, retourne du JSON structuré (sera stringified pour Claude)
  },
}
```

## 🔁 Loop tool use (pattern Anthropic 2026)

```
1. Save USER message en DB
2. Rebuild Anthropic messages depuis l'historique CopilotMessage
3. Loop (max 5 iterations) :
   a. anthropic.messages.create avec tools + system + messages
   b. Save ASSISTANT message (text + tool_use blocks)
   c. Si stop_reason !== "tool_use" → break (réponse finale)
   d. Sinon : exécute handlers, save TOOL messages, ajoute tool_results au history
4. Update CopilotConversation.messageCount + lastMessageAt
5. Retourne { conversationId, reply, toolCalls, tokens, iterations }
```

## 🎯 System prompt (lib/copilot/index.ts)

Le prompt impose à Claude :
1. **Toujours appeler le tool pertinent AVANT de répondre** (pas de réponse à la volée sans data)
2. **Combine plusieurs tools** quand pertinent (ex: ROAS chute → anomalies + ads_roi + top_campaigns)
3. **Sois actionable** : action + KPI cible + impact
4. **Priorise** par Effort/Impact, 3 actions max
5. **Cite chiffres réels** des tools
6. **Reconnais le manque de data** ("connecte un compte pub pour avoir un diagnostic")
7. **Ton** : direct, pragmatique, fondateur-PME française

**Format réponse** :
```markdown
🎯 **Diagnostic** : 1-2 phrases avec chiffres
⚡ **Top 3 actions** :
1. [Action] — Impact : Fort/Moyen/Faible — KPI cible : ...
2. ...
3. ...
📊 **Détails** : si nécessaire
```

## 🗄️ Schéma Prisma (migration `add_copilot`)

- `CopilotConversation` : userId, title auto (1er message ≤80 chars), messageCount cache, lastMessageAt
- `CopilotMessage` : conversationId, role (USER/ASSISTANT/TOOL), content (text), toolUse JSON (tool_use blocks demandés), toolResult JSON (résultats tool), model, inputTokens/outputTokens (analytics/facturation future)
- Enum `CopilotRole` : USER | ASSISTANT | TOOL

## 🔒 Sécurité

- Auth `getServerSession` sur tous les endpoints
- Ownership : conversation appartient au user demandeur
- Tools reçoivent `userId` du caller → toutes les queries scopées au user (pas de leak cross-tenant)
- Token Anthropic dans env `ANTHROPIC_API_KEY`
- Pas de PII stockée dans les messages (l'user contrôle ce qu'il tape)

## 📊 Endpoints API (3)

| Endpoint | Méthode | Description |
|---|---|---|
| `/api/copilot/ask` | POST | Body `{ question, conversationId? }`. Lance askCopilot, retourne reply final + tool calls + tokens + iterations |
| `/api/copilot/conversations` | GET | List conversations user (cursor pagination, limit 20 défaut max 50) |
| `/api/copilot/conversations/[id]` | GET | Transcript complet (messages avec tool_use/tool_result) |
| `/api/copilot/conversations/[id]` | DELETE | Supprime conversation + messages cascade |

## 🤖 Configuration

| Var d'env | Description | Défaut |
|---|---|---|
| `ANTHROPIC_API_KEY` | Clé API Anthropic | requis |
| `COPILOT_MODEL` | Modèle Claude utilisé | `claude-sonnet-4-20250514` (peut passer à Opus pour reasoning lourd) |

Constants internes (lib/copilot/index.ts) :
- `MAX_ITERATIONS = 5` (anti-loop infini, suffisant pour 99% des questions)
- `MAX_TOKENS = 4000` (réponses synthétiques, focus action)
- Tool result max 8000 chars (garde-fou token consumption)

## 📈 Impact attendu

Sources Gartner / Anthropic / Metizsoft :
- **80% B2B SaaS** intègrent agentic AI copilots en 2026
- **+2-3x feature adoption** vs SaaS sans copilot
- **-40% time-to-value** founder onboarding
- **+30-50% retention** (l'IA répond aux questions au lieu de churner)

## 🚧 Restant phase 2

- UI chat dans `app/(dashboard)/copilot/page.tsx` (composant chat avec streaming)
- Streaming response (Server-Sent Events) au lieu de réponse synchrone
- Tools "write" : déclencher des actions (créer campagne, programmer post, envoyer email) au lieu de juste lire
- Memory long-terme : résumé conversationnel après N tours pour éviter blow-up tokens
- Rate limit per user (anti-abus tokens)
- Cost tracking en DB (cumul tokens × prix Sonnet) pour billing future
