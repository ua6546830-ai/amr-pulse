import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, FlaskConical, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, KeyValue, SectionHeader } from "@/components/ui/page-header";
import { Table, TBody, TD, TDFigure, TH, THead, TR } from "@/components/ui/table";
import { getDemoDataset } from "@/server/demo/load";
import { evidenceForPair, primaryGeneSymbol } from "@/lib/analysis/evidence";
import { AST_CATEGORY_META, CLASSIFICATION_META } from "@/lib/presentation";

export const metadata: Metadata = { title: "Investigation view" };

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
      <div className="flex flex-wrap items-center gap-4 text-[11.5px]">
        <Link href="/investigations" className="inline-flex items-center gap-1 font-medium text-muted hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to findings
        </Link>
        <Link href="/isolates" className="font-medium text-muted hover:text-ink">
          Isolate explorer
        </Link>
      </div>

      <PageHeader
        eyebrow={
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">Investigation view</Badge>
            <Badge variant="amber">Synthetic isolate</Badge>
            <Badge variant="neutral">AMR panel: {isolate.amrPanelVersion ? "reported" : "missing"}</Badge>
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

      <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <p className="mono-label">Genotype · phenotype · interpretation</p>
            <p className="mt-1 text-[15px] font-semibold text-ink">Ceftriaxone comparison record</p>
          </div>
          <div className="flex items-center gap-2">
            {primaryPair ? (
              <Badge variant={CLASSIFICATION_META[primaryPair.classification].variant}>
                {CLASSIFICATION_META[primaryPair.classification].label}
              </Badge>
            ) : null}
            <Link href="/investigations">
              <Button size="sm" variant="secondary">Findings queue</Button>
            </Link>
          </div>
        </div>

        {primaryPair ? (
          <div className="grid grid-cols-1 md:grid-cols-3">
            <div className="border-b border-line p-5 md:border-b-0 md:border-r">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-700">Genotype</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {primaryPair.detectedGenes.length ? (
                  primaryPair.detectedGenes.map((gene) => (
                    <span key={gene} className="rounded-lg border border-brand-100 bg-brand-50 px-2 py-1 font-mono text-[11px] text-brand-800">
                      {gene}
                    </span>
                  ))
                ) : (
                  <span className="text-[12px] text-muted">No curated determinant detected.</span>
                )}
              </div>
              <dl className="mt-4 space-y-2 text-[11.5px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Determinant status</dt>
                  <dd className="font-mono text-[10.5px] text-ink">{primaryPair.determinantStatus.replace(/_/g, " ")}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Mapped drug classes</dt>
                  <dd className="text-right text-[11px] text-ink">{primaryPair.mappedGeneClasses.join(", ") || "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Unresolved symbols</dt>
                  <dd className="font-mono text-right text-[10.5px] text-ink">{primaryPair.unresolvedGenes.join(", ") || "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Screening panel</dt>
                  <dd className="font-mono text-[10.5px] text-ink">{isolate.amrPanelVersion ?? "not reported"}</dd>
                </div>
              </dl>
            </div>

            <div className="border-b border-line p-5 md:border-b-0 md:border-r">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1E7A93]">Phenotype</p>
              <div className="mt-3 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-canvas font-mono text-[20px] font-semibold text-ink ring-1 ring-line">
                  {primaryPair.phenotype}
                </span>
                <div>
                  <p className="text-[12px] font-medium text-ink">{AST_CATEGORY_META[primaryPair.phenotype].label}</p>
                  <p className="text-[11px] text-muted">submitted as &ldquo;{primaryPair.phenotypeRaw || "(blank)"}&rdquo;</p>
                </div>
              </div>
              <dl className="mt-4 space-y-2 text-[11.5px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Method</dt>
                  <dd className="text-right text-[11px] text-ink">{primaryPair.astMethod ?? "not reported"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Standard</dt>
                  <dd className="text-right text-[11px] text-ink">{primaryPair.astStandard ?? "not reported"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Measurement</dt>
                  <dd className="font-mono text-[10.5px] text-ink">
                    {primaryPair.measurement ?? "not reported"} {primaryPair.measurementUnit ?? ""}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Testing year</dt>
                  <dd className="font-mono text-[10.5px] text-ink">{primaryPair.testingYear ?? "not reported"}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-ai-soft/25 p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ai-deep">Interpretation</p>
              <p className="mt-3 text-[13px] font-semibold text-ink">{CLASSIFICATION_META[primaryPair.classification].label}</p>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-600">
                {CLASSIFICATION_META[primaryPair.classification].description}
              </p>
              <p className="mt-3 rounded-lg border border-ai/15 bg-white/70 px-2.5 py-2 text-[10.5px] leading-relaxed text-slate-600">
                Candidate discordance is a review prompt. It is not proof of laboratory error or a novel resistance mechanism.
              </p>
              <dl className="mt-3 space-y-1.5 text-[11px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">In primary cohort</dt>
                  <dd className="font-medium text-ink">{primaryPair.includedInPrimary ? "Yes" : "No"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Exclusion</dt>
                  <dd className="text-right text-[10.5px] text-ink">{primaryPair.exclusionReason?.replace(/_/g, " ") ?? "None"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">AST record</dt>
                  <dd className="font-mono text-[10px] text-ink">{primaryPair.astRecordId}</dd>
                </div>
              </dl>
            </div>
          </div>
        ) : (
          <p className="px-5 py-6 text-[12px] leading-relaxed text-muted">
            No ceftriaxone pair exists for this isolate, or the pair could not be interpreted. All matched pairs are listed below.
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
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

        <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
          <SectionHeader title="What to verify next" description="Structured checks before any biological interpretation." />
          <ol className="mt-3 space-y-2 text-[11.5px] leading-relaxed text-slate-600">
            {[
              "Verify the exact isolate and BioSample linkage — never by organism or approximate name.",
              "Check the AST standard, method, measurement and testing year recorded above.",
              "Confirm the AMR screening panel and database version for this genome.",
              "Check whether the determinant is established for this organism–drug pair before interpreting the gap.",
            ].map((item, index) => (
              <li key={item} className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 font-mono text-[9px] text-brand-700">
                  {index + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <Link href="/investigations">
              <Button size="sm">Record a review note</Button>
            </Link>
            <Link href="/methods" className="text-[11px] font-medium text-brand-700 hover:text-brand-800">
              Classification rules
            </Link>
            <span className="ml-auto text-[9.5px] text-faint">Synthetic record · no clinical use</span>
          </div>
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

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.2fr_1fr]">
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
