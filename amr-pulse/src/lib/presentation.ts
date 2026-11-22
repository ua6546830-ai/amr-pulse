import type { Classification, ExclusionReason, AstCategory } from "@/types/domain";

type BadgeVariant = "neutral" | "blue" | "cyan" | "teal" | "green" | "amber" | "red" | "outline" | "dark";

export const CLASSIFICATION_META: Record<
  Classification,
  { label: string; short: string; description: string; variant: BadgeVariant; color: string }
> = {
  concordant_resistant: {
    label: "Concordant resistant",
    short: "R / determinant +",
    description: "Submitted resistant category and a curated determinant was detected.",
    variant: "teal",
    color: "#0F9D8A",
  },
  concordant_susceptible: {
    label: "Concordant susceptible",
    short: "S / no determinant",
    description: "Submitted susceptible category and no curated determinant was detected.",
    variant: "blue",
    color: "#2563EB",
  },
  candidate_gene_positive_phenotype_susceptible: {
    label: "Gene positive / phenotype susceptible",
    short: "Gene + / S",
    description: "A curated determinant was detected but the submitted category is susceptible. Candidate discordance.",
    variant: "amber",
    color: "#B45309",
  },
  candidate_phenotype_resistant_no_known_determinant: {
    label: "Phenotype resistant / no known determinant",
    short: "R / no determinant",
    description: "Submitted resistant category without a detected curated determinant. Candidate discordance.",
    variant: "red",
    color: "#B91C1C",
  },
  indeterminate: {
    label: "Indeterminate",
    short: "Indeterminate",
    description: "The record cannot support a binary comparison (intermediate, non-susceptible, or unresolved determinant).",
    variant: "neutral",
    color: "#94A3B8",
  },
};

export const AST_CATEGORY_META: Record<AstCategory, { label: string; variant: BadgeVariant }> = {
  S: { label: "Susceptible", variant: "blue" },
  I: { label: "Intermediate", variant: "amber" },
  R: { label: "Resistant", variant: "red" },
  SDD: { label: "Susceptible-dose dependent", variant: "cyan" },
  NS: { label: "Non-susceptible", variant: "amber" },
  U: { label: "Unknown / missing", variant: "neutral" },
};

export const EXCLUSION_LABELS: Record<ExclusionReason, string> = {
  unmatched_ast_isolate: "AST without exact isolate match",
  unmatched_gene_isolate: "Gene call without exact isolate match",
  duplicate_isolate_conflict: "Duplicate isolate identifier",
  unsupported_organism: "Organism without curated evidence",
  unsupported_antibiotic: "Unsupported organism–antibiotic pair",
  missing_genomic_panel: "No AMR screening provenance",
  missing_ast_category: "Missing interpretable category",
  conflicting_ast_categories: "Conflicting submitted categories",
  intermediate_or_nonbinary_category: "Intermediate / non-binary category",
  unresolved_determinant_variant: "Unresolved determinant variant",
  invalid_measurement: "Uninterpretable measurement",
};

export const VALIDATION_CODE_LABELS: Record<string, string> = {
  missing_isolate_id: "Missing isolate identifier",
  missing_organism: "Missing organism",
  duplicate_isolate_id: "Duplicate isolate identifier",
  missing_amr_panel: "No AMR panel provenance",
  accession_format: "Non-standard BioSample format",
  missing_ast_isolate: "AST row without isolate ID",
  missing_or_invalid_category: "Missing or invalid category",
  missing_measurement: "No numeric measurement",
  missing_interpretation_standard: "No interpretation standard",
  unmatched_ast: "AST without exact isolate match",
  no_supported_gene_drug_mapping: "No curated gene–drug mapping",
  conflicting_ast_observations: "Conflicting AST observations",
  duplicate_ast_observation: "Duplicate AST observation",
  unmatched_gene_call: "Unmatched gene call",
  unsupported_gene_association: "Unsupported gene association",
  evidence_missing_source: "Evidence without source",
  evidence_not_verified: "Evidence not fully verified",
};

export function validationLabel(code: string): string {
  return VALIDATION_CODE_LABELS[code] ?? code.replace(/_/g, " ");
}

export function severityVariant(severity: "critical" | "warning" | "info"): BadgeVariant {
  if (severity === "critical") return "red";
  if (severity === "warning") return "amber";
  return "neutral";
}

export function classificationCounts(summary: {
  concordantResistant: { numerator: number };
  concordantSusceptible: { numerator: number };
  candidateGenePositivePhenotypeSusceptible: { numerator: number };
  candidatePhenotypeResistantNoKnownDeterminant: { numerator: number };
}) {
  return {
    concordantResistant: summary.concordantResistant.numerator,
    concordantSusceptible: summary.concordantSusceptible.numerator,
    genePositiveSusceptible: summary.candidateGenePositivePhenotypeSusceptible.numerator,
    resistantNoDeterminant: summary.candidatePhenotypeResistantNoKnownDeterminant.numerator,
  };
}

export function candidateDiscordanceCount(summary: {
  candidateGenePositivePhenotypeSusceptible: { numerator: number };
  candidatePhenotypeResistantNoKnownDeterminant: { numerator: number };
}) {
  return (
    summary.candidateGenePositivePhenotypeSusceptible.numerator +
    summary.candidatePhenotypeResistantNoKnownDeterminant.numerator
  );
}
