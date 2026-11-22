import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Database,
  FileText,
  FlaskConical,
  GitCompare,
  Layers,
  Microscope,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { Logo } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { getDemoDataset } from "@/server/demo/load";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "AMR PULSE — Geno–pheno research intelligence" };

const WORKFLOW = [
  { label: "Import", icon: Upload },
  { label: "Map", icon: Layers },
  { label: "Validate", icon: ShieldCheck },
  { label: "Analyse", icon: GitCompare },
  { label: "Investigate", icon: Microscope },
  { label: "Report", icon: FileText },
  { label: "Reproduce", icon: BookOpen },
];

const CAPABILITIES = [
  {
    icon: GitCompare,
    title: "Five-class comparison",
    body: "Every matched isolate–antibiotic pair receives a cautious classification, including indeterminate states when the record cannot support a call.",
  },
  {
    icon: ShieldCheck,
    title: "Data-quality first",
    body: "Missing panels, unmatched BioSamples, category conflicts and duplicates are surfaced as countable exclusions — never silently dropped.",
  },
  {
    icon: Database,
    title: "Public-data adapters",
    body: "Separate adapters for NCBI Isolates, NCBI AST Browser exports and AMRFinderPlus output. Exact accession matching only.",
  },
  {
    icon: Activity,
    title: "Deterministic statistics",
    body: "Wilson confidence intervals, explicit numerators and denominators, and repeated-observation awareness in every summary.",
  },
  {
    icon: Sparkles,
    title: "Agentic AI, audited",
    body: "The assistant calls validated read-only tools, proposes mappings for human approval and never mutates raw records or computed results.",
  },
  {
    icon: FileText,
    title: "Reproducible reports",
    body: "Analysis version, evidence-map version, seed and exclusion counts travel with every export as a machine-readable manifest.",
  },
];

