import type { AstRecord, IsolateRecord } from "@/types/domain";

export interface MatchOutcome {
  matched: { ast: AstRecord; isolate: IsolateRecord; via: "isolate_id" | "biosample" }[];
  unmatched: AstRecord[];
  ambiguous: { ast: AstRecord; candidates: IsolateRecord[] }[];
}

export function normalizeAccession(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function buildAccessionIndex(isolates: IsolateRecord[]): {
  byId: Map<string, IsolateRecord[]>;
  byBiosample: Map<string, IsolateRecord[]>;
} {
  const byId = new Map<string, IsolateRecord[]>();
  const byBiosample = new Map<string, IsolateRecord[]>();
  for (const iso of isolates) {
    const id = normalizeAccession(iso.isolateId);
    byId.set(id, [...(byId.get(id) ?? []), iso]);
    if (iso.biosampleAccession) {
      const bs = normalizeAccession(iso.biosampleAccession);
      byBiosample.set(bs, [...(byBiosample.get(bs) ?? []), iso]);
    }
  }
  return { byId, byBiosample };
}

/**
 * Exact-only matching. Case/whitespace normalisation is applied because accession formats are
 * defined case-insensitively, but no organism/name-based joining is ever performed.
 */
export function matchAstRecords(ast: AstRecord[], isolates: IsolateRecord[]): MatchOutcome {
  const index = buildAccessionIndex(isolates);
  const matched: MatchOutcome["matched"] = [];
  const unmatched: AstRecord[] = [];
  const ambiguous: MatchOutcome["ambiguous"] = [];

  for (const record of ast) {
    const key = normalizeAccession(record.isolateId);
    const byId = index.byId.get(key) ?? [];
    if (byId.length === 1) {
      matched.push({ ast: record, isolate: byId[0], via: "isolate_id" });
      continue;
    }
    const byBs = index.byBiosample.get(key) ?? [];
    if (byBs.length === 1) {
      matched.push({ ast: record, isolate: byBs[0], via: "biosample" });
      continue;
    }
    if (byId.length > 1 || byBs.length > 1) {
      ambiguous.push({ ast: record, candidates: byId.length > 1 ? byId : byBs });
      continue;
    }
    unmatched.push(record);
  }
  return { matched, unmatched, ambiguous };
}

function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const prev = new Array(b.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = temp;
    }
  }
  return prev[b.length];
}

export interface MatchSuggestion {
  astRecordId: string;
  unmatchedIdentifier: string;
  suggestedIsolateId: string;
  reason: string;
  confidence: "low" | "medium";
}

/** Suggestions only — never applied automatically. */
export function suggestMatches(unmatched: AstRecord[], isolates: IsolateRecord[], limit = 5): MatchSuggestion[] {
  const suggestions: MatchSuggestion[] = [];
  for (const record of unmatched) {
    const key = normalizeAccession(record.isolateId);
    const scored = isolates
      .map((iso) => {
        const candidates = [iso.isolateId, iso.biosampleAccession ?? ""].filter(Boolean).map(normalizeAccession);
        const distance = Math.min(...candidates.map((c) => editDistance(key, c)));
        return { iso, distance };
      })
      .filter(({ distance }) => distance <= 2)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
    for (const { iso, distance } of scored) {
      suggestions.push({
        astRecordId: record.recordId,
        unmatchedIdentifier: record.isolateId,
        suggestedIsolateId: iso.isolateId,
        reason: `Accession edit distance ${distance}; identical organism/collection context is NOT assumed. Human confirmation required.`,
        confidence: distance === 1 ? "medium" : "low",
      });
    }
  }
  return suggestions;
}
