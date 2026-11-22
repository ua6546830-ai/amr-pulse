import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { ArrowRight, Database, FileSpreadsheet, FlaskConical, Microscope, Plus, ShieldCheck } from "lucide-react";
import { EvidenceTable } from "@/components/tables/evidence-table";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionHeader, KeyValue } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat";
import { getDemoDataset } from "@/server/demo/load";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Research Datasets" };

function fileSize(name: string): string {
  try {
    const stat = fs.statSync(path.join(process.cwd(), "public", "demo", name));
    return `${(stat.size / 1024 < 1024 ? stat.size / 1024 : stat.size / 1024 / 1024).toFixed(1)} ${stat.size / 1024 < 1024 ? "KB" : "MB"}`;
  } catch {
    return "—";
  }
}

export default async function DatasetsPage() {
  const demo = await getDemoDataset();
  const counts = demo.manifest.counts;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<Badge variant="outline">Datasets</Badge>}
        title="Research datasets"
        description="A dataset is the immutable unit of provenance: isolates, genomic annotations, susceptibility results and the versioned evidence map used to interpret them."
        actions={
          <Link href="/import">
            <Button size="sm"><Plus className="h-3.5 w-3.5" /> Import dataset</Button>
          </Link>
        }
      />

      <Alert variant="warning" title="One synthetic dataset is active">
        The demonstration dataset is loaded automatically. Imported datasets are validated and analysed in a temporary
        browser session; persisting them requires the Supabase research-workspace configuration described in Methods.
      </Alert>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Isolates" value={formatNumber(counts.isolates)} hint="E. coli 170 · K. pneumoniae 50" tone="info" icon={Microscope} />
        <StatCard label="Gene calls" value={formatNumber(counts.geneCalls)} hint="Curated AMR-panel annotations only" tone="info" icon={FlaskConical} />
        <StatCard label="AST rows" value={formatNumber(counts.astRows)} hint={`${counts.astCeftriaxoneRows} ceftriaxone rows`} tone="info" icon={FileSpreadsheet} />
        <StatCard label="Evidence mappings" value={formatNumber(counts.evidenceMappings)} hint="Organism × determinant × drug rows" tone="info" icon={Database} />
      </section>

      <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-xl border border-line bg-white shadow-card">
          <div className="flex items-start justify-between gap-3 border-b border-line p-4">
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-[14px] font-semibold text-ink">{demo.manifest.datasetName}</p>
                <Badge variant="amber">SYNTHETIC</Badge>
                <Badge variant="green">active</Badge>
              </div>
              <p className="mt-1 max-w-2xl text-[11.5px] leading-relaxed text-muted">{demo.manifest.label}</p>
            </div>
            <Link href="/analysis">
              <Button size="sm" variant="secondary">Open <ArrowRight className="h-3.5 w-3.5" /></Button>
            </Link>
          </div>
          <div className="grid gap-0 p-4 sm:grid-cols-2">
            <dl>
              <KeyValue label="Dataset ID" value="ds_demo_synthetic_v1" mono />
              <KeyValue label="Type" value="SYNTHETIC (not research evidence)" />
              <KeyValue label="Generator" value={demo.manifest.generatorScript} mono />
              <KeyValue label="Generator version" value={demo.manifest.generatorVersion} mono />
              <KeyValue label="Seed" value={String(demo.manifest.seed)} mono />
              <KeyValue label="Generated" value={new Date(demo.manifest.generatedAt).toISOString()} mono />
            </dl>
            <dl className="sm:pl-5">
              <KeyValue label="Source" value={demo.manifest.provenance?.source ?? "Deterministic generator"} />
              <KeyValue label="Licence" value={demo.manifest.provenance?.licence ?? "MIT (code); synthetic content"} />
              <KeyValue label="Analysis engine" value={demo.analysis.meta.analysisVersion} mono />
              <KeyValue label="Evidence map" value={demo.analysis.meta.mappingVersion} mono />
              <KeyValue label="Isolates screened" value={`${demo.analysis.dataQuality.screenedGenomes} / ${demo.analysis.dataQuality.genomes}`} />
              <KeyValue label="Parse errors" value={String(demo.parseErrors.length)} />
            </dl>
          </div>
          <div className="border-t border-line p-4">
            <SectionHeader title="Dataset files" description="Raw tables are never modified by the analysis engine." />
            <div className="mt-2.5 divide-y divide-line rounded-lg border border-line">
              {[
                { name: "demo-isolates.csv", role: "Isolate records", rows: counts.isolates },
                { name: "demo-gene-calls.csv", role: "AMR gene annotations", rows: counts.geneCalls },
                { name: "demo-ast-results.csv", role: "Submitted AST results", rows: counts.astRows },
                { name: "gene-drug-evidence.csv", role: "Versioned evidence map", rows: counts.evidenceMappings },
                { name: "demo-manifest.json", role: "Provenance manifest", rows: null },
                { name: "data-dictionary.md", role: "Field definitions", rows: null },
              ].map((file) => (
                <div key={file.name} className="flex items-center gap-3 px-3 py-2">
                  <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[11.5px] text-ink">{file.name}</p>
                    <p className="text-[10.5px] text-muted">{file.role}</p>
                  </div>
                  <span className="font-mono text-[10.5px] text-muted">{file.rows === null ? "—" : `${formatNumber(file.rows)} rows`}</span>
                  <span className="w-16 text-right font-mono text-[10.5px] text-muted">{fileSize(file.name)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-line bg-white p-4 shadow-card">
            <SectionHeader title="Dataset health" description="Checks performed on load, before analysis." />
            <dl className="mt-2">
              <KeyValue label="Isolates with AST" value={`${new Set(demo.ast.map((a) => a.isolateId)).size}`} />
              <KeyValue label="Isolates with gene calls" value={`${new Set(demo.geneCalls.map((g) => g.isolateId)).size}`} />
              <KeyValue label="Exact AST matches" value={`${demo.matching.matched.length}`} />
              <KeyValue label="Unmatched AST rows" value={`${demo.matching.unmatched.length}`} />
              <KeyValue label="Ambiguous matches" value={`${demo.matching.ambiguous.length}`} />
              <KeyValue label="Validation issues" value={`${demo.validation.issues.length}`} />
            </dl>
            <Link href="/quality" className="mt-2.5 flex items-center gap-1 text-[11.5px] font-medium text-brand-700 hover:text-brand-800">
              <ShieldCheck className="h-3.5 w-3.5" /> Open quality audit <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="rounded-xl border border-line bg-white p-4 shadow-card">
            <SectionHeader title="Intended use" />
            <ul className="mt-2 space-y-1.5 text-[11.5px] leading-relaxed text-slate-600">
              {demo.manifest.intendedUse.map((item) => (
                <li key={item} className="flex gap-1.5"><span className="text-teal-600">•</span>{item}</li>
              ))}
            </ul>
            <p className="mt-3 border-t border-line pt-2 text-[10.5px] font-medium uppercase tracking-wide text-muted">Limitations</p>
            <ul className="mt-1 space-y-1.5 text-[11.5px] leading-relaxed text-slate-600">
              {demo.manifest.limitations.map((item) => (
                <li key={item} className="flex gap-1.5"><span className="text-warn-600">•</span>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <section>
        <SectionHeader
          title="Evidence map"
          description="Only mappings marked verified and established/strong contribute to the primary comparison. Context-dependent and unresolved rows are retained for transparency."
        />
        <div className="mt-2.5">
          <EvidenceTable data={demo.evidence} />
        </div>
      </section>

      <div className="rounded-xl border border-dashed border-line-strong bg-white p-5 text-center">
        <Database className="mx-auto h-5 w-5 text-slate-400" />
        <p className="mt-2 text-[13px] font-medium text-ink">Import your own research dataset</p>
        <p className="mx-auto mt-1 max-w-xl text-[11.5px] leading-relaxed text-muted">
          Supports NCBI Isolates, NCBI AST Browser and AMRFinderPlus exports. Records are linked by exact isolate or
          BioSample accession only — never by organism name.
        </p>
        <Link href="/import" className="mt-3 inline-block">
          <Button size="sm" variant="secondary"><Plus className="h-3.5 w-3.5" /> Start import</Button>
        </Link>
      </div>
    </div>
  );
}
