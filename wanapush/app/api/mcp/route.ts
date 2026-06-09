// POST /api/mcp — main MCP JSON-RPC 2.0 endpoint (Streamable HTTP transport).
//
// Auth : Bearer token format "wp_mcp_<random>" dans header Authorization.
// Body : JSON-RPC 2.0 request (single ou batch array).
// Response : JSON-RPC 2.0 response (single ou batch).
//
// Headers requis (spec MCP) :
//   - Content-Type: application/json
//   - MCP-Protocol-Version: 2025-06-18 (côté client)
//
// Pour V1 stateless : pas de Mcp-Session-Id (chaque requête se suffit à
// elle-même). Pour V2 : session in-memory ou Redis pour stateful tools.

import { NextResponse } from "next/server";
import {
  handleMcpRequest,
  handleMcpBatch,
  type JsonRpcResponse,
} from "@/lib/mcp/server";
import {
  extractBearerToken,
  verifyMcpToken,
  trackMcpUsage,
} from "@/lib/mcp/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

function rpcErrorResponse(code: number, message: string, status = 200) {
  return NextResponse.json(
    { jsonrpc: "2.0", id: null, error: { code, message } },
    { status, headers: { "Content-Type": "application/json" } },
  );
}

export async function POST(req: Request) {
  // Auth Bearer
  const token = extractBearerToken(req);
  if (!token) {
    return rpcErrorResponse(-32001, "Unauthorized: Missing Bearer token", 401);
  }
  const auth = await verifyMcpToken(token);
  if (!auth) {
    return rpcErrorResponse(-32001, "Unauthorized: Invalid or expired token", 401);
  }

  // Parse body (peut être single request ou batch array)
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return rpcErrorResponse(-32700, "Parse error: Invalid JSON");
  }

  let response: JsonRpcResponse | JsonRpcResponse[];
  try {
    if (Array.isArray(body)) {
      response = await handleMcpBatch(body as never, auth.userId, auth.scopes);
    } else {
      response = await handleMcpRequest(body as never, auth.userId, auth.scopes);
    }
    // Fire-and-forget usage tracking
    void trackMcpUsage(auth.keyId).catch(() => undefined);
  } catch (e) {
    return rpcErrorResponse(-32603, `Internal error: ${e instanceof Error ? e.message : String(e)}`);
  }

  // null = notification handled silently (HTTP 204 ou body vide)
  if (response === null) {
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json(response, {
    headers: {
      "Content-Type": "application/json",
      "MCP-Protocol-Version": "2025-06-18",
    },
  });
}

// GET = pas implémenté en V1 (V2 : SSE pour notifications server → client)
export async function GET() {
  return NextResponse.json(
    { error: "MCP GET (SSE notifications) non implémenté en V1. Utilise POST pour invoquer des tools." },
    { status: 405 },
  );
}
