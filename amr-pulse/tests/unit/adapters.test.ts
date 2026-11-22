import { describe, expect, it } from "vitest";
import {
  MAX_ROWS,
  detectSourceFormat,
  guessKindFromHeaders,
  normalizeHeader,
  parseTable,
  suggestMapping,
  toAst,
  toEvidence,
  toGeneCalls,
  toIsolates,
} from "@/lib/imports/adapters";

describe("header handling", () => {
  it("normalises punctuation and whitespace", () => {
    expect(normalizeHeader("  Isolate ID ")).toBe("isolate_id");
    expect(normalizeHeader("Gene Symbol")).toBe("gene_symbol");
    expect(normalizeHeader("% Identity")).toBe("%_identity");
    expect(normalizeHeader("#Gene Symbol")).toBe("gene_symbol");
  });

  it("strips a UTF-8 BOM and honours quoted fields", () => {
    const parsed = parseTable('\uFEFFisolate_id,organism\nA1,"Escherichia coli, K-12"\n\n');
    expect(parsed.headers).toEqual(["isolate_id", "organism"]);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].organism).toBe("Escherichia coli, K-12");
  });

  it("reports a truncated flag only beyond the row cap", () => {
    const header = "isolate_id,organism\n";
    const rows = Array.from({ length: MAX_ROWS + 1 }, (_, index) => `I${index},Escherichia coli`).join("\n");
    const parsed = parseTable(header + rows);
    expect(parsed.rows).toHaveLength(MAX_ROWS);
    expect(parsed.truncated).toBe(true);
  });
});

describe("schema suggestion", () => {
  it("maps canonical aliases with high confidence and reports required gaps", () => {
    const suggestion = suggestMapping(["Isolate id", "Gene Symbol", "% Identity", "Extra"], "genes");
    expect(suggestion.mapping.isolate_id).toBe("Isolate id");
    expect(suggestion.mapping.gene_symbol).toBe("Gene Symbol");
    expect(suggestion.mapping.identity_pct).toBe("% Identity");
    expect(suggestion.confidence.identity_pct).toBe(0.98);
    expect(suggestion.missingRequired).toEqual([]);
    expect(suggestion.unmappedHeaders).toContain("Extra");
  });

  it("marks required fields missing instead of guessing", () => {
    const suggestion = suggestMapping(["foo", "bar"], "ast");
    expect(suggestion.mapping.ast_record_id).toBeNull();
    expect(suggestion.missingRequired.length).toBeGreaterThanOrEqual(3);
  });
});

describe("source detection", () => {
  it("recognises AMRFinderPlus and NCBI AST shapes", () => {
    expect(detectSourceFormat(["Gene Symbol", "Contig ID", "Element subtype"])).toBe("amrfinderplus");
    expect(detectSourceFormat(["BioSample", "Antibiotic", "Resistance phenotype"])).toBe("ncbi-ast");
    expect(detectSourceFormat(["BioSample", "Organism", "Assembly"])).toBe("ncbi-isolates");
    expect(guessKindFromHeaders(["Gene Symbol", "Contig ID"])).toBe("genes");
    expect(guessKindFromHeaders(["BioSample", "Antibiotic", "Resistance phenotype"])).toBe("ast");
    expect(guessKindFromHeaders(["Just", "Random"])).toBe("unknown");
  });
});

describe("record conversion", () => {
  it("trims identifiers and drops rows without a required key", () => {
    const isolates = toIsolates([
      { isolate_id: " A1 ", organism: "Escherichia coli" },
      { isolate_id: "", organism: "Klebsiella pneumoniae" },
    ]);
    expect(isolates).toHaveLength(1);
    expect(isolates[0].isolateId).toBe("A1");
  });

  it("preserves the original interpretation string for AST rows", () => {
    const ast = toAst([{ isolate_id: "A1", antibiotic: "ceftriaxone", interpretation: "resistant" }]);
    expect(ast[0].interpretationRaw).toBe("resistant");
    expect(ast[0].recordId).toBe("A1:ceftriaxone");
  });

  it("keeps numeric identity/coverage only when parseable", () => {
    const calls = toGeneCalls([
      { isolate_id: "A1", gene_symbol: "blaCTX-M-15", identity_pct: "99.8", coverage_pct: "n/a" },
    ]);
    expect(calls[0].identityPct).toBe(99.8);
    expect(calls[0].coveragePct).toBeUndefined();
  });

  it("does not invent evidence fields that are absent", () => {
    const evidence = toEvidence([{ organism: "Escherichia coli", gene_or_mutation: "blaCTX-M", drug: "ceftriaxone" }]);
    expect(evidence[0].evidenceSource).toBe("");
    expect(evidence[0].sourceUrl).toBe("");
    expect(evidence[0].database).toBe("");
    expect(evidence[0].mappingVersion).toBe("unversioned");
    expect(evidence[0].verificationStatus).toBe("unverified");
  });
});
