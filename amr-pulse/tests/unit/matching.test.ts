import { describe, expect, it } from "vitest";
import { matchAstRecords, normalizeAccession, suggestMatches } from "@/lib/matching";
import type { AstRecord, IsolateRecord } from "@/types/domain";

function ast(recordId: string, isolateId: string): AstRecord {
  return { recordId, isolateId, antibiotic: "ceftriaxone", interpretationRaw: "R" };
}

function isolate(isolateId: string, biosample?: string, organism = "Escherichia coli"): IsolateRecord {
  return { isolateId, biosampleAccession: biosample, organism };
}

describe("exact accession matching", () => {
  it("normalises case and whitespace", () => {
    expect(normalizeAccession(" samn 123 ")).toBe("SAMN123");
    const outcome = matchAstRecords([ast("r1", "a1")], [isolate("A1")]);
    expect(outcome.matched).toHaveLength(1);
    expect(outcome.matched[0].via).toBe("isolate_id");
    expect(outcome.unmatched).toHaveLength(0);
  });

  it("falls back to BioSample accession only after identifier lookup", () => {
    const outcome = matchAstRecords([ast("r1", "SAMN001")], [isolate("ISO-1", "SAMN001")]);
    expect(outcome.matched).toHaveLength(1);
    expect(outcome.matched[0].via).toBe("biosample");
  });

  it("marks duplicates ambiguous instead of choosing arbitrarily", () => {
    const outcome = matchAstRecords(
      [ast("r1", "A1")],
      [isolate("A1", "SAMN1"), isolate("A1", "SAMN2")]
    );
    expect(outcome.matched).toHaveLength(0);
    expect(outcome.ambiguous).toHaveLength(1);
    expect(outcome.ambiguous[0].candidates).toHaveLength(2);
  });

  it("never performs name-like fuzzy matching automatically", () => {
    const outcome = matchAstRecords([ast("r1", "E. coli isolate 1")], [isolate("A1")]);
    expect(outcome.matched).toHaveLength(0);
    expect(outcome.unmatched).toHaveLength(1);
  });
});

describe("human-review suggestions", () => {
  it("suggests only near matches with a confidence label and no auto-apply", () => {
    const unmatched = [ast("r9", "SAMN12X")];
    const suggestions = suggestMatches(unmatched, [isolate("ISO-9", "SAMN123")]);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].suggestedIsolateId).toBe("ISO-9");
    expect(suggestions[0].confidence).toBe("medium");
    expect(suggestions[0].reason).toMatch(/human confirmation/i);
  });

  it("returns nothing for distant identifiers", () => {
    expect(suggestMatches([ast("r9", "ZZZ999")], [isolate("ISO-1", "SAMN123")])).toHaveLength(0);
  });
});
