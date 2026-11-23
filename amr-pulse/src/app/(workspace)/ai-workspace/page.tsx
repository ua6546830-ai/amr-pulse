import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, BookOpen, Bot, ClipboardCheck, FileSearch, GitCompare, KeyRound, ListChecks, Lock, ScrollText, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { AiAssistant } from "@/components/ai-assistant";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { getAiConfig } from "@/lib/ai/config";
import { CITATIONS } from "@/lib/citations/library";
import { formatNumber } from "@/lib/utils";
import { getDemoDataset } from "@/server/demo/load";
import { recentAudit } from "@/server/ai/audit";

export const metadata: Metadata = { title: "AI research assistant" };
export const dynamic = "force-dynamic";

const STARTERS = [
  "Explain the detected discrepancies.",
  "Why might this isolate show resistance?",
  "Show the supporting scientific evidence.",
  "Identify possible explanations.",
  "Summarise the findings for my research report.",
];

const AGENTS = [
  {
    name: "Data mapping",
    icon: FileSearch,
    purpose: "Suggests column mappings and explains each match. Suggestions are never applied automatically.",
    tools: ["inspect_supported_schema", "get_column_aliases", "validate_mapping", "preview_mapped_records"],
  },
  {
    name: "Quality auditor",
    icon: ClipboardCheck,
    purpose: "Summarises validation issues, duplicates, conflicts and missing fields with denominators.",
    tools: ["get_quality_report", "inspect_invalid_records", "inspect_duplicate_records", "get_missing_field_statistics"],
  },
  {
    name: "Resistance investigation",
    icon: GitCompare,
    purpose: "Explains candidate discordance per isolate using curated evidence and AST provenance.",
    tools: ["get_isolate_evidence", "get_ast_evidence", "get_gene_drug_evidence", "get_discordance_summary"],
  },
  {
    name: "Research assistant",
    icon: BookOpen,
    purpose: "Drafts methods and results summaries from analysis outputs, citing only verified reference IDs.",
    tools: ["get_analysis_results", "get_methodology", "get_relevant_references", "get_citation_library", "get_figure_data"],
  },
];

