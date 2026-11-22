import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, FlaskConical, Sparkles } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, KeyValue, SectionHeader } from "@/components/ui/page-header";
import { Table, TBody, TD, TDFigure, TH, THead, TR } from "@/components/ui/table";
import { getDemoDataset } from "@/server/demo/load";
import { evidenceForPair, primaryGeneSymbol } from "@/lib/analysis/evidence";
import { AST_CATEGORY_META, CLASSIFICATION_META } from "@/lib/presentation";

export const metadata: Metadata = { title: "Isolate detail" };

export default async function IsolateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isolateId = decodeURIComponent(id);
  const demo = await getDemoDataset();
  const isolate = demo.isolates.find((row) => row.isolateId === isolateId);
  if (!isolate) notFound();

  const genes = demo.geneCalls.filter((call) => call.isolateId === isolate.isolateId);
  const astRows = demo.ast.filter((row) => row.isolateId === isolate.isolateId);
  const pairs = demo.analysis.pairs.filter((pair) => pair.isolateId === isolate.isolateId);
  const primaryPair = pairs.find((pair) => pair.antibiotic === "ceftriaxone");
  const drugs = [...new Set(astRows.map((row) => row.antibiotic))];
  const relevantEvidence = drugs.flatMap((drug) => evidenceForPair(demo.evidence, isolate.organism, drug));

  return (
    <div className="space-y-5">
      <Link href="/isolates" className="inline-flex items-center gap-1 text-[11.5px] font-medium text-muted hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to isolate explorer
      </Link>

      <PageHeader
        eyebrow={
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="amber">Synthetic isolate</Badge>
            <Badge variant="outline">AMR panel: {isolate.amrPanelVersion ? "reported" : "missing"}</Badge>
          </div>
        }
        title={isolate.isolateId}
        description={<span className="italic">{isolate.organism}</span>}
        actions={
          <>
            <Link href={`/ai-workspace?q=${encodeURIComponent(`Explain the discordance for isolate ${isolate.isolateId} using only the loaded evidence.`)}`}>
              <Button size="sm" variant="secondary"><Sparkles className="h-3.5 w-3.5" /> Ask assistant</Button>
            </Link>
            <Link href="/methods">
              <Button size="sm" variant="secondary"><BookOpen className="h-3.5 w-3.5" /> Methods</Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-xl border border-line bg-white p-4 shadow-card">
          <SectionHeader title="Isolate metadata" description="Values as submitted; nothing is inferred." />
          <dl className="mt-2">
            <KeyValue label="BioSample" value={isolate.biosampleAccession ?? "not reported"} mono />
            <KeyValue label="Assembly" value={isolate.assemblyAccession ?? "not reported"} mono />
            <KeyValue label="Collection date" value={isolate.collectionDate ?? "not reported"} />
            <KeyValue label="Country" value={isolate.country ?? "not reported"} />
            <KeyValue label="Isolation source" value={isolate.isolationSource ?? "not reported"} />
            <KeyValue label="Genome quality" value={isolate.genomeQuality ?? "not reported"} />
            <KeyValue label="Study" value={isolate.studyId ?? "not reported"} />
            <KeyValue label="Gene calls" value={`${genes.length}`} />
            <KeyValue label="AST rows" value={`${astRows.length}`} />
          </dl>
        </div>

        <div className="rounded-xl border border-line bg-white p-4 shadow-card">
          <SectionHeader
            title="Ceftriaxone comparison"
            description="Primary pairing used by the demo workspace."
            actions={primaryPair ? <Badge variant={CLASSIFICATION_META[primaryPair.classification].variant}>{CLASSIFICATION_META[primaryPair.classification].short}</Badge> : null}
          />
          {primaryPair ? (
            <>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-line bg-canvas/40 p-2.5">
                  <p className="text-[10px] uppercase tracking-wide text-muted">Submitted phenotype</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Badge variant={AST_CATEGORY_META[primaryPair.phenotype].variant}>{primaryPair.phenotype}</Badge>
                    <span className="font-mono text-[10.5px] text-muted">&ldquo;{primaryPair.phenotypeRaw || "(blank)"}&rdquo;</span>
                  </div>
                </div>
                <div className="rounded-lg border border-line bg-canvas/40 p-2.5">
                  <p className="text-[10px] uppercase tracking-wide text-muted">Determinant status</p>
                  <p className="mt-1 font-mono text-[11.5px] text-ink">{primaryPair.determinantStatus.replace(/_/g, " ")}</p>
                </div>
              </div>
              <dl className="mt-2">
                <KeyValue label="Detected determinants" value={<span className="font-mono">{primaryPair.detectedGenes.join(", ") || "none detected"}</span>} />
                <KeyValue label="Unresolved symbols" value={<span className="font-mono">{primaryPair.unresolvedGenes.join(", ") || "—"}</span>} />
                <KeyValue label="Mapped drug classes" value={primaryPair.mappedGeneClasses.join(", ") || "—"} />
                <KeyValue label="AST record" value={primaryPair.astRecordId} mono />
                <KeyValue label="Method" value={primaryPair.astMethod ?? "not reported"} />
                <KeyValue label="Standard" value={primaryPair.astStandard ?? "not reported"} />
                <KeyValue label="Measurement" value={primaryPair.measurement ?? "not reported"} mono />
              </dl>
              <Alert variant={primaryPair.includedInPrimary ? "info" : "warning"} className="mt-3 py-2 text-[11px]">
                {CLASSIFICATION_META[primaryPair.classification].description}
              </Alert>
            </>
          ) : (
            <p className="mt-3 text-[12px] leading-relaxed text-muted">
              No ceftriaxone pair exists for this isolate, or the pair could not be interpreted. All matched pairs are
              listed below.
            </p>
          )}
        </div>
      </div>

      <section className="rounded-xl border border-line bg-white shadow-card">
        <div className="border-b border-line p-4">
          <SectionHeader title="Analysed pairs for this isolate" description="One row per antibiotic with a curated organism-specific mapping." />
        </div>
        {pairs.length === 0 ? (
          <p className="px-4 py-6 text-[12px] text-muted">No matched pairs for this isolate.</p>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Antibiotic</TH>
                <TH>Phenotype</TH>
                <TH>Determinant</TH>
                <TH>Detected genes</TH>
                <TH>Classification</TH>
                <TH>In primary</TH>
                <TH>Exclusion</TH>
              </tr>
            </THead>
            <TBody>
              {pairs.map((pair) => (
                <TR key={pair.astRecordId}>
                  <TD className="capitalize text-[11.5px]">{pair.antibiotic}</TD>
                  <TD><Badge variant={AST_CATEGORY_META[pair.phenotype].variant}>{pair.phenotype}</Badge></TD>
                  <TD className="text-[10.5px] text-muted">{pair.determinantStatus.replace(/_/g, " ")}</TD>
                  <TD className="font-mono text-[10.5px]">{pair.detectedGenes.join(", ") || "—"}</TD>
                  <TD><Badge variant={CLASSIFICATION_META[pair.classification].variant}>{CLASSIFICATION_META[pair.classification].short}</Badge></TD>
                  <TD className="text-[10.5px]">{pair.includedInPrimary ? "yes" : "no"}</TD>
                  <TD className="text-[10.5px] text-muted">{pair.exclusionReason?.replace(/_/g, " ") ?? "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </section>

      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-xl border border-line bg-white shadow-card">
          <div className="border-b border-line p-4">
            <SectionHeader title="Curated gene calls" description={`${genes.length} annotations attached to this isolate.`} />
          </div>
          {genes.length === 0 ? (
            <p className="px-4 py-6 text-[12px] text-muted">No gene calls were submitted for this isolate.</p>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Symbol</TH>
                  <TH>Class</TH>
                  <TH>Mechanism</TH>
                  <TH>Method</TH>
                  <TH>Database</TH>
                  <TH className="text-right">Identity</TH>
                </tr>
              </THead>
              <TBody>
                {genes.map((gene, index) => (
                  <TR key={`${gene.geneSymbol}-${index}`}>
                    <TD className="font-mono text-[11px]">{primaryGeneSymbol(gene.geneSymbol)}</TD>
                    <TD className="text-[10.5px] text-slate-600">{gene.drugClass ?? "—"}</TD>
                    <TD className="text-[10.5px] text-slate-600">{gene.mechanism ?? "—"}</TD>
                    <TD className="text-[10.5px] text-muted">{gene.detectionMethod ?? "—"}</TD>
                    <TD className="whitespace-nowrap text-[10.5px] text-muted">{gene.database ?? "—"} {gene.databaseVersion ?? ""}</TD>
                    <TDFigure>{gene.identityPct === undefined ? "—" : `${gene.identityPct}%`}</TDFigure>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </section>

        <section className="rounded-xl border border-line bg-white shadow-card">
          <div className="border-b border-line p-4">
            <SectionHeader title="Relevant evidence map rows" description="Only rows for drugs submitted for this isolate." />
          </div>
          <Table>
            <THead>
              <tr>
                <TH>Gene</TH>
                <TH>Drug</TH>
                <TH>Level</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <TBody>
              {relevantEvidence.map((row, index) => (
                <TR key={`${row.geneOrMutation}-${row.drug}-${index}`}>
                  <TD className="font-mono text-[10.5px]">{row.geneOrMutation}</TD>
                  <TD className="capitalize text-[10.5px]">{row.drug}</TD>
                  <TD className="text-[10.5px]">{row.evidenceLevel}</TD>
                  <TD className="text-[10.5px] text-muted">{row.verificationStatus.replace(/_/g, " ")}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <p className="border-t border-line px-4 py-2 text-[10px] text-slate-400">
            Only verified established/strong rows can produce a positive determinant call. The full map is available under Research Datasets.
          </p>
        </section>
      </div>

      <section className="rounded-xl border border-line bg-white shadow-card">
        <div className="border-b border-line p-4">
          <SectionHeader title="All submitted AST rows" description="Original values retained, including missing categories and measurements." />
        </div>
        <Table>
          <THead>
            <tr>
              <TH>Record</TH>
              <TH>Antibiotic</TH>
              <TH>Category</TH>
              <TH>Method</TH>
              <TH>Measurement</TH>
              <TH>Standard</TH>
              <TH>Testing year</TH>
            </tr>
          </THead>
          <TBody>
            {astRows.map((row) => (
              <TR key={row.recordId}>
                <TD className="font-mono text-[10.5px]">{row.recordId}</TD>
                <TD className="capitalize text-[11px]">{row.antibiotic}</TD>
                <TD>{row.interpretationRaw ? <Badge variant="neutral">{row.interpretationRaw}</Badge> : <span className="text-[10.5px] text-warn-600">blank</span>}</TD>
                <TD className="text-[10.5px] text-muted">{row.method ?? "—"}</TD>
                <TD className="font-mono text-[10.5px]">{row.measurement ?? "—"} {row.measurementUnit ?? ""}</TD>
                <TD className="text-[10.5px] text-muted">{row.interpretationStandard ?? "—"}</TD>
                <TD className="font-mono text-[10.5px] text-muted">{row.testingYear ?? "—"}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </section>

      <div className="rounded-lg border border-line bg-white px-4 py-3 text-[10.5px] text-muted shadow-card">
        <span className="inline-flex items-center gap-1.5 font-medium text-ink"><FlaskConical className="h-3.5 w-3.5 text-teal-600" /> Provenance</span>
        <span className="ml-2">Synthetic demo dataset · seed {demo.manifest.seed} · analysis {demo.analysis.meta.analysisVersion} · evidence map {demo.analysis.meta.mappingVersion} · record generated deterministically.</span>
      </div>
    </div>
  );
}
