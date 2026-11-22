import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Download, FileJson, GitCompare, Microscope, Sigma } from "lucide-react";
import { AnalysisControls } from "@/components/analysis-controls";
import { PairsTable } from "@/components/tables/pairs-table";
import { Alert, EmptyState } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionHeader, KeyValue } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat";
import { Table, TBody, TD, TDFigure, TH, THead, TR } from "@/components/ui/table";
import { getDemoDataset } from "@/server/demo/load";
import { runAnalysis } from "@/lib/analysis/pipeline";
import { CLASSIFICATION_META, EXCLUSION_LABELS, classificationCounts } from "@/lib/presentation";
import { formatCi, formatNumber, formatPct } from "@/lib/utils";

export const metadata: Metadata = { title: "Geno–Pheno Analysis" };

const ALLOWED_ORGANISMS = ["Escherichia coli", "Klebsiella pneumoniae"];

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ organism?: string; antibiotic?: string }>;
}) {
  const demo = await getDemoDataset();
  const params = await searchParams;
  const organism = params.organism ?? "Escherichia coli";
  const antibiotic = params.antibiotic ?? "ceftriaxone";
  const selectedOrganism = organism === "all" ? "" : organism;
  const selectedAntibiotic = antibiotic === "all" ? "" : antibiotic;

  const analysis = runAnalysis({
    isolates: demo.isolates,
    geneCalls: demo.geneCalls,
    astResults: demo.ast,
    evidence: demo.evidence,
    options: { requirePanel: true, organism: selectedOrganism || undefined, antibiotic: selectedAntibiotic || undefined },
  });

  const summary = analysis.summary;
  const counts = classificationCounts(summary);
  const isPrimary = selectedOrganism === "Escherichia coli" && selectedAntibiotic === "ceftriaxone";
  const eligiblePairs = analysis.pairs.filter((pair) => pair.includedInPrimary);
  const distinctIsolates = new Set(eligiblePairs.map((pair) => pair.isolateId)).size;
  const excludedPairs = new Set(analysis.pairs.filter((pair) => !pair.includedInPrimary).map((pair) => `${pair.isolateId}||${pair.antibiotic}`)).size;
  const exportQuery = new URLSearchParams();
  if (selectedOrganism) exportQuery.set("organism", selectedOrganism);
  if (selectedAntibiotic) exportQuery.set("antibiotic", selectedAntibiotic);
  const qs = exportQuery.size > 0 ? `&${exportQuery.toString()}` : "";

  const contingency = [
    { label: "Determinant detected", r: counts.concordantResistant, s: counts.genePositiveSusceptible },
    { label: "No determinant detected", r: counts.resistantNoDeterminant, s: counts.concordantSusceptible },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">Analysis workspace</Badge>
            {isPrimary ? <Badge variant="blue">Primary pairing</Badge> : null}
            <Badge variant="amber">Synthetic data</Badge>
          </div>
        }
        title="Genotype–phenotype comparison"
        description="Five-class comparison between curated genomic determinants and submitted susceptibility categories, with every exclusion counted. Candidate discordance is an investigation prompt, not a verdict."
        actions={
          <>
            <a href={`/api/analysis/export?resource=pairs&format=csv${qs}`} download>
              <Button size="sm" variant="secondary"><Download className="h-3.5 w-3.5" /> Pairs CSV</Button>
            </a>
            <a href={`/api/analysis/export?format=json${qs}`} download>
              <Button size="sm" variant="secondary"><FileJson className="h-3.5 w-3.5" /> Results JSON</Button>
            </a>
            <Link href="/reports">
              <Button size="sm">Build report <ArrowRight className="h-3.5 w-3.5" /></Button>
            </Link>
          </>
        }
      />

      <AnalysisControls
        organisms={[...new Set(demo.isolates.map((iso) => iso.organism))].filter((name) => ALLOWED_ORGANISMS.includes(name))}
        drugs={[...new Set(demo.evidence.map((row) => row.drug))].sort()}
        selectedOrganism={selectedOrganism || "all"}
        selectedAntibiotic={selectedAntibiotic || "all"}
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-line bg-white px-3.5 py-2.5 text-[11px] text-muted shadow-card">
        <span><span className="text-slate-400">Organism</span> <span className="font-medium text-ink">{selectedOrganism || "All"}</span></span>
        <span><span className="text-slate-400">Antibiotic</span> <span className="font-medium capitalize text-ink">{selectedAntibiotic || "All mapped"}</span></span>
        <span><span className="text-slate-400">Panel required</span> <span className="font-medium text-ink">Yes</span></span>
        <span><span className="text-slate-400">Eligible pairs</span> <span className="font-medium text-ink">{summary.eligiblePairs}</span></span>
        <span className="ml-auto font-mono text-[10px]">run {analysis.meta.analysisVersion} · {new Date(analysis.meta.generatedAt).toISOString()}</span>
      </div>

      <section aria-label="Key statistics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Eligible pairs"
          value={formatNumber(summary.eligiblePairs)}
          denominator={`/ ${formatNumber(analysis.counts.uniqueIsolateDrugPairs)} pairs`}
          hint={`${distinctIsolates} distinct isolates; pairs are repeated observations, not independent isolates.`}
          tone="info"
          icon={Sigma}
        />
        <StatCard
          label="Agreement"
          value={formatPct(summary.agreement.proportion)}
          denominator={`(${summary.agreement.numerator}/${summary.agreement.denominator})`}
          hint={formatCi(summary.agreement.ci95)}
          tone="good"
          icon={GitCompare}
        />
        <StatCard
          label="Determinant-positive PPV"
          value={formatPct(summary.determinantPositivePredictiveValue.proportion)}
          denominator={`(${summary.determinantPositivePredictiveValue.numerator}/${summary.determinantPositivePredictiveValue.denominator})`}
          hint={`${formatCi(summary.determinantPositivePredictiveValue.ci95)} · not a clinical predictive value`}
          tone="warn"
          icon={AlertTriangle}
        />
        <StatCard
          label="Excluded pairs"
          value={formatNumber(excludedPairs)}
          denominator={`/ ${formatNumber(analysis.counts.uniqueIsolateDrugPairs)} pairs`}
          hint={`${analysis.counts.indeterminatePairs} indeterminate pairs; ${analysis.exclusions.reduce((acc, group) => acc + group.count, 0)} excluded AST records.`}
          icon={Microscope}
        />
      </section>

      {summary.eligiblePairs === 0 ? (
        <Alert variant="warning" title="Insufficient data for this stratum">
          No pair in the selected organism–antibiotic stratum met the inclusion rules. The platform does not compute a
          percentage from an empty denominator. Review the exclusions below or select another stratum.
        </Alert>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-xl border border-line bg-white p-4 shadow-card">
            <SectionHeader
              title="Contingency of paired observations"
              description="Binary positions only; indeterminate pairs are held outside this table."
            />
            <div className="mt-3">
              <Table>
                <THead>
                  <tr>
                    <TH className="w-40">Genomic evidence</TH>
                    <TH className="text-right">Phenotype R</TH>
                    <TH className="text-right">Phenotype S</TH>
                    <TH className="text-right">Row total</TH>
                  </tr>
                </THead>
                <TBody>
                  {contingency.map((row) => (
                    <TR key={row.label}>
                      <TD className="text-[11.5px]">{row.label}</TD>
                      <TDFigure>{row.r}</TDFigure>
                      <TDFigure>{row.s}</TDFigure>
                      <TDFigure className="text-muted">{row.r + row.s}</TDFigure>
                    </TR>
                  ))}
                  <TR className="bg-canvas/40">
                    <TD className="text-[11.5px] font-medium">Column total</TD>
                    <TDFigure className="font-semibold">{counts.concordantResistant + counts.resistantNoDeterminant}</TDFigure>
                    <TDFigure className="font-semibold">{counts.concordantSusceptible + counts.genePositiveSusceptible}</TDFigure>
                    <TDFigure className="font-semibold">{summary.eligiblePairs}</TDFigure>
                  </TR>
                </TBody>
              </Table>
            </div>
            <div className="mt-3 grid gap-2 text-[10.5px] leading-relaxed text-muted sm:grid-cols-2">
              <p><span className="font-medium text-ink">Agreement</span> = (concordant R + concordant S) / eligible pairs. Descriptive only.</p>
              <p><span className="font-medium text-ink">PPV here</span> = concordant R / (concordant R + gene-positive susceptible). A data-quality metric, not a diagnostic performance claim.</p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(CLASSIFICATION_META) as Array<keyof typeof CLASSIFICATION_META>).map((key) => {
              const meta = CLASSIFICATION_META[key];
              if (key === "indeterminate") {
                return (
                  <div key={key} className="rounded-xl border border-dashed border-line-strong bg-white p-3.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-medium text-muted">{meta.label}</p>
                      <Badge variant="neutral">{analysis.counts.indeterminatePairs}</Badge>
                    </div>
                    <p className="mt-2 text-[10.5px] leading-relaxed text-muted">{meta.description}</p>
                  </div>
                );
              }
              const estimate =
                key === "concordant_resistant" ? summary.concordantResistant :
                key === "concordant_susceptible" ? summary.concordantSusceptible :
                key === "candidate_gene_positive_phenotype_susceptible" ? summary.candidateGenePositivePhenotypeSusceptible :
                summary.candidatePhenotypeResistantNoKnownDeterminant;
              return (
                <div key={key} className="rounded-xl border border-line bg-white p-3.5 shadow-card">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] font-medium text-muted">{meta.label}</p>
                    <Badge variant={meta.variant}>{formatPct(estimate.proportion)}</Badge>
                  </div>
                  <p className="mt-2 font-mono text-xl font-semibold tabular-nums text-ink">
                    {estimate.numerator}<span className="text-[12px] font-normal text-muted"> / {estimate.denominator}</span>
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted">{formatCi(estimate.ci95)}</p>
                  <p className="mt-1.5 text-[10.5px] leading-relaxed text-slate-600">{meta.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <section>
        <SectionHeader
          title="Analysed isolate–antibiotic pairs"
          description={`${analysis.pairs.length} pairs, including indeterminate and excluded pairs. Filter by classification or search identifiers and genes.`}
        />
        <div className="mt-2.5">
          <PairsTable data={analysis.pairs} />
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-xl border border-line bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-line p-4">
            <SectionHeader
              title="Exclusions and indeterminate states"
              description="Record-level counts. A pair can contribute one record; unmatched rows are counted separately."
            />
            <a href={`/api/analysis/export?resource=exclusions&format=csv${qs}`} download className="text-[11px] font-medium text-brand-700 hover:text-brand-800">
              Export CSV
            </a>
          </div>
          {analysis.exclusions.length === 0 ? (
            <EmptyState title="No exclusions" description="Every screened record passed the inclusion rules." icon={GitCompare} />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Reason</TH>
                  <TH>Explanation</TH>
                  <TH className="text-right">Records</TH>
                </tr>
              </THead>
              <TBody>
                {analysis.exclusions.map((group) => (
                  <TR key={group.reason}>
                    <TD className="whitespace-nowrap text-[11.5px] font-medium">{EXCLUSION_LABELS[group.reason]}</TD>
                    <TD className="max-w-[360px] text-[11px] leading-relaxed text-slate-600">{group.explanation}</TD>
                    <TDFigure>{group.count}</TDFigure>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
          <p className="border-t border-line px-4 py-2 text-[10px] text-slate-400">
            Example identifiers are included in the CSV export. Exclusion is a transparency mechanism, not a judgment on laboratory quality.
          </p>
        </section>

        <div className="space-y-3">
          <div className="rounded-xl border border-line bg-white p-4 shadow-card">
            <SectionHeader title="Stratification" description="Agreement by antibiotic in the current organism stratum." />
            <Table className="mt-2">
              <THead>
                <tr>
                  <TH>Antibiotic</TH>
                  <TH className="text-right">Eligible</TH>
                  <TH className="text-right">Agreement</TH>
                </tr>
              </THead>
              <TBody>
                {analysis.byDrug.map((drug) => (
                  <TR key={drug.drug}>
                    <TD className="capitalize text-[11.5px]">{drug.drug}</TD>
                    <TDFigure>{drug.eligible}</TDFigure>
                    <TDFigure>{drug.agreement === null ? "—" : formatPct(drug.agreement)}</TDFigure>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          <div className="rounded-xl border border-line bg-white p-4 shadow-card">
            <SectionHeader title="Run provenance" description="Attach this block to any downstream report." />
            <dl className="mt-1">
              <KeyValue label="Analysis version" value={analysis.meta.analysisVersion} mono />
              <KeyValue label="Evidence map" value={analysis.meta.mappingVersion} mono />
              <KeyValue label="Generated" value={new Date(analysis.meta.generatedAt).toISOString()} mono />
              <KeyValue label="Panel required" value="true" mono />
              <KeyValue label="Organism filter" value={analysis.meta.organism} />
              <KeyValue label="Antibiotic filter" value={analysis.meta.antibiotic} />
              <KeyValue label="Dataset type" value="SYNTHETIC" />
            </dl>
          </div>
        </div>
      </div>

      <Alert variant="info" title="Interpretation guardrails">
        Agreement is a descriptive measure of this synthetic cohort. It is not a validation of AMRFinderPlus, CARD,
        ResFinder, CLSI or EUCAST, and it is not a measure of laboratory accuracy. A gene-positive/susceptible pair may
        reflect gene expression, phenotypic testing conditions, entry errors or an incomplete evidence map; each
        possibility requires review. Pairs sharing an isolate are not statistically independent.
      </Alert>
    </div>
  );
}
