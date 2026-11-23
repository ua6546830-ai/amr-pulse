"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, Bot, CheckCircle2, FlaskConical, GitCompare, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatNumber } from "@/lib/utils";
import type { Classification } from "@/types/domain";

type DemoExample = {
  isolateId: string;
  antibiotic: string;
  phenotype: string;
  genes: string[];
  classification: Classification;
  label: string;
  pct: string;
};

export type DemoTourData = {
  organism: string;
  antibiotic: string;
  counts: { isolates: number; geneCalls: number; astRows: number; uniqueIsolateDrugPairs: number; eligiblePairs: number; indeterminatePairs: number };
  agreement: { numerator: number; denominator: number; pct: string; ci: string };
  classes: Array<{ key: Classification; label: string; short: string; count: number; pct: string; color: string; description: string }>;
  validation: { total: number; critical: number; warning: number; info: number };
  matching: { matched: number; total: number };
  examples: DemoExample[];
  versions: { analysis: string; mapping: string; seed: number; generator: string };
};

const STEPS = [
  { id: "problem", title: "The research problem", eyebrow: "Step 1 · why this matters" },
  { id: "import", title: "Upload and validation", eyebrow: "Step 2 · trustworthy inputs" },
  { id: "compare", title: "Genotype–phenotype comparison", eyebrow: "Step 3 · the comparison model" },
  { id: "discordance", title: "Discovering discordant records", eyebrow: "Step 4 · candidates for review" },
  { id: "assist", title: "AI-supported investigation and reporting", eyebrow: "Step 5 · evidence, not verdicts" },
] as const;

