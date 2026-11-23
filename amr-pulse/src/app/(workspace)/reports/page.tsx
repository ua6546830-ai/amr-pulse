import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileDown, FileText, ShieldCheck } from "lucide-react";
import { ReportBuilder } from "@/components/report-builder";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { CITATIONS } from "@/lib/citations/library";
import { getDemoDataset } from "@/server/demo/load";

export const metadata: Metadata = { title: "Research reports" };
export const dynamic = "force-dynamic";

const REPORT_CITATION_IDS = [
  "feldgarden2021amrfinder",
  "feldgarden2019validation",
  "alcock2023card",
  "bortolaia2020resfinder",
  "tyson2015wgs",
  "su2019genomebased",
  "boolchandani2019seq",
  "wilson1927",
  "vonelm2007strobe",
  "clsiM100",
  "eucastBreakpoints",
  "whoGlass",
  "ncbiAstBrowser",
];

export default async function ReportsPage() {
  const demo = await getDemoDataset();
  const primary = demo.primary;
  const contributing = demo.evidence.filter(
    (row) => row.verificationStatus === "verified" && (row.evidenceLevel === "established" || row.evidenceLevel === "strong")
  ).length;
  const verified = demo.evidence.filter((row) => row.verificationStatus === "verified").length;
  const citations = REPORT_CITATION_IDS.map((id) => CITATIONS.find((citation) => citation.id === id)).filter(
    (citation): citation is (typeof CITATIONS)[number] => Boolean(citation)
  );

  return (
    <div className="space-y-5">
      <div className="no-print space-y-4">
        <PageHeader
          eyebrow={
            <div className="flex items-center gap-2">
              <Badge variant="outline">Reports</Badge>
              <Badge variant="amber">Synthetic data</Badge>
            </div>
          }
          title="Research reports"
          description="Assemble a STROBE-oriented report from the deterministic analysis output — objective, methods, exclusions, results, interpretation, data quality, limitations, reproducibility and verified references. Every figure carries its numerator and denominator."
          actions={
            <>
              <Button asChild variant="secondary" size="sm">
                <Link href="/api/manifest">
                  <FileDown className="h-3.5 w-3.5" /> Manifest JSON
                </Link>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link href="/ai-workspace">
                  <FileText className="h-3.5 w-3.5" /> Ask the assistant
                </Link>
              </Button>
            </>
          }
        />

        <Alert variant="info" title="What this builder will not do">
          It will not invent results, infer ethics approval, claim clinical validation or modify classifications. “Print / PDF” uses your browser’s print dialog; check the preview and retain the engine and mapping versions.
        </Alert>
      </div>

      <ReportBuilder
        data={{
          datasetName: demo.manifest.datasetName,
          datasetType: demo.manifest.datasetType,
          datasetLabel: demo.manifest.label,
          generatorVersion: demo.manifest.generatorVersion,
          seed: demo.manifest.seed,
          datasetGeneratedAt: demo.manifest.generatedAt,
          counts: primary.counts,
          summary: primary.summary,
          meta: {
            analysisVersion: primary.meta.analysisVersion,
            mappingVersion: primary.meta.mappingVersion,
            organism: primary.meta.organism,
            antibiotic: primary.meta.antibiotic,
            requirePanel: primary.meta.requirePanel,
          },
          exclusions: primary.exclusions.map((exclusion) => ({ reason: exclusion.reason, count: exclusion.count, explanation: exclusion.explanation })),
          quality: primary.dataQuality,
          byDrug: primary.byDrug,
          discordanceExamples: primary.discordances.slice(0, 12).map((pair) => ({
            isolateId: pair.isolateId,
            antibiotic: pair.antibiotic,
            phenotype: pair.phenotype,
            detectedGenes: pair.detectedGenes,
            classification: pair.classification,
            astStandard: pair.astStandard,
            astMethod: pair.astMethod,
          })),
          evidence: {
            total: demo.evidence.length,
            verified,
            contributing,
            mappingVersion: primary.meta.mappingVersion,
          },
          citations: citations.map((citation) => ({
            id: citation.id,
            authors: citation.authors,
            year: citation.year,
            title: citation.title,
            journal: citation.journal,
            doi: citation.doi,
            url: citation.url,
          })),
        }}
      />

      <div className="no-print flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <SectionHeader
          title="Publication package"
          description="The research manuscript, figures, tables and reproducibility archive are produced separately from the verified real-data analysis — not from this synthetic demo."
        />
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href="/methods">
              <ShieldCheck className="h-3.5 w-3.5" /> Methods &amp; versions
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/analysis">
              Analysis <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
