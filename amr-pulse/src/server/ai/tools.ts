import { z } from "zod";
import type { DemoDataset } from "@/server/demo/load";
import { SCHEMAS, applyMapping, type TableKind } from "@/lib/imports/adapters";
import { CITATIONS } from "@/lib/citations/library";
import { EXCLUSION_LABELS, classificationCounts, validationLabel } from "@/lib/presentation";
import { primaryGeneSymbol } from "@/lib/analysis/evidence";

export interface ToolResult {
  summary: string;
  data: unknown;
  citations: string[];
  source: string;
}

export interface AiTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  schema: z.ZodTypeAny;
  execute: (args: unknown, demo: DemoDataset) => ToolResult;
}

const citationIds = new Set(CITATIONS.map((citation) => citation.id));
const cleanCitations = (ids: string[] | undefined) => [...new Set((ids ?? []).filter((id) => citationIds.has(id)))];

function tokenSearch(query: string, citations: typeof CITATIONS) {
  const tokens = query.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2);
  return citations
    .map((citation) => {
      const haystack = `${citation.title} ${citation.journal} ${citation.note} ${citation.authors}`.toLowerCase();
      const score = tokens.reduce((acc, token) => acc + (haystack.includes(token) ? 1 : 0), 0);
      return { citation, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
}

function canonicalRows(kind: TableKind, demo: DemoDataset): Array<Record<string, string>> {
  if (kind === "isolates") {
    return demo.isolates.map((iso) => ({
      isolate_id: iso.isolateId,
      biosample_accession: iso.biosampleAccession ?? "",
      organism: iso.organism,
      collection_date: iso.collectionDate ?? "",
      country: iso.country ?? "",
      isolation_source: iso.isolationSource ?? "",
      assembly_accession: iso.assemblyAccession ?? "",
      genome_quality: iso.genomeQuality ?? "",
      amr_panel_version: iso.amrPanelVersion ?? "",
      study_id: iso.studyId ?? "",
    }));
  }
  if (kind === "genes") {
    return demo.geneCalls.map((call) => ({
      isolate_id: call.isolateId,
      gene_symbol: call.geneSymbol,
      gene_name: call.geneName ?? "",
      drug_class: call.drugClass ?? "",
      mechanism: call.mechanism ?? "",
      detection_method: call.detectionMethod ?? "",
      database: call.database ?? "",
      database_version: call.databaseVersion ?? "",
      identity_pct: call.identityPct === undefined ? "" : String(call.identityPct),
      coverage_pct: call.coveragePct === undefined ? "" : String(call.coveragePct),
      contig_id: call.contigId ?? "",
    }));
  }
  if (kind === "ast") {
    return demo.ast.map((row) => ({
      ast_record_id: row.recordId,
      isolate_id: row.isolateId,
      antibiotic: row.antibiotic,
      drug_class: row.drugClass ?? "",
      ast_method: row.method ?? "",
      measurement: row.measurement ?? "",
      measurement_unit: row.measurementUnit ?? "",
      interpretation: row.interpretationRaw,
      interpretation_standard: row.interpretationStandard ?? "",
      breakpoint_version: row.breakpointVersion ?? "",
      testing_year: row.testingYear ?? "",
      lab_id: row.labId ?? "",
    }));
  }
  return demo.evidence.map((row) => ({
    organism: row.organism,
    gene_or_mutation: row.geneOrMutation,
    drug: row.drug,
    drug_class: row.drugClass,
    mechanism: row.mechanism,
    evidence_level: row.evidenceLevel,
    evidence_source: row.evidenceSource,
    source_url: row.sourceUrl,
    database: row.database,
    database_version: row.databaseVersion,
    verification_status: row.verificationStatus,
    mapping_version: row.mappingVersion,
    notes: row.notes ?? "",
  }));
}

const kindSchema = z.enum(["isolates", "genes", "ast", "evidence"]);
const mappingSchema = z.record(z.string(), z.union([z.string(), z.null()]));

export function createTools(): AiTool[] {
  return [
    {
      name: "inspect_supported_schema",
      description: "Return the supported canonical fields, required flags and descriptions for one or all import tables.",
      parameters: {
        type: "object",
        properties: { kind: { type: "string", enum: ["isolates", "genes", "ast", "evidence"] } },
        additionalProperties: false,
      },
      schema: z.object({ kind: kindSchema.optional() }),
      execute: (args) => {
        const { kind } = args as { kind?: TableKind };
        const kinds = kind ? [kind] : (["isolates", "genes", "ast", "evidence"] as TableKind[]);
        const data = Object.fromEntries(
          kinds.map((entry) => [
            entry,
            SCHEMAS[entry].map((field) => ({ key: field.key, label: field.label, required: field.required, description: field.description })),
          ])
        );
        return {
          summary: `Supported schema returned for ${kinds.join(", ")}.`,
          data,
          citations: [],
          source: "AMR PULSE import schema",
        };
      },
    },
    {
      name: "get_column_aliases",
      description: "List accepted column-name aliases for one import table.",
      parameters: {
        type: "object",
        properties: { kind: { type: "string", enum: ["isolates", "genes", "ast", "evidence"] } },
        required: ["kind"],
        additionalProperties: false,
      },
      schema: z.object({ kind: kindSchema }),
      execute: (args) => {
        const { kind } = args as { kind: TableKind };
        return {
          summary: `Aliases returned for ${kind}.`,
          data: SCHEMAS[kind].map((field) => ({ key: field.key, aliases: field.aliases, required: field.required })),
          citations: [],
          source: "AMR PULSE import schema",
        };
      },
    },
    {
      name: "validate_mapping",
      description: "Deterministically validate a proposed canonical-field mapping. Does not modify any data.",
      parameters: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["isolates", "genes", "ast", "evidence"] },
          mapping: { type: "object", additionalProperties: { type: ["string", "null"] } },
        },
        required: ["kind", "mapping"],
        additionalProperties: false,
      },
      schema: z.object({ kind: kindSchema, mapping: mappingSchema }),
      execute: (args) => {
        const { kind, mapping } = args as { kind: TableKind; mapping: Record<string, string | null> };
        const allowed = new Set(SCHEMAS[kind].map((field) => field.key));
        const unknownKeys = Object.keys(mapping).filter((key) => !allowed.has(key));
        const missingRequired = SCHEMAS[kind].filter((field) => field.required && !mapping[field.key]).map((field) => field.key);
        const targets = Object.entries(mapping).filter(([, value]) => value).map(([, value]) => value as string);
        const duplicatedTargets = targets.filter((target, index) => targets.indexOf(target) !== index);
        return {
          summary: missingRequired.length === 0 && unknownKeys.length === 0 && duplicatedTargets.length === 0
            ? `Mapping for ${kind} passes deterministic validation.`
            : `Mapping for ${kind} has issues: ${missingRequired.length} missing required, ${unknownKeys.length} unknown, ${duplicatedTargets.length} reused target(s).`,
          data: { kind, valid: missingRequired.length === 0 && unknownKeys.length === 0 && duplicatedTargets.length === 0, missingRequired, unknownKeys, duplicatedTargets },
          citations: [],
          source: "Deterministic mapping validator",
        };
      },
    },
    {
      name: "preview_mapped_records",
      description: "Preview the first records of an import table after applying a mapping. Read-only, demo data only.",
      parameters: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["isolates", "genes", "ast", "evidence"] },
          mapping: { type: "object", additionalProperties: { type: ["string", "null"] } },
          limit: { type: "number" },
        },
        required: ["kind", "mapping"],
        additionalProperties: false,
      },
      schema: z.object({ kind: kindSchema, mapping: mappingSchema, limit: z.number().int().min(1).max(20).optional() }),
      execute: (args, demo) => {
        const { kind, mapping, limit } = args as { kind: TableKind; mapping: Record<string, string | null>; limit?: number };
        const rows = canonicalRows(kind, demo);
        const mapped = applyMapping(rows, mapping).slice(0, limit ?? 5);
        return {
          summary: `Previewed ${mapped.length} mapped ${kind} records from the demo tables.`,
          data: { kind, preview: mapped, note: "Read-only preview. No data was written." },
          citations: [],
          source: "Demo dataset (synthetic)",
        };
      },
    },
    {
      name: "get_quality_report",
      description: "Return the deterministic quality audit summary and leading issue codes.",
      parameters: { type: "object", properties: { limit: { type: "number" } }, additionalProperties: false },
      schema: z.object({ limit: z.number().int().min(1).max(30).optional() }),
      execute: (args, demo) => {
        const { limit } = args as { limit?: number };
        const report = demo.validation;
        return {
          summary: `${report.issues.length} quality issues: ${report.bySeverity.critical} critical, ${report.bySeverity.warning} warning, ${report.bySeverity.info} info.`,
          data: {
            bySeverity: report.bySeverity,
            byCode: report.byCode.slice(0, limit ?? 10),
            examples: report.issues.slice(0, limit ?? 6).map((issue) => ({
              severity: issue.severity,
              code: issue.code,
              recordId: issue.recordId,
              field: issue.field,
              problem: issue.problem,
              explanation: issue.explanation,
            })),
          },
          citations: [],
          source: "Deterministic validation engine",
        };
      },
    },
    {
      name: "inspect_invalid_records",
      description: "List records with invalid or missing fields, optionally filtered by severity or issue code.",
      parameters: {
        type: "object",
        properties: { severity: { type: "string", enum: ["critical", "warning", "info"] }, code: { type: "string" }, limit: { type: "number" } },
        additionalProperties: false,
      },
      schema: z.object({
        severity: z.enum(["critical", "warning", "info"]).optional(),
        code: z.string().max(80).optional(),
        limit: z.number().int().min(1).max(50).optional(),
      }),
      execute: (args, demo) => {
        const { severity, code, limit } = args as { severity?: "critical" | "warning" | "info"; code?: string; limit?: number };
        const filtered = demo.validation.issues.filter(
          (issue) => (!severity || issue.severity === severity) && (!code || issue.code === code)
        );
        return {
          summary: `${filtered.length} issue records matched the filter.`,
          data: filtered.slice(0, limit ?? 15).map((issue) => ({
            severity: issue.severity,
            code: issue.code,
            label: validationLabel(issue.code),
            recordId: issue.recordId,
            field: issue.field,
            originalValue: issue.originalValue,
            explanation: issue.explanation,
            suggestion: issue.suggestion ?? "",
          })),
          citations: [],
          source: "Deterministic validation engine",
        };
      },
    },
    {
      name: "inspect_duplicate_records",
      description: "List duplicate or conflicting isolate and AST observations recorded by the quality engine.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
      schema: z.object({}),
      execute: (_args, demo) => {
        const duplicates = demo.validation.issues.filter((issue) => issue.code === "duplicate_ast_observation" || issue.code === "conflicting_ast_observations" || issue.code === "duplicate_isolate_id");
        return {
          summary: `${duplicates.length} duplicate or conflicting observations were recorded.`,
          data: {
            issues: duplicates.slice(0, 15).map((issue) => ({ code: issue.code, recordId: issue.recordId, problem: issue.problem, originalValue: issue.originalValue, explanation: issue.explanation })),
            duplicateAstRows: demo.analysis.dataQuality.duplicateRows,
            duplicateIsolates: demo.analysis.dataQuality.duplicateGenomes,
          },
          citations: [],
          source: "Deterministic validation engine",
        };
      },
    },
    {
      name: "get_missing_field_statistics",
      description: "Return missing-data percentages and denominators for AST and isolate fields.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
      schema: z.object({}),
      execute: (_args, demo) => {
        const quality = demo.analysis.dataQuality;
        return {
          summary: `Measurement missing in ${quality.missingMeasurementPct.toFixed(1)}% of AST rows; standard missing in ${quality.missingStandardPct.toFixed(1)}%; collection date missing in ${quality.missingCollectionDatePct.toFixed(1)}% of isolates.`,
          data: {
            astRows: quality.astRows,
            isolates: quality.genomes,
            missing: {
              interpretation: quality.missingInterpretationPct,
              measurement: quality.missingMeasurementPct,
              standard: quality.missingStandardPct,
              testingYear: quality.missingTestingYearPct,
              country: quality.missingCountryPct,
              collectionDate: quality.missingCollectionDatePct,
            },
            policy: "Reported and excluded with reasons; no imputation.",
          },
          citations: [],
          source: "Deterministic data-quality summary",
        };
      },
    },
    {
      name: "get_isolate_evidence",
      description: "Return metadata, gene calls, AST rows and analysed pairs for one isolate (exact identifier).",
      parameters: { type: "object", properties: { isolateId: { type: "string" } }, required: ["isolateId"], additionalProperties: false },
      schema: z.object({ isolateId: z.string().min(1).max(120) }),
      execute: (args, demo) => {
        const { isolateId } = args as { isolateId: string };
        const isolate = demo.isolates.find((row) => row.isolateId.toLowerCase() === isolateId.toLowerCase());
        if (!isolate) {
          const suggestions = demo.isolates.filter((row) => row.isolateId.toLowerCase().includes(isolateId.toLowerCase().slice(0, 6))).slice(0, 5).map((row) => row.isolateId);
          return {
            summary: `No isolate matched ${isolateId} exactly. ${suggestions.length} partial identifiers are available but were not substituted.`,
            data: { isolateId, found: false, suggestions },
            citations: [],
            source: "Demo isolate table",
          };
        }
        const genes = demo.geneCalls.filter((call) => call.isolateId === isolate.isolateId);
        const ast = demo.ast.filter((row) => row.isolateId === isolate.isolateId);
        const pairs = demo.analysis.pairs.filter((pair) => pair.isolateId === isolate.isolateId);
        const standard = ast.find((row) => row.interpretationStandard)?.interpretationStandard ?? "";
        const citations = cleanCitations([
          genes.length > 0 ? "feldgarden2021amrfinder" : "",
          /resfinder/i.test(genes.map((g) => g.database ?? "").join(" ")) ? "bortolaia2020resfinder" : "",
          /clsi/i.test(standard) ? "clsiM100" : "",
          /eucast/i.test(standard) ? "eucastBreakpoints" : "",
        ]);
        return {
          summary: `Isolate ${isolate.isolateId} (${isolate.organism}) has ${genes.length} curated gene calls, ${ast.length} AST rows and ${pairs.length} analysed pairs.`,
          data: {
            isolate,
            genes: genes.map((gene) => ({ symbol: primaryGeneSymbol(gene.geneSymbol), className: gene.drugClass, mechanism: gene.mechanism, method: gene.detectionMethod, database: gene.database, databaseVersion: gene.databaseVersion })),
            ast: ast.map((row) => ({ recordId: row.recordId, antibiotic: row.antibiotic, category: row.interpretationRaw, method: row.method, measurement: row.measurement, unit: row.measurementUnit, standard: row.interpretationStandard, testingYear: row.testingYear })),
            pairs: pairs.map((pair) => ({ antibiotic: pair.antibiotic, phenotype: pair.phenotype, determinantStatus: pair.determinantStatus, detectedGenes: pair.detectedGenes, classification: pair.classification, includedInPrimary: pair.includedInPrimary, exclusionReason: pair.exclusionReason })),
            interpretationNote: "Candidate discordance is a review prompt, not proof of laboratory error.",
          },
          citations,
          source: "Demo isolate, gene-call and AST tables plus deterministic analysis",
        };
      },
    },
    {
      name: "get_gene_drug_evidence",
      description: "Query the versioned gene–drug evidence map by gene, drug or organism.",
      parameters: {
        type: "object",
        properties: { gene: { type: "string" }, drug: { type: "string" }, organism: { type: "string" }, onlyVerified: { type: "boolean" } },
        additionalProperties: false,
      },
      schema: z.object({ gene: z.string().max(80).optional(), drug: z.string().max(80).optional(), organism: z.string().max(120).optional(), onlyVerified: z.boolean().optional() }),
      execute: (args, demo) => {
        const { gene, drug, organism, onlyVerified } = args as { gene?: string; drug?: string; organism?: string; onlyVerified?: boolean };
        const filtered = demo.evidence.filter(
          (row) =>
            (!gene || row.geneOrMutation.toLowerCase().includes(gene.toLowerCase())) &&
            (!drug || row.drug.toLowerCase().includes(drug.toLowerCase())) &&
            (!organism || row.organism.toLowerCase().includes(organism.toLowerCase())) &&
            (!onlyVerified || row.verificationStatus === "verified")
        );
        const citations = cleanCitations([
          filtered.some((row) => /amrfinder/i.test(row.database)) ? "feldgarden2021amrfinder" : "",
          filtered.some((row) => /card/i.test(row.database)) ? "alcock2023card" : "",
          filtered.some((row) => /resfinder/i.test(row.database)) ? "bortolaia2020resfinder" : "",
        ]);
        return {
          summary: `${filtered.length} evidence rows matched. Mapping version ${filtered[0]?.mappingVersion ?? demo.analysis.meta.mappingVersion}.`,
          data: filtered.slice(0, 20),
          citations,
          source: "Versioned demo evidence map",
        };
      },
    },
    {
      name: "get_ast_evidence",
      description: "Return submitted AST rows for an isolate or antibiotic, preserving original categories.",
      parameters: { type: "object", properties: { isolateId: { type: "string" }, antibiotic: { type: "string" }, limit: { type: "number" } }, additionalProperties: false },
      schema: z.object({ isolateId: z.string().max(120).optional(), antibiotic: z.string().max(120).optional(), limit: z.number().int().min(1).max(100).optional() }),
      execute: (args, demo) => {
        const { isolateId, antibiotic, limit } = args as { isolateId?: string; antibiotic?: string; limit?: number };
        const filtered = demo.ast.filter(
          (row) => (!isolateId || row.isolateId.toLowerCase() === isolateId.toLowerCase()) && (!antibiotic || row.antibiotic.toLowerCase().includes(antibiotic.toLowerCase()))
        );
        return {
          summary: `${filtered.length} submitted AST rows matched; ${filtered.filter((row) => !row.interpretationRaw.trim()).length} have no interpretable category.`,
          data: filtered.slice(0, limit ?? 20).map((row) => ({ recordId: row.recordId, isolateId: row.isolateId, antibiotic: row.antibiotic, category: row.interpretationRaw, method: row.method, measurement: row.measurement, standard: row.interpretationStandard })),
          citations: cleanCitations([filtered.some((row) => /clsi/i.test(row.interpretationStandard ?? "")) ? "clsiM100" : "", filtered.some((row) => /eucast/i.test(row.interpretationStandard ?? "")) ? "eucastBreakpoints" : ""]),
          source: "Demo AST table",
        };
      },
    },
    {
      name: "get_discordance_summary",
      description: "Summarise candidate discordance and indeterminate pairs from the primary analysis.",
      parameters: { type: "object", properties: { classification: { type: "string" }, limit: { type: "number" } }, additionalProperties: false },
      schema: z.object({ classification: z.string().max(80).optional(), limit: z.number().int().min(1).max(50).optional() }),
      execute: (args, demo) => {
        const { classification, limit } = args as { classification?: string; limit?: number };
        const primary = demo.primary;
        const counts = classificationCounts(primary.summary);
        const filtered = primary.discordances.filter((pair) => !classification || pair.classification === classification);
        return {
          summary: `Primary pairing has ${primary.discordances.length} candidate discordant pairs: ${counts.genePositiveSusceptible} gene-positive/susceptible and ${counts.resistantNoDeterminant} resistant/no known determinant; ${primary.counts.indeterminatePairs} indeterminate.`,
          data: {
            eligiblePairs: primary.summary.eligiblePairs,
            agreement: primary.summary.agreement,
            classifications: {
              concordant_resistant: counts.concordantResistant,
              concordant_susceptible: counts.concordantSusceptible,
              candidate_gene_positive_phenotype_susceptible: counts.genePositiveSusceptible,
              candidate_phenotype_resistant_no_known_determinant: counts.resistantNoDeterminant,
              indeterminate: primary.counts.indeterminatePairs,
            },
            examples: filtered.slice(0, limit ?? 8).map((pair) => ({ isolateId: pair.isolateId, antibiotic: pair.antibiotic, phenotype: pair.phenotype, detectedGenes: pair.detectedGenes, classification: pair.classification, standard: pair.astStandard })),
            interpretation: "Candidate discordance requires review of linkage, AST method/standard, screening provenance and allele resolution. It is not an accusation of laboratory error.",
          },
          citations: cleanCitations(["feldgarden2019validation", "tyson2015wgs", "wilson1927"]),
          source: "Deterministic primary analysis (E. coli × ceftriaxone)",
        };
      },
    },
    {
      name: "inspect_source_provenance",
      description: "Return dataset and record provenance for an isolate or AST record.",
      parameters: { type: "object", properties: { isolateId: { type: "string" }, astRecordId: { type: "string" } }, additionalProperties: false },
      schema: z.object({ isolateId: z.string().max(120).optional(), astRecordId: z.string().max(120).optional() }),
      execute: (args, demo) => {
        const { isolateId, astRecordId } = args as { isolateId?: string; astRecordId?: string };
        const ast = astRecordId ? demo.ast.find((row) => row.recordId === astRecordId) : undefined;
        const resolvedId = isolateId ?? ast?.isolateId;
        const isolate = resolvedId ? demo.isolates.find((row) => row.isolateId === resolvedId) : undefined;
        return {
          summary: isolate ? `Provenance for ${isolate.isolateId}: source table row, screening panel ${isolate.amrPanelVersion ?? "not reported"}, analysis ${demo.analysis.meta.analysisVersion}.` : "No matching record was found for the supplied identifiers.",
          data: {
            dataset: { name: demo.manifest.datasetName, type: demo.manifest.datasetType, seed: demo.manifest.seed, generatedAt: demo.manifest.generatedAt, label: demo.manifest.label },
            analysis: demo.analysis.meta,
            isolate: isolate ?? null,
            astRecord: ast ?? null,
            note: "The demo dataset is synthetic. Provenance records the generator, versions and deterministic engine; it is not a clinical record.",
          },
          citations: [],
          source: "Dataset manifest and analysis metadata",
        };
      },
    },
    {
      name: "get_relevant_references",
      description: "Search the verified citation library; unknown identifiers are never returned.",
      parameters: { type: "object", properties: { query: { type: "string" }, limit: { type: "number" } }, required: ["query"], additionalProperties: false },
      schema: z.object({ query: z.string().min(2).max(300), limit: z.number().int().min(1).max(10).optional() }),
      execute: (args) => {
        const { query, limit } = args as { query: string; limit?: number };
        const matches = tokenSearch(query, CITATIONS).slice(0, limit ?? 5);
        return {
          summary: `${matches.length} verified references matched the query.`,
          data: matches.map(({ citation }) => ({ id: citation.id, title: citation.title, authors: citation.authors, year: citation.year, journal: citation.journal, doi: citation.doi, url: citation.url, note: citation.note })),
          citations: cleanCitations(matches.map(({ citation }) => citation.id)),
          source: "Verified citation library (Crossref/Europe PMC, 2026-11-22)",
        };
      },
    },
    {
      name: "get_analysis_results",
      description: "Return deterministic analysis counts, summary, stratification and exclusions.",
      parameters: { type: "object", properties: { scope: { type: "string", enum: ["primary", "all"] } }, additionalProperties: false },
      schema: z.object({ scope: z.enum(["primary", "all"]).optional() }),
      execute: (args, demo) => {
        const { scope } = args as { scope?: "primary" | "all" };
        const analysis = scope === "all" ? demo.analysis : demo.primary;
        return {
          summary: `${scope === "all" ? "All-organism" : "Primary"} analysis: ${analysis.counts.eligiblePairs} eligible pairs, agreement ${analysis.summary.agreement.numerator}/${analysis.summary.agreement.denominator}.`,
          data: {
            meta: analysis.meta,
            counts: analysis.counts,
            summary: analysis.summary,
            byDrug: analysis.byDrug,
            byOrganism: analysis.byOrganism,
            exclusions: analysis.exclusions.map(({ reason, count, explanation }) => ({ reason, label: EXCLUSION_LABELS[reason], count, explanation })),
          },
          citations: cleanCitations(["wilson1927", "feldgarden2019validation"]),
          source: "Deterministic analysis engine",
        };
      },
    },
    {
      name: "get_dataset_manifest",
      description: "Return dataset provenance, counts, limitations and analysis versions.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
      schema: z.object({}),
      execute: (_args, demo) => ({
        summary: `Dataset: ${demo.manifest.datasetName} (${demo.manifest.datasetType}), seed ${demo.manifest.seed}, ${demo.manifest.counts.isolates} isolates.`,
        data: { manifest: demo.manifest, analysis: demo.analysis.meta, validationCheckedAt: demo.validation.checkedAt },
        citations: [],
        source: "Demo manifest",
      }),
    },
    {
      name: "get_methodology",
      description: "Return the analysis methodology, statistical definitions and exclusion rules.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
      schema: z.object({}),
      execute: () => ({
        summary: "Methodology returned: five-class comparison, Wilson intervals, exact-only linkage, no imputation, no breakpoint pooling.",
        data: {
          unit: "matched isolate–antibiotic pair",
          classification: ["concordant_resistant", "concordant_susceptible", "candidate_gene_positive_phenotype_susceptible", "candidate_phenotype_resistant_no_known_determinant", "indeterminate"],
          interval: "Wilson score interval, z = 1.959963984540054",
          matching: "Exact isolate identifier or BioSample accession; near matches require human approval and are never auto-applied.",
          exclusions: Object.entries(EXCLUSION_LABELS).map(([reason, label]) => ({ reason, label })),
          missingData: "Reported and excluded with reasons; no imputation.",
          standards: "CLSI and EUCAST are not pooled without an explicit, justified harmonisation rule.",
          repeatedObservations: "Multiple antibiotics per isolate are not independent; denominators count pairs.",
          aiBoundary: "The AI cannot modify raw data, exclusions, classifications or statistics. All calculations are deterministic.",
        },
        citations: cleanCitations(["wilson1927", "clsiM100", "eucastBreakpoints", "feldgarden2019validation"]),
        source: "AMR PULSE methods",
      }),
    },
    {
      name: "get_citation_library",
      description: "Return the full verified citation library. Only these identifiers may be cited.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
      schema: z.object({}),
      execute: () => ({
        summary: `${CITATIONS.length} verified citations are available.`,
        data: CITATIONS.map((citation) => ({ id: citation.id, title: citation.title, authors: citation.authors, year: citation.year, journal: citation.journal, doi: citation.doi, url: citation.url })),
        citations: CITATIONS.map((citation) => citation.id),
        source: "Verified citation library",
      }),
    },
    {
      name: "get_figure_data",
      description: "Return data arrays used by the dashboard figures, so a narrative cannot invent numbers.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
      schema: z.object({}),
      execute: (_args, demo) => {
        const primary = demo.primary;
        const counts = classificationCounts(primary.summary);
        return {
          summary: "Figure data returned from the deterministic analysis.",
          data: {
            classification: counts,
            agreementByDrug: demo.analysis.byDrug.map((drug) => ({ drug: drug.drug, eligible: drug.eligible, agreement: drug.agreement })),
            exclusions: primary.exclusions.map((group) => ({ reason: group.reason, label: EXCLUSION_LABELS[group.reason], count: group.count })),
            missingness: demo.analysis.dataQuality,
            organisms: demo.analysis.byOrganism,
          },
          citations: cleanCitations(["wilson1927"]),
          source: "Deterministic analysis engine",
        };
      },
    },
  ];
}

export function findTool(tools: AiTool[], name: string): AiTool | undefined {
  return tools.find((tool) => tool.name === name);
}

export function toolSchemas(tools: AiTool[]) {
  return tools.map((tool) => ({ name: tool.name, description: tool.description, parameters: tool.parameters }));
}
