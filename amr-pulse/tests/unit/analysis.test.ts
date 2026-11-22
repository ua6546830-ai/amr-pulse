import { describe, expect, it } from "vitest";
import { classifyPair, runAnalysis } from "@/lib/analysis/pipeline";
import { isContributingEvidence, isUnresolvedVariantForDrug } from "@/lib/analysis/evidence";
import type { AstRecord, GeneCallRecord, GeneDrugEvidence, IsolateRecord } from "@/types/domain";

const evidence: GeneDrugEvidence = {
  organism: "Escherichia coli",
  geneOrMutation: "blaCTX-M",
  drug: "ceftriaxone",
  drugClass: "Cephalosporin",
  mechanism: "Beta-lactamase",
  evidenceLevel: "established",
  evidenceSource: "Test source",
  sourceUrl: "https://example.org/evidence",
  database: "TEST",
  databaseVersion: "1.0",
  verificationStatus: "verified",
  mappingVersion: "test-map",
};

function isolate(isolateId: string, panel = "AMR panel v1"): IsolateRecord {
  return { isolateId, organism: "Escherichia coli", amrPanelVersion: panel || undefined };
}

function ast(isolateId: string, category: string, recordId = `${isolateId}-ast`): AstRecord {
  return { recordId, isolateId, antibiotic: "ceftriaxone", interpretationRaw: category };
}

function gene(isolateId: string, symbol: string): GeneCallRecord {
  return { isolateId, geneSymbol: symbol };
}

const isolates: IsolateRecord[] = [
  isolate("A1"), // R + determinant
  isolate("A2"), // S, none
  isolate("A3"), // S + determinant
  isolate("A4"), // R, none
  isolate("A5"), // I
  isolate("A6", ""), // missing panel
  isolate("A7"), // unresolved TEM
];

const astResults: AstRecord[] = [
  ast("A1", "R"),
  ast("A2", "S"),
  ast("A3", "S"),
  ast("A4", "R"),
  ast("A5", "I"),
  ast("A6", "S"),
  ast("A7", "S"),
  ast("Z9", "R", "unmatched-row"),
];

const geneCalls: GeneCallRecord[] = [
  gene("A1", "blaCTX-M-15"),
  gene("A3", "blaCTX-M-15"),
  gene("A7", "blaTEM-1"),
  gene("GX", "blaCTX-M-15"),
];

function baseOptions(requirePanel = true) {
  return { requirePanel };
}

describe("five-way classification", () => {
  it("implements the documented binary cross-tabulation", () => {
    expect(classifyPair("R", "positive")).toBe("concordant_resistant");
    expect(classifyPair("S", "none_detected")).toBe("concordant_susceptible");
    expect(classifyPair("S", "positive")).toBe("candidate_gene_positive_phenotype_susceptible");
    expect(classifyPair("R", "none_detected")).toBe("candidate_phenotype_resistant_no_known_determinant");
    expect(classifyPair("I", "positive")).toBe("indeterminate");
    expect(classifyPair("R", "unresolved_variant")).toBe("indeterminate");
  });

  it("treats only verified established/strong evidence as contributing", () => {
    expect(isContributingEvidence(evidence)).toBe(true);
    expect(isContributingEvidence({ ...evidence, evidenceLevel: "moderate" })).toBe(false);
    expect(isContributingEvidence({ ...evidence, verificationStatus: "needs_review" })).toBe(false);
  });

  it("refuses to interpret generic TEM/SHV as a 3GC determinant", () => {
    expect(isUnresolvedVariantForDrug("blaTEM-1", "ceftriaxone")).toBe(true);
    expect(isUnresolvedVariantForDrug("blaSHV", "cefotaxime")).toBe(true);
    expect(isUnresolvedVariantForDrug("blaCTX-M-15", "ceftriaxone")).toBe(false);
    expect(isUnresolvedVariantForDrug("blaTEM-1", "ampicillin")).toBe(false);
  });
});

