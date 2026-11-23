"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FileCheck2,
  FlaskConical,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Progress } from "@/components/ui/stat";
import {
  MAX_FILE_BYTES,
  MAX_ROWS,
  SCHEMAS,
  applyMapping,
  parseTable,
  toCsv,
  type MappingSuggestion,
  type ParsedTable,
  type TableKind,
} from "@/lib/imports/adapters";
import { runAnalysis, type AnalysisResult } from "@/lib/analysis/pipeline";
import { runValidation, type ValidationReport } from "@/lib/validation/engine";
import { matchAstRecords, suggestMatches, type MatchOutcome, type MatchSuggestion } from "@/lib/matching";
import { CLASSIFICATION_META, classificationCounts, validationLabel } from "@/lib/presentation";
import { formatPct } from "@/lib/utils";
import type { AstRecord, GeneCallRecord, GeneDrugEvidence, IsolateRecord } from "@/types/domain";

type Phase = "upload" | "map" | "review" | "processing" | "results";

interface SlotState {
  kind: TableKind;
  fileName: string | null;
  bytes: number;
  table: ParsedTable | null;
  preview: {
    headers: string[];
    mapping: MappingSuggestion["mapping"];
    confidence: MappingSuggestion["confidence"];
    missingRequired: string[];
    sourceFormat: string;
    detectedKind: string;
    errors: string[];
    truncated: boolean;
  } | null;
  mapping: Record<string, string | null>;
  error: string | null;
  loading: boolean;
}

interface PreparedImport {
  isolates: IsolateRecord[];
  geneCalls: GeneCallRecord[];
  ast: AstRecord[];
  evidence: GeneDrugEvidence[];
  validation: ValidationReport;
  matching: MatchOutcome;
  suggestions: MatchSuggestion[];
  droppedRows: Record<string, number>;
}

interface ImportResult extends PreparedImport {
  analysis: AnalysisResult;
  completedAt: string;
}

const SLOT_ORDER: TableKind[] = ["isolates", "genes", "ast", "evidence"];

const SLOT_META: Record<TableKind, { title: string; description: string; required: boolean }> = {
  isolates: {
    title: "Isolate records",
    description: "Metadata and the exact identifiers used for matching. BioSample accession is optional but preferred.",
    required: true,
  },
  genes: {
    title: "Gene calls",
    description: "AMRFinderPlus, CARD or ResFinder annotations already computed elsewhere. The platform does not call genes from reads.",
    required: true,
  },
  ast: {
    title: "AST results",
    description: "Submitted S/I/R categories with optional method, measurement, standard and year.",
    required: true,
  },
  evidence: {
    title: "Gene–drug evidence map",
    description: "Versioned, cited organism–gene–drug mappings. Download the demo template if you need the expected shape.",
    required: true,
  },
};

function emptySlot(kind: TableKind): SlotState {
  return { kind, fileName: null, bytes: 0, table: null, preview: null, mapping: {}, error: null, loading: false };
}

