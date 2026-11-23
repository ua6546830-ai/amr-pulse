import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FlaskConical, PlayCircle, ShieldCheck } from "lucide-react";
import { DemoTour, type DemoTourData } from "@/components/demo-tour";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionHeader, KeyValue } from "@/components/ui/page-header";
import { CLASSIFICATION_META } from "@/lib/presentation";
import { formatCi, formatNumber, formatPct } from "@/lib/utils";
import { getDemoDataset } from "@/server/demo/load";

export const metadata: Metadata = { title: "Guided demonstration" };
export const dynamic = "force-dynamic";

const ORDER = [
  "concordant_resistant",
  "concordant_susceptible",
  "candidate_gene_positive_phenotype_susceptible",
  "candidate_phenotype_resistant_no_known_determinant",
] as const;

export default async function DemoPage() {
  const demo = await getDemoDataset();
  const primary = demo.primary;
  const summary = primary.summary;

  const estimates = {
    concordant_resistant: summary.concordantResistant,
    concordant_susceptible: summary.concordantSusceptible,
    candidate_gene_positive_phenotype_susceptible: summary.candidateGenePositivePhenotypeSusceptible,
    candidate_phenotype_resistant_no_known_determinant: summary.candidatePhenotypeResistantNoKnownDeterminant,
  };

  const queue = [
    ...primary.discordances.filter((pair) => pair.classification === "candidate_gene_positive_phenotype_susceptible").slice(0, 2),
    ...primary.discordances.filter((pair) => pair.classification === "candidate_phenotype_resistant_no_known_determinant").slice(0, 2),
  ];

  const data: DemoTourData = {
    organism: primary.meta.organism,
    antibiotic: primary.meta.antibiotic,
    counts: primary.counts,
    agreement: {
      numerator: summary.agreement.numerator,
      denominator: summary.agreement.denominator,
      pct: formatPct(summary.agreement.proportion),
      ci: formatCi(summary.agreement.ci95),
    },
    classes: ORDER.map((key) => {
      const estimate = estimates[key];
      return {
        key,
        label: CLASSIFICATION_META[key].label,
        short: CLASSIFICATION_META[key].short,
        count: estimate.numerator,
        pct: formatPct(estimate.proportion),
        color: CLASSIFICATION_META[key].color,
        description: CLASSIFICATION_META[key].description,
      };
    }),
    validation: {
      total: demo.validation.issues.length,
      critical: demo.validation.bySeverity.critical,
      warning: demo.validation.bySeverity.warning,
      info: demo.validation.bySeverity.info,
    },
    matching: { matched: demo.matching.matched.length, total: demo.ast.length },
    examples: queue.map((pair) => ({
      isolateId: pair.isolateId,
      antibiotic: pair.antibiotic,
      phenotype: pair.phenotype,
      genes: pair.detectedGenes.slice(0, 3),
      classification: pair.classification,
      label: CLASSIFICATION_META[pair.classification].label,
      pct: CLASSIFICATION_META[pair.classification].short,
    })),
    versions: {
      analysis: primary.meta.analysisVersion,
      mapping: primary.meta.mappingVersion,
      seed: demo.manifest.seed,
      generator: demo.manifest.generatorVersion,
    },
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Demonstration</Badge>
            <Badge variant="amber">Synthetic data</Badge>
            <span className="text-[11px] text-muted">5 steps · about 5 minutes</span>
          </div>
        }
        title="Guided demonstration"
        description="A presenter-paced walkthrough of the full research loop — research problem, import and validation, genotype–phenotype comparison, candidate discordance, then AI-supported investigation and reporting."
        actions={
          <>
            <Button asChild variant="secondary" size="sm">
              <Link href="/dashboard">Exit to overview</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/import">
                <PlayCircle className="h-3.5 w-3.5" /> Start the live import
              </Link>
            </Button>
          </>
        }
      />

      <Alert variant="warning" title="Demonstration dataset · synthetic data">
        Every isolate in this tour is fictional. Values are produced by the real deterministic pipeline from synthetic inputs; they are
        not real-world clinical observations and must never be presented as such.
      </Alert>

      <DemoTour data={data} />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl border border-line bg-white p-4 shadow-card">
          <SectionHeader
            title="What the tour deliberately does not do"
            description="A short, honest boundary list for judges and reviewers."
          />
          <ul className="mt-2 space-y-2 text-[11.5px] leading-relaxed text-slate-600">
            <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" /> It does not present candidate discordance as laboratory error, contamination or a clinical finding.</li>
            <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" /> It does not claim diagnostic accuracy, clinical validation, regulatory certification or ethics approval.</li>
            <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" /> It does not invent references or use citation identifiers outside the verified library.</li>
            <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" /> It does not hide failed validation, exclusions or indeterminate results to make a number look better.</li>
            <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" /> It does not produce patient advice; the platform is research-support software only.</li>
          </ul>
        </section>

        <section className="rounded-xl border border-line bg-white p-4 shadow-card">
          <SectionHeader title="Dataset under demonstration" description="Reproducibility identifiers shown throughout the tour." />
          <dl className="mt-1">
            <KeyValue label="Dataset" value={demo.manifest.datasetName} />
            <KeyValue label="Type" value={<Badge variant="amber">{demo.manifest.datasetType}</Badge>} />
            <KeyValue label="Seed" value={demo.manifest.seed} mono />
            <KeyValue label="Generator" value={`${demo.manifest.generatorVersion}`} mono />
            <KeyValue label="Analysis engine" value={primary.meta.analysisVersion} mono />
            <KeyValue label="Evidence map" value={primary.meta.mappingVersion} mono />
            <KeyValue label="Stratum isolates / AST rows" value={`${formatNumber(primary.counts.isolates)} / ${formatNumber(primary.counts.astRows)}`} mono />
          </dl>
          <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
            <Button asChild variant="secondary" size="sm">
              <Link href="/methods"><FlaskConical className="h-3.5 w-3.5" /> Methods &amp; versions</Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link href="/reports">Reports <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
