export type AstCategory = "S" | "I" | "R" | "SDD" | "NS" | "U";

export interface IsolateRecord {
  isolateId: string;
  biosampleAccession?: string;
  organism: string;
  collectionDate?: string;
  country?: string;
  isolationSource?: string;
  assemblyAccession?: string;
  genomeQuality?: string;
  amrPanelVersion?: string;
  studyId?: string;
}

export interface GeneCallRecord {
  isolateId: string;
  geneSymbol: string;
  geneName?: string;
  drugClass?: string;
  mechanism?: string;
  detectionMethod?: string;
  database?: string;
  databaseVersion?: string;
  identityPct?: number;
  coveragePct?: number;
  contigId?: string;
}

export interface AstRecord {
  recordId: string;
  isolateId: string;
  antibiotic: string;
  drugClass?: string;
  method?: string;
  measurement?: string;
  measurementUnit?: string;
  interpretationRaw: string;
  interpretationStandard?: string;
  breakpointVersion?: string;
  testingYear?: string;
  labId?: string;
}

export type EvidenceLevel = "established" | "strong" | "moderate" | "context-dependent" | "unresolved";
export type VerificationStatus = "verified" | "needs_review" | "context_dependent" | "unverified";

export interface GeneDrugEvidence {
  organism: string;
  geneOrMutation: string;
  drug: string;
  drugClass: string;
  mechanism: string;
  evidenceLevel: EvidenceLevel;
  evidenceSource: string;
  sourceUrl: string;
  database: string;
  databaseVersion: string;
  verificationStatus: VerificationStatus;
  mappingVersion: string;
  notes?: string;
}

export type DeterminantStatus = "positive" | "none_detected" | "unresolved_variant" | "not_screened";

export type Classification =
  | "concordant_resistant"
  | "concordant_susceptible"
  | "candidate_gene_positive_phenotype_susceptible"
  | "candidate_phenotype_resistant_no_known_determinant"
  | "indeterminate";

export type ExclusionReason =
  | "unmatched_ast_isolate"
  | "unmatched_gene_isolate"
  | "duplicate_isolate_conflict"
  | "unsupported_organism"
  | "unsupported_antibiotic"
  | "missing_genomic_panel"
  | "missing_ast_category"
  | "conflicting_ast_categories"
  | "intermediate_or_nonbinary_category"
  | "unresolved_determinant_variant"
  | "invalid_measurement";

export interface AnalysedPair {
  isolateId: string;
  organism: string;
  antibiotic: string;
  astRecordId: string;
  phenotype: AstCategory;
  phenotypeRaw: string;
  determinantStatus: DeterminantStatus;
  detectedGenes: string[];
  unresolvedGenes: string[];
  mappedGeneClasses: string[];
  classification: Classification;
  includedInPrimary: boolean;
  exclusionReason?: ExclusionReason;
  astMethod?: string;
  astStandard?: string;
  testingYear?: string;
  measurement?: string;
  measurementUnit?: string;
}

export interface ExclusionGroup {
  reason: ExclusionReason;
  count: number;
  recordIds: string[];
  explanation: string;
}

export interface ProportionEstimate {
  numerator: number;
  denominator: number;
  proportion: number | null;
  ci95: [number, number] | null;
}

export interface ClassificationSummary {
  eligiblePairs: number;
  concordantResistant: ProportionEstimate;
  concordantSusceptible: ProportionEstimate;
  candidateGenePositivePhenotypeSusceptible: ProportionEstimate;
  candidatePhenotypeResistantNoKnownDeterminant: ProportionEstimate;
  agreement: ProportionEstimate;
  determinantPositivePredictiveValue: ProportionEstimate;
  determinantNegativeResistantProportion: ProportionEstimate;
}

export interface DataQualitySummary {
  astRows: number;
  uniquePairs: number;
  duplicateRows: number;
  duplicateGenomes: number;
  missingInterpretationPct: number;
  missingMeasurementPct: number;
  missingStandardPct: number;
  missingTestingYearPct: number;
  missingCountryPct: number;
  missingCollectionDatePct: number;
  mixedStandards: { standard: string; count: number }[];
  methods: { method: string; count: number }[];
  genomes: number;
  screenedGenomes: number;
}

export interface AnalysisResult {
  meta: {
    analysisVersion: string;
    mappingVersion: string;
    generatedAt: string;
    organism: string;
    antibiotic: string;
    requirePanel: boolean;
  };
  counts: {
    isolates: number;
    geneCalls: number;
    astRows: number;
    uniqueIsolateDrugPairs: number;
    eligiblePairs: number;
    indeterminatePairs: number;
  };
  summary: ClassificationSummary;
  exclusions: ExclusionGroup[];
  dataQuality: DataQualitySummary;
  pairs: AnalysedPair[];
  byDrug: DrugSummary[];
  byOrganism: OrganismSummary[];
  discordances: AnalysedPair[];
}

export interface DrugSummary {
  drug: string;
  drugClass: string;
  eligible: number;
  concordantResistant: number;
  concordantSusceptible: number;
  genePositiveSusceptible: number;
  resistantNoKnownDeterminant: number;
  indeterminate: number;
  agreement: number | null;
}

export interface OrganismSummary {
  organism: string;
  isolates: number;
  eligiblePairs: number;
  genePositiveSusceptible: number;
  resistantNoKnownDeterminant: number;
  agreement: number | null;
}
