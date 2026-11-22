import Papa from "papaparse";
import type { AstRecord, GeneCallRecord, GeneDrugEvidence, IsolateRecord } from "@/types/domain";

export type TableKind = "isolates" | "genes" | "ast" | "evidence";
export type Row = Record<string, string>;

export interface ParsedTable {
  headers: string[];
  rows: Row[];
  errors: string[];
  truncated: boolean;
}

export const MAX_ROWS = 20000;
export const MAX_FILE_BYTES = 8 * 1024 * 1024;

export function parseTable(text: string, delimiter?: string): ParsedTable {
  const clean = text.replace(/^\uFEFF/, "");
  const parsed = Papa.parse<Row>(clean, {
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
    delimiter,
    transformHeader: (h) => h.trim(),
  });
  const rows = parsed.data.slice(0, MAX_ROWS).filter((r) => Object.values(r).some((v) => String(v ?? "").trim() !== ""));
  return {
    headers: (parsed.meta.fields ?? []).map((h) => h.trim()),
    rows,
    errors: parsed.errors.slice(0, 20).map((e) => `${e.type}: ${e.message}${e.row !== undefined ? ` (row ${e.row + 1})` : ""}`),
    truncated: parsed.data.length > MAX_ROWS,
  };
}

export interface CanonicalField {
  key: string;
  label: string;
  required: boolean;
  aliases: string[];
  description: string;
}

