"use client";

import * as React from "react";
import { BookOpen, CheckCircle2, Clipboard, Download, FileJson, Printer, Save, Sparkles, Trash2, Wand2 } from "lucide-react";
import { MarkdownLite } from "@/components/markdown-lite";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CLASSIFICATION_META, EXCLUSION_LABELS } from "@/lib/presentation";
import { formatCi, formatNumber, formatPct, formatPct100 } from "@/lib/utils";
import type { Classification, ExclusionReason, ProportionEstimate } from "@/types/domain";

type Quality = {
  astRows: number;
  uniquePairs: number;
  duplicateRows: number;
  duplicateGenomes: number;
  missingInterpretationPct: number;
  missingMeasurementPct: number;
  missingStandardPct: number;
  missingTestingYearPct: number;
  missingCountryPct: number;
  missingCollectionDatePct: number;
  mixedStandards: Array<{ standard: string; count: number }>;
  methods: Array<{ method: string; count: number }>;
  genomes: number;
  screenedGenomes: number;
};

export interface ReportCitation {
  id: string;
  authors: string;
  year: number;
  title: string;
  journal: string;
  doi?: string;
  url: string;
}

export interface ReportData {
  datasetName: string;
  datasetType: string;
  datasetLabel: string;
  generatorVersion: string;
  seed: number;
  datasetGeneratedAt: string;
  counts: { isolates: number; geneCalls: number; astRows: number; uniqueIsolateDrugPairs: number; eligiblePairs: number; indeterminatePairs: number };
  summary: {
    concordantResistant: ProportionEstimate;
    concordantSusceptible: ProportionEstimate;
    candidateGenePositivePhenotypeSusceptible: ProportionEstimate;
    candidatePhenotypeResistantNoKnownDeterminant: ProportionEstimate;
    agreement: ProportionEstimate;
    determinantPositivePredictiveValue: ProportionEstimate;
    determinantNegativeResistantProportion: ProportionEstimate;
  };
  meta: { analysisVersion: string; mappingVersion: string; organism: string; antibiotic: string; requirePanel: boolean };
  exclusions: Array<{ reason: ExclusionReason; count: number; explanation: string }>;
  quality: Quality;
  byDrug: Array<{ drug: string; eligible: number; concordantResistant: number; concordantSusceptible: number; genePositiveSusceptible: number; resistantNoKnownDeterminant: number; indeterminate: number; agreement: number | null }>;
  discordanceExamples: Array<{ isolateId: string; antibiotic: string; phenotype: string; detectedGenes: string[]; classification: Classification; astStandard?: string; astMethod?: string }>;
  evidence: { total: number; verified: number; contributing: number; mappingVersion: string };
  citations: ReportCitation[];
}

type SavedDraft = {
  id: string;
  kind: "ai-draft" | "report";
  title: string;
  createdAt: string;
  question?: string;
  body: string;
  citations?: Array<{ id: string; label: string; url: string }>;
  limitations?: string[];
  mode?: string;
  model?: string | null;
  runId?: string;
};

const STORAGE_KEY = "amr-pulse:saved-reports";

