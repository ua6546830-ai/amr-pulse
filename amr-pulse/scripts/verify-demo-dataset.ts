import fs from "node:fs";
import path from "node:path";
import { parseTable, toAst, toEvidence, toGeneCalls, toIsolates } from "../src/lib/imports/adapters";
import { runAnalysis } from "../src/lib/analysis/pipeline";

function read(name: string) {
  return parseTable(fs.readFileSync(path.join("public", "demo", name), "utf8"));
}

const isolates = toIsolates(read("demo-isolates.csv").rows);
const geneCalls = toGeneCalls(read("demo-gene-calls.csv").rows);
const ast = toAst(read("demo-ast-results.csv").rows);
const evidence = toEvidence(read("gene-drug-evidence.csv").rows);
const result = runAnalysis({
  isolates,
  geneCalls,
  astResults: ast,
  evidence,
  options: { requirePanel: true, antibiotic: "ceftriaxone" },
});
const truth = JSON.parse(fs.readFileSync(path.join("src/server/fixtures/demo-benchmark-truth.json"), "utf8"));
const expected = truth.expected.ceftriaxone;

const actual = {
  eligiblePairs: result.summary.eligiblePairs,
  classifications: {
    concordant_resistant: result.summary.concordantResistant.numerator,
    concordant_susceptible: result.summary.concordantSusceptible.numerator,
    candidate_gene_positive_phenotype_susceptible:
      result.summary.candidateGenePositivePhenotypeSusceptible.numerator,
    candidate_phenotype_resistant_no_known_determinant:
      result.summary.candidatePhenotypeResistantNoKnownDeterminant.numerator,
  },
  indeterminatePairs: result.counts.indeterminatePairs,
  exclusionsByReason: Object.fromEntries(result.exclusions.map((e) => [e.reason, e.count])),
  astRows: result.counts.astRows,
  uniquePairs: result.counts.uniqueIsolateDrugPairs,
  duplicateRows: result.dataQuality.duplicateRows,
  agreement: result.summary.agreement.proportion,
};

const checks: [string, unknown, unknown][] = [
  ["eligiblePairs", actual.eligiblePairs, expected.eligiblePairs],
  ["concordant_resistant", actual.classifications.concordant_resistant, expected.classifications.concordant_resistant],
  ["concordant_susceptible", actual.classifications.concordant_susceptible, expected.classifications.concordant_susceptible],
  [
    "candidate_gene_positive_phenotype_susceptible",
    actual.classifications.candidate_gene_positive_phenotype_susceptible,
    expected.classifications.candidate_gene_positive_phenotype_susceptible,
  ],
  [
    "candidate_phenotype_resistant_no_known_determinant",
    actual.classifications.candidate_phenotype_resistant_no_known_determinant,
    expected.classifications.candidate_phenotype_resistant_no_known_determinant,
  ],
  ["indeterminatePairs", actual.indeterminatePairs, expected.indeterminatePairs],
  ["astRows", actual.astRows, expected.astRows],
  ["uniquePairs", actual.uniquePairs, expected.uniquePairs],
  ["duplicateRows", actual.duplicateRows, expected.duplicateRows],
];
for (const [reason, count] of Object.entries(expected.exclusionsByReason as Record<string, number>)) {
  checks.push([`exclusion:${reason}`, actual.exclusionsByReason[reason] ?? 0, count]);
}

let failed = 0;
for (const [name, a, e] of checks) {
  const ok = a === e;
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: actual=${String(a)} expected=${String(e)}`);
}
console.log(`agreement actual=${actual.agreement?.toFixed(4)} expected=${Number(expected.agreement).toFixed(4)}`);
if (failed > 0) {
  console.error(`${failed} check(s) failed`);
  process.exit(1);
}
console.log("Benchmark reproduced exactly.");
