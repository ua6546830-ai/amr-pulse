import type {
  AnalysisResult,
  AnalysedPair,
  AstCategory,
  AstRecord,
  Classification,
  DataQualitySummary,
  DeterminantStatus,
  DrugSummary,
  ExclusionGroup,
  ExclusionReason,
  GeneCallRecord,
  GeneDrugEvidence,
  IsolateRecord,
  OrganismSummary,
} from "@/types/domain";
import { proportion } from "@/lib/statistics/wilson";
import {
  ANALYSIS_VERSION,
  evaluateGenes,
  evidenceForPair,
  MAPPING_VERSION,
  normalizeDrug,
  normalizeOrganism,
} from "./evidence";

export type { AnalysisResult } from "@/types/domain";

export interface AnalysisOptions {
  requirePanel?: boolean;
  organism?: string;
  antibiotic?: string;
}

export interface AnalysisInput {
  isolates: IsolateRecord[];
  geneCalls: GeneCallRecord[];
  astResults: AstRecord[];
  evidence: GeneDrugEvidence[];
  options?: AnalysisOptions;
}

const EXCLUSION_EXPLANATIONS: Record<ExclusionReason, string> = {
  unmatched_ast_isolate: "AST record has no isolate matching the exact isolate identifier.",
  unmatched_gene_isolate: "Gene call has no isolate matching the exact isolate identifier.",
  duplicate_isolate_conflict: "Isolate identifier occurs more than once in the isolate table.",
  unsupported_organism: "No verified gene–drug evidence exists for this organism.",
  unsupported_antibiotic: "No verified gene–drug evidence exists for this organism–antibiotic combination.",
  missing_genomic_panel: "No documented AMR gene-screening provenance for this isolate.",
  missing_ast_category: "Submitted AST record has no interpretable S/I/R category.",
  conflicting_ast_categories: "Multiple submitted AST records disagree on the interpretation category.",
  intermediate_or_nonbinary_category: "Interpretation is intermediate, SDD or non-susceptible and is kept out of the binary primary comparison.",
  unresolved_determinant_variant: "A beta-lactamase symbol is present but the allele cannot be resolved as an established ceftriaxone determinant.",
  invalid_measurement: "Measurement value is present but uninterpretable for the recorded method.",
};

export function normalizeCategory(raw: string): AstCategory {
  const value = String(raw ?? "").trim().toLowerCase();
  if (["r", "resistant", "resistance"].includes(value)) return "R";
  if (["s", "susceptible", "sensitive"].includes(value)) return "S";
  if (["i", "intermediate"].includes(value)) return "I";
  if (["sdd", "susceptible-dose dependent", "susceptible dose dependent"].includes(value)) return "SDD";
  if (["ns", "non-susceptible", "non susceptible", "nonsusceptible"].includes(value)) return "NS";
  return "U";
}

function isNumericMeasurement(value?: string): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  if (!v || v === "not reported" || v === "nr") return false;
  const match = v.match(/^[<>=≤≥]{0,2}\s*(\d+(\.\d+)?)/);
  return Boolean(match);
}

function rowPreferenceScore(row: AstRecord): number {
  let score = 0;
  if (isNumericMeasurement(row.measurement)) score += 4;
  const method = normalizeDrug(row.method ?? "");
  if (/broth|mic|agar/.test(method)) score += 3;
  if (row.interpretationStandard) score += 2;
  if (row.testingYear) score += 1;
  if (row.breakpointVersion) score += 1;
  return score;
}

function toProportion(n: number, d: number) {
  return proportion(n, d);
}

function duplicateIsolateIds(isolates: IsolateRecord[]): Set<string> {
  const counts = new Map<string, number>();
  for (const iso of isolates) counts.set(iso.isolateId, (counts.get(iso.isolateId) ?? 0) + 1);
  return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([id]) => id));
}

