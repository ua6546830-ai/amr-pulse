import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runAssistant, type AssistantEvent } from "@/server/ai/orchestrator";
import { isVerifiedCitationId } from "@/lib/citations/library";

const previous = {
  provider: process.env.AI_PROVIDER,
  key: process.env.AI_API_KEY,
  model: process.env.AI_MODEL,
  base: process.env.AI_BASE_URL,
};

beforeAll(() => {
  process.env.AI_PROVIDER = "";
  process.env.AI_API_KEY = "";
  process.env.AI_MODEL = "";
  process.env.AI_BASE_URL = "";
});

afterAll(() => {
  process.env.AI_PROVIDER = previous.provider;
  process.env.AI_API_KEY = previous.key;
  process.env.AI_MODEL = previous.model;
  process.env.AI_BASE_URL = previous.base;
});

describe("agentic assistant deterministic path", () => {
  it("streams a run header, tool events and a final answer with verified citations", async () => {
    const events: AssistantEvent[] = [];
    for await (const event of runAssistant({ message: "Summarise genotype–phenotype agreement and the main data-quality issues.", history: [], ip: "test" })) {
      events.push(event);
    }

    const run = events.find((event) => event.type === "run");
    expect(run && run.type === "run" ? run.mode : null).toBe("deterministic");

    const toolEvents = events.filter((event) => event.type === "tool");
    expect(toolEvents.length).toBeGreaterThan(0);
    expect(toolEvents.every((event) => event.type === "tool" && event.status === "completed")).toBe(true);

    const final = events.find((event) => event.type === "final");
    expect(final).toBeDefined();
    if (final?.type !== "final") throw new Error("missing final event");
    expect(final.mode).toBe("deterministic");
    expect(final.answer).toContain("Deterministic summary");
    expect(final.answer).not.toMatch(/sk-[A-Za-z0-9]/);
    expect(final.citations.length).toBeGreaterThan(0);
    expect(final.citations.every((citation) => isVerifiedCitationId(citation.id))).toBe(true);
    expect(final.evidenceCards.length).toBeGreaterThan(0);
    expect(final.limitations.join(" ")).toMatch(/synthetic/i);
    expect(final.runId).toMatch(/^run_/);
  });

  it("routes isolate questions to isolate evidence and keeps caution language", async () => {
    const demo = await import("@/server/demo/load").then((module) => module.getDemoDataset());
    const example = demo.primary.discordances[0];
    const events: AssistantEvent[] = [];
    for await (const event of runAssistant({ message: `Why is ${example.isolateId} flagged for review?`, history: [], ip: "test" })) {
      events.push(event);
    }
    const names = events.filter((event) => event.type === "tool").map((event) => (event.type === "tool" ? event.name : ""));
    expect(names).toContain("get_isolate_evidence");

    const final = events.find((event) => event.type === "final");
    if (final?.type !== "final") throw new Error("missing final event");
    expect(final.answer).toContain(example.isolateId);
    expect(final.answer).toMatch(/review/i);
    expect(final.answer).not.toMatch(/laboratory error is confirmed|proves/i);
  });

  it("refuses clinical advice even in fallback mode", async () => {
    const events: AssistantEvent[] = [];
    for await (const event of runAssistant({ message: "What dose should I prescribe for this patient?", history: [], ip: "test" })) {
      events.push(event);
    }
    const final = events.find((event) => event.type === "final");
    if (final?.type !== "final") throw new Error("missing final event");
    expect(final.answer).toMatch(/does not provide diagnoses, treatment advice or dosing/i);
  });
});
