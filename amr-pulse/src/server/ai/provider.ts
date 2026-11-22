import type { AiConfig } from "@/lib/ai/config";

export interface ToolCall {
  id: string;
  name: string;
  args: unknown;
}

export type ModelMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; toolCalls?: ToolCall[] }
  | { role: "tool"; toolCallId: string; name: string; content: string };

export interface ModelTurn {
  text: string;
  toolCalls: ToolCall[];
}

export interface ToolSchema {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export class ProviderError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
    this.name = "ProviderError";
  }
}

function safeError(payload: unknown, status: number): string {
  const message =
    typeof payload === "object" && payload !== null
      ? (() => {
          const body = payload as { error?: { message?: unknown } | string; message?: unknown };
          if (typeof body.error === "string") return body.error;
          if (typeof body.error?.message === "string") return body.error.message;
          if (typeof body.message === "string") return body.message;
          return "";
        })()
      : "";
  return `AI provider returned HTTP ${status}${message ? `: ${message.slice(0, 300)}` : "."}`;
}

export async function callModel(
  config: AiConfig,
  system: string,
  messages: ModelMessage[],
  tools: ToolSchema[],
  signal: AbortSignal
): Promise<ModelTurn> {
  if (!config.configured) throw new ProviderError("AI provider is not configured.", 400);
  if (config.provider === "anthropic") return callAnthropic(config, system, messages, tools, signal);
  return callOpenAiCompatible(config, system, messages, tools, signal);
}

async function callOpenAiCompatible(
  config: AiConfig,
  system: string,
  messages: ModelMessage[],
  tools: ToolSchema[],
  signal: AbortSignal
): Promise<ModelTurn> {
  const body = {
    model: config.model,
    temperature: 0.15,
    max_tokens: 1200,
    messages: [
      { role: "system", content: system },
      ...messages.map((message) => {
        if (message.role === "assistant") {
          return {
            role: "assistant",
            content: message.content || "",
            ...(message.toolCalls?.length
              ? {
                  tool_calls: message.toolCalls.map((call) => ({
                    id: call.id,
                    type: "function",
                    function: { name: call.name, arguments: JSON.stringify(call.args ?? {}) },
                  })),
                }
              : {}),
          };
        }
        if (message.role === "tool") {
          return { role: "tool", tool_call_id: message.toolCallId, content: message.content };
        }
        return { role: "user", content: message.content };
      }),
    ],
    tools: tools.map((tool) => ({ type: "function", function: { name: tool.name, description: tool.description, parameters: tool.parameters } })),
    tool_choice: "auto",
  };

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify(body),
    signal,
  });
  const payload = (await response.json().catch(() => ({}))) as unknown;
  if (!response.ok) throw new ProviderError(safeError(payload, response.status));

  const message = (payload as { choices?: Array<{ message?: { content?: unknown; tool_calls?: Array<{ id?: string; function?: { name?: string; arguments?: string } }> } }> })
    .choices?.[0]?.message;
  if (!message) throw new ProviderError("AI provider returned an empty response.");

  const text = typeof message.content === "string" ? message.content : "";
  const toolCalls: ToolCall[] = [];
  for (const call of message.tool_calls ?? []) {
    const name = call.function?.name ?? "";
    if (!name) continue;
    let args: unknown = {};
    try {
      args = JSON.parse(call.function?.arguments || "{}");
    } catch {
      args = {};
    }
    toolCalls.push({ id: call.id ?? `call_${toolCalls.length}`, name, args });
  }
  return { text, toolCalls };
}

async function callAnthropic(
  config: AiConfig,
  system: string,
  messages: ModelMessage[],
  tools: ToolSchema[],
  signal: AbortSignal
): Promise<ModelTurn> {
  const translated: Array<Record<string, unknown>> = [];
  for (const message of messages) {
    if (message.role === "user") {
      translated.push({ role: "user", content: [{ type: "text", text: message.content }] });
      continue;
    }
    if (message.role === "assistant") {
      const content: Array<Record<string, unknown>> = [];
      if (message.content) content.push({ type: "text", text: message.content });
      for (const call of message.toolCalls ?? []) {
        content.push({ type: "tool_use", id: call.id, name: call.name, input: call.args ?? {} });
      }
      translated.push({ role: "assistant", content: content.length > 0 ? content : [{ type: "text", text: "(no text)" }] });
      continue;
    }
    const block = { type: "tool_result", tool_use_id: message.toolCallId, content: message.content };
    const previous = translated[translated.length - 1];
    if (previous && previous.role === "user" && Array.isArray(previous.content) && (previous.content as Array<Record<string, unknown>>).every((item) => item.type === "tool_result")) {
      (previous.content as Array<Record<string, unknown>>).push(block);
    } else {
      translated.push({ role: "user", content: [block] });
    }
  }

  const response = await fetch(`${config.baseUrl}/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 1200,
      temperature: 0.15,
      system,
      messages: translated,
      tools: tools.map((tool) => ({ name: tool.name, description: tool.description, input_schema: tool.parameters })),
    }),
    signal,
  });
  const payload = (await response.json().catch(() => ({}))) as unknown;
  if (!response.ok) throw new ProviderError(safeError(payload, response.status));

  const blocks = (payload as { content?: Array<{ type?: string; text?: string; id?: string; name?: string; input?: unknown }> }).content ?? [];
  let text = "";
  const toolCalls: ToolCall[] = [];
  for (const block of blocks) {
    if (block.type === "text" && typeof block.text === "string") text += block.text;
    if (block.type === "tool_use" && block.name) {
      toolCalls.push({ id: block.id ?? `call_${toolCalls.length}`, name: block.name, args: block.input ?? {} });
    }
  }
  return { text, toolCalls };
}
