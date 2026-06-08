---
name: wanapush-mcp-server
description: >
  Utilise cette skill quand l'utilisateur travaille sur le MCP Server de
  WanaPush : exposer les tools du copilot à Claude.ai/ChatGPT/Cursor via le
  protocole Model Context Protocol (JSON-RPC 2.0 sur Streamable HTTP). V1
  shippée 2026-06-08.
license: proprietary
version: 1.0
last_reviewed: 2026-06-08
---

# SKILL — WanaPush MCP Server

> **Pourquoi MCP** : 78% des enterprise teams ont ≥1 MCP-backed agent en prod
> en 2026. MCP SDK downloads ×970 depuis nov 2024. C'est le standard pour
> exposer une plateforme SaaS à TOUT l'écosystème AI (Claude.ai, ChatGPT,
> Cursor, IDE plugins, etc.) en un seul endpoint.
>
> **V2 shippée 2026-06-08** : JSON-RPC 2.0 sur Streamable HTTP, auth Bearer
> token. **3 primitives complètes** :
> - **9 Tools** depuis lib/copilot/tools.ts
> - **2 Resources statiques** + **4 Resource Templates** (URIs `wanapush://...`)
> - **5 Prompts** (templates founder pré-instanciés avec data live)

## 🧭 Quand l'invoquer

- L'user demande "expose mes data via MCP", "connecter Claude.ai à WanaPush",
  "MCP server"
- Travail dans `lib/mcp/*`, `app/api/mcp/route.ts`, `app/api/integrations/mcp/*`
- Modèle Prisma `McpApiKey`

## 🏗️ Architecture V1

```
lib/mcp/
  auth.ts           ← genMcpToken, verifyMcpToken, trackMcpUsage
  server.ts         ← handleMcpRequest dispatcher JSON-RPC 2.0

app/api/mcp/route.ts
  POST              ← main JSON-RPC handler (Bearer auth, single ou batch)
  GET               ← 405 en V1 (V2 : SSE notifications server → client)

app/api/integrations/mcp/keys/
  route.ts          ← GET list + POST create (retourne token UNE SEULE FOIS)
  [id]/route.ts     ← PATCH toggle/rename, DELETE revoke
```

## 📡 Spec MCP 2025-06-18 implémentée

**Méthodes** :
- `initialize` : handshake. Retourne `protocolVersion: "2025-06-18"` + `capabilities: { tools: { listChanged: false } }` + `serverInfo: { name, version }` + `instructions` (description du server).
- `notifications/initialized` : ACK client (no-op côté server, retourne null → HTTP 204).
- `ping` : health-check (retourne `{}`).
- `tools/list` : retourne `{ tools: [{ name, description, inputSchema }] }`. Pagination cursor non implémentée (9 tools = tient dans 1 page).
- `tools/call` : input `{ name, arguments }`. Retourne `{ content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result, isError: false }`. Truncate à 12k chars si trop long.

**V2 ajouts (2026-06-08)** :
- `resources/list` : retourne 2 resources statiques + capabilities
- `resources/templates/list` : 4 templates URIs paramétrées RFC 6570
- `resources/read` : dispatch URI → contenu (Prisma scope strict)
- `prompts/list` : 5 prompts founder
- `prompts/get` : instancie un prompt avec arguments + injecte data live

**Pas implémenté V2** :
- `completion/*` (autocomplete arguments)
- `sampling/createMessage` (LLM-as-server)
- `resources/subscribe` + notifications (subscribe live)
- Server-side notifications (`list_changed`)
- Pagination des listes (toutes les listes tiennent dans 1 page V2)

## 🔐 Auth — Bearer token format `wp_mcp_<random>`

- `genMcpToken()` : 32 bytes random → base64url (~256 bits entropie)
- Stockage : **SHA-256 hex hash** en DB (`McpApiKey.tokenHash` indexé unique)
- Token retourné en clair UNE SEULE FOIS à la création (jamais re-affiché)
- `tokenPrefix` stocké pour affichage UI : `"wp_mcp_abcdefg…"` (14 chars + ellipsis)
- TTL optionnel (`expiresAt`) — clé invalide automatiquement après
- Scopes : `"read"` (V1) ou `"read:write"` (V2 pour write tools)
- Stats : `totalCalls`, `lastUsedAt`, `lastError` trackés