export function DemoTour({ data }: { data: DemoTourData }) {
  const [step, setStep] = React.useState(0);
  const current = STEPS[step];

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") setStep((value) => Math.min(STEPS.length - 1, value + 1));
      if (event.key === "ArrowLeft") setStep((value) => Math.max(0, value - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <div className="bg-navy-950 px-5 py-4 text-white">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-300/15 px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-amber-200">
            <FlaskConical className="h-3 w-3" /> Demonstration dataset · synthetic data
          </span>
          <span className="text-[10.5px] text-slate-300">
            {current.eyebrow} · about 5 minutes total
          </span>
          <span className="ml-auto font-mono text-[9.5px] text-slate-400">research support only · no clinical use</span>
        </div>
        <div className="mt-3 flex items-center gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1} aria-label="Demonstration progress">
          {STEPS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStep(index)}
              aria-label={`Go to step ${index + 1}: ${item.title}`}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                index < step ? "bg-[#5FE0C0]" : index === step ? "bg-white" : "bg-white/15 hover:bg-white/30"
              )}
            />
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="p-5 sm:p-6">
          <p className="mono-label">{current.eyebrow}</p>
          <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-ink">{current.title}</h2>
          <div className="mt-3 space-y-3 text-[12.5px] leading-relaxed text-slate-600">
            {step === 0 ? (
              <>
                <p>
                  Genomic screening reports which resistance determinants a bacterium carries. Laboratory AST reports whether it actually grew
                  in the presence of a drug. When the two disagree, the cause is not automatically known.
                </p>
                <p>
                  AMR PULSE connects curated gene calls with submitted susceptibility results at the level of one isolate–antibiotic pair, then
                  separates genuine agreement from <span className="font-medium text-ink">candidate discordance that needs a human investigator</span>.
                </p>
                <ul className="space-y-1.5">
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" /> Every record is linked by exact identifier or BioSample accession — never by organism name.</li>
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" /> Every exclusion is counted and explained, so the denominator stays honest.</li>
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" /> A disagreement is a review prompt, not a verdict of laboratory error.</li>
                </ul>
              </>
            ) : null}
            {step === 1 ? (
              <>
                <p>
                  The demo workspace ships with three linked tables — isolate metadata, curated gene calls and submitted AST results — plus a
                  versioned gene–drug evidence map. The guided import matches columns explicitly and never guesses a mapping.
                </p>
                <p>
                  Validation runs before any analysis. Critical issues block the affected pair; warnings remain visible with a stated limitation.
                  <span className="font-medium text-ink"> Incomplete validation is never presented as success.</span>
                </p>
                <ul className="space-y-1.5">
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" /> {formatNumber(data.matching.matched)} of {formatNumber(data.matching.total)} AST rows matched exactly.</li>
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" /> {formatNumber(data.validation.total)} issues recorded, each traceable to a record and field.</li>
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" /> No value is imputed, averaged or silently deleted.</li>
                </ul>
              </>
            ) : null}
            {step === 2 ? (
              <>
                <p>
                  Each eligible pair is placed into one of five positions: concordant resistant, concordant susceptible, gene-positive but
                  susceptible, resistant without a known determinant, or indeterminate. Only the first four share the agreement denominator.
                </p>
                <p>
                  In the primary stratum — <span className="italic">{data.organism}</span> × {data.antibiotic} — {formatNumber(data.agreement.denominator)} pairs
                  were eligible and agreement was {data.agreement.pct} ({formatNumber(data.agreement.numerator)}/{formatNumber(data.agreement.denominator)}; {data.agreement.ci}).
                  That is descriptive concordance, not diagnostic accuracy.
                </p>
                <ul className="space-y-1.5">
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" /> Indeterminate pairs stay outside the denominator and are reported separately.</li>
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" /> Wilson 95% intervals accompany every proportion.</li>
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" /> Pairs sharing an isolate are not independent observations.</li>
                </ul>
              </>
            ) : null}
            {step === 3 ? (
              <>
                <p>
                  Candidate discordance is the signal the platform exists to surface. Both directions are kept distinct: a detected determinant
                  with a susceptible phenotype, and a resistant phenotype with no known determinant.
                </p>
                <p>
                  Each candidate opens an investigation view with genotype, phenotype and interpretation side by side, the source AST record and a
                  structured checklist of possible explanations. Notes are session-only and never written back to the dataset.
                </p>
                <ul className="space-y-1.5">
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" /> {formatNumber(data.classes.find((entry) => entry.key === "candidate_gene_positive_phenotype_susceptible")?.count ?? 0)} gene-positive/susceptible pairs in the primary stratum.</li>
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" /> {formatNumber(data.classes.find((entry) => entry.key === "candidate_phenotype_resistant_no_known_determinant")?.count ?? 0)} resistant/no-known-determinant pairs.</li>
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" /> Filters cover organism, antibiotic, phenotype, determinant and review status.</li>
                </ul>
              </>
            ) : null}
            {step === 4 ? (
              <>
                <p>
                  The research assistant reads only validated tool outputs: counts, exclusions, evidence rows and provenance. It cannot change a
                  mapping, exclusion, classification or statistic — and it may cite only identifiers from the verified library.
                </p>
                <p>
                  With no provider key configured, answers are assembled deterministically and labelled as such. Reports are generated from the same
                  analysis output, with an interpretation section, limitations, reproducibility versions and references.
                </p>
                <ul className="space-y-1.5">
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" /> Every answer exposes its tool calls, evidence cards and citation IDs.</li>
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" /> Unknown citations are rejected; imported text cannot grant tool access.</li>
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" /> No diagnosis, treatment advice or dosing is produced.</li>
                </ul>
              </>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {step === 0 ? <Button asChild size="sm"><Link href="/dashboard">Open the research overview <ArrowRight className="h-3.5 w-3.5" /></Link></Button> : null}
            {step === 1 ? <Button asChild size="sm"><Link href="/import">Open the import workspace <ArrowRight className="h-3.5 w-3.5" /></Link></Button> : null}
            {step === 2 ? <Button asChild size="sm"><Link href="/analysis">Open analysis results <ArrowRight className="h-3.5 w-3.5" /></Link></Button> : null}
            {step === 3 ? <Button asChild size="sm"><Link href="/investigations">Open the investigation queue <ArrowRight className="h-3.5 w-3.5" /></Link></Button> : null}
            {step === 4 ? (
              <>
                <Button asChild size="sm"><Link href="/ai-workspace">Ask the assistant <ArrowRight className="h-3.5 w-3.5" /></Link></Button>
                <Button asChild size="sm" variant="secondary"><Link href="/reports">Build a report</Link></Button>
              </>
            ) : null}
          </div>
        </div>

        <aside className="border-t border-line bg-canvas/40 p-5 lg:border-l lg:border-t-0">
          <p className="mono-label">Live from the pipeline</p>
          {step === 0 ? (
            <dl className="mt-2 divide-y divide-line text-[11px]">
              {[
                ["Dataset", "Synthetic demonstration"],
                ["Isolates in primary stratum", formatNumber(data.counts.isolates)],
                ["Curated gene calls", formatNumber(data.counts.geneCalls)],
                ["Submitted AST rows", formatNumber(data.counts.astRows)],
                ["Unique isolate–drug pairs", formatNumber(data.counts.uniqueIsolateDrugPairs)],
                ["Primary pairing", `${data.organism} × ${data.antibiotic}`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-2 py-1.5">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-right font-mono text-[10.5px] text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {step === 1 ? (
            <div className="mt-2 space-y-3">
              <div className="grid grid-cols-3 gap-1.5">
                <div className="rounded-lg border border-danger-100 bg-danger-50/60 p-2.5 text-center">
                  <p className="font-mono text-lg tabular-nums text-danger-600">{data.validation.critical}</p>
                  <p className="text-[9.5px] uppercase tracking-wide text-muted">Critical</p>
                </div>
                <div className="rounded-lg border border-warn-100 bg-warn-50/60 p-2.5 text-center">
                  <p className="font-mono text-lg tabular-nums text-warn-700">{data.validation.warning}</p>
                  <p className="text-[9.5px] uppercase tracking-wide text-muted">Warning</p>
                </div>
                <div className="rounded-lg border border-line bg-white p-2.5 text-center">
                  <p className="font-mono text-lg tabular-nums text-ink">{data.validation.info}</p>
                  <p className="text-[9.5px] uppercase tracking-wide text-muted">Info</p>
                </div>
              </div>
              <div className="space-y-1.5 text-[11px]">
                <p className="flex items-center justify-between gap-2"><span className="text-muted">Exact matches</span><span className="font-mono text-ink">{formatNumber(data.matching.matched)} / {formatNumber(data.matching.total)}</span></p>
                <p className="flex items-center justify-between gap-2"><span className="text-muted">Issues recorded</span><span className="font-mono text-ink">{formatNumber(data.validation.total)}</span></p>
                <p className="flex items-center justify-between gap-2"><span className="text-muted">Auto-corrections</span><span className="font-mono text-ink">none</span></p>
              </div>
              <div className="rounded-lg border border-line bg-white p-2.5 text-[10.5px] leading-relaxed text-muted">
                <Upload className="mb-1 h-3.5 w-3.5 text-brand-600" />
                Start analysis stays disabled until critical issues are acknowledged. Warnings remain attached to the run.
              </div>
            </div>
          ) : null}
          {step === 2 ? (
            <div className="mt-2 space-y-1">
              {data.classes.map((entry) => (
                <div key={entry.key} className="flex items-center gap-2 rounded-lg bg-white px-2 py-2 text-[10.5px]">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: entry.color }} />
                  <span className="truncate text-muted">{entry.short}</span>
                  <span className="ml-auto shrink-0 font-mono tabular-nums text-ink">{entry.count} <span className="text-faint">{entry.pct}</span></span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-line px-2 pt-2 text-[10.5px] text-muted">
                <span>Indeterminate · excluded</span>
                <span className="font-mono tabular-nums text-ink">{formatNumber(data.counts.indeterminatePairs)}</span>
              </div>
              <div className="mt-2 rounded-lg bg-navy-950 px-3 py-2.5 text-white">
                <p className="text-[9.5px] uppercase tracking-[0.12em] text-slate-400">Agreement</p>
                <p className="mt-0.5 font-mono text-xl tabular-nums">{data.agreement.pct}</p>
                <p className="text-[10px] text-slate-400">{data.agreement.numerator}/{data.agreement.denominator} · {data.agreement.ci}</p>
              </div>
            </div>
          ) : null}
          {step === 3 ? (
            <div className="mt-2 space-y-2">
              {data.examples.map((example) => (
                <Link key={example.isolateId} href={`/isolates/${encodeURIComponent(example.isolateId)}`} className="group block rounded-lg border border-line bg-white p-2.5 transition-colors hover:border-brand-200">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10.5px] font-medium text-ink">{example.isolateId}</span>
                    <ArrowUpRight className="h-3 w-3 text-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-700" />
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted">{example.antibiotic} · phenotype {example.phenotype} · {example.genes.join(", ") || "no genes"}</p>
                  <p className="mt-1 text-[10.5px] font-medium text-ink">{example.label}</p>
                </Link>
              ))}
              <p className="text-[10px] leading-relaxed text-muted">Synthetic examples. Candidate discordance is a review prompt, never proof of laboratory error.</p>
            </div>
          ) : null}
          {step === 4 ? (
            <div className="mt-2 space-y-2">
              <div className="rounded-lg border border-line bg-white p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-ink"><Bot className="h-3.5 w-3.5 text-ai" /> Deterministic answer · provider not configured</p>
                <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
                  “Agreement in <span className="italic">{data.organism}</span> × {data.antibiotic} is {data.agreement.pct}
                  ({data.agreement.numerator}/{data.agreement.denominator}; {data.agreement.ci}). {formatNumber(
                    (data.classes.find((entry) => entry.key === "candidate_gene_positive_phenotype_susceptible")?.count ?? 0) +
                      (data.classes.find((entry) => entry.key === "candidate_phenotype_resistant_no_known_determinant")?.count ?? 0)
                  )} candidate pairs require review. This is descriptive concordance in synthetic data, not clinical validation.”
                </p>
              </div>
              <ul className="space-y-1 text-[10.5px] text-muted">
                <li className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-brand-600" /> Tool calls and citations shown with every answer</li>
                <li className="flex items-center gap-1.5"><GitCompare className="h-3 w-3 text-brand-600" /> Report sections include interpretation, limitations and versions</li>
              </ul>
              <div className="rounded-lg border border-warn-100 bg-warn-50/60 p-2.5 text-[10px] leading-relaxed text-warn-700">
                Engine {data.versions.analysis} · evidence map {data.versions.mapping} · seed {data.versions.seed}
              </div>
            </div>
          ) : null}
        </aside>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
        <div className="flex items-center gap-2 text-[10.5px] text-muted">
          <span className="font-mono">0{step + 1} / 05</span>
          <span className="hidden sm:inline">· use ← → keys to present</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}>
            <ArrowLeft className="h-3.5 w-3.5" /> Previous
          </Button>
          {step < STEPS.length - 1 ? (
            <Button size="sm" onClick={() => setStep((value) => Math.min(STEPS.length - 1, value + 1))}>
              Next step <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button size="sm" onClick={() => setStep(0)}>Restart tour</Button>
          )}
        </div>
      </div>
    </div>
  );
}
