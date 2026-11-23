import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  FileText,
  FlaskConical,
  GitCompare,
  PlayCircle,
  Radar,
  ShieldCheck,
  Sigma,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { AgreementDonut, ChartFrame, CompletenessChart, HorizontalBars, StackedAstBars } from "@/components/charts/charts";
import { Alert, EmptyState } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, KeyValue, SectionHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat";
import { getDemoDataset } from "@/server/demo/load";
import { CLASSIFICATION_META, candidateDiscordanceCount, classificationCounts, validationLabel } from "@/lib/presentation";
import { formatCi, formatNumber, formatPct } from "@/lib/utils";

export const metadata: Metadata = { title: "Research overview" };

export default async function DashboardPage() {
  const demo = await getDemoDataset();
  const primary = demo.primary;
  const summary = primary.summary;
  const counts = classificationCounts(summary);
  const candidate = candidateDiscordanceCount(summary);
  const excludedPairs = primary.counts.uniqueIsolateDrugPairs - primary.counts.eligiblePairs;

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

  const completeness = [
    { name: "Interpretable S/I/R category", value: 100 - demo.analysis.dataQuality.missingInterpretationPct },
    { name: "Numeric measurement", value: 100 - demo.analysis.dataQuality.missingMeasurementPct },
    { name: "Interpretation standard", value: 100 - demo.analysis.dataQuality.missingStandardPct },
    { name: "Testing year", value: 100 - demo.analysis.dataQuality.missingTestingYearPct },
    { name: "Country metadata", value: 100 - demo.analysis.dataQuality.missingCountryPct },
    { name: "Collection date", value: 100 - demo.analysis.dataQuality.missingCollectionDatePct },
  ];

  const topCodes = demo.validation.byCode.slice(0, 4);
  const severity = demo.validation.bySeverity;
  const totalIssues = severity.critical + severity.warning + severity.info;

  const queue = [
    ...primary.discordances.filter((p) => p.classification === "candidate_gene_positive_phenotype_susceptible").slice(0, 2),
    ...primary.discordances.filter((p) => p.classification === "candidate_phenotype_resistant_no_known_determinant").slice(0, 2),
  ];

  const recent = [
    {
      title: "Ceftriaxone × E. coli · primary",
      detail: `${formatNumber(summary.eligiblePairs)} eligible pairs · ${formatPct(summary.agreement.proportion)} agreement`,
      status: "Complete",
      href: "/analysis",
    },
    {
      title: "All-strata agreement summary",
      detail: `${formatNumber(demo.analysis.summary.eligiblePairs)} pairs across every supported stratum · ${formatPct(demo.analysis.summary.agreement.proportion)} agreement`,
      status: "Complete",
      href: "/analysis#all-strata",
    },
    {
      title: "Data-quality audit",
      detail: `${formatNumber(totalIssues)} issue records · ${severity.critical} critical`,
      status: "Reviewed",
      href: "/quality",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Research workspace</Badge>
            <Badge variant="amber">Synthetic demo</Badge>
            <span className="text-[11.5px] text-muted">Primary pairing · E. coli × ceftriaxone</span>
          </div>
        }
        title="Research overview"
        description="Genotype–phenotype concordance across the active cohort. Every figure is produced by the deterministic analysis engine from the loaded dataset — nothing is hard-coded."
        actions={
          <>
            <Link href="/demo">
              <Button variant="secondary" size="sm">
                <PlayCircle className="h-3.5 w-3.5" /> Demo tour
              </Button>
            </Link>
            <Link href="/analysis">
              <Button size="sm">
                <GitCompare className="h-3.5 w-3.5" /> Open analysis
              </Button>
            </Link>
          </>
        }
      />

      <Alert variant="warning" title="Synthetic demonstration dataset — not research evidence">
        The 220 isolates below are fictional (SYN- identifiers, fixed seed). They exercise the platform end-to-end;
        never cite these numbers as findings.
      </Alert>

      <section aria-label="Key metrics" className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Eligible comparisons"
          value={formatNumber(summary.eligiblePairs)}
          denominator={`/ ${formatNumber(primary.counts.uniqueIsolateDrugPairs)}`}
          hint="Matched isolate–antibiotic pairs passing every inclusion rule."
          tone="info"
          icon={Sigma}
        />
        <StatCard
          label="Agreement rate"
          value={formatPct(summary.agreement.proportion)}
          denominator={`(${summary.agreement.numerator}/${summary.agreement.denominator})`}
          hint={`${formatCi(summary.agreement.ci95)} · concordance, not accuracy`}
          tone="good"
          icon={GitCompare}
        />
        <StatCard
          label="Potential discordances"
          value={formatNumber(candidate)}
          denominator={`/ ${summary.eligiblePairs}`}
          hint={`${counts.genePositiveSusceptible} gene+/S · ${counts.resistantNoDeterminant} R/no determinant`}
          tone="warn"
          icon={TriangleAlert}
        />
        <StatCard
          label="Indeterminate results"
          value={formatNumber(primary.counts.indeterminatePairs)}
          denominator="pairs"
          hint={`Held outside the denominator · ${formatNumber(excludedPairs)} pairs excluded with a reason`}
          tone="default"
          icon={ShieldCheck}
        />
      </section>

      <section className="grid grid-cols-1 gap-3.5 xl:grid-cols-5">
        <ChartFrame
          className="xl:col-span-3"
          title="Genotype–phenotype agreement"
          description={`Five-class comparison of ${summary.eligiblePairs} eligible pairs`}
          source="Source: synthetic demo dataset · engine 1.0.0 · Wilson 95% intervals · indeterminate pairs excluded from the denominator"
          height={272}
        >
          {summary.eligiblePairs === 0 ? (
            <EmptyState title="Insufficient data" description="No eligible pairs under the current inclusion rules." />
          ) : (
            <div className="grid h-full min-w-0 grid-cols-1 items-center gap-6 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
              <AgreementDonut counts={counts} />
              <div className="min-w-0 space-y-1">
                {(Object.keys(CLASSIFICATION_META) as Array<keyof typeof CLASSIFICATION_META>)
                  .filter((key) => key !== "indeterminate")
                  .map((key) => {
                    const meta = CLASSIFICATION_META[key];
                    const estimate =
                      key === "concordant_resistant"
                        ? summary.concordantResistant
                        : key === "concordant_susceptible"
                          ? summary.concordantSusceptible
                          : key === "candidate_gene_positive_phenotype_susceptible"
                            ? summary.candidateGenePositivePhenotypeSusceptible
                            : summary.candidatePhenotypeResistantNoKnownDeterminant;
                    return (
                      <div key={key} className="flex items-start gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-canvas">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-[12px] font-medium text-ink">{meta.label}</p>
                            <p className="font-mono text-[12px] tabular-nums text-ink">
                              {estimate.numerator} <span className="text-muted">({formatPct(estimate.proportion)})</span>
                            </p>
                          </div>
                          <p className="text-[10.5px] text-muted">{formatCi(estimate.ci95)}</p>
                        </div>
                      </div>
                    );
                  })}
                <div className="mt-1 flex items-center justify-between border-t border-line px-2 pt-2.5 text-[11px] text-muted">
                  <span>Indeterminate · not in denominator</span>
                  <span className="font-mono tabular-nums text-ink">{primary.counts.indeterminatePairs}</span>
                </div>
              </div>
            </div>
          )}
        </ChartFrame>

        <div className="flex flex-col rounded-2xl border border-line bg-white shadow-card xl:col-span-2">
          <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-4">
            <div>
              <p className="text-[14.5px] font-semibold tracking-[-0.01em] text-ink">Findings requiring investigation</p>
              <p className="mt-1 text-[12px] text-muted">Candidate pairs, ranked by phenotype class</p>
            </div>
            <Link href="/investigations" className="inline-flex shrink-0 items-center gap-1 text-[11.5px] font-medium text-brand-700 hover:text-brand-800">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <ul className="divide-y divide-line">
            {queue.map((pair) => {
              const meta = CLASSIFICATION_META[pair.classification];
              return (
                <li key={`${pair.isolateId}-${pair.astRecordId}`}>
                  <Link
                    href={`/isolates/${encodeURIComponent(pair.isolateId)}`}
                    className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-canvas/70"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-canvas font-mono text-[10px] font-semibold text-navy-800 ring-1 ring-line">
                      {pair.phenotype}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-[11.5px] text-ink">{pair.isolateId}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-muted">
                        {pair.detectedGenes.length ? pair.detectedGenes.join(", ") : "no determinant detected" } · {pair.antibiotic}
                      </span>
                    </span>
                    <Badge variant={meta.variant}>{meta.short}</Badge>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-faint transition-colors group-hover:text-brand-700" />
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-auto border-t border-line px-5 py-3">
            <p className="text-[10.5px] leading-relaxed text-faint">
              Showing {queue.length} of {primary.discordances.length}. Candidate discordance is a review prompt, not a laboratory-error claim.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <ChartFrame
          title="Agreement by antibiotic"
          description="Demo cohort · all supported pairs with n ≥ 5"
          source="Source: synthetic demo dataset · unadjusted agreement, no breakpoint pooling"
          height={250}
        >
          {agreementByDrug.length === 0 ? (
            <EmptyState title="Insufficient data" description="No antibiotic has at least five eligible pairs." />
          ) : (
            <HorizontalBars data={agreementByDrug} suffix="%" color="#12A985" />
          )}
        </ChartFrame>

        <ChartFrame
          title="Submitted AST category mix"
          description="Raw submitted categories before inclusion rules"
          source="Source: synthetic demo dataset · intermediate, SDD and NS grouped as non-binary"
          height={250}
        >
          <StackedAstBars data={drugMix} />
        </ChartFrame>
      </section>

      <section className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
          <SectionHeader title="Data-quality summary" description={`${formatNumber(totalIssues)} issue records across all demo tables`} />
          <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-line">
            <span style={{ width: `${(severity.critical / Math.max(1, totalIssues)) * 100}%` }} className="bg-danger-600" />
            <span style={{ width: `${(severity.warning / Math.max(1, totalIssues)) * 100}%` }} className="bg-warn-600/80" />
            <span style={{ width: `${(severity.info / Math.max(1, totalIssues)) * 100}%` }} className="bg-sci-cyan/70" />
          </div>
          <ul className="mt-4 space-y-2">
            {topCodes.map((code) => (
              <li key={code.code} className="flex items-center justify-between gap-2 text-[11.5px]" title={code.code}>
                <span className="truncate text-muted">{validationLabel(code.code)}</span>
                <span className="font-mono tabular-nums text-ink">{code.count}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
            <div className="flex gap-1.5">
              <Badge variant="red">{severity.critical} critical</Badge>
              <Badge variant="amber">{severity.warning} warning</Badge>
            </div>
            <Link href="/quality" className="text-[11.5px] font-medium text-brand-700 hover:text-brand-800">Audit</Link>
          </div>
        </div>

        <ChartFrame
          title="Field completeness"
          description="Records with a usable value"
          source="Source: synthetic demo dataset · missingness reported, never imputed"
          height={228}
        >
          <CompletenessChart data={completeness} />
        </ChartFrame>

        <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
          <div className="flex items-start justify-between gap-2">
            <SectionHeader title="Reproducibility snapshot" description="Versions travel with every export." />
            <BookOpen className="h-4 w-4 text-faint" />
          </div>
          <dl className="mt-2">
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
              <Button size="sm" className="w-full"><FileText className="h-3.5 w-3.5" /> Export</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
        <div className="rounded-2xl border border-line bg-white shadow-card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <SectionHeader title="Recent analyses" description="Most recent work in this workspace" />
            <Badge variant="teal">Demo seed 20261122</Badge>
          </div>
          <ul className="divide-y divide-line">
            {recent.map((item) => (
              <li key={item.title}>
                <Link href={item.href} className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-canvas/70">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 ring-1 ring-brand-100">
                    <CheckCircle2 className="h-4 w-4 text-brand-700" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium text-ink">{item.title}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted">{item.detail}</span>
                  </span>
                  <Badge variant="green">{item.status}</Badge>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-faint group-hover:text-brand-700" />
                </Link>
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-5 py-3 text-[10.5px] text-faint">
            Synthetic benchmark runs · 22 Nov 2026 · generated from seed 20261122. Not real surveillance activity.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
          <SectionHeader title="Continue the research loop" description="Every step reuses the same validated denominator." />
          <div className="mt-3 space-y-1.5">
            {[
              { href: "/import", label: "Start a new analysis", icon: Sigma },
              { href: "/quality", label: "Review data quality", icon: ShieldCheck },
              { href: "/investigations", label: "Triage findings", icon: Radar },
              { href: "/ai-workspace", label: "Ask the AI assistant", icon: Sparkles },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2.5 rounded-xl border border-line px-3 py-2.5 text-[12px] text-slate-700 transition-colors hover:border-line-strong hover:bg-canvas"
                >
                  <Icon className="h-4 w-4 text-brand-600" /> {item.label}
                  <ArrowRight className="ml-auto h-3.5 w-3.5 text-faint" />
                </Link>
              );
            })}
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-canvas p-3 text-[10.5px] leading-relaxed text-muted">
            <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
            Research-support platform. No patient-level data, no clinical decision-making.
          </div>
        </div>
      </section>

      <details className="group rounded-2xl border border-line bg-white px-5 py-4 shadow-card">
        <summary className="flex cursor-pointer items-center justify-between gap-3 text-[13px] font-semibold text-ink">
          How to read these numbers
          <span className="text-[11px] font-normal text-faint group-open:hidden">4 interpretation limits</span>
        </summary>
        <ul className="mt-3 grid grid-cols-1 gap-2 text-[12px] leading-relaxed text-slate-600 sm:grid-cols-2">
          <li className="rounded-xl border border-line bg-canvas/50 p-3">
            <span className="font-medium text-ink">Absence of detection is not absence of resistance.</span> A susceptible call with no determinant requires documented screening provenance.
          </li>
          <li className="rounded-xl border border-line bg-canvas/50 p-3">
            <span className="font-medium text-ink">&ldquo;Candidate discordance&rdquo; is deliberately cautious.</span> It flags pairs for review, not a laboratory error or novel mechanism.
          </li>
          <li className="rounded-xl border border-line bg-canvas/50 p-3">
            <span className="font-medium text-ink">Repeated observations are not independent.</span> Denominators count isolate–antibiotic pairs, not organisms.
          </li>
          <li className="rounded-xl border border-line bg-canvas/50 p-3">
            <span className="font-medium text-ink">No breakpoint harmonisation.</span> CLSI and EUCAST submissions are reported separately; pooling was not justified.
          </li>
        </ul>
      </details>
    </div>
  );
}
