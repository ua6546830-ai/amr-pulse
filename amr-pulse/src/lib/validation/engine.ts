import type { AstRecord, GeneCallRecord, GeneDrugEvidence, IsolateRecord } from "@/types/domain";
import { primaryGeneSymbol, evidenceForPair, geneMatchesMapping, normalizeOrganism } from "@/lib/analysis/evidence";
import { normalizeCategory } from "@/lib/analysis/pipeline";

export type Severity = "critical" | "warning" | "info";

export interface ValidationIssue {
  code: string;
  severity: Severity;
  recordId: string;
  field: string;
  problem: string;
  originalValue: string;
  explanation: string;
  suggestion?: string;
  resolutionStatus: "open";
}

export interface ValidationReport {
  issues: ValidationIssue[];
  bySeverity: Record<Severity, number>;
  byCode: { code: string; count: number }[];
  checkedAt: string;
}

export interface ValidationInput {
  isolates: IsolateRecord[];
  geneCalls: GeneCallRecord[];
  ast: AstRecord[];
  evidence: GeneDrugEvidence[];
  requirePanel?: boolean;
}

const BIOSAMPLE = /^SAM[NED][A-Z]?\d{6,}$/i;

export function runValidation(input: ValidationInput): ValidationReport {
  const issues: ValidationIssue[] = [];
  const add = (issue: Omit<ValidationIssue, "resolutionStatus">) => issues.push({ ...issue, resolutionStatus: "open" });

  const isolateCounts = new Map<string, number>();
  for (const iso of input.isolates) isolateCounts.set(iso.isolateId, (isolateCounts.get(iso.isolateId) ?? 0) + 1);
  const duplicateIsolates = new Set([...isolateCounts.entries()].filter(([, n]) => n > 1).map(([id]) => id));

  for (const iso of input.isolates) {
    if (!iso.isolateId.trim()) {
      add({ code: "missing_isolate_id", severity: "critical", recordId: "(no id)", field: "isolate_id", problem: "Isolate identifier is empty.", originalValue: iso.isolateId ?? "", explanation: "Records without an identifier cannot be linked to genomic or AST evidence." });
    }
    if (!iso.organism.trim() || /^unknown/i.test(iso.organism)) {
      add({ code: "missing_organism", severity: "critical", recordId: iso.isolateId, field: "organism", problem: "Organism is missing or unknown.", originalValue: iso.organism ?? "", explanation: "Organism-specific gene–drug interpretation cannot proceed without a species." });
    }
    if (duplicateIsolates.has(iso.isolateId)) {
      add({ code: "duplicate_isolate_id", severity: "critical", recordId: iso.isolateId, field: "isolate_id", problem: "Duplicate isolate identifier.", originalValue: iso.isolateId, explanation: "All AST records for this identifier are excluded until the duplicate is resolved." });
    }
    if (input.requirePanel && !String(iso.amrPanelVersion ?? "").trim()) {
      add({ code: "missing_amr_panel", severity: "warning", recordId: iso.isolateId, field: "amr_panel_version", problem: "No AMR screening provenance.", originalValue: "", explanation: "Absence of gene calls cannot be interpreted as absence of genetic resistance when no screening panel is documented.", suggestion: "Supply the AMRFinderPlus/database version used for the genome." });
    }
    if (iso.biosampleAccession && !BIOSAMPLE.test(iso.biosampleAccession) && !/^SYN/i.test(iso.biosampleAccession)) {
      add({ code: "accession_format", severity: "info", recordId: iso.isolateId, field: "biosample_accession", problem: "BioSample accession does not match the standard pattern.", originalValue: iso.biosampleAccession, explanation: "Non-standard accessions are accepted as exact-match keys but may indicate a mapping error." });
    }
  }

  const astGroups = new Map<string, AstRecord[]>();
  for (const record of input.ast) {
    const key = `${record.isolateId}||${record.antibiotic.trim().toLowerCase()}`;
    astGroups.set(key, [...(astGroups.get(key) ?? []), record]);
    if (!record.isolateId?.trim()) {
      add({ code: "missing_ast_isolate", severity: "critical", recordId: record.recordId, field: "isolate_id", problem: "AST row has no isolate identifier.", originalValue: "", explanation: "The observation cannot be matched." });
    }
    const category = normalizeCategory(record.interpretationRaw);
    if (category === "U") {
      add({ code: "missing_or_invalid_category", severity: "critical", recordId: record.recordId, field: "interpretation", problem: "Missing or invalid susceptibility category.", originalValue: record.interpretationRaw, explanation: "Only S, I, R, SDD and NS are recognised. Empty or free-text values are not recalculated.", suggestion: "Correct the submitted category or exclude the record." });
    }
    if (!record.measurement?.trim()) {
      add({ code: "missing_measurement", severity: "info", recordId: record.recordId, field: "measurement", problem: "No numeric MIC or zone measurement.", originalValue: "", explanation: "Category remains analysable, but the result cannot be independently re-derived." });
    }
    if (!String(record.interpretationStandard ?? "").trim()) {
      add({ code: "missing_interpretation_standard", severity: "warning", recordId: record.recordId, field: "interpretation_standard", problem: "Interpretation standard not reported.", originalValue: "", explanation: "CLSI and EUCAST categories are not pooled by the engine; missing standards reduce comparability." });
    }
    if (!input.isolates.some((iso) => iso.isolateId === record.isolateId)) {
      add({ code: "unmatched_ast", severity: "critical", recordId: record.recordId, field: "isolate_id", problem: "No isolated record matches this AST identifier exactly.", originalValue: record.isolateId, explanation: "No automatic name-based join is performed. Confirm a mapping manually if appropriate." });
    }
    const iso = input.isolates.find((i) => i.isolateId === record.isolateId);
    if (iso && normalizeOrganism(iso.organism) && input.evidence.length > 0) {
      if (evidenceForPair(input.evidence, iso.organism, record.antibiotic).length === 0) {
        add({ code: "no_supported_gene_drug_mapping", severity: "warning", recordId: record.recordId, field: "antibiotic", problem: "No verified gene–drug mapping for this organism–antibiotic pair.", originalValue: `${iso.organism} / ${record.antibiotic}`, explanation: "The pair cannot contribute to the primary comparison and will be excluded as unsupported." });
      }
    }
  }

  for (const [, rows] of astGroups) {
    if (rows.length > 1) {
      const categories = [...new Set(rows.map((r) => normalizeCategory(r.interpretationRaw)))];
      add({
        code: categories.length > 1 ? "conflicting_ast_observations" : "duplicate_ast_observation",
        severity: categories.length > 1 ? "critical" : "warning",
        recordId: rows.map((r) => r.recordId).join("; "),
        field: "interpretation",
        problem: categories.length > 1 ? "Duplicate isolate–antibiotic observations disagree." : "Duplicate isolate–antibiotic observations.",
        originalValue: rows.map((r) => `${r.recordId}=${r.interpretationRaw || "(blank)"}`).join("; "),
        explanation: categories.length > 1
          ? "Conflicting categories are excluded from the primary comparison; they are not averaged or recalculated."
          : "One representative observation is retained using a documented preference rule (MIC measured by dilution first).",
      });
    }
  }

  for (const call of input.geneCalls) {
    if (!input.isolates.some((iso) => iso.isolateId === call.isolateId)) {
      add({ code: "unmatched_gene_call", severity: "warning", recordId: `${call.isolateId}:${call.geneSymbol}`, field: "isolate_id", problem: "Gene call has no exact isolate match.", originalValue: call.isolateId, explanation: "The annotation cannot be attached to an AST record." });
    }
    const iso = input.isolates.find((i) => i.isolateId === call.isolateId);
    if (iso) {
      const anyMapping = input.evidence.some(
        (e) => normalizeOrganism(e.organism) === normalizeOrganism(iso.organism) && geneMatchesMapping(call.geneSymbol, e)
      );
      if (!anyMapping) {
        add({ code: "unsupported_gene_association", severity: "info", recordId: `${call.isolateId}:${primaryGeneSymbol(call.geneSymbol)}`, field: "gene_symbol", problem: "No curated gene–drug association exists for this symbol.", originalValue: call.geneSymbol, explanation: "The gene is retained in the dataset but is not used to infer resistance. It is not interpreted as a novel mechanism." });
      }
    }
  }

  for (const e of input.evidence) {
    if (!e.sourceUrl?.trim()) {
      add({ code: "evidence_missing_source", severity: "warning", recordId: `${e.organism}:${e.geneOrMutation}:${e.drug}`, field: "source_url", problem: "Evidence mapping has no source URL.", originalValue: "", explanation: "Unverifiable mappings must not contribute to primary results." });
    }
    if (e.verificationStatus !== "verified") {
      add({ code: "evidence_not_verified", severity: "info", recordId: `${e.organism}:${e.geneOrMutation}:${e.drug}`, field: "verification_status", problem: "Mapping is not fully verified.", originalValue: e.verificationStatus, explanation: "Only verified established/strong mappings contribute to the primary comparison." });
    }
  }

  const bySeverity: Record<Severity, number> = { critical: 0, warning: 0, info: 0 };
  const byCodeMap = new Map<string, number>();
  for (const issue of issues) {
    bySeverity[issue.severity] += 1;
    byCodeMap.set(issue.code, (byCodeMap.get(issue.code) ?? 0) + 1);
  }
  return {
    issues,
    bySeverity,
    byCode: [...byCodeMap.entries()].map(([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count),
    checkedAt: new Date().toISOString(),
  };
}