export default async function AiWorkspacePage() {
  const demo = await getDemoDataset();
  const ai = getAiConfig();
  const audit = recentAudit(5);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={
          <div className="flex items-center gap-2">
            <Badge variant="outline">AI layer</Badge>
            <Badge variant={ai.configured ? "blue" : "amber"}>{ai.configured ? "Provider configured" : "Deterministic fallback active"}</Badge>
          </div>
        }
        title="AI research assistant"
        description="One assistant, backed by four role-scoped agents with typed read-only tools. The model never computes results, mutates data or supplies its own references; every answer exposes tool calls and verified citation IDs."
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link href="/methods">
              <ScrollText className="h-3.5 w-3.5" /> Methods
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 space-y-4">
          <AiAssistant suggestions={STARTERS} aiConfigured={ai.configured} aiReason={ai.reason} model={ai.model || null} />
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[10.5px] text-muted">
            <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-brand-600" /> Working from the synthetic demo dataset</span>
            <span>·</span>
            <span>{formatNumber(demo.analysis.summary.eligiblePairs)} eligible pairs across every supported stratum</span>
            <span>·</span>
            <span>{demo.primary.meta.organism} × {demo.primary.meta.antibiotic} as the primary pairing</span>
          </p>

          <details className="group rounded-2xl border border-line bg-white shadow-card">
            <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="text-[13px] font-semibold text-ink">Under the hood · role-scoped agents</p>
                <p className="mt-0.5 text-[11px] text-muted">Four roles, {AGENTS.reduce((sum, agent) => sum + agent.tools.length, 0)} typed tools. Tool access is enforced by the orchestrator, not requested politely.</p>
              </div>
              <span className="text-[10.5px] font-medium text-brand-700 group-open:hidden">Show</span>
              <span className="hidden text-[10.5px] font-medium text-brand-700 group-open:inline">Hide</span>
            </summary>
            <div className="grid grid-cols-1 gap-2 border-t border-line p-4 sm:grid-cols-2">
              {AGENTS.map((agent) => (
                <div key={agent.name} className="rounded-xl border border-line bg-canvas/40 p-3">
                  <p className="flex items-center gap-2 text-[12px] font-semibold text-ink">
                    <agent.icon className="h-3.5 w-3.5 text-brand-600" /> Agent · {agent.name}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">{agent.purpose}</p>
                  <p className="mt-2 font-mono text-[9.5px] leading-relaxed text-slate-500">{agent.tools.join(" · ")}</p>
                </div>
              ))}
            </div>
          </details>
        </div>

        <div className="space-y-4">
          <Alert variant="warning" title="Research use only">
            No diagnostic output, treatment advice or dosing. Synthetic demo data is not research evidence, and candidate discordance is a review prompt rather than proof of laboratory error.
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-brand-600" /> How an answer is built
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                ["Question", "Your question is validated and sent to the orchestrator — never straight to a model."],
                ["Read-only tools", "Agents query the validated pipeline: counts, evidence, provenance. Arguments are Zod-checked."],
                ["Verified answer", "Numbers come from tool output only. Citations outside the verified library are stripped and disclosed."],
              ].map(([title, body], index) => (
                <div key={title} className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 font-mono text-[10px] font-semibold text-brand-700">{index + 1}</span>
                  <div>
                    <p className="text-[11.5px] font-medium text-ink">{title}</p>
                    <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">{body}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-brand-600" /> Safety architecture
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-[11px] text-ink/80">
              <p className="flex items-start gap-2">
                <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" /> Keys stay server-side. The browser only sees <span className="font-mono text-[10px]">/api/ai/chat</span> responses.
              </p>
              <p className="flex items-start gap-2">
                <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" /> Tool arguments are Zod-validated; unknown tools are rejected.
              </p>
              <p className="flex items-start gap-2">
                <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" /> Citations outside the verified library are stripped and disclosed.
              </p>
              <p className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" /> Imported text is treated as untrusted data; embedded instructions are ignored.
              </p>
              <p className="flex items-start gap-2">
                <ListChecks className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" /> Rate limited to {ai.maxRequestsPerHour} requests/hour per client; runs stop after 3 model turns or 6 tool calls.
              </p>
              <p className="flex items-start gap-2">
                <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" /> Deterministic answers remain available if the provider fails.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="h-3.5 w-3.5 text-brand-600" /> Recent runs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {audit.length === 0 ? (
                <p className="text-[11px] leading-relaxed text-muted">No runs since this server started. Audit entries store a question hash, mode, tools, citations and timing — not raw questions.</p>
              ) : (
                audit.map((event) => (
                  <div key={event.runId} className="rounded-lg border border-line bg-canvas/50 px-2.5 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10.5px] text-ink">{event.runId}</span>
                      <Badge variant={event.mode === "ai" ? "blue" : event.mode === "failed" ? "red" : "neutral"}>{event.mode}</Badge>
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted">
                      {new Date(event.startedAt).toLocaleTimeString()} · hash {event.questionHash} · {event.tools.length} tools · {event.citations.length} citations
                    </p>
                  </div>
                ))
              )}
              <p className="pt-1 text-[10px] leading-relaxed text-slate-500">In-memory audit for this server instance; the Supabase schema persists runs and tool events when a workspace database is configured.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-brand-600" /> Citation library
              </CardTitle>
              <Badge variant="neutral">{CITATIONS.length}</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-[11px] leading-relaxed text-muted">
                {CITATIONS.length} verified entries, each resolved on 2026-11-22 via Crossref, Europe PMC/PubMed or the publisher. Unknown identifiers are rejected at the orchestrator boundary.
              </p>
              <Link href="/methods#references" className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-brand-700 hover:underline">
                Open the reference register
              </Link>
            </CardContent>
          </Card>

          <Alert variant="info" title="Prompt-injection defence">
            <p className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Text inside imported CSVs, isolate identifiers and tool payloads is data. Instructions in that text cannot alter tool permissions, exclusions or statistical output.
            </p>
          </Alert>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <SectionHeader title="Continue the workflow" description="Drafts saved from this page appear in Reports, labelled as AI-generated and unverified." />
        <div className="flex gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href="/reports">Open reports</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href="/investigations">Investigation queue</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
