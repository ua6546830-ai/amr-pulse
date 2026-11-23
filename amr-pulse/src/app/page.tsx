import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Check,
  Database,
  FileText,
  FlaskConical,
  GitCompare,
  Lock,
  Radar,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { Logo } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductPreview, type PreviewClassification } from "@/components/marketing/product-preview";
import { getDemoDataset } from "@/server/demo/load";
import { CLASSIFICATION_META, candidateDiscordanceCount } from "@/lib/presentation";
import { formatCi, formatNumber, formatPct } from "@/lib/utils";

export const metadata: Metadata = {
  title: "AMR PULSE — Understand genotype–phenotype gaps",
  description:
    "AMR PULSE connects bacterial genomic resistance determinants with antimicrobial susceptibility data to help researchers identify, investigate and understand genotype-phenotype discrepancies.",
};

const JOURNEY = [
  { label: "Upload", description: "Genomic determinants, AST results and panel provenance.", icon: UploadCloud },
  { label: "Validate", description: "A visual checklist of critical, warning and informational issues.", icon: ShieldCheck },
  { label: "Analyse", description: "Five-class comparison on one documented denominator.", icon: GitCompare },
  { label: "Investigate", description: "Genotype, phenotype and interpretation in one record view.", icon: Radar },
  { label: "Report", description: "Methods, limitations and provenance travel with every export.", icon: FileText },
];

const BENEFITS = [
  {
    icon: GitCompare,
    title: "A denominator you can defend",
    body: "Every counted pair passed a documented inclusion rule. Excluded records stay countable with their reason, and indeterminate results never inflate agreement.",
  },
  {
    icon: Radar,
    title: "Discordance without accusation",
    body: "Candidate findings are review prompts, not laboratory-error claims. The workspace separates plausible reporting or metadata problems from genuinely unresolved pairs.",
  },
  {
    icon: BookOpen,
    title: "Evidence you can trace",
    body: "Analysis version, evidence-map version, dataset seed and exclusion counts travel with the result — so another researcher can reproduce the same output.",
  },
];

const CAPABILITIES = [
  {
    icon: GitCompare,
    title: "Five-class comparison",
    body: "Concordant resistant, concordant susceptible, gene-positive/susceptible, resistant with no known determinant, and indeterminate — each with explicit numerator, denominator and interval.",
  },
  {
    icon: ShieldCheck,
    title: "Validation before analysis",
    body: "Missing panels, malformed accessions, conflicting categories and duplicate isolates surface as a checklist. Incomplete validation is never marked successful.",
  },
  {
    icon: Database,
    title: "Public-data adapters",
    body: "Separate importers for NCBI isolate metadata, AST Browser exports and AMRFinderPlus output. Exact accession matching only — no fuzzy joins.",
  },
  {
    icon: Activity,
    title: "Deterministic statistics",
    body: "Wilson confidence intervals, explicit denominators and repeated-observation awareness. Every figure on screen comes from the analysis pipeline.",
  },
  {
    icon: Sparkles,
    title: "AI that cites its inputs",
    body: "The assistant calls validated read-only tools, cites dataset and evidence versions, separates observation from hypothesis, and falls back transparently when no model is configured.",
  },
  {
    icon: FileText,
    title: "Reproducible reports",
    body: "Markdown, CSV and structured summaries with a machine-readable manifest: dataset, seed, engine, mapping version, exclusions and limitations.",
  },
];

const AI_QUESTIONS = [
  "Explain the detected discrepancies.",
  "Why might this isolate show resistance?",
  "Show the supporting scientific evidence.",
  "Identify possible explanations.",
  "Summarise the findings for my research report.",
];