export const SCHEMAS: Record<TableKind, CanonicalField[]> = {
  isolates: [
    { key: "isolate_id", label: "Isolate identifier", required: true, aliases: ["isolate_id", "isolate", "isolate id", "isolateid", "strain", "strain_id", "isolate identifier", "sample_id"], description: "Exact isolate key used to link genomic and AST records." },
    { key: "biosample_accession", label: "BioSample accession", required: false, aliases: ["biosample_accession", "biosample", "biosample id", "biosample_accession_number", "sample accession", "sample_accession"], description: "NCBI BioSample accession (exact-match only)." },
    { key: "organism", label: "Organism", required: true, aliases: ["organism", "species", "organism_name", "scientific_name", "taxon", "scientific name"], description: "Species name, e.g. Escherichia coli." },
    { key: "collection_date", label: "Collection date", required: false, aliases: ["collection_date", "collection date", "isolation_date", "date", "collection year"], description: "Date of isolation where available." },
    { key: "country", label: "Country", required: false, aliases: ["country", "geo_loc_name", "geographic location", "location", "country_code"], description: "Country or geo_loc_name." },
    { key: "isolation_source", label: "Isolation source", required: false, aliases: ["isolation_source", "source", "isolation source", "body site"], description: "Specimen or environmental source." },
    { key: "assembly_accession", label: "Assembly accession", required: false, aliases: ["assembly_accession", "assembly", "assembly accession", "genbank_accession", "genome accession"], description: "Assembly identifier." },
    { key: "genome_quality", label: "Genome quality", required: false, aliases: ["genome_quality", "quality", "checkm"], description: "Quality flag if supplied." },
    { key: "amr_panel_version", label: "AMR panel version", required: false, aliases: ["amr_panel_version", "amr screening version", "amr_screening", "panel_version", "gene_panel_version", "amr panel"], description: "Screening provenance. Required for eligibility when panel enforcement is on." },
    { key: "study_id", label: "Study ID", required: false, aliases: ["study_id", "study", "project", "project_id"], description: "Optional study grouping." },
  ],
  genes: [
    { key: "isolate_id", label: "Isolate identifier", required: true, aliases: ["isolate_id", "isolate", "isolate id", "strain", "sample_id", "genome_id"], description: "Must match the isolate table exactly." },
    { key: "gene_symbol", label: "Gene symbol", required: true, aliases: ["gene_symbol", "gene", "gene symbol", "gene_symbol_amrfinder", "#gene symbol", "amr gene", "resistance gene"], description: "e.g. blaCTX-M-15." },
    { key: "gene_name", label: "Gene name", required: false, aliases: ["gene_name", "gene name", "product", "description"], description: "Descriptive name." },
    { key: "drug_class", label: "Drug class", required: false, aliases: ["drug_class", "class", "antibiotic_class", "subclass"], description: "Annotated class." },
    { key: "mechanism", label: "Mechanism", required: false, aliases: ["mechanism", "resistance_mechanism", "type"], description: "Annotated mechanism." },
    { key: "detection_method", label: "Detection method", required: false, aliases: ["detection_method", "method", "analysis_method"], description: "Tool or method." },
    { key: "database", label: "Database", required: false, aliases: ["database", "reference_database", "source"], description: "Reference database." },
    { key: "database_version", label: "Database version", required: false, aliases: ["database_version", "reference_database_version", "version"], description: "Database snapshot." },
    { key: "identity_pct", label: "Identity (%)", required: false, aliases: ["identity_pct", "% identity", "identity", "pct_identity"], description: "Numeric identity." },
    { key: "coverage_pct", label: "Coverage (%)", required: false, aliases: ["coverage_pct", "% coverage", "coverage", "pct_coverage"], description: "Numeric coverage." },
    { key: "contig_id", label: "Contig ID", required: false, aliases: ["contig_id", "contig", "sequence id", "protein id"], description: "Source contig." },
  ],
  ast: [
    { key: "ast_record_id", label: "AST record ID", required: true, aliases: ["ast_record_id", "ast_id", "record_id", "id", "observation_id"], description: "Unique observation key." },
    { key: "isolate_id", label: "Isolate identifier", required: true, aliases: ["isolate_id", "isolate", "isolate id", "strain", "sample_id", "biosample", "biosample_accession"], description: "Exact isolate/BioSample key." },
    { key: "antibiotic", label: "Antibiotic", required: true, aliases: ["antibiotic", "antimicrobial", "drug", "agent", "antibiotic_name"], description: "Tested agent." },
    { key: "drug_class", label: "Drug class", required: false, aliases: ["drug_class", "class", "antibiotic_class"], description: "Agent class." },
    { key: "ast_method", label: "AST method", required: false, aliases: ["ast_method", "method", "laboratory_typing_method", "testing_method"], description: "MIC, disk diffusion, etc." },
    { key: "measurement", label: "Measurement", required: false, aliases: ["measurement", "measurement_value", "mic", "zone", "value"], description: "Numeric MIC or zone." },
    { key: "measurement_unit", label: "Measurement unit", required: false, aliases: ["measurement_unit", "unit", "units"], description: "mg/L or mm." },
    { key: "interpretation", label: "Interpretation", required: true, aliases: ["interpretation", "resistance_phenotype", "phenotype", "susceptibility", "ast_category", "category"], description: "Original S/I/R/SDD/NS." },
    { key: "interpretation_standard", label: "Interpretation standard", required: false, aliases: ["interpretation_standard", "testing_standard", "standard", "guideline"], description: "CLSI or EUCAST." },
    { key: "breakpoint_version", label: "Breakpoint version", required: false, aliases: ["breakpoint_version", "testing_standard_year", "breakpoint_year", "year"], description: "Breakpoint edition/year." },
    { key: "testing_year", label: "Testing year", required: false, aliases: ["testing_year", "test_year", "year"], description: "Year of testing." },
    { key: "lab_id", label: "Laboratory ID", required: false, aliases: ["lab_id", "laboratory", "lab", "submitter"], description: "Submitting laboratory." },
  ],
  evidence: [
    { key: "organism", label: "Organism", required: true, aliases: ["organism", "species"], description: "Species this mapping applies to." },
    { key: "gene_or_mutation", label: "Gene or mutation", required: true, aliases: ["gene_or_mutation", "gene", "determinant", "gene_symbol"], description: "Family or allele; family entries match allele-level symbols." },
    { key: "drug", label: "Drug", required: true, aliases: ["drug", "antibiotic", "antimicrobial"], description: "Antibiotic." },
    { key: "drug_class", label: "Drug class", required: true, aliases: ["drug_class", "class"], description: "Drug class." },
    { key: "mechanism", label: "Mechanism", required: true, aliases: ["mechanism", "resistance_mechanism"], description: "Mechanism." },
    { key: "evidence_level", label: "Evidence level", required: true, aliases: ["evidence_level", "level"], description: "established / strong / moderate / context-dependent." },
    { key: "evidence_source", label: "Evidence source", required: true, aliases: ["evidence_source", "source", "citation"], description: "Curated source." },
    { key: "source_url", label: "Source URL", required: true, aliases: ["source_url", "url"], description: "Working source URL." },
    { key: "database", label: "Database", required: true, aliases: ["database"], description: "Database name." },
    { key: "database_version", label: "Database version", required: true, aliases: ["database_version", "version"], description: "Version or snapshot." },
    { key: "verification_status", label: "Verification status", required: true, aliases: ["verification_status", "status"], description: "verified / needs_review / context_dependent." },
    { key: "mapping_version", label: "Mapping version", required: true, aliases: ["mapping_version"], description: "Version identifier." },
    { key: "notes", label: "Notes", required: false, aliases: ["notes", "comment"], description: "Curation notes." },
  ],
};

