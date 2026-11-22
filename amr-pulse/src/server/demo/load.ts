import fs from "node:fs";
import path from "node:path";
import type { AstRecord, GeneCallRecord, GeneDrugEvidence, IsolateRecord } from "@/types/domain";
import { parseTable, toAst, toEvidence, toGeneCalls, toIsolates } from "@/lib/imports/adapters";
import { runAnalysis, type AnalysisResult } from "@/lib/analysis/pipeline";
import { runValidation, type ValidationReport } from "@/lib/validation/engine";
import { matchAstRecords, suggestMatches, type MatchOutcome, type MatchSuggestion } from "@/lib/matching";

export interface DemoManifest {
  datasetName: string;
  datasetType: string;
  generatorVersion: string;
  generatorScript: string;
  seed: number;
  generatedAt: string;
  label: string;
  counts: Record<string, number>;
  files: string[];
  intendedUse: string[];
  limitations: string[];
  provenance: { source: string; licence: string };
}

export interface DemoDataset {
  manifest: DemoManifest;
  isolates: IsolateRecord[];
  geneCalls: GeneCallRecord[];
  ast: AstRecord[];
  evidence: GeneDrugEvidence[];
  analysis: AnalysisResult;
  primary: AnalysisResult;
  validation: ValidationReport;
  matching: MatchOutcome;
  suggestions: MatchSuggestion[];
  parseErrors: string[];
}

const DEMO_DIR = path.join(process.cwd(), "public", "demo");

function readCsv(name: string) {
  const text = fs.readFileSync(path.join(DEMO_DIR, name), "utf8");
  return parseTable(text);
}

let instance: Promise<DemoDataset> | null = null;

export function getDemoDataset(): Promise<DemoDataset> {
  instance ??= loadDemoDataset();
  return instance;
}

async function loadDemoDataset(): Promise<DemoDataset> {
  const isolatesTable = readCsv("demo-isolates.csv");
  const genesTable = readCsv("demo-gene-calls.csv");
  const astTable = readCsv("demo-ast-results.csv");
  const evidenceTable = readCsv("gene-drug-evidence.csv");

  const isolates = toIsolates(isolatesTable.rows);
  const geneCalls = toGeneCalls(genesTable.rows);
  const ast = toAst(astTable.rows);
  const evidence = toEvidence(evidenceTable.rows);

  const analysis = runAnalysis({ isolates, geneCalls, astResults: ast, evidence, options: { requirePanel: true } });
  const primary = runAnalysis({
    isolates,
    geneCalls,
    astResults: ast,
    evidence,
    options: { requirePanel: true, organism: "Escherichia coli", antibiotic: "ceftriaxone" },
  });

  const matching = matchAstRecords(ast, isolates);
  const validation = runValidation({ isolates, geneCalls, ast, evidence, requirePanel: true });
  const manifest = JSON.parse(fs.readFileSync(path.join(DEMO_DIR, "demo-manifest.json"), "utf8")) as DemoManifest;

  return {
    manifest,
    isolates,
    geneCalls,
    ast,
    evidence,
    analysis,
    primary,
    validation,
    matching,
    suggestions: suggestMatches(matching.unmatched, isolates, 2),
    parseErrors: [...isolatesTable.errors, ...genesTable.errors, ...astTable.errors, ...evidenceTable.errors],
  };
}

export async function getDemoTruth() {
  const file = path.join(process.cwd(), "src", "server", "fixtures", "demo-benchmark-truth.json");
  return JSON.parse(fs.readFileSync(file, "utf8")) as {
    seed: number;
    expected: {
      ceftriaxone: {
        eligiblePairs: number;
        classifications: Record<string, number>;
        indeterminatePairs: number;
        exclusionsByReason: Record<string, number>;
        astRows: number;
        uniquePairs: number;
        duplicateRows: number;
        agreement: number;
      };
      escherichia_coli_ceftriaxone: {
        eligiblePairs: number;
        classifications: Record<string, number>;
        indeterminatePairs: number;
        exclusionsByReason: Record<string, number>;
        astRows: number;
        uniquePairs: number;
        duplicateRows: number;
        agreement: number;
      };
    };
  };
}
