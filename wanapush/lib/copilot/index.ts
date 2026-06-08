// AI Marketing Copilot — core loop avec tool use Claude.
//
// Architecture (pattern Anthropic Tool Use 2026) :
//  1. Build messages history depuis CopilotMessage en DB
//  2. Call Claude avec tools définis + system prompt expert WanaPush
//  3. Si réponse contient `tool_use` blocks → exécute handlers + add tool_result
//     messages + re-call Claude (loop max 5 iterations)
//  4. Quand Claude return un `text` block sans tool_use → c'est la réponse finale
//  5. Sauvegarde tous les messages (USER + tool_use ASSISTANT + TOOL results +
//     final ASSISTANT) en DB pour conversation memory + analytics
//
// Best practices 2026 :
//  - System prompt expert WanaPush (réutilisé depuis lib/anthropic.ts)
//  - max_tokens 4000 (réponses synthétiques, focus sur l'action)
//  - max_iterations 5 (anti-loop infini)
//  - Tools fournissent du JSON structuré → Claude raisonne dessus

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { TOOL_BY_NAME, getAnthropicTools } from "./tools";

// Sélection du provider : Anthropic prioritaire (tool use plus fiable),
// fallback OpenAI function calling si seule OPENAI_API_KEY est configurée.
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY?.trim();
const OPENAI_KEY = process.env.OPENAI_API_KEY?.trim();
const anthropic = ANTHROPIC_KEY ? new Anthropic({ apiKey: ANTHROPIC_KEY }) : null;
const openai = OPENAI_KEY ? new OpenAI({ apiKey: OPENAI_KEY }) : null;

const PROVIDER: "anthropic" | "openai" | null = anthropic ? "anthropic" : openai ? "openai" : null;
const ANTHROPIC_MODEL = process.env.COPILOT_MODEL ?? "claude-sonnet-4-20250514";
const OPENAI_MODEL = process.env.COPILOT_OPENAI_MODEL ?? "gpt-4o";
const MAX_ITERATIONS = 5;
const MAX_TOKENS = 4000;

function safeJsonParse(s: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(s);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

const SYSTEM_PROMPT = `Tu es WanaPush Copilot, l'assistant IA stratégique du fondateur d'une PME française qui utilise WanaPush (plateforme marketing SaaS).

Tu as accès à des **tools** qui te permettent de récupérer en temps réel les vraies données business du founder :
- get_overview : KPIs cross-modules sur N jours
- get_anomalies : alertes détectées (chutes ROAS, lead inflow, spikes)
- get_leads_funnel : leads (HOT/WARM/COLD), score, conversion
- get_ads_roi : publicité avec ROAS par plateforme
- get_email_engagement : open/click/désabo rates
- get_shop_revenue : CA, AOV, retention boutique
- get_gbp_visibility : Google Business Profile
- get_unit_economics : CAC, LTV, ratio, payback
- get_top_campaigns : meilleures campagnes par ROAS

**RÈGLES STRICTES** :
1. **Toujours appeler le tool pertinent AVANT de répondre** quand l'user demande des chiffres, un diagnostic, une recommandation ciblée. Ne JAMAIS répondre "à la volée" sans avoir les vraies données.
2. **Combine plusieurs tools** quand pertinent (ex: "Pourquoi mon ROAS chute ?" → get_anomalies + get_ads_roi + get_top_campaigns).
3. **Sois actionable** : pour chaque recommandation, fournis l'action concrète + le KPI de succès + l'impact estimé.
4. **Priorise** par matrice Effort/Impact. 3 actions max par réponse.
5. **Cite les chiffres réels** des tools, pas des estimations vagues.
6. **Reconnais quand tu manques de data** : si un tool retourne des zéros, dis-le ("Pas de données ads sur cette période — connecte un compte pub pour avoir un diagnostic ROAS").
7. **Ton ton** : direct, pragmatique, fondateur-PME française. Pas de blabla. Concis.

**Format de réponse final** (markdown) :
🎯 **Diagnostic** : 1-2 phrases résumant l'état actuel avec chiffres
⚡ **Top 3 actions** :
1. [Action concrète] — Impact estimé : Fort/Moyen/Faible — KPI cible : ...
2. ...
3. ...
📊 **Détails** : si nécessaire (sinon skip cette section)

N'utilise PAS d'emojis dans les bullets ou paragraphes (uniquement dans les titres de sections).
N'invente JAMAIS de chiffres : si tu n'as pas les données, dis-le clairement et propose comment les obtenir.`;

// ─── Types ──────────────────────────────────────────────────────────────────

type AnthropicMessageContent =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string };