export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[^a-z0-9%]+/g, "_").replace(/^_+|_+$/g, "");
}

export interface MappingSuggestion {
  mapping: Record<string, string | null>;
  confidence: Record<string, number>;
  unmappedHeaders: string[];
  missingRequired: string[];
}

export function suggestMapping(headers: string[], kind: TableKind): MappingSuggestion {
  const normalized = new Map<string, string>();
  for (const h of headers) normalized.set(normalizeHeader(h), h);
  const mapping: Record<string, string | null> = {};
  const confidence: Record<string, number> = {};
  const used = new Set<string>();
  for (const field of SCHEMAS[kind]) {
    const aliasMatch = field.aliases.map(normalizeHeader).find((a) => normalized.has(a));
    if (aliasMatch) {
      const source = normalized.get(aliasMatch)!;
      mapping[field.key] = source;
      confidence[field.key] = 0.98;
      used.add(source);
      continue;
    }
    const fuzzy = headers.find((h) => {
      const n = normalizeHeader(h);
      return !used.has(h) && (field.aliases.map(normalizeHeader).some((a) => n.includes(a) || a.includes(n)));
    });
    if (fuzzy) {
      mapping[field.key] = fuzzy;
      confidence[field.key] = 0.7;
      used.add(fuzzy);
    } else {
      mapping[field.key] = null;
      confidence[field.key] = 0;
    }
  }
  return {
    mapping,
    confidence,
    unmappedHeaders: headers.filter((h) => !used.has(h)),
    missingRequired: SCHEMAS[kind].filter((f) => f.required && !mapping[f.key]).map((f) => f.label),
  };
}

export function applyMapping(rows: Row[], mapping: Record<string, string | null>): Row[] {
  return rows.map((row) => {
    const out: Row = {};
    for (const [canonical, source] of Object.entries(mapping)) {
      if (source) out[canonical] = String(row[source] ?? "").trim();
    }
    return out;
  });
}