function initialSlots(): Record<TableKind, SlotState> {
  return {
    isolates: emptySlot("isolates"),
    genes: emptySlot("genes"),
    ast: emptySlot("ast"),
    evidence: emptySlot("evidence"),
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function download(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function ImportWizard() {
  const [phase, setPhase] = useState<Phase>("upload");
  const [slots, setSlots] = useState<Record<TableKind, SlotState>>(initialSlots);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [prepared, setPrepared] = useState<PreparedImport | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [dragKind, setDragKind] = useState<TableKind | null>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);

  const allRequiredLoaded = SLOT_ORDER.every((kind) => !SLOT_META[kind].required || slots[kind].table !== null);
  const mappingsValid = SLOT_ORDER.every((kind) => {
    if (!slots[kind].table) return !SLOT_META[kind].required;
    return SCHEMAS[kind].filter((field) => field.required).every((field) => slots[kind].mapping[field.key]);
  });

  const totalRows = useMemo(
    () => SLOT_ORDER.reduce((acc, kind) => acc + (slots[kind].table?.rows.length ?? 0), 0),
    [slots]
  );

  async function handleFile(kind: TableKind, file: File | null) {
    if (!file) return;
    setError(null);
    if (file.size > MAX_FILE_BYTES) {
      setSlots((current) => ({ ...current, [kind]: { ...current[kind], error: `File exceeds ${(MAX_FILE_BYTES / 1024 / 1024).toFixed(0)} MB. Split the export before importing.` } }));
      return;
    }
    setSlots((current) => ({ ...current, [kind]: { ...current[kind], loading: true, error: null, fileName: file.name, bytes: file.size } }));
    try {
      const text = await file.text();
      const previewResponse = await fetch("/api/import/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 380_000), kind, filename: file.name }),
      });
      const previewPayload = (await previewResponse.json()) as {
        error?: string;
        headers?: string[];
        mapping?: Record<string, string | null>;
        confidence?: Record<string, number>;
        missingRequired?: string[];
        sourceFormat?: string;
        detectedKind?: string;
        errors?: string[];
        truncated?: boolean;
      };
      if (!previewResponse.ok) throw new Error(previewPayload.error ?? "Preview failed.");
      const table = parseTable(text);
      if (table.headers.length === 0) throw new Error("No header row was detected.");
      if (table.rows.length > MAX_ROWS) throw new Error(`File contains more than ${MAX_ROWS.toLocaleString()} data rows. Split it first.`);
      setSlots((current) => ({
        ...current,
        [kind]: {
          ...current[kind],
          loading: false,
          table,
          preview: {
            headers: previewPayload.headers ?? table.headers,
            mapping: previewPayload.mapping ?? {},
            confidence: previewPayload.confidence ?? {},
            missingRequired: previewPayload.missingRequired ?? [],
            sourceFormat: previewPayload.sourceFormat ?? "unknown",
            detectedKind: previewPayload.detectedKind ?? "unknown",
            errors: previewPayload.errors ?? [],
            truncated: previewPayload.truncated ?? false,
          },
          mapping: { ...(previewPayload.mapping ?? {}) },
          error: null,
        },
      }));
    } catch (caught) {
      setSlots((current) => ({
        ...current,
        [kind]: { ...current[kind], loading: false, table: null, preview: null, error: caught instanceof Error ? caught.message : "Could not read this file." },
      }));
    }
  }

  function updateMapping(kind: TableKind, field: string, source: string) {
    setSlots((current) => ({
      ...current,
      [kind]: { ...current[kind], mapping: { ...current[kind].mapping, [field]: source === "" ? null : source } },
    }));
  }

  async function sendChunks(kind: TableKind, rows: Record<string, string>[], mapping: Record<string, string | null>, onProgress: (done: number, total: number) => void) {
    const batches = chunk(rows, 400);
    const records: unknown[] = [];
    let dropped = 0;
    for (let index = 0; index < batches.length; index += 1) {
      const response = await fetch("/api/import/normalize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, mapping, rows: batches[index] }),
      });
      const payload = (await response.json()) as { error?: string; records?: unknown[]; droppedRows?: number };
      if (!response.ok) throw new Error(payload.error ?? `Chunk ${index + 1} failed for ${kind}.`);
      records.push(...(payload.records ?? []));
      dropped += payload.droppedRows ?? 0;
      onProgress(index + 1, batches.length);
    }
    return { records, dropped };
  }

  async function prepareImport() {
    setError(null);
    setAcknowledged(false);
    if (!allRequiredLoaded) {
      setError("Load isolate, gene-call, AST and evidence-map files before validation.");
      return;
    }
    if (!mappingsValid) {
      setError("Every required canonical field must be mapped before validation.");
      return;
    }
    setPhase("processing");
    setProgress(0);
    try {
      const isolates = slots.isolates;
      const genes = slots.genes;
      const ast = slots.ast;
      const evidence = slots.evidence;
      if (!isolates.table || !genes.table || !ast.table || !evidence.table) throw new Error("Missing table data.");

      const totalBatches =
        chunk(isolates.table.rows, 400).length + chunk(genes.table.rows, 400).length + chunk(ast.table.rows, 400).length + chunk(evidence.table.rows, 400).length;
      let completedBatches = 0;
      const tick = () => {
        completedBatches += 1;
        setProgress(Math.round((completedBatches / Math.max(1, totalBatches)) * 100));
        setProgressLabel(`Normalising tables in chunks (${completedBatches}/${totalBatches})`);
      };

      setProgressLabel("Normalising isolate records");
      const isoResult = await sendChunks("isolates", isolates.table.rows, isolates.mapping, tick);
      setProgressLabel("Normalising gene calls");
      const geneResult = await sendChunks("genes", genes.table.rows, genes.mapping, tick);
      setProgressLabel("Normalising AST results");
      const astResult = await sendChunks("ast", ast.table.rows, ast.mapping, tick);
      setProgressLabel("Normalising evidence map");
      const evidenceResult = await sendChunks("evidence", evidence.table.rows, evidence.mapping, tick);

      setProgressLabel("Running deterministic validation and matching checks");
      const isolateRecords = isoResult.records as IsolateRecord[];
      const geneRecords = geneResult.records as GeneCallRecord[];
      const astRecords = astResult.records as AstRecord[];
      const evidenceRecords = evidenceResult.records as GeneDrugEvidence[];

      const validation = runValidation({
        isolates: isolateRecords,
        geneCalls: geneRecords,
        ast: astRecords,
        evidence: evidenceRecords,
        requirePanel: true,
      });
      const matching = matchAstRecords(astRecords, isolateRecords);
      setPrepared({
        isolates: isolateRecords,
        geneCalls: geneRecords,
        ast: astRecords,
        evidence: evidenceRecords,
        validation,
        matching,
        suggestions: suggestMatches(matching.unmatched, isolateRecords, 2),
        droppedRows: {
          isolates: isoResult.dropped,
          genes: geneResult.dropped,
          ast: astResult.dropped,
          evidence: evidenceResult.dropped,
        },
      });
      setProgress(100);
      setPhase("review");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The validation pass could not be completed.");
      setPhase("map");
    }
  }

  function startAnalysis() {
    if (!prepared) return;
    setError(null);
    setPhase("processing");
    setProgress(55);
    setProgressLabel("Computing five-class genotype–phenotype comparisons");
    try {
      const analysis = runAnalysis({
        isolates: prepared.isolates,
        geneCalls: prepared.geneCalls,
        astResults: prepared.ast,
        evidence: prepared.evidence,
        options: { requirePanel: true },
      });
      const importResult: ImportResult = {
        ...prepared,
        analysis,
        completedAt: new Date().toISOString(),
      };
      setResult(importResult);
      setProgress(100);
      setPhase("results");
      try {
        window.sessionStorage.setItem(
          "amr-pulse:last-import",
          JSON.stringify({
            completedAt: importResult.completedAt,
            files: SLOT_ORDER.map((kind) => ({ kind, fileName: slots[kind].fileName, rows: slots[kind].table?.rows.length ?? 0 })),
            counts: analysis.counts,
            eligiblePairs: analysis.summary.eligiblePairs,
            agreement: analysis.summary.agreement,
            note: "Temporary in-browser session summary. Raw derived data is not persisted.",
          })
        );
      } catch {
        // Session snapshots are optional.
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The analysis could not be completed.");
      setPhase("review");
    }
  }

  function reset() {
    setSlots(initialSlots());
    setResult(null);
    setPrepared(null);
    setAcknowledged(false);
    setPhase("upload");
    setError(null);
    setProgress(0);
  }

  function downloadMapped(kind: TableKind) {
    const slot = slots[kind];
    if (!slot.table) return;
    const mappedRows = applyMapping(slot.table.rows, slot.mapping);
    const columns = Object.keys(slot.mapping).filter((key) => slot.mapping[key]);
    download(`amr-pulse-mapped-${kind}.csv`, toCsv(columns, mappedRows), "text/csv;charset=utf-8");
  }

  async function loadDemoTables() {
    setError(null);
    setLoadingDemo(true);
    try {
      const files: Array<[TableKind, string]> = [
        ["isolates", "demo-isolates.csv"],
        ["genes", "demo-gene-calls.csv"],
        ["ast", "demo-ast-results.csv"],
        ["evidence", "gene-drug-evidence.csv"],
      ];
      for (const [kind, name] of files) {
        const response = await fetch(`/demo/${name}`);
        if (!response.ok) throw new Error(`Could not load ${name}.`);
        const text = await response.text();
        await handleFile(kind, new File([text], name, { type: "text/csv" }));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The demo tables could not be loaded.");
    } finally {
      setLoadingDemo(false);
    }
  }

  function downloadIssues() {
    if (!result) return;
    const rows = result.validation.issues.map((issue) => ({
      severity: issue.severity,
      code: issue.code,
      label: validationLabel(issue.code),
      record_id: issue.recordId,
      field: issue.field,
      problem: issue.problem,
      original_value: issue.originalValue,
      explanation: issue.explanation,
      suggestion: issue.suggestion ?? "",
      resolution_status: issue.resolutionStatus,
    }));
    const columns = ["severity", "code", "label", "record_id", "field", "problem", "original_value", "explanation", "suggestion", "resolution_status"];
    download("amr-pulse-import-issues.csv", toCsv(columns, rows), "text/csv;charset=utf-8");
  }

  function downloadResults() {
    if (!result) return;
    download(
      "amr-pulse-imported-analysis.json",
      JSON.stringify(
        {
          generatedAt: result.completedAt,
          note: "Temporary in-browser analysis. Dataset provenance is supplied by the importer; the demo workspace is unchanged.",
          counts: { isolates: result.isolates.length, geneCalls: result.geneCalls.length, astRows: result.ast.length, evidenceRows: result.evidence.length },
          droppedRows: result.droppedRows,
          analysis: result.analysis,
          validation: { bySeverity: result.validation.bySeverity, byCode: result.validation.byCode, issues: result.validation.issues },
          matching: { matched: result.matching.matched.length, unmatched: result.matching.unmatched.length, ambiguous: result.matching.ambiguous.length },
        },
        null,
        2
      ),
      "application/json"
    );
  }

  const stepIndex =
    phase === "upload"
      ? allRequiredLoaded
        ? 2
        : slots.isolates.table && slots.genes.table
          ? 1
          : 0
      : phase === "map"
        ? 2
        : phase === "review"
          ? 3
          : 4;

  const steps = [
    { id: "genomic", label: "Upload genomic data", hint: "Isolates + gene calls" },
    { id: "ast", label: "Upload AST results", hint: "Predictions + evidence map" },
    { id: "map", label: "Map columns", hint: "Confirm every field" },
    { id: "review", label: "Review quality", hint: "Validation + matching" },
    { id: "results", label: "Start analysis", hint: "Five-class comparison" },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-white p-3 shadow-card">
        <ol className="flex items-stretch gap-1 overflow-x-auto">
          {steps.map((step, index) => {
            const done = index < stepIndex || (index === stepIndex && phase === "results");
            const active = index === stepIndex && phase !== "results";
            return (
              <li key={step.id} className="flex min-w-[150px] flex-1 items-center gap-2">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[10.5px] ${
                    done
                      ? "bg-brand-600 text-white"
                      : active
                        ? "bg-navy-900 text-white ring-4 ring-navy-900/10"
                        : "bg-canvas text-faint ring-1 ring-line"
                  }`}
                >
                  {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
                </div>
                <div className="min-w-0">
                  <p className={`truncate text-[11px] font-medium ${done || active ? "text-ink" : "text-muted"}`}>{step.label}</p>
                  <p className="truncate text-[9.5px] text-faint">{step.hint}</p>
                </div>
                {index < steps.length - 1 ? <span className={`mx-1 hidden h-px flex-1 sm:block ${done ? "bg-brand-200" : "bg-line"}`} /> : null}
              </li>
            );
          })}
        </ol>
        <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2">
          <p className="text-[10.5px] text-muted">
            {totalRows > 0 ? `${totalRows.toLocaleString()} rows staged across ${SLOT_ORDER.filter((kind) => slots[kind].table).length} tables` : "No files staged"}
          </p>
          <p className="text-[10.5px] text-faint">Step {stepIndex + 1} of 5</p>
        </div>
      </div>

      {error ? <Alert variant="danger" title="Import stopped">{error}</Alert> : null}

      {phase === "upload" ? (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white px-4 py-3.5 shadow-card sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[12.5px] font-semibold text-ink">Bring four tables, or start with the demonstration cohort</p>
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">
                Genomic annotations and AST results are joined by exact identifier only. No sequencing or gene re-calling happens here.
              </p>
            </div>
            <Button size="sm" variant="secondary" disabled={loadingDemo} onClick={() => void loadDemoTables()}>
              {loadingDemo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Load demo tables
            </Button>
          </div>

          <Alert variant="warning" title="Do not upload identifiable patient data">
            Use isolate-level, de-identified public or research data. AMR PULSE is not a clinical system and is not
            HIPAA/ISO certified. Files are parsed for this session only; derived raw tables are not persisted server-side in demo mode.
          </Alert>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {SLOT_ORDER.map((kind) => {
              const meta = SLOT_META[kind];
              const slot = slots[kind];
              const dragging = dragKind === kind;
              return (
                <div
                  key={kind}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragKind(kind);
                  }}
                  onDragLeave={() => setDragKind(null)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragKind(null);
                    const file = event.dataTransfer.files?.[0] ?? null;
                    void handleFile(kind, file);
                  }}
                  className={`rounded-2xl border bg-white p-4 shadow-card transition-colors ${dragging ? "border-brand-500 bg-brand-50/40" : "border-line"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[12.5px] font-semibold text-ink">{meta.title}</p>
                      <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">{meta.description}</p>
                    </div>
                    <Badge variant={slot.table ? "green" : "neutral"}>{slot.table ? "loaded" : meta.required ? "required" : "optional"}</Badge>
                  </div>

                  <label
                    className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line-strong bg-canvas/40 px-3 py-3 transition-colors hover:border-brand-500/60 hover:bg-brand-50/30"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-line">
                      {slot.loading ? <Loader2 className="h-4 w-4 animate-spin text-brand-600" /> : slot.table ? <CheckCircle2 className="h-4 w-4 text-brand-600" /> : <Upload className="h-4 w-4 text-muted" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11.5px] font-medium text-ink">{slot.fileName ? "Replace file" : "Drop file here or browse"}</span>
                      <span className="block truncate text-[10px] text-muted">
                        {slot.fileName ? `${slot.fileName} · ${(slot.bytes / 1024).toFixed(0)} KB` : "CSV or TSV · up to 8 MB"}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10.5px] font-medium text-brand-700">{slot.fileName ? "Change" : "Browse"}</span>
                    <input
                      type="file"
                      accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        void handleFile(kind, file);
                        event.target.value = "";
                      }}
                    />
                  </label>

                  {slot.error ? <p className="mt-2 text-[10.5px] text-danger-600">{slot.error}</p> : null}
                  {slot.preview ? (
                    <div className="mt-2 rounded-lg border border-line bg-canvas/40 p-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="blue">{slot.preview.sourceFormat}</Badge>
                        <Badge variant="neutral">{slot.preview.headers.length} columns</Badge>
                        <Badge variant="neutral">{slot.table?.rows.length.toLocaleString()} rows</Badge>
                        {slot.preview.missingRequired.length > 0 ? <Badge variant="amber">{slot.preview.missingRequired.length} required unmapped</Badge> : <Badge variant="green">required mapped</Badge>}
                      </div>
                      <p className="mt-1.5 truncate font-mono text-[9.5px] text-muted">{slot.preview.headers.join(" · ")}</p>
                    </div>
                  ) : null}
                  {kind === "evidence" ? (
                    <a href="/demo/gene-drug-evidence.csv" download className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-medium text-brand-700 hover:underline">
                      <Download className="h-3 w-3" /> Download evidence-map template (demo, synthetic)
                    </a>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-line bg-white px-4 py-3 shadow-card sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-muted">CSV or TSV · up to 8 MB and 20,000 rows per table · normalised in chunks of 400 rows.</p>
            <Button size="sm" disabled={!allRequiredLoaded} onClick={() => setPhase("map")}>
              Review column mappings <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : null}

      {phase === "map" ? (
        <div className="space-y-3">
          <Alert variant="info" title="Mapping is a suggestion until you confirm it">
            Suggestions come from documented aliases and fuzzy header matching. A lower-confidence match is never applied
            automatically; your confirmation is the authority. Required fields must be mapped before analysis.
          </Alert>
          {SLOT_ORDER.map((kind) => {
            const slot = slots[kind];
            if (!slot.table || !slot.preview) return null;
            return (
              <div key={kind} className="rounded-xl border border-line bg-white shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
                  <div>
                    <p className="text-[12.5px] font-semibold text-ink">{SLOT_META[kind].title}</p>
                    <p className="text-[10.5px] text-muted">{slot.fileName} · {slot.table.rows.length.toLocaleString()} rows · detected as {slot.preview.detectedKind}</p>
                  </div>
                  <Badge variant={SCHEMAS[kind].filter((f) => f.required).every((f) => slot.mapping[f.key]) ? "green" : "amber"}>
                    {SCHEMAS[kind].filter((f) => f.required).every((f) => slot.mapping[f.key]) ? "required mapped" : "required missing"}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 gap-x-6 gap-y-2 p-4 md:grid-cols-2">
                  {SCHEMAS[kind].map((field) => {
                    const confidence = slot.preview?.confidence[field.key] ?? 0;
                    return (
                      <div key={field.key} className="flex items-center gap-2">
                        <div className="w-40 shrink-0">
                          <p className="text-[10.5px] font-medium text-ink">
                            {field.label} {field.required ? <span className="text-danger-600">*</span> : null}
                          </p>
                          <p className="text-[9px] text-muted">{field.key}</p>
                        </div>
                        <Select
                          aria-label={`Map ${field.label}`}
                          value={slot.mapping[field.key] ?? ""}
                          onChange={(event) => updateMapping(kind, field.key, event.target.value)}
                          className="h-7 flex-1 text-[10.5px]"
                        >
                          <option value="">(unmapped)</option>
                          {slot.preview?.headers.map((header) => (
                            <option key={header} value={header}>{header}</option>
                          ))}
                        </Select>
                        {slot.mapping[field.key] ? (
                          <Badge variant={confidence >= 0.9 ? "green" : confidence >= 0.6 ? "amber" : "neutral"}>{Math.round(confidence * 100)}%</Badge>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                {slot.preview.errors.length > 0 ? (
                  <p className="border-t border-line px-4 py-2 text-[10px] text-warn-600">Parser notes: {slot.preview.errors.slice(0, 3).join("; ")}</p>
                ) : null}
              </div>
            );
          })}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-white px-4 py-3 shadow-card">
            <Button size="sm" variant="secondary" onClick={() => setPhase("upload")}>
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
            <Button size="sm" disabled={!mappingsValid} onClick={() => void prepareImport()}>
              <ShieldCheck className="h-3.5 w-3.5" /> Continue to validation
            </Button>
          </div>
        </div>
      ) : null}

      {phase === "review" && prepared ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-canvas ring-1 ring-line">
                  <ShieldCheck className="h-5 w-5 text-brand-700" />
                </span>
                <div>
                  <p className="text-[14px] font-semibold text-ink">Quality review before analysis</p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">
                    Validation and identifier matching ran on the normalised tables. Nothing has been analysed yet.
                  </p>
                </div>
              </div>
              <Badge
                variant={prepared.validation.bySeverity.critical > 0 ? "red" : prepared.validation.bySeverity.warning > 0 ? "amber" : "green"}
              >
                {prepared.validation.bySeverity.critical > 0
                  ? `${prepared.validation.bySeverity.critical} critical`
                  : prepared.validation.bySeverity.warning > 0
                    ? `${prepared.validation.bySeverity.warning} warnings`
                    : "validation passed"}
              </Badge>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {SLOT_ORDER.map((kind) => {
                const records =
                  kind === "isolates"
                    ? prepared.isolates.length
                    : kind === "genes"
                      ? prepared.geneCalls.length
                      : kind === "ast"
                        ? prepared.ast.length
                        : prepared.evidence.length;
                return (
                  <div key={kind} className="rounded-xl border border-line bg-canvas/40 px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-brand-600" />
                      <p className="truncate text-[10.5px] font-medium text-ink">{SLOT_META[kind].title}</p>
                    </div>
                    <p className="mt-1 font-mono text-[16px] font-semibold tabular-nums text-ink">{records.toLocaleString()}</p>
                    <p className="text-[9.5px] text-muted">{prepared.droppedRows[kind]} rows dropped in normalisation</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Badge variant="red">{prepared.validation.bySeverity.critical} critical</Badge>
              <Badge variant="amber">{prepared.validation.bySeverity.warning} warning</Badge>
              <Badge variant="neutral">{prepared.validation.bySeverity.info} info</Badge>
              <span className="mx-1 hidden h-3 w-px bg-line sm:block" />
              <Badge variant="green">{prepared.matching.matched.length} exact matches</Badge>
              <Badge variant="amber">{prepared.matching.unmatched.length} unmatched</Badge>
              <Badge variant="neutral">{prepared.matching.ambiguous.length} ambiguous</Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-line bg-white shadow-card">
              <div className="border-b border-line px-4 py-3">
                <p className="text-[12.5px] font-semibold text-ink">Most frequent validation issues</p>
                <p className="mt-0.5 text-[10.5px] text-muted">Every issue is retained with its record and explanation.</p>
              </div>
              {prepared.validation.byCode.length === 0 ? (
                <div className="px-4 py-6">
                  <Alert variant="success" title="No validation issues detected">
                    Required identifiers, categories and provenance fields passed the checks on these tables.
                  </Alert>
                </div>
              ) : (
                <ul className="divide-y divide-line">
                  {prepared.validation.byCode.slice(0, 7).map((entry) => (
                    <li key={entry.code} className="flex items-center justify-between gap-3 px-4 py-2">
                      <span className="truncate text-[11px] text-slate-600">{validationLabel(entry.code)}</span>
                      <span className="font-mono text-[11px] tabular-nums text-ink">{entry.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-line bg-white shadow-card">
              <div className="border-b border-line px-4 py-3">
                <p className="text-[12.5px] font-semibold text-ink">Identifier matching</p>
                <p className="mt-0.5 text-[10.5px] text-muted">Exact identifiers only; suggestions require human approval.</p>
              </div>
              <div className="space-y-2.5 px-4 py-3">
                {[
                  { label: "AST rows with an exact isolate match", value: prepared.matching.matched.length, tone: "text-brand-700" },
                  { label: "AST rows without a match", value: prepared.matching.unmatched.length, tone: "text-warn-700" },
                  { label: "Ambiguous identifiers", value: prepared.matching.ambiguous.length, tone: "text-ink" },
                  { label: "Near-match suggestions (not applied)", value: prepared.suggestions.length, tone: "text-muted" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-600">{row.label}</span>
                    <span className={`font-mono text-[12px] font-semibold tabular-nums ${row.tone}`}>{row.value.toLocaleString()}</span>
                  </div>
                ))}
                <div className="rounded-lg border border-line bg-canvas/50 px-2.5 py-2 text-[10px] leading-relaxed text-muted">
                  Unmatched AST rows cannot enter the comparison. They are reported, never force-joined by organism or
                  approximate name.
                </div>
              </div>
            </div>
          </div>

          <details className="rounded-2xl border border-line bg-white px-4 py-3 shadow-card">
            <summary className="cursor-pointer text-[12px] font-semibold text-ink">
              Inspect individual validation records
              <span className="ml-2 text-[10.5px] font-normal text-faint">first 12 of {prepared.validation.issues.length}</span>
            </summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-[10.5px]">
                <thead className="text-[9px] uppercase tracking-[0.08em] text-muted">
                  <tr>
                    <th className="py-1 pr-3 font-medium">Severity</th>
                    <th className="py-1 pr-3 font-medium">Record</th>
                    <th className="py-1 pr-3 font-medium">Field</th>
                    <th className="py-1 font-medium">Problem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {prepared.validation.issues.slice(0, 12).map((issue, index) => (
                    <tr key={`${issue.recordId}-${issue.code}-${index}`}>
                      <td className="py-1.5 pr-3">
                        <Badge variant={issue.severity === "critical" ? "red" : issue.severity === "warning" ? "amber" : "neutral"}>{issue.severity}</Badge>
                      </td>
                      <td className="py-1.5 pr-3 font-mono text-[10px]">{issue.recordId}</td>
                      <td className="py-1.5 pr-3 font-mono text-[10px] text-muted">{issue.field}</td>
                      <td className="py-1.5 text-slate-600">{issue.problem}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          {prepared.validation.bySeverity.critical > 0 ? (
            <Alert variant="warning" title={`${prepared.validation.bySeverity.critical} critical issue records must be acknowledged`}>
              Critical issues exclude the affected records from analysis or prevent a valid comparison. They are never
              hidden and this validation pass is not marked successful. Review the individual records before continuing.
            </Alert>
          ) : null}

          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-card sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Button size="sm" variant="secondary" onClick={() => setPhase("map")}>
                <ArrowLeft className="h-3.5 w-3.5" /> Back to mapping
              </Button>
              {prepared.validation.bySeverity.critical > 0 ? (
                <label className="flex items-start gap-2 text-[10.5px] leading-relaxed text-slate-600">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(event) => setAcknowledged(event.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 accent-[#12A985]"
                  />
                  I understand the critical issues and that affected records will be excluded.
                </label>
              ) : null}
            </div>
            <Button
              size="sm"
              disabled={prepared.validation.bySeverity.critical > 0 && !acknowledged}
              onClick={startAnalysis}
            >
              <FlaskConical className="h-3.5 w-3.5" /> Start analysis
            </Button>
          </div>
        </div>
      ) : null}

      {phase === "processing" ? (
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
            <p className="text-[13px] font-medium text-ink">Validating and analysing your tables</p>
          </div>
          <p className="mt-1 text-[11px] text-muted">{progressLabel}</p>
          <div className="mt-3">
            <Progress value={progress} label={`${progress}% · each table is normalised server-side; statistics run against the confirmed mapping`} />
          </div>
        </div>
      ) : null}

      {phase === "results" && result ? (
        <div className="space-y-3">
          <Alert variant="warning" title="Temporary in-browser analysis">
            Results below use the tables you mapped in this session. Nothing is written to a shared database, and the
            synthetic demo workspace is unchanged. Reloading the page discards derived data. Configure Supabase for a
            persistent research workspace.
          </Alert>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Isolates", value: result.isolates.length },
              { label: "Gene calls", value: result.geneCalls.length },
              { label: "AST rows", value: result.ast.length },
              { label: "Evidence rows", value: result.evidence.length },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-line bg-white p-4 shadow-card">
                <p className="text-[10.5px] uppercase tracking-wide text-muted">{item.label}</p>
                <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-ink">{item.value.toLocaleString()}</p>
                <p className="mt-0.5 text-[10px] text-muted">{result.droppedRows[item.label === "Isolates" ? "isolates" : item.label === "Gene calls" ? "genes" : item.label === "AST rows" ? "ast" : "evidence"]} rows dropped in normalisation</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-xl border border-line bg-white p-4 shadow-card">
              <p className="text-[12.5px] font-semibold text-ink">Comparison summary</p>
              <p className="mt-0.5 text-[10.5px] text-muted">All organisms and mapped antibiotics in the imported tables.</p>
              <dl className="mt-3 grid grid-cols-2 gap-3">
                <div><dt className="text-[10px] uppercase tracking-wide text-muted">Eligible pairs</dt><dd className="font-mono text-lg font-semibold">{result.analysis.summary.eligiblePairs}</dd></div>
                <div><dt className="text-[10px] uppercase tracking-wide text-muted">Agreement</dt><dd className="font-mono text-lg font-semibold">{formatPct(result.analysis.summary.agreement.proportion)}</dd></div>
                <div><dt className="text-[10px] uppercase tracking-wide text-muted">Candidate discordance</dt><dd className="font-mono text-lg font-semibold text-warn-600">
                  {classificationCounts(result.analysis.summary).genePositiveSusceptible + classificationCounts(result.analysis.summary).resistantNoDeterminant}
                </dd></div>
                <div><dt className="text-[10px] uppercase tracking-wide text-muted">Indeterminate</dt><dd className="font-mono text-lg font-semibold">{result.analysis.counts.indeterminatePairs}</dd></div>
              </dl>
              <div className="mt-3 space-y-1 border-t border-line pt-2">
                {(Object.keys(CLASSIFICATION_META) as Array<keyof typeof CLASSIFICATION_META>).map((key) => {
                  const summary = result.analysis.summary;
                  const count =
                    key === "concordant_resistant" ? summary.concordantResistant.numerator :
                    key === "concordant_susceptible" ? summary.concordantSusceptible.numerator :
                    key === "candidate_gene_positive_phenotype_susceptible" ? summary.candidateGenePositivePhenotypeSusceptible.numerator :
                    key === "candidate_phenotype_resistant_no_known_determinant" ? summary.candidatePhenotypeResistantNoKnownDeterminant.numerator :
                    result.analysis.counts.indeterminatePairs;
                  return (
                    <div key={key} className="flex items-center justify-between text-[10.5px]">
                      <span className="text-muted">{CLASSIFICATION_META[key].label}</span>
                      <span className="font-mono text-ink">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-line bg-white p-4 shadow-card">
              <p className="text-[12.5px] font-semibold text-ink">Validation and matching</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="red">{result.validation.bySeverity.critical} critical</Badge>
                <Badge variant="amber">{result.validation.bySeverity.warning} warning</Badge>
                <Badge variant="neutral">{result.validation.bySeverity.info} info</Badge>
                <Badge variant="green">{result.matching.matched.length} exact matches</Badge>
                <Badge variant="amber">{result.matching.unmatched.length} unmatched</Badge>
              </div>
              <ul className="mt-3 space-y-1">
                {result.validation.byCode.slice(0, 8).map((entry) => (
                  <li key={entry.code} className="flex items-center justify-between text-[10.5px]">
                    <span className="text-muted">{validationLabel(entry.code)}</span>
                    <span className="font-mono text-ink">{entry.count}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-line pt-2 text-[10px] leading-relaxed text-muted">
                Suggestions for unmatched identifiers: {result.suggestions.length}. None are applied automatically.
                Review them in the exported JSON; a persistent workspace records approvals in the audit log.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-white p-4 shadow-card">
            <p className="text-[12.5px] font-semibold text-ink">Excluded records</p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left text-[10.5px]">
                <thead className="text-[9px] uppercase tracking-wide text-muted">
                  <tr><th className="py-1 pr-3 font-medium">Reason</th><th className="py-1 pr-3 font-medium">Records</th><th className="py-1 font-medium">Explanation</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {result.analysis.exclusions.map((group) => (
                    <tr key={group.reason}>
                      <td className="py-1.5 pr-3 font-mono">{group.reason}</td>
                      <td className="py-1.5 pr-3 font-mono">{group.count}</td>
                      <td className="py-1.5 text-muted">{group.explanation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white px-4 py-3 shadow-card">
            <Button size="sm" variant="secondary" onClick={() => downloadMapped("isolates")}><Download className="h-3.5 w-3.5" /> Mapped isolates</Button>
            <Button size="sm" variant="secondary" onClick={() => downloadMapped("genes")}><Download className="h-3.5 w-3.5" /> Mapped genes</Button>
            <Button size="sm" variant="secondary" onClick={() => downloadMapped("ast")}><Download className="h-3.5 w-3.5" /> Mapped AST</Button>
            <Button size="sm" variant="secondary" onClick={downloadIssues}><Download className="h-3.5 w-3.5" /> Issues CSV</Button>
            <Button size="sm" onClick={downloadResults}><FileCheck2 className="h-3.5 w-3.5" /> Analysis JSON</Button>
            <Link href="/quality" className="ml-auto text-[11px] font-medium text-brand-700 hover:underline">Quality rules</Link>
            <Button size="sm" variant="outline" onClick={reset}><RefreshCw className="h-3.5 w-3.5" /> Start over</Button>
          </div>

          {result.analysis.summary.eligiblePairs === 0 ? (
            <Alert variant="warning" title="No eligible pairs">
              No imported pair passed the inclusion rules. Check that the organism names match the evidence map exactly
              and that every isolate has recorded AMR screening provenance.
            </Alert>
          ) : null}

          <div className="flex items-start gap-2 text-[10.5px] leading-relaxed text-muted">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" />
            Completed {new Date(result.completedAt).toLocaleString("en-GB")} · engine {result.analysis.meta.analysisVersion} · evidence map {result.analysis.meta.mappingVersion} ·
            imported mapping versions are preserved per evidence row. No AI model was used to compute these results.
          </div>
        </div>
      ) : null}

      {phase === "upload" && error ? (
        <div className="rounded-lg border border-line bg-white px-3 py-2 text-[10.5px] text-muted">
          <AlertTriangle className="mr-1 inline h-3 w-3 text-warn-600" /> If a file is rejected, confirm that it has a header row, uses UTF-8 and is smaller than 8 MB.
        </div>
      ) : null}
    </div>
  );
}
