import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Download, Microscope, ShieldAlert } from "lucide-react";
import { DiscordanceWorkbench } from "@/components/discordance-workbench";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat";
import { getDemoDataset } from "@/server/demo/load";
import { CLASSIFICATION_META, classificationCounts } from "@/lib/presentation";
import { formatNumber, formatPct } from "@/lib/utils";

export const metadata: Metadata = { title: "Discordance Investigation" };

export default async function InvestigationsPage() {
  const demo = await getDemoDataset();
  const analysis = demo.analysis;
  const counts = classificationCounts(analysis.summary);
  const candidates = analysis.discordances;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">Findings</Badge>
            <Badge variant="amber">Synthetic data</Badge>
            <span className="text-[11px] text-muted">all supported pairings</span>
          </div>
        }
        title="Discordance investigation"
        description="Triage every candidate discordant pair with a structured review. Filter by organism, antibiotic, determinant, phenotype or review status. The workbench records what a reviewer checked; it does not assign blame to a laboratory or assert a mechanism."
        actions={
          <>
            <a href="/api/analysis/export?resource=discordances&format=csv" download>
              <Button size="sm" variant="secondary"><Download className="h-3.5 w-3.5" /> Queue CSV</Button>
            </a>
            <Link href="/ai-workspace">
              <Button size="sm">Ask the assistant <ArrowRight className="h-3.5 w-3.5" /></Button>
            </Link>
          </>
        }
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Candidate discordant pairs"
          value={formatNumber(candidates.length)}
          denominator={`/ ${analysis.summary.eligiblePairs}`}
          hint="Counts both directions of disagreement."
          tone="warn"
          icon={AlertTriangle}
        />
        <StatCard
          label="Gene positive / phenotype S"
          value={formatNumber(counts.genePositiveSusceptible)}
          denominator={`/ ${analysis.summary.eligiblePairs}`}
          hint={formatPct(analysis.summary.candidateGenePositivePhenotypeSusceptible.proportion)}
          tone="warn"
          icon={ShieldAlert}
        />
        <StatCard
          label="Phenotype R / no determinant"
          value={formatNumber(counts.resistantNoDeterminant)}
          denominator={`/ ${analysis.summary.eligiblePairs}`}
          hint={formatPct(analysis.summary.candidatePhenotypeResistantNoKnownDeterminant.proportion)}
          tone="bad"
          icon={Microscope}
        />
        <StatCard
          label="Indeterminate pairs"
          value={formatNumber(analysis.counts.indeterminatePairs)}
          hint="Intermediate, SDD/NS or unresolved determinant symbols; held outside the binary comparison."
          icon={AlertTriangle}
        />
      </section>

      <Alert variant="warning" title="Candidate, not confirmed">
        A candidate gene-positive/susceptible pair can reflect gene silencing, an inoculum or reading error, a
        breakpoint update, a mixed culture, or an incorrect genome–AST linkage. A resistant phenotype with no curated
        determinant may be intrinsic, mutational, mediated by an uncurated gene, or a testing artefact. Each possibility
        is a hypothesis to test — not a conclusion.
      </Alert>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_320px]">
        <div>
          <SectionHeader
            title="Triage queue"
            description={`${candidates.length} candidate pairs ordered by source record. Select a row to open the structured review.`}
          />
          <div className="mt-2.5">
            <DiscordanceWorkbench pairs={candidates} />
          </div>
        </div>

        <aside className="space-y-3">
          <div className="rounded-xl border border-line bg-white p-4 shadow-card">
            <SectionHeader title="Triage order" description="Suggested, not enforced." />
            <ol className="mt-2 space-y-2 text-[11px] leading-relaxed text-slate-600">
              {[
                "Verify linkage: exact isolate and BioSample identifiers.",
                "Verify the AST standard, method, measurement and testing year.",
                "Verify the AMR panel and database version for the genome.",
                "Check allele-level resolution of the gene symbol.",
                "Check whether the organism–drug mapping is established at all.",
                "Only then consider biological explanations.",
              ].map((item, index) => (
                <li key={item} className="flex gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-50 font-mono text-[9px] text-brand-700">{index + 1}</span>
                  {item}
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-xl border border-line bg-white p-4 shadow-card">
            <SectionHeader title="Both directions matter" />
            <div className="mt-2 space-y-2 text-[11px] leading-relaxed text-slate-600">
              <p>
                <span className="font-medium text-ink">Gene + / phenotype S</span> asks whether the determinant is
                expressed or correctly interpreted, and whether the AST result is genuinely susceptible.
              </p>
              <p>
                <span className="font-medium text-ink">Phenotype R / no determinant</span> asks whether the mechanism is
                mutational, intrinsic, uncurated, or whether the isolate linkage is wrong.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-white p-4 shadow-card">
            <SectionHeader title="Definitions" />
            <div className="mt-2 space-y-1.5">
              {(Object.keys(CLASSIFICATION_META) as Array<keyof typeof CLASSIFICATION_META>)
                .filter((key) => key !== "indeterminate")
                .map((key) => (
                  <p key={key} className="text-[10.5px] leading-relaxed text-muted">
                    <span className="font-medium text-ink">{CLASSIFICATION_META[key].label}:</span> {CLASSIFICATION_META[key].description}
                  </p>
                ))}
            </div>
            <Link href="/methods" className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-brand-700 hover:text-brand-800">
              Full classification rules <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