function num(value?: string): number | undefined {
  if (!value) return undefined;
  const cleaned = String(value).replace(/[^0-9.\-]/g, "");
  if (!/[0-9]/.test(cleaned)) return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

export function toIsolates(rows: Row[]): IsolateRecord[] {
  return rows
    .filter((r) => r.isolate_id)
    .map((r) => ({
      isolateId: r.isolate_id.trim(),
      biosampleAccession: r.biosample_accession || undefined,
      organism: (r.organism || "Unknown organism").trim(),
      collectionDate: r.collection_date || undefined,
      country: r.country || undefined,
      isolationSource: r.isolation_source || undefined,
      assemblyAccession: r.assembly_accession || undefined,
      genomeQuality: r.genome_quality || undefined,
      amrPanelVersion: r.amr_panel_version || undefined,
      studyId: r.study_id || undefined,
    }));
}

export function toGeneCalls(rows: Row[]): GeneCallRecord[] {
  return rows
    .filter((r) => r.isolate_id && r.gene_symbol)
    .map((r) => ({
      isolateId: r.isolate_id.trim(),
      geneSymbol: r.gene_symbol.trim(),
      geneName: r.gene_name || undefined,
      drugClass: r.drug_class || undefined,
      mechanism: r.mechanism || undefined,
      detectionMethod: r.detection_method || undefined,
      database: r.database || undefined,
      databaseVersion: r.database_version || undefined,
      identityPct: num(r.identity_pct),
      coveragePct: num(r.coverage_pct),
      contigId: r.contig_id || undefined,
    }));
}

export function toAst(rows: Row[]): AstRecord[] {
  return rows
    .filter((r) => r.isolate_id && r.antibiotic)
    .map((r) => ({
      recordId: r.ast_record_id || `${r.isolate_id}:${r.antibiotic}`,
      isolateId: r.isolate_id.trim(),
      antibiotic: r.antibiotic.trim(),
      drugClass: r.drug_class || undefined,
      method: r.ast_method || undefined,
      measurement: r.measurement || undefined,
      measurementUnit: r.measurement_unit || undefined,
      interpretationRaw: r.interpretation || "",
      interpretationStandard: r.interpretation_standard || undefined,
      breakpointVersion: r.breakpoint_version || undefined,
      testingYear: r.testing_year || undefined,
      labId: r.lab_id || undefined,
    }));
}

export function toEvidence(rows: Row[]): GeneDrugEvidence[] {
  return rows
    .filter((r) => r.organism && r.gene_or_mutation && r.drug)
    .map((r) => ({
      organism: r.organism,
      geneOrMutation: r.gene_or_mutation,
      drug: r.drug,
      drugClass: r.drug_class || "Unspecified",
      mechanism: r.mechanism || "Unspecified",
      evidenceLevel: (r.evidence_level || "unverified") as GeneDrugEvidence["evidenceLevel"],
      evidenceSource: r.evidence_source || "",
      sourceUrl: r.source_url || "",
      database: r.database || "",
      databaseVersion: r.database_version || "",
      verificationStatus: (r.verification_status || "unverified") as GeneDrugEvidence["verificationStatus"],
      mappingVersion: r.mapping_version || "unversioned",
      notes: r.notes || undefined,
    }));
}

export type SourceFormat = "amr-pulse" | "ncbi-isolates" | "ncbi-ast" | "amrfinderplus" | "unknown";

export function detectSourceFormat(headers: string[]): SourceFormat {
  const h = new Set(headers.map(normalizeHeader));
  const has = (...names: string[]) => names.some((n) => h.has(normalizeHeader(n)));
  if (has("isolate_id") && has("amr_panel_version")) return "amr-pulse";
  if (has("gene symbol", "gene_symbol") && has("contig id", "contig_id")) return "amrfinderplus";
  if (has("biosample", "biosample_accession") && has("antibiotic", "antimicrobial") && has("resistance_phenotype", "phenotype")) return "ncbi-ast";
  if (has("biosample", "biosample_accession") && has("organism", "species") && has("assembly", "assembly_accession")) return "ncbi-isolates";
  return "unknown";
}

export function guessKindFromHeaders(headers: string[]): TableKind | "unknown" {
  const format = detectSourceFormat(headers);
  if (format === "ncbi-ast") return "ast";
  if (format === "amrfinderplus") return "genes";
  if (format === "ncbi-isolates" || format === "amr-pulse") {
    const h = new Set(headers.map(normalizeHeader));
    if (h.has("antibiotic")) return "ast";
    if (h.has("gene_symbol") || h.has("gene")) return "genes";
    return "isolates";
  }
  return "unknown";
}

export function toCsv(columns: string[], rows: Array<Record<string, unknown>>): string {
  const escape = (v: unknown) => {
    const s = v === undefined || v === null ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.join(","), ...rows.map((r) => columns.map((c) => escape(r[c])).join(","))].join("\n") + "\n";
}