export default async function LandingPage() {
  const demo = await getDemoDataset();
  const primary = demo.primary;
  const summary = primary.summary;
  const counts = {
    concordantResistant: summary.concordantResistant,
    concordantSusceptible: summary.concordantSusceptible,
    genePositiveSusceptible: summary.candidateGenePositivePhenotypeSusceptible,
    resistantNoDeterminant: summary.candidatePhenotypeResistantNoKnownDeterminant,
  };
  const candidate = candidateDiscordanceCount(summary);
  const excludedPairs = primary.exclusions.reduce((acc, group) => acc + group.count, 0);

  const previewClassifications: PreviewClassification[] = (
    ["concordant_resistant", "concordant_susceptible", "candidate_gene_positive_phenotype_susceptible", "candidate_phenotype_resistant_no_known_determinant"] as const
  ).map((key) => {
    const meta = CLASSIFICATION_META[key];
    const estimate =
      key === "concordant_resistant"
        ? summary.concordantResistant
        : key === "concordant_susceptible"
          ? summary.concordantSusceptible
          : key === "candidate_gene_positive_phenotype_susceptible"
            ? summary.candidateGenePositivePhenotypeSusceptible
            : summary.candidatePhenotypeResistantNoKnownDeterminant;
    return {
      key,
      label: meta.label,
      short: meta.short,
      count: estimate.numerator,
      pct: (estimate.proportion ?? 0) * 100,
      color: meta.color,
    };
  });

  const queue = [
    ...primary.discordances.filter((p) => p.classification === "candidate_gene_positive_phenotype_susceptible").slice(0, 2),
    ...primary.discordances.filter((p) => p.classification === "candidate_phenotype_resistant_no_known_determinant").slice(0, 2),
  ];

  const previewFindings = (queue.length ? queue : primary.discordances).slice(0, 3).map((pair) => ({
    id: pair.isolateId,
    antibiotic: pair.antibiotic,
    phenotype: pair.phenotype,
    genes: pair.detectedGenes,
    classification: pair.classification === "candidate_gene_positive_phenotype_susceptible" ? "Gene + / phenotype S" : "Phenotype R / no determinant",
    variant: (pair.classification === "candidate_gene_positive_phenotype_susceptible" ? "amber" : "red") as "amber" | "red",
  }));

  const previewDrugs = demo.analysis.byDrug
    .filter((d) => d.eligible >= 5 && d.agreement !== null)
    .sort((a, b) => b.eligible - a.eligible)
    .slice(0, 4)
    .map((d) => ({ name: d.drug, agreement: Math.round((d.agreement ?? 0) * 100), eligible: d.eligible }));

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-50 border-b border-line/80 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-5">
          <Logo href="/" />
          <nav className="hidden items-center gap-7 text-[12.5px] text-slate-600 lg:flex">
            <a href="#comparison" className="transition-colors hover:text-ink">Comparison model</a>
            <a href="#workflow" className="transition-colors hover:text-ink">How it works</a>
            <a href="#assistant" className="transition-colors hover:text-ink">AI assistant</a>
            <a href="#reproducibility" className="transition-colors hover:text-ink">Reproducibility</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/demo" className="hidden sm:block">
              <Button variant="ghost" size="sm">Live demonstration</Button>
            </Link>
            <Link href="/dashboard">
              <Button size="sm">
                Explore workspace <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute inset-0 bg-hero-aurora" />
          <div className="absolute inset-0 bg-grid-faint bg-grid [mask-image:radial-gradient(75%_60%_at_50%_0%,black,transparent)] opacity-60" />
        </div>
        <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-5 pb-16 pt-14 lg:grid-cols-[1.02fr_0.98fr] lg:pb-24 lg:pt-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-white/70 px-3 py-1 backdrop-blur">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-600" />
              </span>
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-navy-800">
                The future of scientific intelligence
              </span>
            </div>

            <h1 className="display mt-5 max-w-[620px] text-[38px] font-semibold leading-[1.08] text-ink sm:text-[48px] lg:text-[54px]">
              Understand the <span className="text-gradient">gaps</span> between genomic predictions and laboratory evidence.
            </h1>
            <p className="mt-5 max-w-[560px] text-[15px] leading-relaxed text-slate-600">
              AMR PULSE connects bacterial genomic resistance determinants with antimicrobial susceptibility data to help
              researchers identify, investigate and understand genotype-phenotype discrepancies.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/dashboard">
                <Button size="lg">
                  Explore Research Workspace <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button variant="secondary" size="lg">
                  View Live Demonstration
                </Button>
              </Link>
            </div>

            <ul className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11.5px] text-slate-600">
              {["No account required", "Deterministic analysis engine", "Synthetic cohort included"].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <BadgeCheck className="h-3.5 w-3.5 text-brand-600" /> {item}
                </li>
              ))}
            </ul>
          </div>

          <ProductPreview
            eligible={summary.eligiblePairs}
            indeterminate={primary.counts.indeterminatePairs}
            classifications={previewClassifications}
            findings={previewFindings}
            drugs={previewDrugs}
            engine={primary.meta.analysisVersion}
          />
        </div>

        <div className="relative border-y border-line/80 bg-white/50 backdrop-blur">
          <div className="mx-auto grid max-w-[1200px] grid-cols-2 divide-x divide-line/70 px-5 md:grid-cols-4">
            {[
              { label: "Eligible comparisons", value: formatNumber(summary.eligiblePairs), note: `/ ${formatNumber(primary.counts.uniqueIsolateDrugPairs)} matched pairs` },
              { label: "Agreement", value: formatPct(summary.agreement.proportion), note: `${formatCi(summary.agreement.ci95)}` },
              { label: "Candidate discordances", value: formatNumber(candidate), note: "review prompts, not errors" },
              { label: "Exclusions recorded", value: formatNumber(excludedPairs), note: "each with a stated reason" },
            ].map((stat) => (
              <div key={stat.label} className="px-4 py-5 first:pl-0 md:px-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{stat.label}</p>
                <p className="mt-1.5 font-mono text-[24px] font-semibold tabular-nums leading-none text-ink">{stat.value}</p>
                <p className="mt-1 text-[10.5px] text-faint">{stat.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-5 py-16 lg:py-20">
        <div className="grid gap-4 md:grid-cols-3">
          {BENEFITS.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div key={benefit.title} className="group relative overflow-hidden rounded-2xl border border-line bg-white p-6 shadow-card transition-shadow hover:shadow-lift">
                <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-brand-600/70 to-brand-600/0" />
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 ring-1 ring-brand-100">
                    <Icon className="h-5 w-5 text-brand-700" />
                  </span>
                  <span className="font-mono text-[10px] text-faint">0{index + 1}</span>
                </div>
                <h2 className="mt-4 text-[16px] font-semibold tracking-[-0.01em] text-ink">{benefit.title}</h2>
                <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600">{benefit.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="comparison" className="border-y border-line bg-white">
        <div className="mx-auto max-w-[1200px] px-5 py-16 lg:py-20">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mono-label">Comparison model</p>
              <h2 className="display mt-2 max-w-[680px] text-[28px] font-semibold leading-tight text-ink lg:text-[34px]">
                Five classes. One honest denominator.
              </h2>
              <p className="mt-3 max-w-[640px] text-[13.5px] leading-relaxed text-slate-600">
                Each eligible isolate–antibiotic pair lands in exactly one class below. Records that cannot support a
                binary comparison become indeterminate and are held outside the agreement denominator.
              </p>
            </div>
            <Link href="/analysis" className="inline-flex shrink-0 items-center gap-1.5 text-[12.5px] font-medium text-brand-700 hover:text-brand-800">
              Open the analysis <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {(
              [
                { key: "concordant_resistant", estimate: counts.concordantResistant },
                { key: "concordant_susceptible", estimate: counts.concordantSusceptible },
                { key: "candidate_gene_positive_phenotype_susceptible", estimate: counts.genePositiveSusceptible },
                { key: "candidate_phenotype_resistant_no_known_determinant", estimate: counts.resistantNoDeterminant },
              ] as const
            ).map(({ key, estimate }) => {
              const meta = CLASSIFICATION_META[key];
              return (
                <div key={key} className="relative overflow-hidden rounded-2xl border border-line bg-white p-4">
                  <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: meta.color }} />
                  <p className="mt-1 text-[12px] font-semibold leading-snug text-ink">{meta.label}</p>
                  <p className="mt-2.5 font-mono text-[26px] font-semibold tabular-nums leading-none text-ink">
                    {estimate.numerator}
                    <span className="ml-1.5 text-[11px] font-normal text-muted">({formatPct(estimate.proportion)})</span>
                  </p>
                  <p className="mt-1.5 text-[10px] text-muted">{formatCi(estimate.ci95)}</p>
                  <p className="mt-3 border-t border-line pt-2 text-[11px] leading-relaxed text-slate-600">{meta.description}</p>
                </div>
              );
            })}
            <div className="relative overflow-hidden rounded-2xl border border-dashed border-line-strong bg-canvas/60 p-4">
              <span className="absolute inset-x-0 top-0 h-[3px] bg-slate-300" />
              <p className="mt-1 text-[12px] font-semibold leading-snug text-ink">Indeterminate</p>
              <p className="mt-2.5 font-mono text-[26px] font-semibold tabular-nums leading-none text-ink">
                {primary.counts.indeterminatePairs}
                <span className="ml-1.5 text-[11px] font-normal text-muted">pairs</span>
              </p>
              <p className="mt-1.5 text-[10px] text-muted">not in the denominator</p>
              <p className="mt-3 border-t border-line pt-2 text-[11px] leading-relaxed text-slate-600">
                Intermediate, non-susceptible or unresolved determinant records tabled for review — never folded into
                concordance.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-[1200px] px-5 py-16 lg:py-20">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mono-label">How it works</p>
            <h2 className="display mt-2 text-[28px] font-semibold leading-tight text-ink lg:text-[34px]">
              From upload to defensible report.
            </h2>
            <p className="mt-3 max-w-[620px] text-[13.5px] leading-relaxed text-slate-600">
              The workspace follows the same five steps every time, so a first-time researcher and a reviewer see the
              same evidence trail.
            </p>
          </div>
          <Badge variant="teal">≈ 5 minutes with the demo cohort</Badge>
        </div>

        <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {JOURNEY.map((step, index) => {
            const Icon = step.icon;
            return (
              <Link
                key={step.label}
                href={index === 0 ? "/import" : index === 4 ? "/reports" : index === 3 ? "/investigations" : "/analysis"}
                className="group relative rounded-2xl border border-line bg-white p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-900/[0.04] ring-1 ring-line">
                    <Icon className="h-4 w-4 text-navy-800" />
                  </span>
                  <span className="font-mono text-[10px] text-faint">0{index + 1}</span>
                </div>
                <p className="mt-3 text-[13px] font-semibold text-ink">{step.label}</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-slate-600">{step.description}</p>
                <ArrowRight className="mt-3 h-3.5 w-3.5 text-faint transition-all group-hover:translate-x-0.5 group-hover:text-brand-700" />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-[1200px] px-5 py-16 lg:py-20">
          <div className="max-w-[720px]">
            <p className="mono-label">Capabilities</p>
            <h2 className="display mt-2 text-[28px] font-semibold leading-tight text-ink lg:text-[34px]">
              Built around the science, not the dashboard.
            </h2>
            <p className="mt-3 text-[13.5px] leading-relaxed text-slate-600">
              Each component makes one analytical step auditable: where a record came from, which rule was applied, what
              was excluded and why, and what the denominator actually represents.
            </p>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-line bg-white p-5 transition-colors hover:border-line-strong">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-canvas ring-1 ring-line">
                    <Icon className="h-4 w-4 text-brand-700" />
                  </span>
                  <h3 className="mt-3.5 text-[13.5px] font-semibold text-ink">{item.title}</h3>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-600">{item.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="assistant" className="mx-auto max-w-[1200px] px-5 py-16 lg:py-20">
        <div className="overflow-hidden rounded-3xl border border-ai/15 bg-white shadow-card">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
            <div className="p-7 lg:p-10">
              <Badge variant="ai">AI research assistant</Badge>
              <h2 className="display mt-4 max-w-[460px] text-[28px] font-semibold leading-tight text-ink lg:text-[34px]">
                Ask the question. See the evidence.
              </h2>
              <p className="mt-3 max-w-[500px] text-[13.5px] leading-relaxed text-slate-600">
                One assistant across the workspace, grounded in your selected dataset. It separates observation from
                hypothesis, cites the evidence map and dataset version, and labels deterministic answers instead of
                pretending a model is present.
              </p>
              <div className="mt-5 flex flex-wrap gap-1.5">
                {AI_QUESTIONS.map((question) => (
                  <span key={question} className="rounded-full border border-ai/15 bg-ai-soft/70 px-2.5 py-1 text-[10.5px] text-ai-deep">
                    {question}
                  </span>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Link href="/ai-workspace">
                  <Button size="sm">
                    <Sparkles className="h-3.5 w-3.5" /> Open the assistant
                  </Button>
                </Link>
                <Link href="/methods#ai" className="text-[11.5px] font-medium text-brand-700 hover:text-brand-800">
                  How the assistant is constrained
                </Link>
              </div>
            </div>

            <div className="relative border-t border-ai/10 bg-[radial-gradient(80%_80%_at_100%_0%,rgba(118,101,232,0.14),transparent_70%)] p-6 lg:border-l lg:border-t-0 lg:p-8">
              <div className="space-y-2.5">
                <div className="ml-auto max-w-[86%] rounded-2xl rounded-br-md bg-navy-900 px-3.5 py-2.5 text-[11px] leading-relaxed text-white">
                  Explain the detected discrepancies.
                </div>
                <div className="rounded-2xl rounded-bl-md border border-line bg-white/90 p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-ai-soft">
                      <Sparkles className="h-3 w-3 text-ai-deep" />
                    </span>
                    <span className="text-[10.5px] font-semibold text-ink">AMR PULSE assistant</span>
                    <Badge variant="neutral" className="ml-auto">Deterministic fallback</Badge>
                  </div>
                  <div className="mt-2.5 space-y-2 text-[10.5px] leading-relaxed text-slate-600">
                    <p>
                      <span className="font-semibold text-ink">Observation.</span> {candidate} of {summary.eligiblePairs}{" "}
                      eligible pairs are candidate discordances: {counts.genePositiveSusceptible.numerator} gene-positive with a
                      susceptible category and {counts.resistantNoDeterminant.numerator} resistant with no known determinant.
                    </p>
                    <p>
                      <span className="font-semibold text-ink">Evidence.</span> Classification uses curated gene–drug
                      mappings, submitted categories and screening provenance. Indeterminate records are excluded from the
                      denominator.
                    </p>
                    <p>
                      <span className="font-semibold text-ink">Caution.</span> A candidate discordance prompts review. It
                      does not establish laboratory error or a novel resistance mechanism.
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-2.5">
                    <span className="rounded-full border border-line bg-canvas px-2 py-0.5 text-[9px] text-muted">
                      Primary analysis · synthetic
                    </span>
                    <span className="rounded-full border border-line bg-canvas px-2 py-0.5 text-[9px] text-muted">
                      Map {primary.meta.mappingVersion}
                    </span>
                    <span className="rounded-full border border-line bg-canvas px-2 py-0.5 text-[9px] text-muted">
                      Engine {primary.meta.analysisVersion}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="reproducibility" className="relative overflow-hidden bg-navy-950 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_320px_at_15%_0%,rgba(66,184,213,0.16),transparent_65%),radial-gradient(600px_300px_at_90%_100%,rgba(118,101,232,0.18),transparent_65%)]" aria-hidden />
        <div className="relative mx-auto grid max-w-[1200px] gap-10 px-5 py-16 lg:grid-cols-[1fr_0.9fr] lg:py-20">
          <div>
            <Badge variant="dark" className="border-white/20 bg-white/10 text-teal-100">Reproducibility</Badge>
            <h2 className="display mt-4 max-w-[520px] text-[28px] font-semibold leading-tight lg:text-[34px]">
              Every export carries its own provenance.
            </h2>
            <p className="mt-3 max-w-[520px] text-[13.5px] leading-relaxed text-slate-300">
              The manifest is not an afterthought. Dataset type, seed, engine version, evidence-map version, counted
              exclusions and stated limitations are written into the analysis and its reports.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/methods">
                <Button variant="accent" size="sm">Read data &amp; methods</Button>
              </Link>
              <Link href="/reports">
                <Button variant="outline" size="sm" className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white">
                  See report formats
                </Button>
              </Link>
            </div>
          </div>
          <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {[
              { k: "Dataset", v: demo.manifest.datasetName, mono: false },
              { k: "Type", v: "Synthetic · demo", mono: false },
              { k: "Seed", v: String(demo.manifest.seed), mono: true },
              { k: "Analysis engine", v: primary.meta.analysisVersion, mono: true },
              { k: "Evidence map", v: primary.meta.mappingVersion, mono: true },
              { k: "Exclusions", v: `${excludedPairs} recorded pairs`, mono: false },
            ].map((row) => (
              <div key={row.k} className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3">
                <dt className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">{row.k}</dt>
                <dd className={`mt-1 truncate text-[11.5px] text-white ${row.mono ? "font-mono" : ""}`} title={row.v}>{row.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-[1200px] gap-3 px-5 py-14 md:grid-cols-3">
          {[
            { icon: FlaskConical, title: "Synthetic data, always labelled", body: "The demonstration cohort is fictional and fixed-seed. Every screen states it; no synthetic result is presented as a real-world observation." },
            { icon: Lock, title: "Research support, not a device", body: "No diagnosis, treatment advice or patient-level decision-making. Not HIPAA or ISO certified; no ethics approval is claimed." },
            { icon: Check, title: "No fabricated evidence", body: "Citations must resolve to a verified source. When a check cannot be completed, the platform says so rather than inventing a result." },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex gap-3 rounded-2xl border border-line bg-canvas/50 p-4">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-navy-800" />
                <div>
                  <p className="text-[12.5px] font-semibold text-ink">{item.title}</p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-slate-600">{item.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-5 py-16 text-center lg:py-20">
        <p className="mono-label">Start here</p>
        <h2 className="display mx-auto mt-2 max-w-[720px] text-[30px] font-semibold leading-tight text-ink lg:text-[38px]">
          Investigate the gap with a cohort you can inspect.
        </h2>
        <p className="mx-auto mt-3 max-w-[560px] text-[13.5px] leading-relaxed text-slate-600">
          The workspace opens on a synthetic demonstration dataset. Bring your own genomic and AST exports when you are
          ready to run the same pipeline on your study data.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard">
            <Button size="lg">Explore Research Workspace <ArrowRight className="h-4 w-4" /></Button>
          </Link>
          <Link href="/demo">
            <Button variant="secondary" size="lg">View Live Demonstration</Button>
          </Link>
        </div>
        <p className="mt-4 text-[10.5px] text-faint">Synthetic demonstration dataset · no upload required · no patient data</p>
      </section>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto max-w-[1200px] px-5 py-10">
          <div className="grid gap-8 md:grid-cols-[1.2fr_0.6fr_0.6fr_0.8fr]">
            <div>
              <Logo href="/" />
              <p className="mt-3 max-w-[300px] text-[11.5px] leading-relaxed text-muted">
                Research-support software for genotype–phenotype concordance in bacterial antimicrobial resistance.
                Synthetic demonstration data; not for clinical use.
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">Workspace</p>
              <ul className="mt-2.5 space-y-1.5 text-[11.5px] text-slate-600">
                <li><Link className="hover:text-ink" href="/dashboard">Overview</Link></li>
                <li><Link className="hover:text-ink" href="/import">New analysis</Link></li>
                <li><Link className="hover:text-ink" href="/investigations">Findings</Link></li>
                <li><Link className="hover:text-ink" href="/ai-workspace">AI assistant</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">Evidence</p>
              <ul className="mt-2.5 space-y-1.5 text-[11.5px] text-slate-600">
                <li><Link className="hover:text-ink" href="/methods">Data &amp; methods</Link></li>
                <li><Link className="hover:text-ink" href="/quality">Data quality</Link></li>
                <li><Link className="hover:text-ink" href="/reports">Reports</Link></li>
                <li><a className="hover:text-ink" href="https://github.com/ua6546830-ai/amr-pulse" target="_blank" rel="noreferrer">Source repository</a></li>
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">Developer</p>
              <p className="mt-2.5 text-[12px] font-medium text-ink">Uzair Ahmad</p>
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">Qoder · CEGA Buildathon 2026</p>
              <Link href="/demo" className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-brand-700 hover:text-brand-800">
                Run the 5-minute tour <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-2 border-t border-line pt-4 text-[10px] text-faint sm:flex-row sm:items-center sm:justify-between">
            <p>AMR PULSE · research-support platform · engine {primary.meta.analysisVersion}</p>
            <p>Synthetic demonstration dataset · no patient or surveillance data</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
