// MCP Server — implémentation JSON-RPC 2.0 du protocole MCP (spec 2025-06-18).
//
// Doc : https://modelcontextprotocol.io/specification/2025-06-18
//
// Méthodes implémentées :
//  - initialize : handshake initial avec capabilities
//  - notifications/initialized : ACK client (no-op côté server)
//  - tools/list : liste les tools exposés
//  - tools/call : invoque un tool
//
// Toutes les réponses respectent le format JSON-RPC 2.0 :
//   { jsonrpc: "2.0", id, result | error }
//
// Erreurs JSON-RPC standards :
//   -32700 : Parse error (JSON invalide)
//   -32600 : Invalid Request
//   -32601 : Method not found
//   -32602 : Invalid params
//   -32603 : Internal error
//
// Pour V1, les tools sont réutilisés depuis lib/copilot/tools.ts. La spec MCP
// utilise `inputSchema` (camelCase), notre format Anthropic utilise `input_schema`
// (snake_case) — on adapte au passage. Sortie en `content: [{ type: "text", text }]`
// + `structuredContent` JSON pour clients modernes (Claude.ai parse les deux).

import { TOOLS } from "@/lib/copilot/tools";

const MCP_PROTOCOL_VERSION = "2025-06-18";

// ─── Types JSON-RPC ─────────────────────────────────────────────────────────

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcSuccess = {
  jsonrpc: "2.0";
  id: string | number | null;
  result: unknown;
};

type JsonRpcError = {
  jsonrpc: "2.0";
  id: string | number | null;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
};

export type JsonRpcResponse = JsonRpcSuccess | JsonRpcError | null;

// ─── Error helpers ──────────────────────────────────────────────────────────

function rpcError(id: string | number | null, code: number, message: string, data?: unknown): JsonRpcError {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}

function rpcSuccess(id: string | number | null, result: unknown): JsonRpcSuccess {
  return { jsonrpc: "2.0", id, result };
}

// ─── Method handlers ────────────────────────────────────────────────────────

/** initialize : retourne capabilities + protocolVersion + serverInfo */
function handleInitialize(request: JsonRpcRequest): JsonRpcResponse {
  // Les params contiennent client capabilities + protocolVersion — on les
  // ignore en V1 (on accepte tous les clients respectant 2025-06-18+)
  return rpcSuccess(request.id ?? null, {
    protocolVersion: MCP_PROTOCOL_VERSION,
    capabilities: {
      tools: { listChanged: false },
      // resources/prompts non implémentés en V1
    },
    serverInfo: {
      name: "wanapush-mcp",
      title: "WanaPush Marketing Copilot",
      version: "1.0.0",
    },
    instructions:
      "WanaPush MCP Server expose les tools analytics + connectors marketing du founder. " +
      "Les tools renvoient des KPIs cross-modules (Ads, Leads, Email, Shop, GBP) + anomalies + unit economics. " +
      "Auth requise : Bearer token format wp_mcp_<random>.",
  });
}

/** tools/list : retourne les tools du copilot en format MCP */
function handleToolsList(request: JsonRpcRequest): JsonRpcResponse {
  const tools = TOOLS.map(({ tool }) => ({
    name: tool.name,
    description: tool.description,
    // MCP utilise `inputSchema` (camelCase) — Anthropic utilise `input_schema`
    inputSchema: tool.input_schema,
    // outputSchema non défini en V1 — Claude.ai accepte content libre
  }));
  return rpcSuccess(request.id ?? null, { tools });
}

/** tools/call : invoque un tool avec userId du caller (scope strict) */
async function handleToolsCall(
  request: JsonRpcRequest,
  userId: string,
): Promise<JsonRpcResponse> {
  const params = request.params as { name?: string; arguments?: Record<string, unknown> } | undefined;
  if (!params?.name) {
    return rpcError(request.id ?? null, -32602, "Invalid params: 'name' required");
  }

  const tool = TOOLS.find((t) => t.tool.name === params.name);
  if (!tool) {
    return rpcError(request.id ?? null, -32602, `Unknown tool: ${params.name}`);
  }

  try {
    const result = await tool.handler(userId, params.arguments ?? {});
    const json = JSON.stringify(result);
    return rpcSuccess(request.id ?? null, {
      content: [
        {
          type: "text",
          text: json.length > 12_000 ? json.slice(0, 12_000) + "\n...(truncated)" : json,
        },
      ],
      structuredContent: result, // Claude.ai et clients modernes utilisent ce field
      isError: false,
    });
  } catch (e) {
    // Tool execution error : renvoyé comme result avec isError: true
    // (pas un protocol error, selon spec MCP 2025-06-18)
    return rpcSuccess(request.id ?? null, {
      content: [
        {
          type: "text",
          text: `Tool execution failed: ${e instanceof Error ? e.message : String(e)}`,
        },
      ],
      isError: true,
    });
  }
}

// ─── Main dispatcher ────────────────────────────────────────────────────────

/** Handler principal — parse + dispatch une seule requête JSON-RPC.
 *  Pour notification (sans id), retourne null (pas de réponse HTTP). */
export async function handleMcpRequest(
  request: JsonRpcRequest,
  userId: string,
): Promise<JsonRpcResponse> {
  // Validate JSON-RPC 2.0 envelope
  if (request.jsonrpc !== "2.0") {
    return rpcError(request.id ?? null, -32600, "Invalid Request: jsonrpc must be '2.0'");
  }

  // Notifications (no id) — pas de réponse HTTP, on traite silencieusement
  const isNotification = request.id === undefined;

  switch (request.method) {
    case "initialize":
      return handleInitialize(request);
    case "notifications/initialized":
      // ACK client initialized — no-op
      return null;
    case "ping":
      // Optionnel mais souvent demandé pour health-check
      return rpcSuccess(request.id ?? null, {});
    case "tools/list":
      return handleToolsList(request);
    case "tools/call":
      return handleToolsCall(request, userId);
    default:
      if (isNotification) return null; // ignore unknown notifications
      return rpcError(request.id ?? null, -32601, `Method not found: ${request.method}`);
  }
}

/** Handler pour batch JSON-RPC (array de requests).
 *  Retourne un array de responses (sans les nulls = notifications). */
export async function handleMcpBatch(
  requests: JsonRpcRequest[],
  userId: string,
): Promise<JsonRpcResponse[]> {
  const responses = await Promise.all(requests.map((r) => handleMcpRequest(r, userId)));
  return responses.filter((r): r is JsonRpcSuccess | JsonRpcError => r !== null);
}