export function classifyPair(
  phenotype: AstCategory,
  determinantStatus: DeterminantStatus
): Classification {
  if (phenotype === "R" && determinantStatus === "positive") return "concordant_resistant";
  if (phenotype === "S" && determinantStatus === "none_detected") return "concordant_susceptible";
  if (phenotype === "S" && determinantStatus === "positive")
    return "candidate_gene_positive_phenotype_susceptible";
  if (phenotype === "R" && determinantStatus === "none_detected")
    return "candidate_phenotype_resistant_no_known_determinant";
  return "indeterminate";
}

export function runAnalysis(input: AnalysisInput): AnalysisResult {
  const { isolates, geneCalls, astResults, evidence } = input;
  const options = { requirePanel: true, ...(input.options ?? {}) };

  const exclusions = new Map<ExclusionReason, { recordIds: string[] }>();
  const addExclusion = (reason: ExclusionReason, recordIds: string[]) => {
    const bucket = exclusions.get(reason) ?? { recordIds: [] };
    bucket.recordIds.push(...recordIds);
    exclusions.set(reason, bucket);
  };

  const allIsolateIds = new Set(isolates.map((iso) => iso.isolateId));
  for (const call of geneCalls) {
    if (!allIsolateIds.has(call.isolateId)) {
      addExclusion("unmatched_gene_isolate", [`${call.isolateId}:${call.geneSymbol}`]);
    }
  }

  const allIsolateById = new Map<string, IsolateRecord>();
  for (const iso of isolates) {
    if (!allIsolateById.has(iso.isolateId)) allIsolateById.set(iso.isolateId, iso);
  }
  const scopedIsolates = options.organism
    ? isolates.filter((iso) => normalizeOrganism(iso.organism) === normalizeOrganism(options.organism!))
    : isolates;
  const isolateDupes = duplicateIsolateIds(scopedIsolates);
  const isolateIndex = new Map<string, IsolateRecord>();
  for (const iso of scopedIsolates) {
    if (!isolateIndex.has(iso.isolateId)) isolateIndex.set(iso.isolateId, iso);
  }
  const genesByIsolate = new Map<string, GeneCallRecord[]>();
  for (const call of geneCalls) {
    const list = genesByIsolate.get(call.isolateId) ?? [];
    list.push(call);
    genesByIsolate.set(call.isolateId, list);
  }

  // Organism scoping is applied before grouping so counts and completeness describe the
  // analysed cohort. Records with no matching isolate stay in scope so that the exclusion
  // register can report them as unmatched rather than silently dropping them.
  const filteredAst = astResults.filter((ast) => {
    if (options.antibiotic && normalizeDrug(ast.antibiotic) !== normalizeDrug(options.antibiotic)) return false;
    if (options.organism) {
      const owner = allIsolateById.get(ast.isolateId);
      if (owner && normalizeOrganism(owner.organism) !== normalizeOrganism(options.organism)) return false;
    }
    return true;
  });

  const groups = new Map<string, AstRecord[]>();
  for (const ast of filteredAst) {
    const key = `${ast.isolateId}||${normalizeDrug(ast.antibiotic)}`;
    const list = groups.get(key) ?? [];
    list.push(ast);
    groups.set(key, list);
  }

  const pairs: AnalysedPair[] = [];
  let duplicateRows = 0;

  for (const [, rows] of groups) {
    duplicateRows += Math.max(0, rows.length - 1);
    const first = rows[0];
    const isolate = isolateIndex.get(first.isolateId);
    const recordIds = rows.map((r) => r.recordId);

    if (!isolate) {
      addExclusion("unmatched_ast_isolate", recordIds);
      continue;
    }
    if (isolateDupes.has(isolate.isolateId)) {
      addExclusion("duplicate_isolate_conflict", recordIds);
      continue;
    }
    if (options.organism && normalizeOrganism(isolate.organism) !== normalizeOrganism(options.organism)) {
      continue;
    }

    const drugEvidence = evidenceForPair(evidence, isolate.organism, first.antibiotic);
    if (drugEvidence.length === 0) {
      const anyOrganismEvidence = evidence.some(
        (e) => normalizeOrganism(e.organism) === normalizeOrganism(isolate.organism)
      );
      addExclusion(anyOrganismEvidence ? "unsupported_antibiotic" : "unsupported_organism", recordIds);
      continue;
    }
    const canonicalDrug = drugEvidence[0].drug;

    if (options.requirePanel && !String(isolate.amrPanelVersion ?? "").trim()) {
      addExclusion("missing_genomic_panel", recordIds);
      continue;
    }

    const validRows = rows.filter((r) => normalizeCategory(r.interpretationRaw) !== "U");
    if (validRows.length === 0) {
      addExclusion("missing_ast_category", recordIds);
      continue;
    }

    const distinct = [...new Set(validRows.map((r) => normalizeCategory(r.interpretationRaw)))];
    if (distinct.length > 1) {
      addExclusion("conflicting_ast_categories", recordIds);
      continue;
    }

    const sorted = [...validRows].sort((a, b) => rowPreferenceScore(b) - rowPreferenceScore(a));
    const chosen = sorted[0];
    const phenotype = normalizeCategory(chosen.interpretationRaw);

    if (phenotype !== "R" && phenotype !== "S") {
      const pair: AnalysedPair = {
        isolateId: isolate.isolateId,
        organism: isolate.organism,
        antibiotic: canonicalDrug,
        astRecordId: chosen.recordId,
        phenotype,
        phenotypeRaw: chosen.interpretationRaw,
        determinantStatus: "none_detected",
        detectedGenes: [],
        unresolvedGenes: [],
        mappedGeneClasses: [],
        classification: "indeterminate",
        includedInPrimary: false,
        exclusionReason: "intermediate_or_nonbinary_category",
        astMethod: chosen.method,
        astStandard: chosen.interpretationStandard,
        testingYear: chosen.testingYear,
        measurement: chosen.measurement,
        measurementUnit: chosen.measurementUnit,
      };
      addExclusion("intermediate_or_nonbinary_category", [chosen.recordId]);
      pairs.push(pair);
      continue;
    }

    const geneEvaluation = evaluateGenes(
      genesByIsolate.get(isolate.isolateId) ?? [],
      evidence,
      isolate.organism,
      canonicalDrug
    );

    let determinantStatus: DeterminantStatus;
    if (geneEvaluation.matchedGenes.length > 0) determinantStatus = "positive";
    else if (geneEvaluation.unresolvedGenes.length > 0) determinantStatus = "unresolved_variant";
    else determinantStatus = "none_detected";

    if (determinantStatus === "unresolved_variant") {
      const pair: AnalysedPair = {
        isolateId: isolate.isolateId,
        organism: isolate.organism,
        antibiotic: canonicalDrug,
        astRecordId: chosen.recordId,
        phenotype,
        phenotypeRaw: chosen.interpretationRaw,
        determinantStatus,
        detectedGenes: geneEvaluation.matchedGenes,
        unresolvedGenes: geneEvaluation.unresolvedGenes,
        mappedGeneClasses: [],
        classification: "indeterminate",
        includedInPrimary: false,
        exclusionReason: "unresolved_determinant_variant",
        astMethod: chosen.method,
        astStandard: chosen.interpretationStandard,
        testingYear: chosen.testingYear,
        measurement: chosen.measurement,
        measurementUnit: chosen.measurementUnit,
      };
      addExclusion("unresolved_determinant_variant", [chosen.recordId]);
      pairs.push(pair);
      continue;
    }

    const classification = classifyPair(phenotype, determinantStatus);
    pairs.push({
      isolateId: isolate.isolateId,
      organism: isolate.organism,
      antibiotic: canonicalDrug,
      astRecordId: chosen.recordId,
      phenotype,
      phenotypeRaw: chosen.interpretationRaw,
      determinantStatus,
      detectedGenes: geneEvaluation.matchedGenes,
      unresolvedGenes: geneEvaluation.unresolvedGenes,
      mappedGeneClasses: [...new Set(geneEvaluation.matched.map((m) => m.drugClass))],
      classification,
      includedInPrimary: classification !== "indeterminate",
      astMethod: chosen.method,
      astStandard: chosen.interpretationStandard,
      testingYear: chosen.testingYear,
      measurement: chosen.measurement,
      measurementUnit: chosen.measurementUnit,
    });
  }

  const eligible = pairs.filter((p) => p.includedInPrimary);
  const concordantResistant = eligible.filter((p) => p.classification === "concordant_resistant").length;
  const concordantSusceptible = eligible.filter((p) => p.classification === "concordant_susceptible").length;
  const genePositiveSusceptible = eligible.filter(
    (p) => p.classification === "candidate_gene_positive_phenotype_susceptible"
  ).length;
  const resistantNoDeterminant = eligible.filter(
    (p) => p.classification === "candidate_phenotype_resistant_no_known_determinant"
  ).length;
  const nEligible = eligible.length;
  const determinantPositive = concordantResistant + genePositiveSusceptible;
  const determinantNegative = concordantSusceptible + resistantNoDeterminant;

  const exclusionGroups: ExclusionGroup[] = [...exclusions.entries()]
    .map(([reason, bucket]) => ({
      reason,
      count: bucket.recordIds.length,
      recordIds: [...new Set(bucket.recordIds)].slice(0, 50),
      explanation: EXCLUSION_EXPLANATIONS[reason],
    }))
    .sort((a, b) => b.count - a.count);

  const standards = new Map<string, number>();
  const methods = new Map<string, number>();
  for (const ast of filteredAst) {
    const std = (ast.interpretationStandard ?? "").trim() || "(missing)";
    const methodLabel = (ast.method ?? "").trim() || "(missing)";
    standards.set(std, (standards.get(std) ?? 0) + 1);
    methods.set(methodLabel, (methods.get(methodLabel) ?? 0) + 1);
  }
  const pct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);
  const dataQuality: DataQualitySummary = {
    astRows: filteredAst.length,
    uniquePairs: groups.size,
    duplicateRows,
    duplicateGenomes: isolates.length - isolateIndex.size,
    missingInterpretationPct: pct(
      filteredAst.filter((a) => normalizeCategory(a.interpretationRaw) === "U").length,
      filteredAst.length
    ),
    missingMeasurementPct: pct(
      filteredAst.filter((a) => !isNumericMeasurement(a.measurement)).length,
      filteredAst.length
    ),
    missingStandardPct: pct(
      filteredAst.filter((a) => !String(a.interpretationStandard ?? "").trim()).length,
      filteredAst.length
    ),
    missingTestingYearPct: pct(
      filteredAst.filter((a) => !String(a.testingYear ?? "").trim()).length,
      filteredAst.length
    ),
    missingCountryPct: pct(
      scopedIsolates.filter((i) => !String(i.country ?? "").trim()).length,
      scopedIsolates.length
    ),
    missingCollectionDatePct: pct(
      scopedIsolates.filter((i) => !String(i.collectionDate ?? "").trim()).length,
      scopedIsolates.length
    ),
    mixedStandards: [...standards.entries()].map(([standard, count]) => ({ standard, count })).sort((a, b) => b.count - a.count),
    methods: [...methods.entries()].map(([method, count]) => ({ method, count })).sort((a, b) => b.count - a.count),
    genomes: scopedIsolates.length,
    screenedGenomes: scopedIsolates.filter((i) => String(i.amrPanelVersion ?? "").trim()).length,
  };

  const byDrugMap = new Map<string, DrugSummary>();
  for (const pair of pairs) {
    const existing = byDrugMap.get(pair.antibiotic) ?? {
      drug: pair.antibiotic,
      drugClass: evidenceForPair(evidence, pair.organism, pair.antibiotic)[0]?.drugClass ?? "Unspecified",
      eligible: 0,
      concordantResistant: 0,
      concordantSusceptible: 0,
      genePositiveSusceptible: 0,
      resistantNoKnownDeterminant: 0,
      indeterminate: 0,
      agreement: null,
    };
    if (!pair.includedInPrimary) existing.indeterminate += 1;
    else {
      existing.eligible += 1;
      if (pair.classification === "concordant_resistant") existing.concordantResistant += 1;
      if (pair.classification === "concordant_susceptible") existing.concordantSusceptible += 1;
      if (pair.classification === "candidate_gene_positive_phenotype_susceptible")
        existing.genePositiveSusceptible += 1;
      if (pair.classification === "candidate_phenotype_resistant_no_known_determinant")
        existing.resistantNoKnownDeterminant += 1;
    }
    byDrugMap.set(pair.antibiotic, existing);
  }
  const byDrug = [...byDrugMap.values()]
    .map((d) => ({
      ...d,
      agreement: d.eligible > 0 ? (d.concordantResistant + d.concordantSusceptible) / d.eligible : null,
    }))
    .sort((a, b) => b.eligible - a.eligible);

  const byOrganismMap = new Map<string, OrganismSummary>();
  for (const iso of isolates) {
    const stats = byOrganismMap.get(iso.organism) ?? {
      organism: iso.organism,
      isolates: 0,
      eligiblePairs: 0,
      genePositiveSusceptible: 0,
      resistantNoKnownDeterminant: 0,
      agreement: null,
    };
    stats.isolates += 1;
    byOrganismMap.set(iso.organism, stats);
  }
  for (const pair of pairs.filter((p) => p.includedInPrimary)) {
    const stats = byOrganismMap.get(pair.organism);
    if (!stats) continue;
    stats.eligiblePairs += 1;
    if (pair.classification === "candidate_gene_positive_phenotype_susceptible") stats.genePositiveSusceptible += 1;
    if (pair.classification === "candidate_phenotype_resistant_no_known_determinant")
      stats.resistantNoKnownDeterminant += 1;
  }
  const byOrganism = [...byOrganismMap.values()]
    .map((o) => {
      const orgPairs = pairs.filter((p) => p.includedInPrimary && p.organism === o.organism);
      const concordant = orgPairs.filter(
        (p) => p.classification === "concordant_resistant" || p.classification === "concordant_susceptible"
      ).length;
      return { ...o, agreement: o.eligiblePairs > 0 ? concordant / o.eligiblePairs : null };
    })
    .sort((a, b) => b.isolates - a.isolates);

  return {
    meta: {
      analysisVersion: ANALYSIS_VERSION,
      mappingVersion: MAPPING_VERSION,
      generatedAt: new Date().toISOString(),
      organism: options.organism ?? "All organisms",
      antibiotic: options.antibiotic ?? "All mapped antibiotics",
      requirePanel: Boolean(options.requirePanel),
    },
    counts: {
      isolates: isolateIndex.size,
      geneCalls: geneCalls.filter((call) => isolateIndex.has(call.isolateId)).length,
      astRows: filteredAst.length,
      uniqueIsolateDrugPairs: groups.size,
      eligiblePairs: nEligible,
      indeterminatePairs: pairs.filter((p) => p.classification === "indeterminate").length,
    },
    summary: {
      eligiblePairs: nEligible,
      concordantResistant: toProportion(concordantResistant, nEligible),
      concordantSusceptible: toProportion(concordantSusceptible, nEligible),
      candidateGenePositivePhenotypeSusceptible: toProportion(genePositiveSusceptible, nEligible),
      candidatePhenotypeResistantNoKnownDeterminant: toProportion(resistantNoDeterminant, nEligible),
      agreement: toProportion(concordantResistant + concordantSusceptible, nEligible),
      determinantPositivePredictiveValue: toProportion(concordantResistant, determinantPositive),
      determinantNegativeResistantProportion: toProportion(resistantNoDeterminant, determinantNegative),
    },
    exclusions: exclusionGroups,
    dataQuality,
    pairs,
    byDrug,
    byOrganism,
    discordances: pairs.filter(
      (p) =>
        p.classification === "candidate_gene_positive_phenotype_susceptible" ||
        p.classification === "candidate_phenotype_resistant_no_known_determinant"
    ),
  };
}
