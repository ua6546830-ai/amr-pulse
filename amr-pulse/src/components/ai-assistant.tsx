"use client";

import * as React from "react";
import {
  AlertTriangle,
  BookOpen,
  Bot,
  CheckCircle2,
  Copy,
  Loader2,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Wrench,
  XCircle,
} from "lucide-react";
import { MarkdownLite } from "@/components/markdown-lite";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type CitationRef = { id: string; label: string; url: string; doi?: string };
type EvidenceCard = { name: string; summary: string; source: string; citations: string[] };
type ToolEvent = { name: string; status: "completed" | "error"; summary: string; source: string; citations: string[]; durationMs: number };
type Final = {
  mode: "deterministic" | "ai";
  answer: string;
  citations: CitationRef[];
  limitations: string[];
  evidenceCards: EvidenceCard[];
  elapsedMs: number;
  runId: string;
};
type Run = {
  id: string;
  question: string;
  status: "running" | "done" | "failed";
  mode: "deterministic" | "ai" | null;
  model: string | null;
  tools: ToolEvent[];
  notices: string[];
  final?: Final;
  error?: string;
};

const SAVED_KEY = "amr-pulse:saved-reports";

export function AiAssistant({
  suggestions,
  aiConfigured,
  aiReason,
  model,
}: {
  suggestions: string[];
  aiConfigured: boolean;
  aiReason: string | null;
  model: string | null;
}) {
  const [question, setQuestion] = React.useState("");
  const [runs, setRuns] = React.useState<Run[]>([]);
  const [running, setRunning] = React.useState(false);
  const [savedFlash, setSavedFlash] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const bottomRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [runs]);

  React.useEffect(() => () => abortRef.current?.abort(), []);

  const updateRun = React.useCallback((id: string, patch: (run: Run) => Run) => {
    setRuns((current) => current.map((run) => (run.id === id ? patch(run) : run)));
  }, []);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (trimmed.length < 2 || running) return;
    const id = `local_${Date.now()}`;
    const history = runs
      .filter((run) => run.final)
      .slice(-3)
      .flatMap((run) => [
        { role: "user" as const, content: run.question },
        { role: "assistant" as const, content: run.final!.answer.slice(0, 3000) },
      ]);
    setRuns((current) => [...current, { id, question: trimmed, status: "running", mode: null, model: null, tools: [], notices: [] }]);
    setQuestion("");
    setRunning(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? `Request failed with HTTP ${response.status}.`);
      }
      if (!response.body) throw new Error("The assistant returned an empty response stream.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
          const chunk = buffer.slice(0, boundary).trim();
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf("\n\n");
          if (!chunk.startsWith("data:")) continue;
          const data = chunk.slice(5).trim();
          if (data === "[DONE]") continue;
          let event: Record<string, unknown>;
          try {
            event = JSON.parse(data) as Record<string, unknown>;
          } catch {
            continue;
          }
          if (event.type === "run") {
            updateRun(id, (run) => ({
              ...run,
              mode: event.mode as Run["mode"],
              model: (event.model as string | null) ?? null,
            }));
          } else if (event.type === "tool") {
            updateRun(id, (run) => ({ ...run, tools: [...run.tools, event as unknown as ToolEvent] }));
          } else if (event.type === "notice") {
            updateRun(id, (run) => ({ ...run, notices: [...run.notices, String(event.message)] }));
          } else if (event.type === "final") {
            updateRun(id, (run) => ({
              ...run,
              status: "done",
              final: {
                mode: event.mode as Final["mode"],
                answer: String(event.answer),
                citations: (event.citations ?? []) as CitationRef[],
                limitations: (event.limitations ?? []) as string[],
                evidenceCards: (event.evidenceCards ?? []) as EvidenceCard[],
                elapsedMs: Number(event.elapsedMs ?? 0),
                runId: String(event.runId),
              },
            }));
          } else if (event.type === "error") {
            updateRun(id, (run) => ({ ...run, status: "failed", error: String(event.message) }));
          }
        }
      }
      setRuns((current) => current.map((run) => (run.id === id && run.status === "running" ? { ...run, status: "failed", error: "The stream ended without a final answer." } : run)));
    } catch (error) {
      if (controller.signal.aborted) {
        updateRun(id, (run) => ({ ...run, status: "failed", error: "Run cancelled." }));
      } else {
        updateRun(id, (run) => ({ ...run, status: "failed", error: error instanceof Error ? error.message : "Assistant request failed." }));
      }
    } finally {
      abortRef.current = null;
      setRunning(false);
    }
  }

  async function copyAnswer(run: Run) {
    if (!run.final) return;
    const text = `${run.final.answer}\n\nEvidence IDs: ${run.final.citations.map((citation) => citation.id).join(", ") || "none"}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(run.id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  }

  function saveToReports(run: Run) {
    if (!run.final) return;
    try {
      const existing = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]") as unknown[];
      const record = {
        id: `report_${Date.now()}`,
        kind: "ai-draft",
        title: run.question.slice(0, 120),
        createdAt: new Date().toISOString(),
        question: run.question,
        body: run.final.answer,
        citations: run.final.citations,
        limitations: run.final.limitations,
        mode: run.final.mode,
        model: run.model,
        runId: run.final.runId,
      };
      localStorage.setItem(SAVED_KEY, JSON.stringify([record, ...existing].slice(0, 25)));
      setSavedFlash(run.id);
      setTimeout(() => setSavedFlash(null), 1800);
    } catch {
      setSavedFlash(null);
    }
  }

  function regenerate(run: Run) {
    void ask(run.question);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-600" /> Ask the research assistant
            </CardTitle>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              The assistant can only read validated tool outputs. It cannot change mappings, exclusions, classifications or statistics.
            </p>
          </div>
          <Badge variant={aiConfigured ? "blue" : "amber"}>{aiConfigured ? `AI · ${model ?? "model"}` : "Deterministic mode"}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {!aiConfigured ? (
            <Alert variant="warning" title="No AI provider configured">
              Answers are assembled deterministically from read-only tools. {aiReason ?? "Set AI_PROVIDER, AI_API_KEY and AI_MODEL to enable model-written summaries."}
            </Alert>
          ) : null}
          <Textarea
            aria-label="Question for the research assistant"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void ask(question);
              }
            }}
            rows={3}
            maxLength={2000}
            placeholder="e.g. Which isolates have candidate discordance for ceftriaxone, and what should I check first?"
            disabled={running}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-muted">Ctrl/⌘ + Enter to send · {question.length}/2000</p>
            <div className="flex items-center gap-2">
              {running ? (
                <Button variant="secondary" size="sm" onClick={() => abortRef.current?.abort()}>
                  Cancel
                </Button>
              ) : null}
              <Button size="sm" onClick={() => void ask(question)} disabled={running || question.trim().length < 2}>
                {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Ask
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void ask(suggestion)}
                disabled={running}
                className="rounded-full border border-line bg-canvas px-3 py-1 text-left text-[11px] text-muted transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {runs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-canvas">
              <Bot className="h-5 w-5 text-muted" />
            </div>
            <p className="text-sm font-medium text-ink">No questions yet</p>
            <p className="max-w-lg text-xs leading-relaxed text-muted">
              Every answer exposes its tool calls, evidence cards and verified citation IDs. Anything the model adds beyond tool output is labelled as interpretation.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {runs.map((run) => (
        <Card key={run.id} className={cn(run.status === "failed" && "border-danger-100")}>
          <CardHeader className="items-start">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Question</p>
              <p className="mt-1 text-[13px] font-medium text-ink">{run.question}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {run.mode ? <Badge variant={run.mode === "ai" ? "blue" : "neutral"}>{run.mode === "ai" ? "AI mode" : "Deterministic"}</Badge> : null}
              {run.status === "running" ? (
                <Badge variant="cyan">
                  <Loader2 className="h-3 w-3 animate-spin" /> Running
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {run.tools.length > 0 ? (
              <div className="space-y-1.5">
                <p className="mono-label">Tool calls</p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {run.tools.map((tool, index) => (
                    <div key={`${tool.name}-${index}`} className="flex items-start gap-2 rounded-lg border border-line bg-canvas/60 px-2.5 py-2">
                      {tool.status === "completed" ? (
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok-600" />
                      ) : (
                        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger-600" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[11px] font-medium text-ink">{tool.name}</p>
                        <p className="text-[11px] leading-snug text-muted">{tool.summary}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {tool.source} · {tool.durationMs} ms
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {run.notices.map((notice, index) => (
              <Alert key={`${run.id}-notice-${index}`} variant="info">
                {notice}
              </Alert>
            ))}

            {run.error ? (
              <Alert variant="danger" title="Run failed">
                {run.error}
              </Alert>
            ) : null}

            {run.status === "running" && !run.final ? (
              <div className="flex items-center gap-2 text-xs text-muted">
                <Wrench className="h-3.5 w-3.5" /> Running read-only tools and composing an answer…
              </div>
            ) : null}

            {run.final ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-line bg-white p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant={run.final.mode === "ai" ? "blue" : "neutral"}>
                      {run.final.mode === "ai" ? "Source-backed AI summary" : "Deterministic summary"}
                    </Badge>
                    <span className="text-[10px] text-muted">
                      {(run.final.elapsedMs / 1000).toFixed(1)} s · run {run.final.runId}
                    </span>
                  </div>
                  <MarkdownLite text={run.final.answer} />
                </div>

                {run.final.evidenceCards.length > 0 ? (
                  <div>
                    <p className="mono-label mb-1.5">Evidence cards (tool-derived, authoritative)</p>
                    <div className="grid gap-2 md:grid-cols-2">
                      {run.final.evidenceCards.slice(0, 6).map((card, index) => (
                        <div key={`${card.name}-${index}`} className="rounded-lg border border-line bg-canvas/50 p-3">
                          <p className="flex items-center gap-1.5 font-mono text-[11px] font-medium text-ink">
                            <Wrench className="h-3 w-3 text-muted" /> {card.name}
                          </p>
                          <p className="mt-1 text-[11.5px] leading-snug text-ink/80">{card.summary}</p>
                          <p className="mt-1 text-[10px] text-muted">Source: {card.source}</p>
                          {card.citations.length > 0 ? (
                            <p className="mt-1 font-mono text-[10px] text-brand-700">{card.citations.join(" · ")}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {run.final.citations.length > 0 ? (
                  <div>
                    <p className="mono-label mb-1.5">Verified citations</p>
                    <ul className="space-y-1">
                      {run.final.citations.map((citation) => (
                        <li key={citation.id} className="flex items-start gap-1.5 text-[11.5px] text-ink/80">
                          <BookOpen className="mt-0.5 h-3 w-3 shrink-0 text-muted" />
                          <a href={citation.url} target="_blank" rel="noreferrer" className="hover:text-brand-700 hover:underline">
                            {citation.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted">No verified citation identifiers were attached to this answer.</p>
                )}

                {run.final.limitations.length > 0 ? (
                  <div className="rounded-lg border border-amber-100 bg-warn-50/60 p-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold text-warn-600">
                      <AlertTriangle className="h-3.5 w-3.5" /> Limitations to carry into any write-up
                    </p>
                    <ul className="mt-1 ml-4 list-disc space-y-0.5 text-[11.5px] text-ink/80">
                      {run.final.limitations.map((limitation, index) => (
                        <li key={`${run.id}-lim-${index}`}>{limitation}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => void copyAnswer(run)}>
                    {copied === run.id ? <CheckCircle2 className="h-3.5 w-3.5 text-ok-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied === run.id ? "Copied" : "Copy answer"}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => saveToReports(run)}>
                    {savedFlash === run.id ? <CheckCircle2 className="h-3.5 w-3.5 text-ok-600" /> : <Save className="h-3.5 w-3.5" />}
                    {savedFlash === run.id ? "Saved to Reports" : "Save draft to Reports"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => regenerate(run)} disabled={running}>
                    <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                  </Button>
                  <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted">
                    <ShieldCheck className="h-3 w-3" /> No diagnosis, treatment or dosing advice
                  </span>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
