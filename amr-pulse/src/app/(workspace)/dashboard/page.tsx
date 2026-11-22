import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Database,
  Download,
  FileText,
  FlaskConical,
  GitCompare,
  Microscope,
  ShieldCheck,
  Sigma,
} from "lucide-react";
import { AgreementDonut, ChartFrame, CompletenessChart, HorizontalBars, OrganismSplit, SimpleBars, StackedAstBars } from "@/components/charts/charts";
import { Alert, EmptyState } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, KeyValue, SectionHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat";
import { getDemoDataset } from "@/server/demo/load";
import {
  AST_CATEGORY_META,
  CLASSIFICATION_META,
  EXCLUSION_LABELS,
  candidateDiscordanceCount,
  classificationCounts,
  validationLabel,
} from "@/lib/presentation";
import { formatCi, formatNumber, formatPct } from "@/lib/utils";

export const metadata: Metadata = { title: "Research overview" };

export default async function DashboardPage() {
  const demo = await getDemoDataset();
  const primary = demo.primary;
  const summary = primary.summary;
  const counts = classificationCounts(summary);
  const candidate = candidateDiscordanceCount(summary);
  const excludedPairs = primary.counts.uniqueIsolateDrugPairs - primary.counts.eligiblePairs;
  const unmatchedRows = primary.exclusions.find((e) => e.reason === "unmatched_ast_isolate")?.count ?? 0;

  const drugMixMap = new Map<string, { drug: string; S: number; I: number; R: number; U: number }>();
  for (const row of demo.ast) {
    const key = row.antibiotic.trim();
    const entry = drugMixMap.get(key) ?? { drug: key, S: 0, I: 0, R: 0, U: 0 };
    const category = row.interpretationRaw.trim().toUpperCase();
    if (category === "S") entry.S += 1;
    else if (category === "I" || category === "SDD" || category === "NS") entry.I += 1;
    else if (category === "R") entry.R += 1;
    else entry.U += 1;
    drugMixMap.set(key, entry);
  }
  const drugMix = [...drugMixMap.values()]
    .sort((a, b) => b.S + b.I + b.R + b.U - (a.S + a.I + a.R + a.U))
    .slice(0, 7);

  const agreementByDrug = demo.analysis.byDrug
    .filter((d) => d.eligible >= 5 && d.agreement !== null)
    .slice(0, 7)
    .map((d) => ({ name: d.drug, value: Math.round((d.agreement ?? 0) * 100) }));

  const exclusionData = primary.exclusions.map((group) => ({
    name: EXCLUSION_LABELS[group.reason],
    value: group.count,
  }));

  const completeness = [
    { name: "Interpretable S/I/R category", value: 100 - demo.analysis.dataQuality.missingInterpretationPct },
    { name: "Numeric measurement", value: 100 - demo.analysis.dataQuality.missingMeasurementPct },
    { name: "Interpretation standard", value: 100 - demo.analysis.dataQuality.missingStandardPct },
    { name: "Testing year", value: 100 - demo.analysis.dataQuality.missingTestingYearPct },
    { name: "Country metadata", value: 100 - demo.analysis.dataQuality.missingCountryPct },
    { name: "Collection date", value: 100 - demo.analysis.dataQuality.missingCollectionDatePct },
  ];

  const organismData = demo.analysis.byOrganism.map((o) => ({ name: o.organism, value: o.isolates }));
  const validationData = demo.validation.byCode.slice(0, 6).map((c) => ({ name: validationLabel(c.code), value: c.count }));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">Workspace</Badge>
            <Badge variant="amber">Synthetic demo</Badge>
            <span className="text-[11px] text-muted">Primary pairing: E. coli × ceftriaxone</span>
          </div>
        }
        title="Research overview"
        description="Genotype–phenotype concordance across the active cohort. Every figure below is generated from the loaded dataset by the deterministic analysis engine; no values are hard-coded."
        actions={
          <>
            <Link href="/reports">
              <Button variant="secondary" size="sm"><FileText className="h-3.5 w-3.5" /> Reports</Button>
            </Link>
            <Link href="/analysis">
              <Button size="sm"><GitCompare className="h-3.5 w-3.5" /> Open analysis</Button>
            </Link>
          </>
        }
      />

      <Alert variant="warning" title="Synthetic demonstration dataset — not research evidence">
        The 220 isolates below are fictional (SYN- identifiers, fixed seed). They exist to exercise the platform
        end-to-end and to validate the analysis engine. Do not cite these numbers as findings.
      </Alert>

      <section aria-label="Key metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Eligible isolate–antibiotic pairs"
          value={formatNumber(summary.eligiblePairs)}
          denominator={`/ ${formatNumber(primary.counts.uniqueIsolateDrugPairs)} pairs`}
          hint="Pairs passing organism, screening-provenance, category and mapping rules."
          tone="info"
          icon={Sigma}
        />
        <StatCard
          label="Observed agreement"
          value={formatPct(summary.agreement.proportion)}
          denominator={`(${summary.agreement.numerator}/${summary.agreement.denominator})`}
          hint={`${formatCi(summary.agreement.ci95)} · not an accuracy estimate`}
          tone="good"
          icon={GitCompare}
        />
        <StatCard
          label="Candidate discordance"
          value={formatNumber(candidate)}
          denominator={`/ ${summary.eligiblePairs}`}
          hint={`${counts.genePositiveSusceptible} gene-positive/susceptible · ${counts.resistantNoDeterminant} resistant/no determinant`}
          tone="warn"
          icon={AlertTriangle}
        />
        <StatCard
          label="Pairs excluded with reason"
          value={formatNumber(excludedPairs)}
          denominator={`/ ${formatNumber(primary.counts.uniqueIsolateDrugPairs)} pairs`}
          hint={`Plus ${formatNumber(unmatchedRows)} AST row${unmatchedRows === 1 ? "" : "s"} without an exact isolate match.`}
          tone="default"
          icon={ShieldCheck}
        />
      </section>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-white px-3.5 py-2.5 text-[11px] text-muted shadow-card">
        <FlaskConical className="h-3.5 w-3.5 text-teal-600" />
        <span className="font-medium text-ink">Primary analysis context</span>
        <span className="text-slate-300">|</span>
        <span>Escherichia coli</span>
        <span className="text-slate-300">|</span>
        <span>ceftriaxone (3rd-generation cephalosporin)</span>
        <span className="text-slate-300">|</span>
        <span>AMR-panel-screened genomes required</span>
        <span className="text-slate-300">|</span>
        <span>Binary S/R categories only; I/SDD/NS reported separately</span>
        <span className="ml-auto font-mono text-[10px]">{primary.meta.analysisVersion} · {primary.meta.mappingVersion}</span>
      </div>

      <section className="grid gap-3 lg:grid-cols-3">
        <ChartFrame
          className="lg:col-span-2"
          title="Classification of eligible pairs"
          description={`Primary pairing · n = ${summary.eligiblePairs} eligible isolate–antibiotic pairs`}
          source="Source: synthetic demo dataset · analysis engine v1.0.0 · Wilson 95% intervals"
          height={250}
        >
          {summary.eligiblePairs === 0 ? (
            <EmptyState title="Insufficient data" description="No eligible pairs under the current inclusion rules." icon={Database} />
          ) : (
            <div className="grid h-full grid-cols-1 items-center gap-5 sm:grid-cols-[minmax(0,220px)_1fr]">
              <AgreementDonut counts={counts} />
              <div className="space-y-1">
                {(Object.keys(CLASSIFICATION_META) as Array<keyof typeof CLASSIFICATION_META>)
                  .filter((key) => key !== "indeterminate")
                  .map((key) => {
                    const meta = CLASSIFICATION_META[key];
                    const estimate =
                      key === "concordant_resistant" ? summary.concordantResistant :
                      key === "concordant_susceptible" ? summary.concordantSusceptible :
                      key === "candidate_gene_positive_phenotype_susceptible" ? summary.candidateGenePositivePhenotypeSusceptible :
                      summary.candidatePhenotypeResistantNoKnownDeterminant;
                    return (
                      <div key={key} className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-canvas">
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-[11.5px] font-medium text-ink">{meta.label}</p>
                            <p className="font-mono text-[11.5px] tabular-nums text-ink">
                              {estimate.numerator} <span className="text-muted">({formatPct(estimate.proportion)})</span>
                            </p>
                          </div>
                          <p className="text-[10px] text-muted">{formatCi(estimate.ci95)}</p>
                        </div>
                      </div>
                    );
                  })}
                <div className="mt-1 flex items-center justify-between border-t border-line px-2 pt-2 text-[10.5px] text-muted">
                  <span>Indeterminate, not in denominator</span>
                  <span className="font-mono tabular-nums text-ink">{primary.counts.indeterminatePairs}</span>
                </div>
              </div>
            </div>
          )}
        </ChartFrame>

        <ChartFrame
          title="Non-concordant outcomes"
          description="Candidate discordance and indeterminate pairs (counts)"
          source="Source: synthetic demo dataset · primary ceftriaxone analysis"
          height={250}
        >
          <HorizontalBars
            data={[
              { name: "Gene + / phenotype S", value: counts.genePositiveSusceptible },
              { name: "Phenotype R / no determinant", value: counts.resistantNoDeterminant },
              { name: "Indeterminate", value: primary.counts.indeterminatePairs },
            ]}
            color="#B45309"
          />
        </ChartFrame>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <ChartFrame
          title="Agreement by antibiotic"
          description="Demo cohort, all supported organism–antibiotic pairs with n ≥ 5"
          source="Source: synthetic demo dataset · unadjusted agreement, no breakpoint pooling"
          height={260}
        >
          {agreementByDrug.length === 0 ? (
            <EmptyState title="Insufficient data" description="No antibiotic has at least five eligible pairs." icon={Database} />
          ) : (
            <HorizontalBars data={agreementByDrug} suffix="%" color="#2563EB" />
          )}
        </ChartFrame>

        <ChartFrame
          title="Submitted AST category mix"
          description="Raw submitted categories before inclusion rules, by antibiotic"
          source="Source: synthetic demo dataset · intermediate, SDD and NS grouped as non-binary"
          height={260}
        >
          <StackedAstBars data={drugMix} />
        </ChartFrame>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <ChartFrame
          title="Excluded records by reason"
          description="Primary ceftriaxone cohort · row-level counts"
          source={`Source: analysis engine · ${primary.counts.astRows} ceftriaxone AST rows screened`}
          height={230}
        >
          {exclusionData.length === 0 ? (
            <EmptyState title="No exclusions" description="All screened records passed inclusion rules." icon={ShieldCheck} />
          ) : (
            <HorizontalBars data={exclusionData} color="#0891B2" />
          )}
        </ChartFrame>

        <ChartFrame
          title="Field completeness"
          description="Percentage of AST/isolate records with a usable value"
          source="Source: synthetic demo dataset · missingness is reported, never imputed"
          height={230}
        >
          <CompletenessChart data={completeness} />
        </ChartFrame>

        <ChartFrame
          title="Cohort composition"
          description="Isolates by organism (individual isolates, not pairs)"
          source="Source: synthetic demo dataset · n = 220 fictional isolates"
          height={230}
        >
          <OrganismSplit data={organismData} />
        </ChartFrame>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-line bg-white shadow-card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <SectionHeader title="Investigation queue" description="Candidate discordance pairs ordered by phenotype class" />
            <Link href="/investigations" className="inline-flex items-center gap-1 text-[11.5px] font-medium text-brand-700 hover:text-brand-800">
              Open queue <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11.5px]">
              <thead>
                <tr className="border-b border-line text-[10px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-2 font-medium">Isolate</th>
                  <th className="px-3 py-2 font-medium">Phenotype</th>
                  <th className="px-3 py-2 font-medium">Curated determinant</th>
                  <th className="px-3 py-2 font-medium">Classification</th>
                  <th className="px-3 py-2 font-medium">Standard</th>
                  <th className="px-4 py-2 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {primary.discordances.slice(0, 6).map((pair) => {
                  const meta = CLASSIFICATION_META[pair.classification];
                  return (
                    <tr key={`${pair.isolateId}-${pair.astRecordId}`} className="border-b border-line/70 last:border-0 hover:bg-canvas/60">
                      <td className="px-4 py-2 font-mono text-[11px] text-ink">{pair.isolateId}</td>
                      <td className="px-3 py-2"><Badge variant={AST_CATEGORY_META[pair.phenotype].variant}>{pair.phenotype}</Badge></td>
                      <td className="px-3 py-2 font-mono text-[10.5px] text-slate-600">
                        {pair.detectedGenes.length > 0 ? pair.detectedGenes.join(", ") : "none detected"}
                      </td>
                      <td className="px-3 py-2"><Badge variant={meta.variant}>{meta.short}</Badge></td>
                      <td className="px-3 py-2 text-[10.5px] text-muted">{pair.astStandard || "not reported"}</td>
                      <td className="px-4 py-2 text-right">
                        <Link href={`/isolates/${encodeURIComponent(pair.isolateId)}`} className="inline-flex items-center gap-1 font-medium text-brand-700 hover:text-brand-800">
                          Inspect <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="border-t border-line px-4 py-2 text-[10px] text-slate-400">
            Showing 6 of {primary.discordances.length} candidate discordant pairs. Candidate discordance is a review prompt, not a claim of laboratory error.
          </p>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-line bg-white p-4 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-[12.5px] font-semibold text-ink">Quality signals</p>
              <Link href="/quality" className="text-[11px] font-medium text-brand-700 hover:text-brand-800">Audit</Link>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="red">{demo.validation.bySeverity.critical} critical</Badge>
              <Badge variant="amber">{demo.validation.bySeverity.warning} warning</Badge>
              <Badge variant="neutral">{demo.validation.bySeverity.info} info</Badge>
            </div>
            <div className="mt-3">
              <SimpleBars data={validationData} height={150} />
            </div>
            <p className="mt-1 text-[10px] text-slate-400">Issue records across all demo tables; a record may raise more than one issue.</p>
          </div>

          <div className="rounded-xl border border-line bg-white p-4 shadow-card">
            <p className="text-[12.5px] font-semibold text-ink">Reproducibility snapshot</p>
            <dl className="mt-1">
              <KeyValue label="Dataset" value={demo.manifest.datasetName} />
              <KeyValue label="Type" value={<Badge variant="amber">{demo.manifest.datasetType}</Badge>} />
              <KeyValue label="Seed" value={demo.manifest.seed} mono />
              <KeyValue label="Engine" value={demo.analysis.meta.analysisVersion} mono />
              <KeyValue label="Evidence map" value={demo.analysis.meta.mappingVersion} mono />
            </dl>
            <div className="mt-3 flex gap-2">
              <Link href="/methods" className="flex-1">
                <Button variant="secondary" size="sm" className="w-full">Manifest</Button>
              </Link>
              <Link href="/reports" className="flex-1">
                <Button variant="secondary" size="sm" className="w-full"><Download className="h-3.5 w-3.5" /> Export</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-line bg-white p-4 shadow-card lg:col-span-2">
          <SectionHeader
            title="How to read these numbers"
            description="Interpretation limits that travel with every result."
          />
          <ul className="mt-3 grid gap-2 text-[11.5px] leading-relaxed text-slate-600 sm:grid-cols-2">
            <li className="rounded-lg border border-line bg-canvas/40 p-2.5">
              <span className="font-medium text-ink">Absence of detection is not absence of resistance.</span> A susceptible call with no determinant requires documented screening provenance before it can be counted.
            </li>
            <li className="rounded-lg border border-line bg-canvas/40 p-2.5">
              <span className="font-medium text-ink">&ldquo;Candidate discordance&rdquo; is deliberately cautious.</span> It flags pairs for review; it does not assert a laboratory error or a novel mechanism.
            </li>
            <li className="rounded-lg border border-line bg-canvas/40 p-2.5">
              <span className="font-medium text-ink">Repeated observations are not independent.</span> Multiple antibiotics per isolate share a genome; denominators count pairs, not organisms.
            </li>
            <li className="rounded-lg border border-line bg-canvas/40 p-2.5">
              <span className="font-medium text-ink">No breakpoint harmonisation.</span> CLSI and EUCAST submissions are reported separately because pooling was not justified for this dataset.
            </li>
          </ul>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-card">
          <SectionHeader title="Continue the workflow" description="Next steps in the research loop." />
          <div className="mt-3 space-y-1.5">
            {[
              { href: "/quality", label: "Audit data quality", icon: ShieldCheck },
              { href: "/analysis", label: "Review full comparison", icon: GitCompare },
              { href: "/investigations", label: "Triage discordant pairs", icon: Microscope },
              { href: "/ai-workspace", label: "Draft a research note", icon: FileText },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-2 text-[11.5px] text-slate-700 hover:border-line-strong hover:bg-canvas">
                  <Icon className="h-3.5 w-3.5 text-brand-600" /> {item.label}
                  <ArrowRight className="ml-auto h-3 w-3 text-slate-400" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