const SECTIONS = [
  { id: "objective", label: "Study objective", description: "Primary and secondary questions, analysis unit." },
  { id: "provenance", label: "Data & provenance", description: "Dataset identity, versions, counts, manifest reference." },
  { id: "methods", label: "Methods", description: "Deterministic pipeline, classifications, statistics." },
  { id: "exclusions", label: "Matching & exclusions", description: "Every exclusion reason with counts." },
  { id: "results", label: "Results", description: "Agreement, five-way classification, by-drug table." },
  { id: "discordance", label: "Candidate discordance", description: "Examples queued for human review." },
  { id: "interpretation", label: "Interpretation", description: "What the numbers support — and what they do not." },
  { id: "quality", label: "Data quality", description: "Completeness, duplicates, standards, methods." },
  { id: "limitations", label: "Limitations", description: "Synthetic data, dependence, no clinical validation." },
  { id: "references", label: "References", description: "Verified library entries only." },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

function est(estimate: ProportionEstimate): string {
  const pctText = estimate.proportion === null ? "not estimable" : formatPct(estimate.proportion);
  const ciText = estimate.ci95 ? formatCi(estimate.ci95) : "CI not estimable";
  return `${formatNumber(estimate.numerator)}/${formatNumber(estimate.denominator)} (${pctText}; ${ciText})`;
}

function buildMarkdown(options: {
  data: ReportData;
  title: string;
  enabled: Record<SectionId, boolean>;
  drafts: SavedDraft[];
  builtAt: string;
}): string {
  const { data, title, enabled, drafts, builtAt } = options;
  const lines: string[] = [];
  const push = (...items: string[]) => lines.push(...items);
  const section = (id: SectionId, heading: string) => {
    if (!enabled[id]) return false;
    push("", `## ${heading}`, "");
    return true;
  };
  const bulletTable = (rows: Array<[string, string | number]>) => {
    push("| Metric | Value |", "| --- | --- |");
    for (const [label, value] of rows) push(`| ${label} | ${value} |`);
  };

  push(`# ${title}`, "");
  push(
    `_Generated ${builtAt} · analysis engine ${data.meta.analysisVersion} · evidence map ${data.evidence.mappingVersion} · ${data.datasetType.toLowerCase()} dataset_`,
    "",
    `> ${data.datasetName} is **synthetic demonstration data** (${data.datasetLabel}). It is not research evidence and has not been clinically validated. Candidate discordance is a review prompt, not proof of laboratory error.`,
    ""
  );

  if (section("objective", "1. Study objective")) {
    push(
      "To measure agreement and candidate genotype–phenotype discordance between curated genomic determinants and submitted antimicrobial susceptibility test (AST) results in matched isolates, and to describe where any disagreement should be investigated first.",
      "",
      `- Primary analysis: ${data.meta.organism} × ${data.meta.antibiotic}.`,
      "- Analysis unit: one matched isolate–antibiotic pair. Repeated AST records for the same pair are collapsed only where categories agree; conflicting pairs are excluded and recorded.",
      "- Secondary analyses: the effect of metadata completeness and AST compatibility, whether screening-panel enforcement changes apparent agreement, and which candidate discordances merit review.",
      "- Hypotheses are tested, not assumed: no disagreement is described as laboratory failure without review."
    );
  }

  if (section("provenance", "2. Data and provenance")) {
    bulletTable([
      ["Dataset", data.datasetName],
      ["Type", `${data.datasetType} (${data.datasetLabel})`],
      ["Seed", data.seed],
      ["Generator", data.generatorVersion],
      ["Dataset generated", data.datasetGeneratedAt],
      ["Isolates / gene calls / AST rows", `${formatNumber(data.counts.isolates)} / ${formatNumber(data.counts.geneCalls)} / ${formatNumber(data.counts.astRows)}`],
      ["Unique isolate–drug pairs", formatNumber(data.counts.uniqueIsolateDrugPairs)],
      ["Eligible pairs (primary)", formatNumber(data.counts.eligiblePairs)],
      ["Indeterminate pairs", formatNumber(data.counts.indeterminatePairs)],
      ["Screening-panel enforcement", data.meta.requirePanel ? "on" : "off"],
      ["Evidence map", `${data.evidence.mappingVersion} (${formatNumber(data.evidence.contributing)} contributing of ${formatNumber(data.evidence.total)} rows; ${formatNumber(data.evidence.verified)} verified)`],
    ]);
    push("", "Reproducibility manifest: `/api/manifest` (JSON) and `public/demo/demo-manifest.json`.");
  }

  if (section("methods", "3. Methods")) {
    push(
      "The pipeline is deterministic and versioned; the AI layer is read-only and cannot alter calculations.",
      "",
      "1. **Import** with explicit column mapping; uploads are size- and row-limited and originals are retained.",
      "2. **Match** AST and gene records to isolates by exact identifier or BioSample accession (case/whitespace normalised). No organism- or name-based joins are performed; edit-distance suggestions require human confirmation and are logged separately.",
      "3. **Validate** identifiers, categories, duplicate conflicts and screening provenance. Each excluded record receives one primary reason.",
      "4. **Interpret** detected symbols against the versioned gene–drug evidence map. Only rows marked verified with established or strong evidence contribute; family-level prefixes match allele symbols.",
      "5. **Classify** binary S/R phenotypes against determinant status into concordant resistant, concordant susceptible, gene-positive/phenotype-susceptible (candidate), phenotype-resistant/no known determinant (candidate), or indeterminate.",
      "6. **Summarise** counts, proportions and Wilson score 95% confidence intervals. Proportions are reported with numerator and denominator; no CLSI/EUCAST categories are pooled without documented harmonisation.",
      "7. **Audit** every exclusion, mapping and run version is retained for reproduction."
    );
    push("", "Repeated pairs from the same isolate are not independent observations; confidence intervals describe pair-level proportions, not population prevalence.");
  }

  if (section("exclusions", "4. Matching and exclusions")) {
    push(
      `Of ${formatNumber(data.counts.uniqueIsolateDrugPairs)} unique isolate–antibiotic pairs, ${formatNumber(data.counts.eligiblePairs)} were eligible for the primary analysis and ${formatNumber(data.counts.indeterminatePairs)} were indeterminate.`,
      ""
    );
    if (data.exclusions.length === 0) {
      push("No records were excluded.");
    } else {
      push("| Exclusion reason | Count | Explanation |", "| --- | --- | --- |");
      for (const exclusion of data.exclusions) {
        push(`| ${EXCLUSION_LABELS[exclusion.reason] ?? exclusion.reason} | ${formatNumber(exclusion.count)} | ${exclusion.explanation} |`);
      }
    }
  }

  if (section("results", "5. Results")) {
    const summary = data.summary;
    push("### 5.1 Agreement");
    push(`Agreement between determinant status and binary AST category: **${est(summary.agreement)}**.`);
    push("", "### 5.2 Five-way classification", "");
    push("| Classification | Pairs | Proportion |", "| --- | --- | --- |");
    const rows: Array<[string, ProportionEstimate]> = [
      [CLASSIFICATION_META.concordant_resistant.label, summary.concordantResistant],
      [CLASSIFICATION_META.concordant_susceptible.label, summary.concordantSusceptible],
      [CLASSIFICATION_META.candidate_gene_positive_phenotype_susceptible.label, summary.candidateGenePositivePhenotypeSusceptible],
      [CLASSIFICATION_META.candidate_phenotype_resistant_no_known_determinant.label, summary.candidatePhenotypeResistantNoKnownDeterminant],
    ];
    for (const [label, estimate] of rows) push(`| ${label} | ${formatNumber(estimate.numerator)}/${formatNumber(estimate.denominator)} | ${estimate.proportion === null ? "—" : formatPct(estimate.proportion)} |`);
    push(`| Indeterminate (not in denominator) | ${formatNumber(data.counts.indeterminatePairs)} | — |`);
    push("", "### 5.3 Secondary measures", "");
    push(`- Determinant-positive predictive value for resistance: ${est(summary.determinantPositivePredictiveValue)}.`);
    push(`- Proportion resistant among determinant-negative pairs: ${est(summary.determinantNegativeResistantProportion)}.`);
    push("", "### 5.4 Agreement by antibiotic", "");
    push("| Antibiotic | Eligible | CR | CS | Gene+ / S | R / no determinant | Indeterminate | Agreement |", "| --- | --- | --- | --- | --- | --- | --- | --- |");
    for (const drug of data.byDrug) {
      push(
        `| ${drug.drug} | ${formatNumber(drug.eligible)} | ${formatNumber(drug.concordantResistant)} | ${formatNumber(drug.concordantSusceptible)} | ${formatNumber(drug.genePositiveSusceptible)} | ${formatNumber(drug.resistantNoKnownDeterminant)} | ${formatNumber(drug.indeterminate)} | ${drug.agreement === null ? "—" : formatPct(drug.agreement)} |`
      );
    }
  }

  if (section("discordance", "6. Candidate discordance")) {
    push(
      `There are ${formatNumber(data.summary.candidateGenePositivePhenotypeSusceptible.numerator)} gene-positive/phenotype-susceptible pairs and ${formatNumber(data.summary.candidatePhenotypeResistantNoKnownDeterminant.numerator)} phenotype-resistant/no known determinant pairs. These are candidates for review.`,
      ""
    );
    if (data.discordanceExamples.length === 0) {
      push("No eligible candidate-discordance pairs were observed in this dataset.");
    } else {
      push("| Isolate | Antibiotic | Phenotype | Detected determinants | Classification |", "| --- | --- | --- | --- | --- |");
      for (const pair of data.discordanceExamples) {
        push(
          `| ${pair.isolateId} | ${pair.antibiotic} | ${pair.phenotype} | ${pair.detectedGenes.join(", ") || "none detected"} | ${CLASSIFICATION_META[pair.classification].label} |`
        );
      }
      push("", "Review order: exact identifier/BioSample linkage → AST method, standard and measurement → screening-panel provenance → allele resolution → possible regulation or expression effects. A candidate discordance does not establish laboratory error.");
    }
  }

  if (section("interpretation", "7. Interpretation")) {
    const agreement = data.summary.agreement;
    push(
      agreement.proportion === null
        ? "Agreement was not estimable in this stratum because no pair met the inclusion rules."
        : `In this synthetic cohort, ${formatPct(agreement.proportion)} of ${formatNumber(agreement.denominator)} eligible pairs agreed between determinant status and binary AST category.`,
      "",
      `The ${formatNumber(data.summary.candidateGenePositivePhenotypeSusceptible.numerator)} gene-positive/susceptible pairs and ${formatNumber(data.summary.candidatePhenotypeResistantNoKnownDeterminant.numerator)} resistant/no-known-determinant pairs are review prompts, not verdicts.`,
      "",
      "- Agreement is descriptive concordance. It is not diagnostic accuracy, clinical validity or a measure of laboratory error.",
      "- Gene-positive/susceptible pairs may reflect gene expression, regulation, testing conditions, mixed breakpoints or an incomplete evidence map. None of these is established for a given pair without review.",
      "- Phenotype-resistant/no-known-determinant pairs may reflect uncurated or novel mechanisms, screening-panel gaps or resistance not captured by the submitted assay.",
      "- No causal or patient-level claim is made. Human review against the source record is required before any scientific or clinical interpretation."
    );
  }

  if (section("quality", "8. Data quality")) {
    const q = data.quality;
    bulletTable([
      ["Isolates / screened with panel provenance", `${formatNumber(q.genomes)} / ${formatNumber(q.screenedGenomes)}`],
      ["AST rows / unique pairs", `${formatNumber(q.astRows)} / ${formatNumber(q.uniquePairs)}`],
      ["Duplicate AST rows", formatNumber(q.duplicateRows)],
      ["Duplicate isolate identifiers", formatNumber(q.duplicateGenomes)],
      ["Missing interpretation", formatPct100(q.missingInterpretationPct)],
      ["Missing numeric measurement", formatPct100(q.missingMeasurementPct)],
      ["Missing interpretive standard", formatPct100(q.missingStandardPct)],
      ["Missing testing year", formatPct100(q.missingTestingYearPct)],
      ["Missing country (isolates)", formatPct100(q.missingCountryPct)],
      ["Missing collection date (isolates)", formatPct100(q.missingCollectionDatePct)],
    ]);
    push("", `- Interpretation standards observed: ${q.mixedStandards.map((entry) => `${entry.standard} (${formatNumber(entry.count)})`).join("; ") || "none recorded"}. Mixed standards are reported, not silently harmonised.`);
    push(`- AST methods observed: ${q.methods.map((entry) => `${entry.method} (${formatNumber(entry.count)})`).join("; ") || "none recorded"}.`);
  }

  if (section("limitations", "9. Limitations")) {
    push(
      `- The dataset is ${data.datasetLabel.toLowerCase()}. No finding here is research evidence.`,
      "- No clinical validation, diagnostic accuracy claim, regulatory certification or ethics approval is asserted.",
      "- Pairs sharing an isolate are not independent; intervals are pair-level descriptive summaries.",
      "- Detection is assay- and panel-dependent. Absence of a determinant is not proof of absence, and unresolved alleles are treated as indeterminate rather than susceptible.",
      "- Mixed interpretive standards and missing metadata limit comparability.",
      "- Candidate discordance can reflect linkage error, expression or regulation, incomplete databases, mixed breakpoints or data-entry problems; each requires review.",
      "- The AI layer drafts prose only; it cannot alter data, exclusions, classifications or statistics."
    );
  }

  if (section("references", "10. References")) {
    for (const citation of data.citations) {
      push(
        `- ${citation.authors} (${citation.year}). ${citation.title}. _${citation.journal}_.${citation.doi ? ` doi:${citation.doi}` : ""} [${citation.id}](${citation.url})`
      );
    }
    push("", `Verified citation library: ${formatNumber(data.citations.length)} entries supplied in this report. Unknown identifiers are rejected by the orchestrator.`);
  }

  if (drafts.length > 0) {
    push("", "## Appendix · AI-generated drafts (unverified)", "");
    push("The following text was produced by the AI assistant. It is a draft for human editing, not a result. Tool-derived evidence cards and deterministic tables remain authoritative.");
    for (const draft of drafts) {
      push("", `### ${draft.title}`, "");
      push(`_${draft.kind === "ai-draft" ? `AI draft · ${draft.mode ?? "unknown"} mode${draft.model ? ` · ${draft.model}` : ""} · ` : ""}${draft.createdAt}_`, "");
      push(draft.body);
      if (draft.citations && draft.citations.length > 0) {
        push("", `Citations: ${draft.citations.map((citation) => `[${citation.id}](${citation.url})`).join(", ")}`);
      }
      if (draft.limitations && draft.limitations.length > 0) {
        push("", "Limitations carried from the draft:");
        for (const limitation of draft.limitations) push(`- ${limitation}`);
      }
    }
  }

  return lines.join("\n") + "\n";
}

export function ReportBuilder({ data }: { data: ReportData }) {
  const [title, setTitle] = React.useState("Candidate genotype–phenotype discordance in synthetic Escherichia coli");
  const [enabled, setEnabled] = React.useState<Record<SectionId, boolean>>(() =>
    Object.fromEntries(SECTIONS.map((section) => [section.id, true])) as Record<SectionId, boolean>
  );
  const [builtAt, setBuiltAt] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [saved, setSaved] = React.useState<SavedDraft[]>([]);
  const [include, setInclude] = React.useState<string[]>([]);
  const [flash, setFlash] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as SavedDraft[];
      setSaved(Array.isArray(parsed) ? parsed : []);
    } catch {
      setSaved([]);
    }
  }, []);

  function persist(next: SavedDraft[]) {
    setSaved(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, 25)));
    } catch {
      // Storage may be unavailable; the UI still reflects the in-memory state.
    }
  }

  const includedDrafts = saved.filter((draft) => draft.kind === "ai-draft" && include.includes(draft.id));
  const markdown = React.useMemo(
    () => buildMarkdown({ data, title, enabled, drafts: includedDrafts, builtAt }),
    [data, title, enabled, includedDrafts, builtAt]
  );

  function download(name: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(markdown);
      setFlash("Copied report markdown.");
    } catch {
      setFlash("Clipboard unavailable in this browser.");
    }
    setTimeout(() => setFlash(null), 1800);
  }

  function saveReport() {
    const record: SavedDraft = {
      id: `report_${Date.now()}`,
      kind: "report",
      title,
      createdAt: new Date().toISOString(),
      body: markdown,
    };
    persist([record, ...saved]);
    setFlash("Report saved to this browser workspace.");
    setTimeout(() => setFlash(null), 1800);
  }

  function removeDraft(id: string) {
    persist(saved.filter((draft) => draft.id !== id));
    setInclude((current) => current.filter((entry) => entry !== id));
  }

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <div className="no-print space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-3.5 w-3.5 text-brand-600" /> Report configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="block text-[11px] font-medium text-ink">
              Report title
              <Input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 h-8 text-[12px]" maxLength={160} />
            </label>
            <label className="block text-[11px] font-medium text-ink">
              Build date
              <Input type="date" value={builtAt} onChange={(event) => setBuiltAt(event.target.value)} className="mt-1 h-8 text-[12px]" />
            </label>
            <div>
              <p className="mb-1 text-[11px] font-medium text-ink">Include sections</p>
              <div className="space-y-1">
                {SECTIONS.map((section) => (
                  <label key={section.id} className="flex items-start gap-2 rounded-md px-1 py-1 text-[11.5px] hover:bg-canvas">
                    <input
                      type="checkbox"
                      checked={enabled[section.id]}
                      onChange={(event) => setEnabled((current) => ({ ...current, [section.id]: event.target.checked }))}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-line text-brand-600"
                    />
                    <span>
                      <span className="font-medium text-ink">{section.label}</span>
                      <span className="block text-[10.5px] leading-snug text-muted">{section.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 border-t border-line pt-3">
              <Button size="sm" onClick={() => download(`amr-pulse-report-${builtAt}.md`, markdown, "text/markdown;charset=utf-8")}>
                <Download className="h-3.5 w-3.5" /> Markdown
              </Button>
              <Button variant="secondary" size="sm" onClick={copyReport}>
                <Clipboard className="h-3.5 w-3.5" /> Copy
              </Button>
              <Button variant="secondary" size="sm" onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5" /> Print / PDF
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => download(`amr-pulse-report-${builtAt}.json`, JSON.stringify({ title, builtAt, markdown, data }, null, 2), "application/json")}
              >
                <FileJson className="h-3.5 w-3.5" /> JSON
              </Button>
              <Button variant="subtle" size="sm" onClick={saveReport}>
                <Save className="h-3.5 w-3.5" /> Save
              </Button>
            </div>
            {flash ? <p className="text-[11px] text-ok-600">{flash}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-brand-600" /> Saved drafts
              </CardTitle>
              <p className="mt-0.5 text-[10.5px] text-muted">Browser-local only. AI drafts are appended in an unverified appendix.</p>
            </div>
            <Badge variant="neutral">{saved.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {saved.length === 0 ? (
              <p className="text-[11px] leading-relaxed text-muted">
                Nothing saved yet. Ask the assistant a question and use “Save draft to Reports”, or save the generated report above.
              </p>
            ) : (
              saved.map((draft) => (
                <div key={draft.id} className="rounded-lg border border-line bg-canvas/40 px-2.5 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[11.5px] font-medium text-ink">{draft.title}</p>
                      <p className="text-[10px] text-muted">
                        {new Date(draft.createdAt).toLocaleString()} · {draft.kind === "ai-draft" ? `AI draft${draft.mode ? ` (${draft.mode})` : ""}` : "Saved report"}
                      </p>
                    </div>
                    <button type="button" onClick={() => removeDraft(draft.id)} className="text-muted hover:text-danger-600" aria-label={`Delete ${draft.title}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {draft.kind === "ai-draft" ? (
                    <label className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-muted">
                      <input
                        type="checkbox"
                        checked={include.includes(draft.id)}
                        onChange={(event) =>
                          setInclude((current) => (event.target.checked ? [...current, draft.id] : current.filter((entry) => entry !== draft.id)))
                        }
                        className="h-3 w-3 rounded border-line text-brand-600"
                      />
                      Include as unverified appendix
                    </label>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Alert variant="warning" title="Before sharing">
          Remove synthetic-data artefacts only after substituting a real, cited dataset. Never describe this output as clinically validated, and do not pool CLSI/EUCAST categories without a documented rule.
        </Alert>
      </div>

      <div className="min-w-0">
        <Card id="report-preview" className="print-page">
          <CardHeader className="no-print">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-brand-600" /> Live report preview
              </CardTitle>
              <p className="mt-0.5 text-[10.5px] text-muted">Rendered from deterministic analysis output. {includedDrafts.length} AI draft(s) appended.</p>
            </div>
            <Badge variant="amber">Synthetic data</Badge>
          </CardHeader>
          <CardContent className="prose-report max-w-none px-6 py-6">
            <MarkdownLite text={markdown} className="prose-none text-[12.5px]" />
            <div className="mt-6 border-t border-line pt-3 text-[10.5px] leading-relaxed text-muted">
              <p>
                Engine {data.meta.analysisVersion} · evidence map {data.evidence.mappingVersion} · dataset seed {data.seed} · built {builtAt}.
              </p>
              <p className="mt-1 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-ok-600" /> All figures above are generated from the active dataset; none are simulated in the report builder.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
