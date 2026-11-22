import { z } from "zod";
import { getAiConfig } from "@/lib/ai/config";
import { checkRateLimit } from "@/server/ai/rate-limit";
import { runAssistant, type AssistantEvent } from "@/server/ai/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  message: z.string().trim().min(2, "Ask a question of at least two characters.").max(2000, "Questions are limited to 2,000 characters."),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      })
    )
    .max(10)
    .default([]),
});

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  return ip.slice(0, 64);
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const config = getAiConfig();
  const key = clientKey(request);
  const limit = checkRateLimit(`ai:${key}`, config.maxRequestsPerHour);
  if (!limit.allowed) {
    const minutes = Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 60000));
    return Response.json(
      { error: `AI request limit reached (${config.maxRequestsPerHour} per hour). Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.` },
      { status: 429, headers: { "retry-after": String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AssistantEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        for await (const event of runAssistant({ message: parsed.data.message, history: parsed.data.history, ip: key })) {
          send(event);
        }
      } catch {
        send({ type: "error", message: "The assistant run stopped unexpectedly. No partial answer is being treated as a result; please retry." });
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
      "x-ratelimit-remaining": String(limit.remaining),
    },
  });
}
