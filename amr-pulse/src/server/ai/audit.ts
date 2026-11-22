import { createHash, randomUUID } from "node:crypto";

export interface AiAuditEvent {
  runId: string;
  startedAt: string;
  completedAt: string | null;
  mode: "deterministic" | "ai" | "failed";
  model: string | null;
  questionHash: string;
  questionLength: number;
  tools: string[];
  citations: string[];
  status: "running" | "completed" | "error";
  elapsedMs: number | null;
  error: string | null;
}

const MAX_EVENTS = 200;
const events: AiAuditEvent[] = [];

export function startAudit(input: { mode: AiAuditEvent["mode"]; model: string | null; question: string; ip: string }): AiAuditEvent {
  const event: AiAuditEvent = {
    runId: `run_${randomUUID().slice(0, 12)}`,
    startedAt: new Date().toISOString(),
    completedAt: null,
    mode: input.mode,
    model: input.model,
    questionHash: createHash("sha256").update(`${input.ip}:${input.question}`).digest("hex").slice(0, 16),
    questionLength: input.question.length,
    tools: [],
    citations: [],
    status: "running",
    elapsedMs: null,
    error: null,
  };
  events.unshift(event);
  if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
  return event;
}

export function updateAudit(runId: string, patch: Partial<AiAuditEvent>) {
  const event = events.find((entry) => entry.runId === runId);
  if (event) Object.assign(event, patch);
}

export function recentAudit(limit = 20) {
  return events.slice(0, limit);
}
