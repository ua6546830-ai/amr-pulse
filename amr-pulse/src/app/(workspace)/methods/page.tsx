import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Download, FileJson, GitBranch, ShieldCheck } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionHeader, KeyValue } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { getDemoDataset } from "@/server/demo/load";
import { runAnalysis } from "@/lib/analysis/pipeline";
import { CITATIONS } from "@/lib/citations/library";
import { formatCi } from "@/lib/utils";

export const metadata: Metadata = { title: "Methods & Reproducibility" };

const PIPELINE = [
  { step: "Import", detail: "Tables are read with explicit column mapping. Uploads are size- and row-limited; conversion is server-validated and never mutates source strings." },
  { step: "Match", detail: "AST and gene records are linked to isolates by exact identifier or BioSample accession (case/whitespace normalised). No organism-name joins." },
  { step: "Validate", detail: "Deterministic rules record missing identifiers, invalid categories, absent screening provenance, conflicting duplicates and unsupported mappings." },
  { step: "Exclude", detail: "Each excluded record receives one primary reason and remains visible in the exclusion register with example identifiers." },
  { step: "Interpret", detail: "Curated, versioned gene–drug mappings determine whether a detected symbol is an established determinant for the organism and drug." },
  { step: "Classify", detail: "Binary phenotypes (S/R) are cross-tabulated against determinant status (detected / none detected / unresolved)." },
  { step: "Summarise", detail: "Counts, proportions and Wilson 95% intervals are computed per pair, with denominators that include excluded records in the audit." },
];

const CLASS_RULES = [
  { label: "Concordant resistant", rule: "Phenotype R AND a curated determinant was detected.", counts: true },
  { label: "Concordant susceptible", rule: "Phenotype S AND no curated determinant was detected, with documented screening provenance.", counts: true },
  { label: "Gene positive / phenotype susceptible", rule: "Phenotype S AND a curated determinant was detected. Candidate discordance.", counts: true },
  { label: "Phenotype resistant / no known determinant", rule: "Phenotype R AND no curated determinant was detected. Candidate discordance.", counts: true },
  { label: "Indeterminate", rule: "I, SDD or NS categories, unresolved determinant variants, or records that fail a required inclusion rule.", counts: false },
];