type AnthropicMessage = {
  role: "user" | "assistant";
  content: string | AnthropicMessageContent[];
};

export type CopilotAnswer = {
  conversationId: string;
  reply: string;
  toolCalls: Array<{ name: string; input: Record<string, unknown> }>;
  inputTokens: number;
  outputTokens: number;
  iterations: number;
};

// ─── Main entry : ask copilot ───────────────────────────────────────────────

export async function askCopilot(
  userId: string,
  question: string,
  conversationId?: string,
): Promise<CopilotAnswer> {
  if (!PROVIDER) {
    throw new Error(
      "Le Copilot IA n'est pas configuré : ajoute soit ANTHROPIC_API_KEY soit OPENAI_API_KEY dans .env.local.",
    );
  }

  // 1. Resolve or create conversation
  let conv;
  if (conversationId) {
    conv = await prisma.copilotConversation.findFirst({
      where: { id: conversationId, userId },
      select: { id: true, title: true, messageCount: true },
    });
    if (!conv) throw new Error("Conversation introuvable");
  } else {
    const title = question.slice(0, 80) + (question.length > 80 ? "…" : "");
    conv = await prisma.copilotConversation.create({
      data: { userId, title, messageCount: 0 },
      select: { id: true, title: true, messageCount: true },
    });
  }

  // 2. Save user message
  await prisma.copilotMessage.create({
    data: { conversationId: conv.id, role: "USER", content: question },
  });

  // 3. Load conversation history (rebuild Anthropic messages format)
  const history = await prisma.copilotMessage.findMany({
    where: { conversationId: conv.id },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true, toolUse: true, toolResult: true },
  });

  const messages: AnthropicMessage[] = [];
  let pendingToolUses: AnthropicMessageContent[] = [];
  for (const m of history) {
    if (m.role === "USER" && m.content) {
      messages.push({ role: "user", content: m.content });
    } else if (m.role === "ASSISTANT") {
      // Assistant peut avoir text + tool_use blocks
      const content: AnthropicMessageContent[] = [];
      if (m.content) content.push({ type: "text", text: m.content });
      if (m.toolUse) {
        const uses = m.toolUse as Array<{ id: string; name: string; input: Record<string, unknown> }>;
        for (const u of uses) content.push({ type: "tool_use", id: u.id, name: u.name, input: u.input });
      }
      if (content.length > 0) messages.push({ role: "assistant", content });
    } else if (m.role === "TOOL" && m.toolResult) {
      // Group tool_results dans un seul user message
      const result = m.toolResult as { tool_use_id: string; content: string };
      pendingToolUses.push({ type: "tool_result", tool_use_id: result.tool_use_id, content: result.content });
    }
    // Flush pending tool_results avant un USER ou ASSISTANT
    if (m.role !== "TOOL" && pendingToolUses.length > 0) {
      messages.splice(messages.length - 1, 0, { role: "user", content: pendingToolUses });
      pendingToolUses = [];
    }
  }
  // Flush final pendings
  if (pendingToolUses.length > 0) {
    messages.push({ role: "user", content: pendingToolUses });
  }

  // 4. Loop : call provider → execute tools → re-call until plus de tool_use
  let totalInput = 0;
  let totalOutput = 0;
  const allToolCalls: Array<{ name: string; input: Record<string, unknown> }> = [];
  let iterations = 0;
  let finalText = "";

  if (PROVIDER === "anthropic") {
    // ─── Path Anthropic Claude (tool use) ─────────────────────────────────
    const tools = getAnthropicTools();
    while (iterations < MAX_ITERATIONS) {
      iterations++;
      const response = await anthropic!.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        tools: tools as never,
        messages: messages as never,
      });

      totalInput += response.usage?.input_tokens ?? 0;
      totalOutput += response.usage?.output_tokens ?? 0;

      const textBlocks: string[] = [];
      const toolUseBlocks: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];
      for (const block of response.content) {
        if (block.type === "text") textBlocks.push(block.text);
        else if (block.type === "tool_use") {
          toolUseBlocks.push({ id: block.id, name: block.name, input: block.input as Record<string, unknown> });
        }
      }

      await prisma.copilotMessage.create({
        data: {
          conversationId: conv.id,
          role: "ASSISTANT",
          content: textBlocks.length > 0 ? textBlocks.join("\n") : null,
          toolUse: toolUseBlocks.length > 0 ? (toolUseBlocks as never) : undefined,
          model: ANTHROPIC_MODEL,
          inputTokens: response.usage?.input_tokens,
          outputTokens: response.usage?.output_tokens,
        },
      });

      if (response.stop_reason !== "tool_use" || toolUseBlocks.length === 0) {
        finalText = textBlocks.join("\n");
        break;
      }

      const assistantContent: AnthropicMessageContent[] = [];
      if (textBlocks.length > 0) assistantContent.push({ type: "text", text: textBlocks.join("\n") });
      for (const u of toolUseBlocks) assistantContent.push({ type: "tool_use", id: u.id, name: u.name, input: u.input });
      messages.push({ role: "assistant", content: assistantContent });

      const toolResults: AnthropicMessageContent[] = [];
      for (const tu of toolUseBlocks) {
        allToolCalls.push({ name: tu.name, input: tu.input });
        const handler = TOOL_BY_NAME.get(tu.name);
        let resultStr: string;
        if (!handler) {
          resultStr = JSON.stringify({ error: `Tool ${tu.name} inconnu` });
        } else {
          try {
            const result = await handler.handler(userId, tu.input);
            resultStr = JSON.stringify(result).slice(0, 8000);
          } catch (e) {
            resultStr = JSON.stringify({ error: e instanceof Error ? e.message : String(e) });
          }
        }
        toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: resultStr });
        await prisma.copilotMessage.create({
          data: {
            conversationId: conv.id,
            role: "TOOL",
            toolResult: { tool_use_id: tu.id, content: resultStr } as never,
          },
        });
      }
      messages.push({ role: "user", content: toolResults });
    }
  } else {
    // ─── Path OpenAI Function Calling ─────────────────────────────────────
    // OpenAI utilise un format différent : system = premier message, tools =
    // { type: "function", function: { name, description, parameters } },
    // tool_calls dans message.tool_calls (arguments en JSON string), tool
    // result dans message { role: "tool", tool_call_id, content }.
    type OpenAIMessage = {
      role: "system" | "user" | "assistant" | "tool";
      content?: string | null;
      tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
      tool_call_id?: string;
    };

    // Conversion messages Anthropic format → OpenAI format
    const openaiMessages: OpenAIMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];
    for (const m of messages) {
      if (m.role === "user") {
        if (typeof m.content === "string") {
          openaiMessages.push({ role: "user", content: m.content });
        } else {
          // Array de tool_result blocks
          for (const block of m.content) {
            if (block.type === "tool_result") {
              openaiMessages.push({
                role: "tool",
                tool_call_id: block.tool_use_id,
                content: block.content,
              });
            }
          }
        }
      } else if (m.role === "assistant") {
        if (typeof m.content === "string") {
          openaiMessages.push({ role: "assistant", content: m.content });
        } else {
          let text = "";
          const toolCalls: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }> = [];
          for (const block of m.content) {
            if (block.type === "text") text += block.text;
            else if (block.type === "tool_use") {
              toolCalls.push({
                id: block.id,
                type: "function",
                function: { name: block.name, arguments: JSON.stringify(block.input) },
              });
            }
          }
          openaiMessages.push({
            role: "assistant",
            content: text || null,
            ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
          });
        }
      }
    }

    // Convert tools Anthropic → OpenAI format
    const openaiTools = getAnthropicTools().map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema,
      },
    }));

    while (iterations < MAX_ITERATIONS) {
      iterations++;
      const response = await openai!.chat.completions.create({
        model: OPENAI_MODEL,
        max_completion_tokens: MAX_TOKENS,
        messages: openaiMessages as never,
        tools: openaiTools,
      });

      totalInput += response.usage?.prompt_tokens ?? 0;
      totalOutput += response.usage?.completion_tokens ?? 0;

      const choice = response.choices[0];
      const msg = choice.message;
      const text = msg.content ?? "";
      const toolCalls = msg.tool_calls ?? [];

      // Save ASSISTANT message en format DB Anthropic-compatible
      const toolUseBlocksForDb = toolCalls
        .filter((tc): tc is { id: string; type: "function"; function: { name: string; arguments: string } } => tc.type === "function")
        .map((tc) => ({
          id: tc.id,
          name: tc.function.name,
          input: safeJsonParse(tc.function.arguments),
        }));
      await prisma.copilotMessage.create({
        data: {
          conversationId: conv.id,
          role: "ASSISTANT",
          content: text || null,
          toolUse: toolUseBlocksForDb.length > 0 ? (toolUseBlocksForDb as never) : undefined,
          model: OPENAI_MODEL,
          inputTokens: response.usage?.prompt_tokens,
          outputTokens: response.usage?.completion_tokens,
        },
      });

      // Si pas de tool calls → réponse finale
      if (choice.finish_reason !== "tool_calls" || toolCalls.length === 0) {
        finalText = text;
        break;
      }

      // Add assistant message au history OpenAI
      openaiMessages.push({
        role: "assistant",
        content: text || null,
        tool_calls: toolCalls
          .filter((tc) => tc.type === "function")
          .map((tc) => {
            // narrow type discriminé
            const fc = tc as Extract<typeof tc, { type: "function" }>;
            return {
              id: fc.id,
              type: "function" as const,
              function: { name: fc.function.name, arguments: fc.function.arguments },
            };
          }),
      });

      // Execute tools + add tool messages
      for (const tcRaw of toolCalls) {
        if (tcRaw.type !== "function") continue;
        const tc = tcRaw as Extract<typeof tcRaw, { type: "function" }>;
        const input = safeJsonParse(tc.function.arguments);
        allToolCalls.push({ name: tc.function.name, input });
        const handler = TOOL_BY_NAME.get(tc.function.name);
        let resultStr: string;
        if (!handler) {
          resultStr = JSON.stringify({ error: `Tool ${tc.function.name} inconnu` });
        } else {
          try {
            const result = await handler.handler(userId, input);
            resultStr = JSON.stringify(result).slice(0, 8000);
          } catch (e) {
            resultStr = JSON.stringify({ error: e instanceof Error ? e.message : String(e) });
          }
        }
        openaiMessages.push({ role: "tool", tool_call_id: tc.id, content: resultStr });
        await prisma.copilotMessage.create({
          data: {
            conversationId: conv.id,
            role: "TOOL",
            toolResult: { tool_use_id: tc.id, content: resultStr } as never,
          },
        });
      }
    }
  }

  // 5. Update conversation stats
  const newCount = await prisma.copilotMessage.count({ where: { conversationId: conv.id } });
  await prisma.copilotConversation.update({
    where: { id: conv.id },
    data: { messageCount: newCount, lastMessageAt: new Date() },
  });

  return {
    conversationId: conv.id,
    reply: finalText || "(Pas de réponse générée — réessayez ou simplifiez la question)",
    toolCalls: allToolCalls,
    inputTokens: totalInput,
    outputTokens: totalOutput,
    iterations,
  };
}
