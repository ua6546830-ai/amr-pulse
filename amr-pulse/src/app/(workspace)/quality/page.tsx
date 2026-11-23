import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Download, Link2, ShieldCheck, Sigma } from "lucide-react";
import { ChartFrame, CompletenessChart } from "@/components/charts/charts";
import { IssuesTable } from "@/components/tables/issues-table";
import { MatchReview } from "@/components/match-review";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionHeader, KeyValue } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat";
import { getDemoDataset } from "@/server/demo/load";
import { validationLabel } from "@/lib/presentation";
import { formatNumber, formatPct100 } from "@/lib/utils";

export const metadata: Metadata = { title: "Data Quality" };

export default async function QualityPage() {
  const demo = await getDemoDataset();
  const q = demo.analysis.dataQuality;
  const totalIssues = demo.validation.issues.length;
  const matchRate = demo.ast.length > 0 ? demo.matching.matched.length / demo.ast.length : null;

  const missingness = [
    { label: "Interpretation category", pct: q.missingInterpretationPct, denominator: q.astRows, unit: "AST rows" },
    { label: "Numeric measurement", pct: q.missingMeasurementPct, denominator: q.astRows, unit: "AST rows" },
    { label: "Interpretation standard", pct: q.missingStandardPct, denominator: q.astRows, unit: "AST rows" },
    { label: "Testing year", pct: q.missingTestingYearPct, denominator: q.astRows, unit: "AST rows" },
    { label: "Country", pct: q.missingCountryPct, denominator: q.genomes, unit: "isolates" },
    { label: "Collection date", pct: q.missingCollectionDatePct, denominator: q.genomes, unit: "isolates" },
  ];

  const completeness = missingness.map((m) => ({ name: m.label, value: 100 - m.pct }));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<Badge variant="outline">Validation</Badge>}
        title="Data quality audit"
        description="Every issue is recorded with its record identifier, field, original value and a deterministic explanation. The engine never edits, imputes or silently drops a submitted value."
        actions={
          <>
            <a href="/api/quality/issues" download>
              <Button size="sm" variant="secondary"><Download className="h-3.5 w-3.5" /> Issues CSV</Button>
            </a>
            <Link href="/analysis">
              <Button size="sm">Continue to analysis <ArrowRight className="h-3.5 w-3.5" /></Button>
            </Link>
          </>
        }
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Recorded issues" value={formatNumber(totalIssues)} hint="One record may raise multiple issues." icon={Sigma} />
        <StatCard label="Critical" value={formatNumber(demo.validation.bySeverity.critical)} hint="Blocking for the affected pair, not the dataset." tone="bad" icon={AlertTriangle} />
        <StatCard label="Warnings" value={formatNumber(demo.validation.bySeverity.warning)} hint="Analysable with a documented caveat." tone="warn" icon={AlertTriangle} />
        <StatCard label="Exact AST matches" value={matchRate === null ? "—" : formatPct100(matchRate * 100)} denominator={`(${demo.matching.matched.length}/${demo.ast.length})`} hint="Only exact identifier or BioSample matching." tone="good" icon={Link2} />
      </section>

      <Alert variant="info" title="What severity means here">
        <span className="font-medium">Critical</span> issues cannot be resolved by the engine (a missing category is not guessed).{" "}
        <span className="font-medium">Warning</span> issues permit analysis with a stated limitation.{" "}
        <span className="font-medium">Info</span> issues document context that does not change the classification. No issue is auto-corrected.
      </Alert>

      <section>
        <SectionHeader
          title="Issue register"
          description={`${demo.validation.issues.length} issues across isolate, gene-call, AST and evidence tables · checked ${new Date(demo.validation.checkedAt).toLocaleString("en-GB")}`}
        />
        <div className="mt-2.5">
          <IssuesTable issues={demo.validation.issues} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl border border-line bg-white p-4 shadow-card">
          <SectionHeader
            title="Identifier matching review"
            description="Unmatched AST rows are never joined by organism name. Suggestions are edit-distance proposals only."
            actions={<Badge variant="neutral">{demo.matching.unmatched.length} unmatched</Badge>}
          />
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-line bg-canvas/40 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted">Matched</p>
              <p className="mt-0.5 font-mono text-lg tabular-nums text-ink">{demo.matching.matched.length}</p>
            </div>
            <div className="rounded-lg border border-line bg-canvas/40 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted">Unmatched</p>
              <p className="mt-0.5 font-mono text-lg tabular-nums text-warn-600">{demo.matching.unmatched.length}</p>
            </div>
            <div className="rounded-lg border border-line bg-canvas/40 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted">Ambiguous</p>
              <p className="mt-0.5 font-mono text-lg tabular-nums text-ink">{demo.matching.ambiguous.length}</p>
            </div>
          </div>
          <div className="mt-3">
            <p className="mb-1.5 text-[11px] font-medium text-ink">Unmatched AST rows</p>
            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="w-full text-left text-[11px]">
                <thead className="border-b border-line bg-canvas/60 text-[9.5px] uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-2.5 py-1.5 font-medium">Record</th>
                    <th className="px-2.5 py-1.5 font-medium">Submitted ID</th>
                    <th className="px-2.5 py-1.5 font-medium">Drug</th>
                    <th className="px-2.5 py-1.5 font-medium">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {demo.matching.unmatched.slice(0, 8).map((row) => (
                    <tr key={row.recordId}>
                      <td className="px-2.5 py-1.5 font-mono text-[10.5px]">{row.recordId}</td>
                      <td className="px-2.5 py-1.5 font-mono text-[10.5px] text-warn-600">{row.isolateId || "(blank)"}</td>
                      <td className="px-2.5 py-1.5 capitalize">{row.antibiotic}</td>
                      <td className="px-2.5 py-1.5">{row.interpretationRaw || "(blank)"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-3">
            <p className="mb-1.5 text-[11px] font-medium text-ink">Suggestions requiring human confirmation</p>
            <MatchReview suggestions={demo.suggestions} />
          </div>
        </section>

        <div className="space-y-3">
          <ChartFrame
            title="Field completeness"
            description="Share of records with a usable value (higher is better)"
            source="Source: active synthetic dataset · missingness reported, not imputed"
            height={190}
          >
            <CompletenessChart data={completeness} />
          </ChartFrame>

          <div className="rounded-xl border border-line bg-white p-4 shadow-card">
            <SectionHeader title="Completeness detail" description="Denominators differ by field type." />
            <dl className="mt-1">
              {missingness.map((row) => (
                <KeyValue
                  key={row.label}
                  label={`${row.label} missing`}
                  value={`${row.pct.toFixed(1)}% of ${formatNumber(row.denominator)} ${row.unit}`}
                />
              ))}
            </dl>
          </div>

          <div className="rounded-xl border border-line bg-white p-4 shadow-card">
            <SectionHeader title="Duplicates and conflicts" />
            <dl className="mt-1">
              <KeyValue label="Duplicate AST rows" value={formatNumber(q.duplicateRows)} />
              <KeyValue label="Duplicate isolate records" value={formatNumber(q.duplicateGenomes)} />
              <KeyValue label="Unique isolate–drug pairs" value={formatNumber(q.uniquePairs)} />
              <KeyValue label="AST rows screened" value={formatNumber(q.astRows)} />
            </dl>
            <p className="mt-2 text-[10.5px] leading-relaxed text-muted">
              A representative row is chosen by a fixed preference rule (numeric measurement, dilution method, reported
              standard). Disagreeing duplicate observations are excluded, never averaged.
            </p>
          </div>

          <div className="rounded-xl border border-line bg-white p-4 shadow-card">
            <SectionHeader title="Top issue codes" />
            <ul className="mt-2 space-y-1">
              {demo.validation.byCode.slice(0, 7).map((entry) => (
                <li key={entry.code} className="flex items-baseline justify-between gap-2 text-[11px]">
                  <span className="text-slate-600">{validationLabel(entry.code)}</span>
                  <span className="font-mono tabular-nums text-ink">{entry.count}</span>
                </li>
              ))}
            </ul>
            <Link href="/methods" className="mt-2 flex items-center gap-1 text-[11px] font-medium text-brand-700 hover:text-brand-800">
              <ShieldCheck className="h-3.5 w-3.5" /> Quality rules and versions
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