export default async function MethodsPage() {
  const demo = await getDemoDataset();
  const primary = runAnalysis({
    isolates: demo.isolates,
    geneCalls: demo.geneCalls,
    astResults: demo.ast,
    evidence: demo.evidence,
    options: { requirePanel: true, organism: "Escherichia coli", antibiotic: "ceftriaxone" },
  });
  const summary = primary.summary;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<Badge variant="outline">Methods</Badge>}
        title="Methods & reproducibility"
        description="The complete decision path from submitted record to reported proportion, including what is excluded, what is assumed and which version produced the result."
        actions={
          <>
            <a href="/api/manifest" download>
              <Button size="sm" variant="secondary"><FileJson className="h-3.5 w-3.5" /> Manifest JSON</Button>
            </a>
            <Link href="/reports">
              <Button size="sm">Report builder <ArrowRight className="h-3.5 w-3.5" /></Button>
            </Link>
          </>
        }
      />

      <Alert variant="info" title="Scope statement">
        AMR PULSE is research-support software. It does not provide diagnoses, treatment recommendations or resistance
        predictions for patient care, and it has not been validated or certified as a medical device. Analyses describe
        the loaded dataset; they do not validate any source database, breakpoint table or laboratory.
      </Alert>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-line bg-white p-4 shadow-card">
          <SectionHeader title="Dataset provenance" />
          <dl className="mt-1">
            <KeyValue label="Name" value={demo.manifest.datasetName} />
            <KeyValue label="Type" value={<Badge variant="amber">{demo.manifest.datasetType}</Badge>} />
            <KeyValue label="Seed" value={demo.manifest.seed} mono />
            <KeyValue label="Generated" value={new Date(demo.manifest.generatedAt).toISOString()} mono />
            <KeyValue label="Generator" value={`${demo.manifest.generatorScript} v${demo.manifest.generatorVersion}`} mono />
            <KeyValue label="Isolates" value={`${demo.manifest.counts.isolates}`} />
          </dl>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-card">
          <SectionHeader title="Analysis provenance" />
          <dl className="mt-1">
            <KeyValue label="Engine version" value={demo.analysis.meta.analysisVersion} mono />
            <KeyValue label="Evidence map" value={demo.analysis.meta.mappingVersion} mono />
            <KeyValue label="Run timestamp" value={new Date(demo.analysis.meta.generatedAt).toISOString()} mono />
            <KeyValue label="Panel required" value="true" mono />
            <KeyValue label="Standards pooling" value="none" mono />
            <KeyValue label="Imputation" value="none" mono />
          </dl>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-card">
          <SectionHeader title="Primary result denominators" />
          <dl className="mt-1">
            <KeyValue label="Eligible pairs" value={`${summary.eligiblePairs}`} />
            <KeyValue label="Agreement" value={`${summary.agreement.numerator}/${summary.agreement.denominator}`} mono />
            <KeyValue label="Agreement 95% CI" value={formatCi(summary.agreement.ci95)} />
            <KeyValue label="Indeterminate pairs" value={`${demo.primary.counts.indeterminatePairs}`} />
            <KeyValue label="Excluded AST rows" value={`${demo.primary.exclusions.reduce((acc, group) => acc + group.count, 0)}`} />
            <KeyValue label="Validation issues" value={`${demo.validation.issues.length}`} />
          </dl>
        </div>
      </div>

      <section className="rounded-xl border border-line bg-white p-4 shadow-card">
        <SectionHeader title="Deterministic pipeline" description="Every stage is implemented in TypeScript without external services; the AI layer is not in this path." />
        <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINE.map((stage, index) => (
            <li key={stage.step} className="rounded-lg border border-line bg-canvas/40 p-2.5">
              <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-ink">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-50 font-mono text-[9px] text-brand-700">{index + 1}</span>
                {stage.step}
              </p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-slate-600">{stage.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-3 lg:grid-cols-[1.15fr_1fr]">
        <section className="rounded-xl border border-line bg-white p-4 shadow-card">
          <SectionHeader title="Classification rules" description="Binary comparison only; all other states remain visible." />
          <Table className="mt-2">
            <THead>
              <tr>
                <TH>Class</TH>
                <TH>Rule</TH>
                <TH className="text-right">Denominator</TH>
              </tr>
            </THead>
            <TBody>
              {CLASS_RULES.map((rule) => (
                <TR key={rule.label}>
                  <TD className="whitespace-nowrap text-[11.5px] font-medium">{rule.label}</TD>
                  <TD className="text-[11px] leading-relaxed text-slate-600">{rule.rule}</TD>
                  <TD className="text-right text-[10.5px] text-muted">{rule.counts ? "included" : "excluded"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <p className="mt-2 text-[10.5px] leading-relaxed text-muted">
            Absence of a gene call is interpreted as &ldquo;none detected&rdquo; only when AMR screening provenance is documented. Otherwise
            the pair is excluded as <span className="font-mono">missing_genomic_panel</span>. Unresolved symbols (for example an
            unspecified <span className="font-mono">blaTEM</span> or <span className="font-mono">blaSHV</span> in an E. coli
            ceftriaxone comparison) produce an indeterminate pair.
          </p>
        </section>

        <section className="rounded-xl border border-line bg-white p-4 shadow-card">
          <SectionHeader title="Evidence map governance" description="Versioned, cited, organism-specific and drug-specific." />
          <ul className="mt-2 space-y-2 text-[11px] leading-relaxed text-slate-600">
            <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" /> Only mappings with <span className="font-mono">verification_status = verified</span> and evidence level <span className="font-mono">established</span> or <span className="font-mono">strong</span> contribute to a positive determinant call.</li>
            <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" /> An unknown or uncurated gene produces <span className="font-mono">no curated association</span>; it is never inferred as a novel mechanism.</li>
            <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" /> Family-level symbols match allele-level mappings by documented prefix rules (for example <span className="font-mono">blaCTX-M-15</span> against <span className="font-mono">blaCTX-M</span>).</li>
            <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" /> Every row records database, version, source URL, evidence level and mapping version. The current demo map has {demo.evidence.length} rows.</li>
          </ul>
          <dl className="mt-3 border-t border-line pt-2">
            <KeyValue label="Mapping version" value={demo.analysis.meta.mappingVersion} mono />
            <KeyValue label="Verification reviewed" value="2026-11-22" />
            <KeyValue label="Source libraries" value="AMRFinderPlus; CARD; ResFinder" />
          </dl>
        </section>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-white p-4 shadow-card">
          <SectionHeader title="Statistics" description="Descriptive, denominator-explicit and conservatively worded." />
          <ul className="mt-2 space-y-2 text-[11px] leading-relaxed text-slate-600">
            <li><span className="font-medium text-ink">Analysis unit:</span> a matched isolate–antibiotic pair. Multiple drugs per isolate share a genome and are not independent.</li>
            <li><span className="font-medium text-ink">Intervals:</span> Wilson score interval with z = 1.959963984540054. Proportions with a zero denominator are reported as not estimable.</li>
            <li><span className="font-medium text-ink">Agreement:</span> (concordant R + concordant S) / eligible pairs. No kappa is reported for the demo because margins are generated, not sampled.</li>
            <li><span className="font-medium text-ink">Determinant-positive predictive value:</span> concordant R / (concordant R + gene-positive susceptible). A data-quality ratio, not a clinical test characteristic.</li>
            <li><span className="font-medium text-ink">No pooling:</span> CLSI and EUCAST submissions are not merged into one breakpoint definition. No category is re-derived from a zone diameter or MIC.</li>
            <li><span className="font-medium text-ink">Sensitivity analyses:</span> organism strata, antibiotic strata and panel-required filtering are available through the analysis workspace and JSON export.</li>
          </ul>
        </section>

        <section className="rounded-xl border border-line bg-white p-4 shadow-card">
          <SectionHeader title="Missing data and duplicates" />
          <ul className="mt-2 space-y-2 text-[11px] leading-relaxed text-slate-600">
            <li><span className="font-medium text-ink">No imputation.</span> Missing categories are excluded with the reason <span className="font-mono">missing_ast_category</span>, not guessed.</li>
            <li><span className="font-medium text-ink">No silent deletions.</span> Every exclusion is recorded with a reason, a count and example record identifiers (capped at 50 per reason in the UI, full in the export).</li>
            <li><span className="font-medium text-ink">Duplicate observations.</span> One representative row is retained using a fixed preference rule: numeric measurement, broth/MIC/agar method, reported standard, testing year, breakpoint version. Disagreeing duplicates are excluded.</li>
            <li><span className="font-medium text-ink">Missingness is a result.</span> Measurement, standard, year, country and collection-date completeness are reported for the cohort, not discarded.</li>
          </ul>
        </section>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-xl border border-line bg-white p-4 shadow-card">
          <SectionHeader title="AI layer" description="Separate from all calculations." />
          <ul className="mt-2 space-y-2 text-[11px] leading-relaxed text-slate-600">
            <li>The scientific engine computes every result; the AI cannot edit raw data, exclusions, classifications or statistics.</li>
            <li>Agent tools are typed and read-only. Proposed column mappings require human approval and deterministic validation.</li>
            <li>Imported text is treated as untrusted. Prompt-injection attempts are ignored and never grant tool access.</li>
            <li>Citations are restricted to the verified library below. Unknown citation identifiers are rejected, not rendered.</li>
            <li>{demo.evidence.length > 0 ? "The AI runs with a deterministic, source-backed fallback when no provider is configured." : ""}</li>
          </ul>
          <Link href="/ai-workspace" className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-brand-700 hover:text-brand-800">
            Open AI workspace <ArrowRight className="h-3 w-3" />
          </Link>
        </section>

        <section className="rounded-xl border border-line bg-white p-4 shadow-card">
          <SectionHeader title="Data governance" />
          <ul className="mt-2 space-y-2 text-[11px] leading-relaxed text-slate-600">
            <li>The demo workspace contains no patient data. Isolates are fictional and labelled SYNTHETIC throughout the interface and exports.</li>
            <li>Users are warned not to upload identifiable patient data. The platform is not HIPAA/ISO-certified and no ethics approval is claimed.</li>
            <li>Secrets (AI keys, Supabase service role) are server-side only. The browser receives neither secret.</li>
            <li>Uploads are size- and row-limited, are not retained beyond the analysis session in demo mode, and can be deleted in a configured workspace.</li>
            <li>Research use of public isolate data remains subject to the source repository&apos;s terms and any local ethics guidance.</li>
          </ul>
        </section>
      </div>

      <section className="rounded-xl border border-line bg-white p-4 shadow-card">
        <SectionHeader title="Reproduce this result" description="Deterministic inputs, versions and commands." />
        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          <div className="rounded-lg bg-ink p-3 font-mono text-[10.5px] leading-relaxed text-slate-200">
            <p className="text-slate-400"># regenerate the synthetic demo (fixed seed)</p>
            <p>npm run demo:data</p>
            <p className="mt-1.5 text-slate-400"># verify the engine against the independent answer key</p>
            <p>npm run verify:demo</p>
            <p className="mt-1.5 text-slate-400"># full verification</p>
            <p>npm run typecheck &amp;&amp; npm test &amp;&amp; npm run build</p>
          </div>
          <div className="space-y-2">
            <dl>
              <KeyValue label="Dataset seed" value={demo.manifest.seed} mono />
              <KeyValue label="Generator version" value={demo.manifest.generatorVersion} mono />
              <KeyValue label="Analysis engine" value={demo.analysis.meta.analysisVersion} mono />
              <KeyValue label="Evidence map" value={demo.analysis.meta.mappingVersion} mono />
              <KeyValue label="Runtime" value={`node ${process.version}`} mono />
            </dl>
            <div className="flex flex-wrap gap-2">
              <a href="/api/manifest" download><Button size="sm" variant="secondary"><Download className="h-3.5 w-3.5" /> Download manifest</Button></a>
              <a href="/api/analysis/export?format=json" download><Button size="sm" variant="secondary"><GitBranch className="h-3.5 w-3.5" /> Full results JSON</Button></a>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-4 shadow-card">
        <SectionHeader title="Verified references" description="Resolved through Crossref and/or Europe PMC on 2026-11-22. Only these identifiers may be cited by the AI assistant." />
        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          {CITATIONS.map((citation) => (
            <div key={citation.id} className="rounded-lg border border-line p-2.5">
              <p className="text-[11px] font-medium leading-snug text-ink">{citation.title}</p>
              <p className="mt-0.5 text-[10.5px] text-muted">{citation.authors} · {citation.year} · {citation.journal}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="neutral">{citation.type}</Badge>
                <a href={citation.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 font-mono text-[10px] text-brand-700 hover:underline">
                  <BookOpen className="h-3 w-3" /> {citation.doi ?? "official page"}
                </a>
                <span className="inline-flex items-center gap-0.5 text-[9.5px] text-teal-700"><ShieldCheck className="h-3 w-3" /> verified</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