describe("runAnalysis", () => {
  it("classifies every eligible pair and records one primary exclusion per block", () => {
    const result = runAnalysis({ isolates, geneCalls, astResults, evidence: [evidence], options: baseOptions() });
    const byIsolate = new Map(result.pairs.map((pair) => [pair.isolateId, pair]));

    expect(byIsolate.get("A1")?.classification).toBe("concordant_resistant");
    expect(byIsolate.get("A2")?.classification).toBe("concordant_susceptible");
    expect(byIsolate.get("A3")?.classification).toBe("candidate_gene_positive_phenotype_susceptible");
    expect(byIsolate.get("A4")?.classification).toBe("candidate_phenotype_resistant_no_known_determinant");
    expect(byIsolate.get("A5")?.classification).toBe("indeterminate");
    expect(byIsolate.get("A5")?.exclusionReason).toBe("intermediate_or_nonbinary_category");
    expect(byIsolate.get("A7")?.classification).toBe("indeterminate");
    expect(byIsolate.get("A7")?.exclusionReason).toBe("unresolved_determinant_variant");

    expect(result.counts.eligiblePairs).toBe(4);
    expect(result.counts.indeterminatePairs).toBe(2);
    expect(result.counts.uniqueIsolateDrugPairs).toBe(8);
    expect(result.summary.concordantResistant.numerator).toBe(1);
    expect(result.summary.concordantSusceptible.numerator).toBe(1);
    expect(result.summary.candidateGenePositivePhenotypeSusceptible.numerator).toBe(1);
    expect(result.summary.candidatePhenotypeResistantNoKnownDeterminant.numerator).toBe(1);
    expect(result.summary.agreement.numerator).toBe(2);
    expect(result.summary.agreement.denominator).toBe(4);
    expect(result.summary.agreement.proportion).toBeCloseTo(0.5, 6);

    const reasons = new Map(result.exclusions.map((group) => [group.reason, group.count]));
    expect(reasons.get("unmatched_ast_isolate")).toBe(1);
    expect(reasons.get("unmatched_gene_isolate")).toBe(1);
    expect(reasons.get("missing_genomic_panel")).toBe(1);
    expect(reasons.get("intermediate_or_nonbinary_category")).toBe(1);
    expect(reasons.get("unresolved_determinant_variant")).toBe(1);
    expect(result.counts.geneCalls).toBe(3);
  });

  it("changes the denominator when panel enforcement is disabled", () => {
    const result = runAnalysis({ isolates, geneCalls, astResults, evidence: [evidence], options: baseOptions(false) });
    expect(result.counts.eligiblePairs).toBe(5);
    expect(result.summary.agreement.numerator).toBe(3);
    expect(result.summary.agreement.denominator).toBe(5);
    expect(result.exclusions.find((group) => group.reason === "missing_genomic_panel")).toBeUndefined();
  });

  it("does not include non-binary phenotypes in the eligible denominator", () => {
    const result = runAnalysis({
      isolates: [isolate("I1"), isolate("I2")],
      geneCalls: [gene("I1", "blaCTX-M-15")],
      astResults: [ast("I1", "SDD"), ast("I2", "NS")],
      evidence: [evidence],
      options: baseOptions(),
    });
    expect(result.counts.eligiblePairs).toBe(0);
    expect(result.summary.agreement.proportion).toBeNull();
    expect(result.summary.agreement.ci95).toBeNull();
  });

  it("reports unsupported combinations instead of pooling evidence", () => {
    const result = runAnalysis({
      isolates: [{ isolateId: "K1", organism: "Klebsiella pneumoniae", amrPanelVersion: "v1" }],
      geneCalls: [],
      astResults: [{ recordId: "k1", isolateId: "K1", antibiotic: "ceftriaxone", interpretationRaw: "R" }],
      evidence: [evidence],
      options: baseOptions(),
    });
    expect(result.counts.eligiblePairs).toBe(0);
    expect(result.exclusions.some((group) => group.reason === "unsupported_organism" || group.reason === "unsupported_antibiotic")).toBe(true);
  });
});