export default async function LandingPage() {
  const demo = await getDemoDataset();
  const primary = demo.primary;
  const summary = primary.summary;
  const candidateDiscordance =
    summary.candidateGenePositivePhenotypeSusceptible.numerator +
    summary.candidatePhenotypeResistantNoKnownDeterminant.numerator;
  const excludedPairs = demo.primary.exclusions.reduce((acc, group) => acc + group.count, 0);

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <nav className="hidden items-center gap-6 text-[12px] text-slate-600 md:flex">
            <a href="#workflow" className="hover:text-ink">Workflow</a>
            <a href="#capabilities" className="hover:text-ink">Capabilities</a>
            <a href="#boundaries" className="hover:text-ink">Scientific boundaries</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[12px] font-medium text-white shadow-sm hover:bg-brand-700">
              Open demo <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <Badge variant="teal">Research infrastructure</Badge>
            <h1 className="mt-4 max-w-xl text-[34px] font-semibold leading-[1.12] tracking-tight text-ink lg:text-[42px]">
              Genotype–phenotype discordance, investigated properly.
            </h1>
            <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-slate-600">
              AMR PULSE compares known genomic resistance determinants with submitted antimicrobial susceptibility
              results, quantifies data-quality effects and separates genuine candidate discordance from metadata,
              reporting and interpretation problems.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <Link href="/dashboard" className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-[12.5px] font-medium text-white hover:bg-slate-800">
                Launch the demo workspace <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link href="/methods" className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-4 py-2 text-[12.5px] font-medium text-slate-700 hover:bg-canvas">
                Read the methods
              </Link>
            </div>
            <ul className="mt-7 grid max-w-xl grid-cols-1 gap-2 text-[11.5px] text-slate-600 sm:grid-cols-3">
              {["No account required", "Deterministic analysis engine", "Synthetic cohort included"].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <BadgeCheck className="h-3.5 w-3.5 text-teal-600" /> {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-line bg-white p-4 shadow-card">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <p className="mono-label">Primary analysis · synthetic</p>
                <p className="mt-0.5 text-[13px] font-semibold text-ink">E. coli × ceftriaxone</p>
              </div>
              <Badge variant="amber">DEMO</Badge>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <dt className="text-[10.5px] text-muted">Eligible pairs</dt>
                <dd className="tabular text-[20px] font-semibold text-ink">{formatNumber(summary.eligiblePairs)}</dd>
              </div>
              <div>
                <dt className="text-[10.5px] text-muted">Agreement</dt>
                <dd className="tabular text-[20px] font-semibold text-ink">
                  {summary.agreement.proportion === null ? "—" : `${Math.round(summary.agreement.proportion * 100)}%`}
                </dd>
              </div>
              <div>
                <dt className="text-[10.5px] text-muted">Candidate discordance</dt>
                <dd className="tabular text-[20px] font-semibold text-amber-700">{formatNumber(candidateDiscordance)}</dd>
              </div>
              <div>
                <dt className="text-[10.5px] text-muted">Indeterminate</dt>
                <dd className="tabular text-[20px] font-semibold text-slate-600">{formatNumber(primary.counts.indeterminatePairs)}</dd>
              </div>
            </dl>
            <div className="mt-3 space-y-1 border-t border-line pt-3 text-[10.5px] text-muted">
              <p>
                Denominator: {summary.eligiblePairs} pairs passing inclusion rules; {excludedPairs} exclusions recorded with reasons.
              </p>
              <p>Analysis engine {primary.meta.analysisVersion} · evidence map {primary.meta.mappingVersion}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-10">
          <p className="mono-label">Workflow</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {WORKFLOW.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className="flex items-center gap-2">
                  <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 shadow-sm">
                    <Icon className="h-3.5 w-3.5 text-brand-600" />
                    <span className="text-[12px] font-medium text-ink">{step.label}</span>
                  </div>
                  {index < WORKFLOW.length - 1 ? <ArrowRight className="h-3.5 w-3.5 text-slate-300" aria-hidden /> : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="capabilities" className="border-b border-line bg-white">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-[22px] font-semibold tracking-tight text-ink">Built around the science, not the dashboard</h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-slate-600">
            Each component exists to make one analytical step auditable: where a record came from, which rule was applied,
            what was excluded and why, and what the resulting denominator actually represents.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-xl border border-line bg-white p-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">
                    <Icon className="h-4 w-4 text-brand-600" />
                  </span>
                  <h3 className="mt-3 text-[13px] font-semibold text-ink">{item.title}</h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-slate-600">{item.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="boundaries" className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-14 lg:grid-cols-[1fr_1fr]">
          <div>
            <Badge variant="red">Scientific boundaries</Badge>
            <h2 className="mt-3 text-[22px] font-semibold tracking-tight text-ink">What this platform will not claim</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
              A missing gene call is not proof of phenotypic susceptibility, and a resistant phenotype without a known
              determinant is not a laboratory error. Both are investigation prompts. The platform never issues diagnoses,
              treatment advice or resistance predictions for patient care.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-white p-4">
            <div className="flex items-start gap-2.5">
              <FlaskConical className="mt-0.5 h-4 w-4 text-teal-600" />
              <div>
                <p className="text-[12.5px] font-medium text-ink">Research-support software</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-slate-600">
                  Designed for surveillance and genomic epidemiology research using public or de-identified isolate-level
                  data. Not validated as a medical device, not HIPAA/ISO certified, and not a substitute for reference
                  laboratory interpretation.
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4 text-[11px]">
              <p><span className="text-muted">Phenotype labels</span><br /><span className="font-medium text-ink">S / I / R / SDD / NS preserved</span></p>
              <p><span className="text-muted">Breakpoint pooling</span><br /><span className="font-medium text-ink">Not performed without a stated rule</span></p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <p>Research-support platform · synthetic demonstration data · no clinical use</p>
        </div>
      </footer>
    </div>
  );
}
