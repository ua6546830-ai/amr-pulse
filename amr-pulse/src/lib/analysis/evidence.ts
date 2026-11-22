import type { GeneDrugEvidence, GeneCallRecord } from "@/types/domain";

export const ANALYSIS_VERSION = "1.0.0";
export const MAPPING_VERSION = "amr-pulse-evidmap-2026.11.1";

const THIRD_GENERATION_CEPHALOSPORINS = new Set([
  "ceftriaxone",
  "cefotaxime",
  "ceftazidime",
  "cefepime",
  "cefpodoxime",
  "cefdinir",
]);

export function normalizeOrganism(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ").replace(/\bspp?\.?$/i, "").trim();
}

export function normalizeDrug(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Gene symbols in public annotations are frequently composite or descriptive; keep the primary symbol. */
export function primaryGeneSymbol(value: string): string {
  return value.split(/[,;]/)[0].trim();
}

function normalizedGene(value: string): string {
  return primaryGeneSymbol(value).toLowerCase().replace(/\s+/g, " ");
}

export function geneMatchesMapping(gene: string, mapping: GeneDrugEvidence): boolean {
  const g = normalizedGene(gene);
  const target = normalizedGene(mapping.geneOrMutation);
  if (!g || !target) return false;
  if (g === target) return true;
  // Family-level entries (e.g. blaCTX-M) match allele-level annotations (blaCTX-M-15).
  return g.startsWith(`${target}-`) || g.startsWith(`${target} `);
}

export function isContributingEvidence(entry: GeneDrugEvidence): boolean {
  return (
    entry.verificationStatus === "verified" &&
    (entry.evidenceLevel === "established" || entry.evidenceLevel === "strong")
  );
}

export function evidenceForPair(
  evidence: GeneDrugEvidence[],
  organism: string,
  drug: string
): GeneDrugEvidence[] {
  const o = normalizeOrganism(organism);
  const d = normalizeDrug(drug);
  return evidence.filter(
    (e) => normalizeOrganism(e.organism) === o && normalizeDrug(e.drug) === d
  );
}

export function supportedDrugsForOrganism(evidence: GeneDrugEvidence[], organism: string): string[] {
  const o = normalizeOrganism(organism);
  return [...new Set(evidence.filter((e) => normalizeOrganism(e.organism) === o).map((e) => e.drug))];
}

/**
 * A generic TEM/SHV symbol cannot be interpreted for third-generation cephalosporins
 * without allele-level resolution. Treating it as a resistance determinant would create
 * false genotype-positive/phenotype-susceptible discordance.
 */
export function isUnresolvedVariantForDrug(gene: string, drug: string): boolean {
  if (!THIRD_GENERATION_CEPHALOSPORINS.has(normalizeDrug(drug))) return false;
  return /^bla(tem|shv)(-\d+)?$/i.test(primaryGeneSymbol(gene));
}

export interface GeneEvaluation {
  matched: GeneDrugEvidence[];
  matchedGenes: string[];
  unresolvedGenes: string[];
  contextDependentGenes: string[];
}

export function evaluateGenes(
  geneCalls: GeneCallRecord[],
  evidence: GeneDrugEvidence[],
  organism: string,
  drug: string
): GeneEvaluation {
  const pairEvidence = evidenceForPair(evidence, organism, drug);
  const contributing = pairEvidence.filter(isContributingEvidence);
  const matched: GeneDrugEvidence[] = [];
  const matchedGenes: string[] = [];
  const unresolvedGenes: string[] = [];
  const contextDependentGenes: string[] = [];

  for (const call of geneCalls) {
    const entry = contributing.find((e) => geneMatchesMapping(call.geneSymbol, e));
    if (entry) {
      if (!matched.some((m) => m.geneOrMutation === entry.geneOrMutation)) matched.push(entry);
      if (!matchedGenes.includes(primaryGeneSymbol(call.geneSymbol))) matchedGenes.push(primaryGeneSymbol(call.geneSymbol));
      continue;
    }
    const context = pairEvidence.find(
      (e) => e.verificationStatus === "context_dependent" && geneMatchesMapping(call.geneSymbol, e)
    );
    if (context) {
      if (!contextDependentGenes.includes(primaryGeneSymbol(call.geneSymbol)))
        contextDependentGenes.push(primaryGeneSymbol(call.geneSymbol));
      continue;
    }
    if (isUnresolvedVariantForDrug(call.geneSymbol, drug)) {
      if (!unresolvedGenes.includes(primaryGeneSymbol(call.geneSymbol)))
        unresolvedGenes.push(primaryGeneSymbol(call.geneSymbol));
    }
  }

  return { matched, matchedGenes, unresolvedGenes, contextDependentGenes };
}
