import type { Metadata } from "next";
import { BookOpen, Database, ExternalLink, FileSpreadsheet, ShieldAlert } from "lucide-react";
import { ImportWizard } from "@/components/import-wizard";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Data Import" };

const SOURCES = [
  {
    name: "NCBI Pathogen Detection",
    url: "https://www.ncbi.nlm.nih.gov/pathogens/",
    what: "Isolate metadata and AMR genotype summaries for pathogen surveillance genomes.",
    how: "Open Isolates browser → filter by organism → download the isolate metadata table. Keep the exact isolate/BioSample identifier column.",
  },
  {
    name: "NCBI AST Browser",
    url: "https://www.ncbi.nlm.nih.gov/pathogens/ast/",
    what: "Submitted antimicrobial susceptibility testing results linked to Pathogen Detection isolates.",
    how: "Filter by organism and antibiotic → download the AST export. Preserve original S/I/R, method, measurement and standard columns.",
  },
  {
    name: "AMRFinderPlus",
    url: "https://github.com/ncbi/amr",
    what: "Annotated resistance gene calls from assembled genomes or proteins.",
    how: "Run AMRFinderPlus externally, then upload its tabular output. Record the database version and AMR panel provenance with the isolate table.",
  },
  {
    name: "NCBI AMR resources",
    url: "https://www.ncbi.nlm.nih.gov/pathogens/antimicrobial-resistance/",
    what: "Documentation and reference material for the Pathogen Detection AMR pipeline.",
    how: "Use to understand how gene calls were produced; the platform never re-calls genes from sequencing reads.",
  },
  {
    name: "CARD",
    url: "https://card.mcmaster.ca/",
    what: "Curated resistance ontology and gene–drug associations.",
    how: "Export or reference the ontology to build or review the evidence map. Record the CARD version used.",
  },
  {
    name: "ResFinder",
    url: "https://genomicepidemiology.org/services/",
    what: "Web service for acquired resistance gene detection.",
    how: "If you use ResFinder calls, include its output fields and database version in the gene-call table; do not mix callers silently.",
  },
];

export default function ImportPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">Import</Badge>
            <Badge variant="neutral">Import → Map → Validate → Analyse</Badge>
          </div>
        }
        title="Data import"
        description="Bring isolate metadata, existing genomic annotations and submitted AST results into a single matched analysis. Records are joined by exact identifier only — never by organism name or approximate name."
      />

      <Alert variant="danger" title="Privacy and scope boundary">
        Do not upload identifiable patient data. Use public, surveillance or appropriately de-identified isolate-level
        research data. AMR PULSE is research-support software: it does not diagnose, does not recommend treatment and
        makes no HIPAA, ISO or medical-device claim.
      </Alert>

      <ImportWizard />

      <section>
        <SectionHeader
          title="Public data import guides"
          description="The platform consumes existing annotations; it does not sequence, assemble or re-call genes."
        />
        <div className="mt-2.5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {SOURCES.map((source) => (
            <div key={source.name} className="rounded-xl border border-line bg-white p-3.5 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[12px] font-semibold text-ink">{source.name}</p>
                <a href={source.url} target="_blank" rel="noreferrer noopener" className="text-brand-700 hover:text-brand-800" aria-label={`Open ${source.name}`}>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              <p className="mt-1 text-[10.5px] leading-relaxed text-muted">{source.what}</p>
              <p className="mt-2 border-t border-line pt-2 text-[10.5px] leading-relaxed text-slate-600">{source.how}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-line bg-white p-4 shadow-card">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink"><FileSpreadsheet className="h-3.5 w-3.5 text-brand-600" /> Expected tables</p>
          <ul className="mt-2 space-y-1.5 text-[10.5px] leading-relaxed text-slate-600">
            <li><span className="font-mono">isolates</span>: isolate_id*, organism*, biosample_accession, country, amr_panel_version…</li>
            <li><span className="font-mono">gene calls</span>: isolate_id*, gene_symbol*…</li>
            <li><span className="font-mono">AST</span>: ast_record_id*, isolate_id*, antibiotic*, interpretation*…</li>
            <li><span className="font-mono">evidence</span>: organism*, gene_or_mutation*, drug*, evidence_level*, verification_status*, mapping_version*…</li>
            <li className="text-muted">* required. Columns are matched by documented aliases; you confirm every mapping.</li>
          </ul>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-card">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink"><ShieldAlert className="h-3.5 w-3.5 text-warn-600" /> Matching rules</p>
          <ul className="mt-2 space-y-1.5 text-[10.5px] leading-relaxed text-slate-600">
            <li>Exact isolate identifier or BioSample accession, after case and whitespace normalisation.</li>
            <li>Ambiguous identifiers are surfaced, not resolved silently.</li>
            <li>Near matches (edit distance ≤ 2) are suggestions only and require human approval.</li>
            <li>An approved mapping is recorded as a review event in a configured workspace.</li>
          </ul>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-card">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink"><Database className="h-3.5 w-3.5 text-cyan-600" /> Persistence</p>
          <ul className="mt-2 space-y-1.5 text-[10.5px] leading-relaxed text-slate-600">
            <li>Without Supabase credentials, imported tables are analysed in the browser and discarded on reload.</li>
            <li>With Supabase, uploads are chunked, stored in workspace-scoped tables and protected by row-level security.</li>
            <li>The public demo dataset is read-only and never mixed with an import.</li>
          </ul>
          <a href="/demo/data-dictionary.md" download className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-medium text-brand-700 hover:underline">
            <BookOpen className="h-3 w-3" /> Demo data dictionary
          </a>
        </div>
      </div>
    </div>
  );
}
