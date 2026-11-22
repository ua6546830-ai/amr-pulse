import { describe, expect, it } from "vitest";
import { getDemoDataset, getDemoTruth } from "@/server/demo/load";
import { runAnalysis } from "@/lib/analysis/pipeline";
import { createTools, findTool } from "@/server/ai/tools";
import { CITATIONS, isVerifiedCitationId } from "@/lib/citations/library";

describe("bundled demonstration dataset", () => {
  it("matches the independent benchmark answer key exactly", async () => {
    const demo = await getDemoDataset();
    const truth = await getDemoTruth();
    const expected = truth.expected.escherichia_coli_ceftriaxone;
    const allOrganisms = truth.expected.ceftriaxone;

    expect(demo.manifest.seed).toBe(truth.seed);
    expect(demo.manifest.datasetType).toBe("SYNTHETIC");
    expect(demo.manifest.label.toLowerCase()).toContain("not real");
    expect(demo.primary.meta.organism.toLowerCase()).toBe("escherichia coli");
    expect(demo.primary.meta.antibiotic.toLowerCase()).toBe("ceftriaxone");

    expect(demo.primary.counts.eligiblePairs).toBe(expected.eligiblePairs);
    expect(demo.primary.counts.indeterminatePairs).toBe(expected.indeterminatePairs);
    expect(demo.primary.counts.astRows).toBe(expected.astRows);
    expect(demo.primary.counts.uniqueIsolateDrugPairs).toBe(expected.uniquePairs);
    expect(demo.primary.dataQuality.duplicateRows).toBe(expected.duplicateRows);

    expect(demo.primary.summary.concordantResistant.numerator).toBe(expected.classifications.concordant_resistant);
    expect(demo.primary.summary.concordantSusceptible.numerator).toBe(expected.classifications.concordant_susceptible);
    expect(demo.primary.summary.candidateGenePositivePhenotypeSusceptible.numerator).toBe(
      expected.classifications.candidate_gene_positive_phenotype_susceptible
    );
    expect(demo.primary.summary.candidatePhenotypeResistantNoKnownDeterminant.numerator).toBe(
      expected.classifications.candidate_phenotype_resistant_no_known_determinant
    );
    expect(demo.primary.summary.agreement.proportion).toBeCloseTo(expected.agreement, 10);

    const exclusions = new Map(demo.primary.exclusions.map((group) => [group.reason, group.count]));
    for (const [reason, count] of Object.entries(expected.exclusionsByReason)) {
      expect(exclusions.get(reason as never)).toBe(count);
    }

    const eligible = demo.primary.pairs.filter((pair) => pair.includedInPrimary);
    expect(eligible).toHaveLength(expected.eligiblePairs);
    expect(eligible.every((pair) => pair.classification !== "indeterminate")).toBe(true);
    expect(demo.primary.discordances.every((pair) => pair.includedInPrimary)).toBe(true);

    const ceftriaxoneOnly = runAnalysis({
      isolates: demo.isolates,
      geneCalls: demo.geneCalls,
      astResults: demo.ast,
      evidence: demo.evidence,
      options: { requirePanel: true, antibiotic: "ceftriaxone" },
    });
    expect(ceftriaxoneOnly.counts.eligiblePairs).toBe(allOrganisms.eligiblePairs);
    expect(ceftriaxoneOnly.counts.indeterminatePairs).toBe(allOrganisms.indeterminatePairs);
    expect(ceftriaxoneOnly.counts.astRows).toBe(allOrganisms.astRows);
    expect(ceftriaxoneOnly.counts.uniqueIsolateDrugPairs).toBe(allOrganisms.uniquePairs);
    expect(ceftriaxoneOnly.summary.agreement.proportion).toBeCloseTo(allOrganisms.agreement, 10);
    expect(ceftriaxoneOnly.summary.concordantResistant.numerator).toBe(allOrganisms.classifications.concordant_resistant);
    expect(ceftriaxoneOnly.summary.concordantSusceptible.numerator).toBe(allOrganisms.classifications.concordant_susceptible);
  });

  it("keeps every excluded pair traceable with a reason and example identifiers", async () => {
    const demo = await getDemoDataset();
    for (const group of demo.primary.exclusions) {
      expect(group.count).toBeGreaterThan(0);
      expect(group.explanation.length).toBeGreaterThan(10);
      expect(group.recordIds.length).toBeGreaterThan(0);
    }
    const indeterminate = demo.primary.pairs.filter((pair) => !pair.includedInPrimary);
    expect(indeterminate.every((pair) => pair.exclusionReason)).toBe(true);
  });

  it("bundles evidence rows that are all version-stamped", async () => {
    const demo = await getDemoDataset();
    expect(demo.evidence.length).toBeGreaterThan(20);
    expect(demo.evidence.every((row) => row.mappingVersion.length > 0)).toBe(true);
    expect(demo.evidence.every((row) => row.sourceUrl.startsWith("https://"))).toBe(true);
  });
});

describe("read-only AI tools", () => {
  it("exposes the full tool roster with unique names", () => {
    const tools = createTools();
    expect(tools).toHaveLength(19);
    expect(new Set(tools.map((tool) => tool.name)).size).toBe(tools.length);
  });

  it("returns denominators rather than bare percentages", async () => {
    const demo = await getDemoDataset();
    const tool = findTool(createTools(), "get_analysis_results");
    expect(tool).toBeDefined();
    const result = tool!.execute({ scope: "primary" }, demo);
    expect(result.summary).toMatch(/\d+ eligible pairs/);
    expect(result.citations.every((id) => isVerifiedCitationId(id))).toBe(true);
  });

  it("returns review-ready evidence for a discordant isolate without altering it", async () => {
    const demo = await getDemoDataset();
    const example = demo.primary.discordances[0];
    const tool = findTool(createTools(), "get_isolate_evidence");
    const result = tool!.execute({ isolateId: example.isolateId }, demo);
    const data = result.data as { isolate: { isolateId: string }; pairs: Array<{ antibiotic: string; classification: string }> };
    expect(data.isolate.isolateId).toBe(example.isolateId);
    expect(data.pairs.some((pair) => pair.antibiotic === example.antibiotic)).toBe(true);
    expect(result.summary).toContain(example.isolateId);
    expect(result.citations.every((id) => isVerifiedCitationId(id))).toBe(true);
    expect((result.data as { interpretationNote?: string }).interpretationNote).toMatch(/review prompt/i);
  });

  it("rejects unknown isolate identifiers instead of guessing", async () => {
    const demo = await getDemoDataset();
    const tool = findTool(createTools(), "get_isolate_evidence");
    const result = tool!.execute({ isolateId: "NOT-A-REAL-ID" }, demo);
    expect((result.data as { found: boolean }).found).toBe(false);
    expect(result.citations).toEqual([]);
  });
});

describe("verified citation library", () => {
  it("has unique IDs and resolvable-looking HTTPS links", () => {
    const ids = new Set(CITATIONS.map((citation) => citation.id));
    expect(ids.size).toBe(CITATIONS.length);
    expect(CITATIONS.every((citation) => citation.url.startsWith("https://"))).toBe(true);
    expect(CITATIONS.every((citation) => citation.verifiedOn === "2026-11-22")).toBe(true);
  });

  it("rejects identifiers outside the library", () => {
    expect(isVerifiedCitationId("feldgarden2021amrfinder")).toBe(true);
    expect(isVerifiedCitationId("made-up-2026")).toBe(false);
  });
});