## 📦 Format JSON-RPC 2.0

**Request** (single ou batch array) :
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": { "name": "get_overview", "arguments": { "days": 30 } }
}
```

**Success Response** :
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": { ... }
}
```

**Error Response** (codes JSON-RPC standards) :
| Code | Sens |
|---|---|
| -32700 | Parse error (JSON invalide) |
| -32600 | Invalid Request (jsonrpc != "2.0") |
| -32601 | Method not found |
| -32602 | Invalid params (ex: name absent dans tools/call) |
| -32603 | Internal error |
| -32001 | Unauthorized (custom : Bearer absent ou invalide) |

**Tool execution errors** : pas un protocol error → renvoyés dans `result` avec `isError: true`, content text avec le message.

## 📚 Resources V2 (`lib/mcp/resources.ts`)

### Statiques (`wanapush://...`)

| URI | MIME | Content |
|---|---|---|
| `wanapush://overview` | application/json | `getOverview(userId, 30d)` — KPIs cross-modules |
| `wanapush://anomalies` | application/json | `detectAnomalies(userId)` — alertes actuelles |

### Templates paramétrées (URI Template RFC 6570)

| URI Template | Content |
|---|---|
| `wanapush://campaign/{id}` | Campaign + metrics 30j |
| `wanapush://lead/{id}` | FormSubmission + scoring + status |
| `wanapush://email-campaign/{id}` | EmailCampaign + stats |
| `wanapush://order/{id}` | Order + items + shop |

**Scope strict** : `readResource(userId, uri)` vérifie l'ownership via Prisma where chains :
- campaign : `adAccount: { userId }`
- lead : `siteSlug` → `GeneratedSite { userId }`
- emailCampaign : `userId` direct
- order : `shop: { userId }`

Pas de leak cross-tenant possible.

**Erreurs** :
- URI non reconnue → null → JSON-RPC `-32002 Resource not found` avec `data: { uri }`
- Internal → `-32603`

**Annotations** : audience + priority (0.9 overview, 1.0 anomalies = critique)

## 🎯 Prompts V2 (`lib/mcp/prompts.ts`)

5 templates founder pré-instanciés avec data live :

| Prompt | Arguments | Description |
|---|---|---|
| `diagnostic_roas` | — | Diagnostic ROAS complet : ads + anomalies + plan action |
| `growth_plan_90d` | `objectif_mrr` (required) | Roadmap 3 sprints de 30j, basée KPIs + benchmarks SaaS 2026 |
| `weekly_review` | — | Compare 7j vs 7j précédents, top wins/problèmes, 3 actions |
| `lead_qualification` | `lead_id` (required) | Aide qualifier un lead (renvoie vers `wanapush://lead/{id}` resource) |
| `anomaly_postmortem` | `anomaly_type` (required) | Root cause + actions correctives + plan prévention |

**Pattern d'injection data** : chaque prompt fetch les data live via les aggregators (`getOverview`, `detectAnomalies`) et les injecte dans le `text` du message user au format markdown JSON. Le LLM client (Claude.ai) reçoit le snapshot déjà inclus → pas besoin d'appeler les tools en amont.

**System note partagé** : tous les prompts incluent un préfixe qui impose :
- Cite les chiffres exacts (pas de "à peu près")
- Top 3 actions max, classées par Impact
- KPI cible + impact estimé
- Ton direct, pragmatique, fondateur-PME française

## 🔧 Tools exposés (9 — réutilisés depuis lib/copilot/tools.ts)

| Tool | Description |
|---|---|
| `get_overview` | KPIs cross-modules N jours |
| `get_anomalies` | Anomalies détectées écart-type 30j |
| `get_leads_funnel` | Leads HOT/WARM/COLD breakdown |
| `get_ads_roi` | ROAS par plateforme |
| `get_email_engagement` | Open/click/désabo rates |
| `get_shop_revenue` | CA, AOV, retention |
| `get_gbp_visibility` | Impressions + clicks + appels + note |
| `get_unit_economics` | CAC, LTV, ratio, payback, LVR |
| `get_top_campaigns` | Top N campagnes par ROAS |

**Réutilisation** : on adapte au passage `input_schema` (Anthropic snake_case) → `inputSchema` (MCP camelCase). Les handlers reçoivent `userId` du token authentifié → scope strict, pas de leak cross-tenant.

## 📊 Endpoints API (4)

| Endpoint | Méthode | Description |
|---|---|---|
| `/api/mcp` | POST | JSON-RPC 2.0 main endpoint (Bearer auth, batch supporté) |
| `/api/mcp` | GET | 405 en V1 |
| `/api/integrations/mcp/keys` | GET/POST | List / generate new token (UNE SEULE FOIS en clair) |
| `/api/integrations/mcp/keys/[id]` | PATCH/DELETE | Toggle/rename / revoke |

**Headers réponse** :
- `Content-Type: application/json`
- `MCP-Protocol-Version: 2025-06-18`

## 🔌 Comment Claude.ai connecte ?

1. User génère une clé via `POST /api/integrations/mcp/keys` (récupère token en clair UNE FOIS)
2. Dans Claude.ai : ajouter un MCP server custom avec :
   - URL : `https://wanapush.com/api/mcp`
   - Auth : `Authorization: Bearer wp_mcp_<token>`
3. Claude.ai fait `initialize` → discover capabilities + tools
4. Claude.ai appelle `tools/list` → reçoit les 9 tools
5. L'user pose une question → Claude.ai sélectionne le tool pertinent + appelle `tools/call`
6. Server exécute le handler (scope user authentifié), retourne JSON
7. Claude.ai interprète + répond à l'user

## 🔒 Sécurité (best practices spec MCP)

- ✅ Server valide tous les inputs des tools (Zod via handlers existants)
- ✅ Rate limit via `lastUsedAt` + `totalCalls` track (V2 : enforce hard limit)
- ✅ Token hashé SHA-256 (pas de clear text en DB)
- ✅ Scope strict : userId du token → handlers receveuront ce userId, queries Prisma scopées
- ✅ TTL optionnel sur les tokens
- ✅ Revoke immédiat via DELETE (hard delete, pas soft)
- ✅ Spec MCP exige "human in the loop" pour tool invocations → l'UI Claude.ai gère ça (pas notre responsabilité côté server)

## 🚧 V3 phase 3

- **Streamable HTTP avec SSE** : GET endpoint pour notifications server → client (`notifications/{resources,tools,prompts}/list_changed`, progress, logging)
- **Stateful sessions** : `Mcp-Session-Id` header avec state in-memory ou Redis
- **resources/subscribe** : push notifications quand resource change (ex: nouveau lead HOT)
- **Write tools** : créer campagnes, programmer posts, envoyer emails (confirmation user-side via Claude.ai UI)
- **Completion API** : `completion/complete` pour autocomplete arguments des prompts (ex: lead_id picker)
- **Pagination** : si on dépasse N resources/tools/prompts par page
- **Rate limit hard** : enforce per-token requests/min
- **Audit log** : table `McpAuditLog` avec chaque appel (debug + compliance)

## 📈 Sources

- [MCP Specification 2025-06-18 — modelcontextprotocol.io](https://modelcontextprotocol.io/specification/2025-06-18)
- [Tools spec — modelcontextprotocol.io/server/tools](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
- [JSON-RPC 2.0 reference — Portkey](https://portkey.ai/blog/mcp-message-types-complete-json-rpc-reference-guide/)
- [MCP Cheat Sheet 2026 — Webfuse](https://www.webfuse.com/mcp-cheat-sheet)
- **78% enterprise teams** ont ≥1 MCP-backed agent en prod (Anthropic stats)
- **MCP SDK ×970 downloads** nov 2024 → mars 2026
