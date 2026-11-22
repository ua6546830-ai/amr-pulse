/**
 * AMR PULSE demonstration dataset generator.
 * Deterministic (fixed seed). SYNTHETIC — no real patients, isolates, hospitals or countries data.
 * Scenario tags are the benchmark answer key; expected counts are computed from them independently
 * of the analysis engine.
 */
import fs from "node:fs";
import path from "node:path";

const SEED = 20261122;
const GENERATOR_VERSION = "1.0.0";
const MAPPING_VERSION = "amr-pulse-demo-evidmap-2026.11.1";
const OUT_DEMO = path.resolve("public", "demo");
const OUT_FIXTURES = path.resolve("src", "server", "fixtures");
fs.mkdirSync(OUT_DEMO, { recursive: true });
fs.mkdirSync(OUT_FIXTURES, { recursive: true });

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
const pick = <T,>(items: T[]): T => items[Math.floor(rand() * items.length)];
const chance = (p: number) => rand() < p;
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

const countries = ["USA", "DEU", "GBR", "IND", "BRA", "KEN", "JPN", "AUS"];
const sources = ["urine", "blood", "wound swab", "sputum", "stool", "environmental water", "food"];
const studies = ["SYN-STUDY-01", "SYN-STUDY-02", "SYN-STUDY-03", "SYN-STUDY-04"];
const panelVersions = ["AMRFinderPlus demo panel 2026.11", "AMRFinderPlus demo panel 2026.05"];

function dateFor(index: number): string {
  const year = 2019 + (index % 6);
  return `${year}-${String(1 + (index * 7) % 12).padStart(2, "0")}-${String(1 + (index * 11) % 28).padStart(2, "0")}`;
}

interface Isolate {
  isolateId: string;
  organism: string;
  scenario: string;
  genes: GeneCall[];
  collectionDate: string;
  country: string;
  source: string;
  panel: string;
  study: string;
}
interface GeneCall {
  isolateId: string;
  geneSymbol: string;
  geneName: string;
  drugClass: string;
  mechanism: string;
  method: string;
  database: string;
  databaseVersion: string;
  identity: string;
  coverage: string;
  contig: string;
}
interface AstRow {
  recordId: string;
  isolateId: string;
  antibiotic: string;
  drugClass: string;
  method: string;
  measurement: string;
  unit: string;
  interpretation: string;
  standard: string;
  breakpoint: string;
  year: string;
  lab: string;
  scenarioTag: string;
}

const GENE_INFO: Record<string, { name: string; cls: string; mech: string }> = {
  "blaCTX-M-15": { name: "CTX-M-15 extended-spectrum beta-lactamase", cls: "Cephalosporins", mech: "Enzymatic hydrolysis (ESBL)" },
  "blaCTX-M-27": { name: "CTX-M-27 extended-spectrum beta-lactamase", cls: "Cephalosporins", mech: "Enzymatic hydrolysis (ESBL)" },
  "blaCTX-M-14": { name: "CTX-M-14 extended-spectrum beta-lactamase", cls: "Cephalosporins", mech: "Enzymatic hydrolysis (ESBL)" },
  "blaCMY-2": { name: "CMY-2 plasmid-mediated AmpC beta-lactamase", cls: "Cephalosporins", mech: "Enzymatic hydrolysis (AmpC)" },
  "blaSHV-12": { name: "SHV-12 extended-spectrum beta-lactamase", cls: "Cephalosporins", mech: "Enzymatic hydrolysis (ESBL)" },
  "blaKPC-2": { name: "KPC-2 carbapenemase", cls: "Carbapenems", mech: "Enzymatic hydrolysis (carbapenemase)" },
  "blaNDM-1": { name: "NDM-1 metallo-beta-lactamase", cls: "Carbapenems", mech: "Enzymatic hydrolysis (carbapenemase)" },
  "blaOXA-48": { name: "OXA-48-like carbapenemase", cls: "Carbapenems", mech: "Enzymatic hydrolysis (carbapenemase)" },
  "blaTEM-1": { name: "TEM-1 penicillinase", cls: "Penicillins", mech: "Enzymatic hydrolysis (penicillinase)" },
  "blaSHV-1": { name: "SHV-1 penicillinase", cls: "Penicillins", mech: "Enzymatic hydrolysis (penicillinase)" },
  "blaEC": { name: "Chromosomal AmpC beta-lactamase (BlaEC family)", cls: "Cephalosporins", mech: "Chromosomal AmpC, expression-dependent" },
  "blaSYN-1": { name: "Uncharacterised synthetic beta-lactamase placeholder", cls: "Unknown", mech: "Unknown — deliberately unmapped" },
  "aac(6')-Ib-cr": { name: "AAC(6')-Ib-cr fluoroquinolone acetyltransferase", cls: "Fluoroquinolones", mech: "Enzymatic modification" },
  qnrS1: { name: "QnrS1 pentapeptide repeat protein", cls: "Fluoroquinolones", mech: "Target protection" },
  "tet(A)": { name: "Tet(A) tetracycline efflux pump", cls: "Tetracyclines", mech: "Efflux" },
  sul1: { name: "Sul1 dihydropteroate synthase variant", cls: "Sulfonamides", mech: "Target replacement" },
  dfrA17: { name: "DfrA17 trimethoprim-resistant dihydrofolate reductase", cls: "Diaminopyrimidines", mech: "Target replacement" },
  "aac(3)-IIa": { name: "AAC(3)-IIa aminoglycoside acetyltransferase", cls: "Aminoglycosides", mech: "Enzymatic modification" },
};

function gene(isolateId: string, symbol: string, idx: number): GeneCall {
  const info = GENE_INFO[symbol];
  return {
    isolateId,
    geneSymbol: symbol,
    geneName: info.name,
    drugClass: info.cls,
    mechanism: info.mech,
    method: symbol === "blaEC" ? "AMRFinderPlus + curated" : "AMRFinderPlus",
    database: "NCBI AMRFinderPlus reference gene catalog",
    databaseVersion: "catalogue snapshot 2026-11-22",
    identity: (97 + rand() * 2.9).toFixed(1),
    coverage: (96 + rand() * 4).toFixed(1),
    contig: `SYN-CONTIG-${String(idx).padStart(4, "0")}`,
  };
}

const isolates: Isolate[] = [];
const geneCalls: GeneCall[] = [];
let geneIdx = 1;

function addGenes(iso: Isolate, symbols: string[]) {
  for (const s of [...new Set(symbols)]) {
    const call = gene(iso.isolateId, s, geneIdx++);
    iso.genes.push(call);
    geneCalls.push(call);
  }
}

function makeIsolate(prefix: string, n: number, scenario: string): Isolate {
  const isolateId = `SYN-${prefix}-${String(n).padStart(4, "0")}`;
  const missingMeta = chance(0.05);
  const iso: Isolate = {
    isolateId,
    organism: prefix === "EC" ? "Escherichia coli" : "Klebsiella pneumoniae",
    scenario,
    genes: [],
    collectionDate: missingMeta ? "" : dateFor(n),
    country: chance(0.03) ? "" : pick(countries),
    source: chance(0.04) ? "" : pick(sources),
    panel: scenario === "missing_panel" ? "" : pick(panelVersions),
    study: pick(studies),
  };
  return iso;
}

const ecScenarios: [string, number][] = [
  ["cr_esbl", 34],
  ["cs_plain", 62],
  ["cs_duplicate", 8],
  ["gene_pos_s", 5],
  ["r_no_det", 35],
  ["unknown_gene_r", 3],
  ["unresolved_s", 6],
  ["intermediate", 3],
  ["missing_category", 5],
  ["conflict", 4],
  ["missing_panel", 5],
];
const kpScenarios: [string, number][] = [
  ["cr_carba", 18],
  ["cs_plain", 20],
  ["gene_pos_s", 2],
  ["r_no_det", 6],
  ["conflict", 2],
  ["missing_panel", 2],
];

let ecCounter = 0;
for (const [scenario, count] of ecScenarios) {
  for (let i = 0; i < count; i++) {
    ecCounter += 1;
    const iso = makeIsolate("EC", ecCounter, scenario);
    switch (scenario) {
      case "cr_esbl":
        addGenes(iso, [pick(["blaCTX-M-15", "blaCTX-M-27", "blaCTX-M-14", "blaCMY-2"]), ...(chance(0.6) ? ["blaTEM-1"] : [])]);
        break;
      case "gene_pos_s":
        addGenes(iso, [pick(["blaCTX-M-15", "blaCMY-2"]), ...(chance(0.5) ? ["blaTEM-1"] : [])]);
        break;
      case "unknown_gene_r":
        addGenes(iso, ["blaSYN-1"]);
        break;
      case "unresolved_s":
        addGenes(iso, [pick(["blaTEM-1", "blaSHV-1"])]);
        break;
      case "missing_panel":
        addGenes(iso, [pick(["blaCTX-M-15", "blaTEM-1"])]);
        break;
      default:
        if (chance(0.25)) addGenes(iso, ["blaEC"]);
        break;
    }
    isolates.push(iso);
  }
}

let kpCounter = 0;
for (const [scenario, count] of kpScenarios) {
  for (let i = 0; i < count; i++) {
    kpCounter += 1;
    const iso = makeIsolate("KP", kpCounter, scenario);
    switch (scenario) {
      case "cr_carba": {
        const carba = pick(["blaKPC-2", "blaNDM-1", "blaOXA-48"]);
        // OXA-48 alone is not a verified ceftriaxone determinant; co-carriage keeps the
        // intended concordant-resistant ceftriaxone scenario biologically coherent.
        addGenes(iso, [carba, ...(carba === "blaOXA-48" || chance(0.6) ? ["blaCTX-M-15"] : [])]);
        break;
      }
      case "gene_pos_s":
        addGenes(iso, ["blaCTX-M-15"]);
        break;
      case "missing_panel":
        addGenes(iso, ["blaKPC-2"]);
        break;
      case "cs_plain":
        if (chance(0.25)) addGenes(iso, ["blaEC"]);
        break;
    }
    isolates.push(iso);
  }
}

for (const iso of isolates) {
  if (chance(0.28)) addGenes(iso, ["tet(A)"]);
  if (chance(0.2)) addGenes(iso, ["sul1"]);
  if (chance(0.15)) addGenes(iso, ["dfrA17"]);
  if (chance(0.12)) addGenes(iso, ["aac(6')-Ib-cr"]);
  else if (chance(0.08)) addGenes(iso, ["qnrS1"]);
  if (chance(0.1)) addGenes(iso, ["aac(3)-IIa"]);
}

const astRows: AstRow[] = [];
let astCounter = 1;
const lab = "SYN-LAB-01";
const standard = () => (chance(0.55) ? "CLSI" : "EUCAST");

function addAst(iso: Isolate, antibiotic: string, drugClass: string, interpretation: string, tag: string, method?: string) {
  const useMic = chance(0.55);
  const recordId = `SYN-AST-${String(astCounter++).padStart(5, "0")}`;
  astRows.push({
    recordId,
    isolateId: iso.isolateId,
    antibiotic,
    drugClass,
    method: method ?? (useMic ? "Broth dilution (MIC)" : "Disk diffusion"),
    measurement: useMic ? String(int(1, 32) * (antibiotic === "ceftriaxone" ? 4 : 1)) : "",
    unit: useMic ? "mg/L" : "mm",
    interpretation,
    standard: chance(0.12) ? "" : standard(),
    breakpoint: chance(0.3) ? "2023" : "",
    year: String(int(2019, 2024)),
    lab,
    scenarioTag: tag,
  });
  return recordId;
}

const drugClass = {
  ceftriaxone: "Third-generation cephalosporins",
  cefotaxime: "Third-generation cephalosporins",
  meropenem: "Carbapenems",
  ciprofloxacin: "Fluoroquinolones",
  tetracycline: "Tetracyclines",
  sulfamethoxazole: "Sulfonamides",
  trimethoprim: "Diaminopyrimidines",
  gentamicin: "Aminoglycosides",
  ampicillin: "Penicillins",
} as const;

const has = (iso: Isolate, s: string) => iso.genes.some((g) => g.geneSymbol === s);
const hasAny = (iso: Isolate, list: string[]) => iso.genes.some((g) => list.includes(g.geneSymbol));

for (const iso of isolates) {
  const s = iso.scenario;
  const ctx3gc = hasAny(iso, ["blaCTX-M-15", "blaCTX-M-27", "blaCTX-M-14", "blaCMY-2", "blaSHV-12", "blaKPC-2", "blaNDM-1"]);
  switch (s) {
    case "cr_esbl":
    case "cr_carba":
      addAst(iso, "ceftriaxone", drugClass.ceftriaxone, "R", "concordant_resistant");
      break;
    case "cs_plain":
    case "cs_duplicate":
      addAst(iso, "ceftriaxone", drugClass.ceftriaxone, "S", "concordant_susceptible");
      if (s === "cs_duplicate") addAst(iso, "ceftriaxone", drugClass.ceftriaxone, "S", "duplicate_same_phenotype");
      break;
    case "gene_pos_s":
      addAst(iso, "ceftriaxone", drugClass.ceftriaxone, "S", "gene_positive_phenotype_susceptible");
      break;
    case "r_no_det":
      addAst(iso, "ceftriaxone", drugClass.ceftriaxone, "R", "resistant_no_known_determinant");
      break;
    case "unknown_gene_r":
      addAst(iso, "ceftriaxone", drugClass.ceftriaxone, "R", "unknown_gene_association");
      break;
    case "unresolved_s":
      addAst(iso, "ceftriaxone", drugClass.ceftriaxone, "S", "unresolved_variant");
      break;
    case "intermediate":
      addAst(iso, "ceftriaxone", drugClass.ceftriaxone, "I", "intermediate_category");
      break;
    case "missing_category":
      addAst(iso, "ceftriaxone", drugClass.ceftriaxone, "", "missing_category");
      break;
    case "conflict":
      addAst(iso, "ceftriaxone", drugClass.ceftriaxone, "S", "conflicting_duplicate");
      addAst(iso, "ceftriaxone", drugClass.ceftriaxone, "R", "conflicting_duplicate");
      break;
    case "missing_panel":
      addAst(iso, "ceftriaxone", drugClass.ceftriaxone, ctx3gc ? "R" : "S", "missing_panel");
      break;
  }

  // Background AST for other drugs (secondary analyses).
  addAst(iso, "ampicillin", drugClass.ampicillin, hasAny(iso, ["blaTEM-1", "blaCTX-M-15", "blaCTX-M-27", "blaCTX-M-14", "blaCMY-2", "blaSHV-12"]) ? "R" : "S", "other_drug");
  if (chance(0.6)) addAst(iso, "ciprofloxacin", drugClass.ciprofloxacin, hasAny(iso, ["aac(6')-Ib-cr", "qnrS1"]) ? "R" : "S", "other_drug");
  if (chance(0.5)) addAst(iso, "tetracycline", drugClass.tetracycline, has(iso, "tet(A)") ? "R" : "S", "other_drug");
  if (chance(0.4)) addAst(iso, "sulfamethoxazole", drugClass.sulfamethoxazole, has(iso, "sul1") ? "R" : "S", "other_drug");
  if (chance(0.3)) addAst(iso, "trimethoprim", drugClass.trimethoprim, has(iso, "dfrA17") ? "R" : "S", "other_drug");
  if (chance(0.3)) addAst(iso, "gentamicin", drugClass.gentamicin, has(iso, "aac(3)-IIa") ? "R" : "S", "other_drug");
  if (chance(0.45)) addAst(iso, "cefotaxime", drugClass.cefotaxime, ctx3gc ? "R" : "S", "other_drug");
  if (iso.organism === "Klebsiella pneumoniae" || chance(0.25)) {
    const carba = hasAny(iso, ["blaKPC-2", "blaNDM-1", "blaOXA-48"]);
    addAst(iso, "meropenem", drugClass.meropenem, carba ? "R" : chance(0.04) ? "R" : "S", "other_drug");
  }
}

// Unmatched AST records: exact accession cannot be linked to any isolate.
for (let i = 1; i <= 6; i++) {
  astRows.push({
    recordId: `SYN-AST-UNMATCHED-${i}`,
    isolateId: `SYN-UNMATCHED-${String(i).padStart(3, "0")}`,
    antibiotic: "ceftriaxone",
    drugClass: drugClass.ceftriaxone,
    method: "Broth dilution (MIC)",
    measurement: "8",
    unit: "mg/L",
    interpretation: "R",
    standard: "CLSI",
    breakpoint: "2023",
    year: "2023",
    lab: "SYN-LAB-EXT",
    scenarioTag: "unmatched_ast",
  });
}

const EVIDENCE_ROWS = [
  ["Escherichia coli", "blaCTX-M", "ceftriaxone", "Third-generation cephalosporins", "ESBL hydrolysis", "established", "NCBI AMRFinderPlus; CARD", "https://github.com/ncbi/amr/wiki", "CARD", "3.2.9", "verified", MAPPING_VERSION, "Family-level mapping to allele-level gene symbols."],
  ["Escherichia coli", "blaCTX-M", "cefotaxime", "Third-generation cephalosporins", "ESBL hydrolysis", "established", "NCBI AMRFinderPlus; CARD", "https://github.com/ncbi/amr/wiki", "CARD", "3.2.9", "verified", MAPPING_VERSION, ""],
  ["Escherichia coli", "blaCTX-M", "ampicillin", "Penicillins", "Enzymatic hydrolysis", "established", "CARD; ResFinder", "https://card.mcmaster.ca/", "CARD", "3.2.9", "verified", MAPPING_VERSION, ""],
  ["Escherichia coli", "blaCMY", "ceftriaxone", "Third-generation cephalosporins", "AmpC hydrolysis", "established", "NCBI AMRFinderPlus; CARD", "https://github.com/ncbi/amr/wiki", "CARD", "3.2.9", "verified", MAPPING_VERSION, "Plasmid-mediated AmpC."],
  ["Escherichia coli", "blaCMY", "cefotaxime", "Third-generation cephalosporins", "AmpC hydrolysis", "established", "NCBI AMRFinderPlus; CARD", "https://github.com/ncbi/amr/wiki", "CARD", "3.2.9", "verified", MAPPING_VERSION, ""],
  ["Escherichia coli", "blaCMY", "ampicillin", "Penicillins", "Enzymatic hydrolysis", "established", "CARD", "https://card.mcmaster.ca/", "CARD", "3.2.9", "verified", MAPPING_VERSION, ""],
  ["Escherichia coli", "blaSHV-12", "ceftriaxone", "Third-generation cephalosporins", "ESBL hydrolysis", "established", "NCBI AMRFinderPlus", "https://github.com/ncbi/amr/wiki", "AMRFinderPlus", "2026-11-22 catalogue", "verified", MAPPING_VERSION, "Allele-specific ESBL."],
  ["Escherichia coli", "blaKPC", "meropenem", "Carbapenems", "Carbapenemase hydrolysis", "established", "NCBI AMRFinderPlus; CARD", "https://github.com/ncbi/amr/wiki", "CARD", "3.2.9", "verified", MAPPING_VERSION, ""],
  ["Escherichia coli", "blaKPC", "ceftriaxone", "Third-generation cephalosporins", "Carbapenemase hydrolysis", "established", "CARD", "https://card.mcmaster.ca/", "CARD", "3.2.9", "verified", MAPPING_VERSION, ""],
  ["Escherichia coli", "blaNDM", "meropenem", "Carbapenems", "Carbapenemase hydrolysis", "established", "NCBI AMRFinderPlus; CARD", "https://github.com/ncbi/amr/wiki", "CARD", "3.2.9", "verified", MAPPING_VERSION, ""],
  ["Escherichia coli", "blaNDM", "ceftriaxone", "Third-generation cephalosporins", "Carbapenemase hydrolysis", "established", "CARD", "https://card.mcmaster.ca/", "CARD", "3.2.9", "verified", MAPPING_VERSION, ""],
  ["Escherichia coli", "blaOXA-48", "meropenem", "Carbapenems", "Carbapenemase hydrolysis", "established", "CARD; ResFinder", "https://card.mcmaster.ca/", "CARD", "3.2.9", "verified", MAPPING_VERSION, "Not mapped to ceftriaxone: OXA-48 does not reliably confer 3GC resistance."],
  ["Escherichia coli", "blaTEM-1", "ampicillin", "Penicillins", "Penicillinase hydrolysis", "established", "CARD; ResFinder", "https://card.mcmaster.ca/", "CARD", "3.2.9", "verified", MAPPING_VERSION, "Generic TEM/SHV symbols are unresolved for 3GC."],
  ["Escherichia coli", "blaEC", "ceftriaxone", "Third-generation cephalosporins", "Chromosomal AmpC (expression-dependent)", "context-dependent", "NCBI AMRFinderPlus; CLSI M100", "https://clsi.org/", "AMRFinderPlus", "2026-11-22 catalogue", "context_dependent", MAPPING_VERSION, "Presence alone is not interpretable; promoter/attenuator variants required."],
  ["Escherichia coli", "aac(6')-Ib-cr", "ciprofloxacin", "Fluoroquinolones", "Enzymatic modification", "established", "CARD; ResFinder", "https://card.mcmaster.ca/", "CARD", "3.2.9", "verified", MAPPING_VERSION, ""],
  ["Escherichia coli", "qnrS1", "ciprofloxacin", "Fluoroquinolones", "Target protection", "strong", "CARD; ResFinder", "https://card.mcmaster.ca/", "CARD", "3.2.9", "verified", MAPPING_VERSION, "Low-level resistance; effect depends on chromosomal background."],
  ["Escherichia coli", "tet(A)", "tetracycline", "Tetracyclines", "Efflux", "established", "CARD; ResFinder", "https://card.mcmaster.ca/", "CARD", "3.2.9", "verified", MAPPING_VERSION, ""],
  ["Escherichia coli", "sul1", "sulfamethoxazole", "Sulfonamides", "Target replacement", "established", "CARD; ResFinder", "https://card.mcmaster.ca/", "CARD", "3.2.9", "verified", MAPPING_VERSION, ""],
  ["Escherichia coli", "dfrA17", "trimethoprim", "Diaminopyrimidines", "Target replacement", "established", "CARD; ResFinder", "https://card.mcmaster.ca/", "CARD", "3.2.9", "verified", MAPPING_VERSION, ""],
  ["Escherichia coli", "aac(3)-IIa", "gentamicin", "Aminoglycosides", "Enzymatic modification", "established", "CARD; ResFinder", "https://card.mcmaster.ca/", "CARD", "3.2.9", "verified", MAPPING_VERSION, ""],
  ["Klebsiella pneumoniae", "blaKPC", "meropenem", "Carbapenems", "Carbapenemase hydrolysis", "established", "NCBI AMRFinderPlus; CARD", "https://github.com/ncbi/amr/wiki", "CARD", "3.2.9", "verified", MAPPING_VERSION, ""],
  ["Klebsiella pneumoniae", "blaKPC", "ceftriaxone", "Third-generation cephalosporins", "Carbapenemase hydrolysis", "established", "CARD", "https://card.mcmaster.ca/", "CARD", "3.2.9", "verified", MAPPING_VERSION, ""],
  ["Klebsiella pneumoniae", "blaNDM", "meropenem", "Carbapenems", "Carbapenemase hydrolysis", "established", "NCBI AMRFinderPlus; CARD", "https://github.com/ncbi/amr/wiki", "CARD", "3.2.9", "verified", MAPPING_VERSION, ""],
  ["Klebsiella pneumoniae", "blaNDM", "ceftriaxone", "Third-generation cephalosporins", "Carbapenemase hydrolysis", "established", "CARD", "https://card.mcmaster.ca/", "CARD", "3.2.9", "verified", MAPPING_VERSION, ""],
  ["Klebsiella pneumoniae", "blaOXA-48", "meropenem", "Carbapenems", "Carbapenemase hydrolysis", "established", "CARD; ResFinder", "https://card.mcmaster.ca/", "CARD", "3.2.9", "verified", MAPPING_VERSION, ""],
  ["Klebsiella pneumoniae", "blaCTX-M", "ceftriaxone", "Third-generation cephalosporins", "ESBL hydrolysis", "established", "NCBI AMRFinderPlus; CARD", "https://github.com/ncbi/amr/wiki", "CARD", "3.2.9", "verified", MAPPING_VERSION, ""],
  ["Klebsiella pneumoniae", "blaCTX-M", "ampicillin", "Penicillins", "Enzymatic hydrolysis", "established", "CARD", "https://card.mcmaster.ca/", "CARD", "3.2.9", "verified", MAPPING_VERSION, ""],
  ["Klebsiella pneumoniae", "blaSHV-12", "ceftriaxone", "Third-generation cephalosporins", "ESBL hydrolysis", "established", "NCBI AMRFinderPlus", "https://github.com/ncbi/amr/wiki", "AMRFinderPlus", "2026-11-22 catalogue", "verified", MAPPING_VERSION, "Allele-specific ESBL; SHV-1 is not mapped."],
  ["Klebsiella pneumoniae", "blaTEM-1", "ampicillin", "Penicillins", "Penicillinase hydrolysis", "established", "CARD; ResFinder", "https://card.mcmaster.ca/", "CARD", "3.2.9", "verified", MAPPING_VERSION, ""],
  ["Klebsiella pneumoniae", "blaEC", "ceftriaxone", "Third-generation cephalosporins", "Chromosomal AmpC (expression-dependent)", "context-dependent", "CLSI M100; NCBI AMRFinderPlus", "https://clsi.org/", "AMRFinderPlus", "2026-11-22 catalogue", "context_dependent", MAPPING_VERSION, "Not interpretable from presence alone."],
  ["Klebsiella pneumoniae", "aac(6')-Ib-cr", "ciprofloxacin", "Fluoroquinolones", "Enzymatic modification", "established", "CARD; ResFinder", "https://card.mcmaster.ca/", "CARD", "3.2.9", "verified", MAPPING_VERSION, ""],
  ["Klebsiella pneumoniae", "qnrS1", "ciprofloxacin", "Fluoroquinolones", "Target protection", "strong", "CARD; ResFinder", "https://card.mcmaster.ca/", "CARD", "3.2.9", "verified", MAPPING_VERSION, ""],
  ["Klebsiella pneumoniae", "tet(A)", "tetracycline", "Tetracyclines", "Efflux", "established", "CARD; ResFinder", "https://card.mcmaster.ca/", "CARD", "3.2.9", "verified", MAPPING_VERSION, ""],
  ["Klebsiella pneumoniae", "sul1", "sulfamethoxazole", "Sulfonamides", "Target replacement", "established", "CARD; ResFinder", "https://card.mcmaster.ca/", "CARD", "3.2.9", "verified", MAPPING_VERSION, ""],
  ["Klebsiella pneumoniae", "dfrA17", "trimethoprim", "Diaminopyrimidines", "Target replacement", "established", "CARD; ResFinder", "https://card.mcmaster.ca/", "CARD", "3.2.9", "verified", MAPPING_VERSION, ""],
  ["Klebsiella pneumoniae", "aac(3)-IIa", "gentamicin", "Aminoglycosides", "Enzymatic modification", "established", "CARD; ResFinder", "https://card.mcmaster.ca/", "CARD", "3.2.9", "verified", MAPPING_VERSION, ""],
];

const EVIDENCE_HEADER = [
  "organism", "gene_or_mutation", "drug", "drug_class", "mechanism", "evidence_level", "evidence_source", "source_url", "database", "database_version", "verification_status", "mapping_version", "notes",
];

function csvEscape(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function writeCsv(file: string, header: string[], rows: (string | number)[][]) {
  const body = [header.join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\n") + "\n";
  fs.writeFileSync(file, body);
}

writeCsv(
  path.join(OUT_DEMO, "demo-isolates.csv"),
  ["isolate_id", "biosample_accession", "organism", "collection_date", "country", "isolation_source", "assembly_accession", "genome_quality", "amr_panel_version", "study_id"],
  isolates.map((iso, i) => [
    iso.isolateId,
    `SAMNSYN${String(i + 1).padStart(7, "0")}`,
    iso.organism,
    iso.collectionDate,
    iso.country,
    iso.source,
    `GCA_SYN${String(100000 + i)}.1`,
    chance(0.85) ? "High" : "Medium",
    iso.panel,
    iso.study,
  ])
);

writeCsv(
  path.join(OUT_DEMO, "demo-gene-calls.csv"),
  ["isolate_id", "gene_symbol", "gene_name", "drug_class", "mechanism", "detection_method", "database", "database_version", "identity_pct", "coverage_pct", "contig_id"],
  geneCalls.map((g) => [g.isolateId, g.geneSymbol, g.geneName, g.drugClass, g.mechanism, g.method, g.database, g.databaseVersion, g.identity, g.coverage, g.contig])
);

writeCsv(
  path.join(OUT_DEMO, "demo-ast-results.csv"),
  ["ast_record_id", "isolate_id", "antibiotic", "drug_class", "ast_method", "measurement", "measurement_unit", "interpretation", "interpretation_standard", "breakpoint_version", "testing_year", "lab_id"],
  astRows.map((a) => [a.recordId, a.isolateId, a.antibiotic, a.drugClass, a.method, a.measurement, a.unit, a.interpretation, a.standard, a.breakpoint, a.year, a.lab])
);

writeCsv(path.join(OUT_DEMO, "gene-drug-evidence.csv"), EVIDENCE_HEADER, EVIDENCE_ROWS);

const ceftriaxoneRows = astRows.filter((a) => a.antibiotic === "ceftriaxone");
const ecIds = new Set(isolates.filter((i) => i.organism === "Escherichia coli").map((i) => i.isolateId));
const ecScenarioCount = (scenario: string) => ecScenarios.find(([name]) => name === scenario)?.[1] ?? 0;
const ecEligible =
  ecScenarioCount("cr_esbl") +
  ecScenarioCount("cs_plain") +
  ecScenarioCount("cs_duplicate") +
  ecScenarioCount("gene_pos_s") +
  ecScenarioCount("r_no_det") +
  ecScenarioCount("unknown_gene_r");
const ecCr = ecScenarioCount("cr_esbl");
const ecCs = ecScenarioCount("cs_plain") + ecScenarioCount("cs_duplicate");
const ecIndeterminate = ecScenarioCount("unresolved_s") + ecScenarioCount("intermediate");
const ecAstRows =
  ecEligible +
  ecIndeterminate +
  ecScenarioCount("missing_category") +
  ecScenarioCount("conflict") * 2 +
  ecScenarioCount("missing_panel") +
  6 +
  ecScenarioCount("cs_duplicate");

const truth = {
  datasetType: "SYNTHETIC",
  generatorVersion: GENERATOR_VERSION,
  seed: SEED,
  generatedAt: new Date().toISOString(),
  scope: { antibiotic: "ceftriaxone", note: "Benchmark expectations apply when the engine is filtered to ceftriaxone." },
  injectedScenarios: [
    { scenario: "cr_esbl", expected: "concordant_resistant", isolates: ecScenarios.find((s) => s[0] === "cr_esbl")![1], drug: "ceftriaxone" },
    { scenario: "cr_carba", expected: "concordant_resistant", isolates: kpScenarios.find((s) => s[0] === "cr_carba")![1], drug: "ceftriaxone" },
    { scenario: "cs_plain", expected: "concordant_susceptible", isolates: 82, drug: "ceftriaxone" },
    { scenario: "gene_pos_s", expected: "candidate_gene_positive_phenotype_susceptible", isolates: 7, drug: "ceftriaxone" },
    { scenario: "r_no_det", expected: "candidate_phenotype_resistant_no_known_determinant", isolates: 41, drug: "ceftriaxone" },
    { scenario: "unknown_gene_r", expected: "candidate_phenotype_resistant_no_known_determinant", isolates: 3, drug: "ceftriaxone", note: "Unknown gene association; classified as no-known-determinant, not as proof of absence." },
    { scenario: "unresolved_s", expected: "indeterminate", isolates: 6, drug: "ceftriaxone", note: "Generic TEM/SHV must not be treated as a 3GC determinant." },
    { scenario: "intermediate", expected: "indeterminate", isolates: 3, drug: "ceftriaxone" },
    { scenario: "missing_category", expected: "excluded_missing_ast_category", isolates: 5, drug: "ceftriaxone" },
    { scenario: "conflict", expected: "excluded_conflicting_ast_categories", isolates: 6, drug: "ceftriaxone" },
    { scenario: "missing_panel", expected: "excluded_missing_genomic_panel", isolates: 7, drug: "ceftriaxone" },
    { scenario: "cs_duplicate", expected: "duplicate_deduplicated_not_excluded", isolates: 8, drug: "ceftriaxone" },
    { scenario: "unmatched_ast", expected: "excluded_unmatched_ast_isolate", isolates: 6, drug: "ceftriaxone" },
  ],
  expected: {
    ceftriaxone: {
      eligiblePairs: 193,
      classifications: {
        concordant_resistant: 52,
        concordant_susceptible: 90,
        candidate_gene_positive_phenotype_susceptible: 7,
        candidate_phenotype_resistant_no_known_determinant: 44,
      },
      indeterminatePairs: 9,
      exclusionsByReason: {
        unmatched_ast_isolate: 6,
        missing_ast_category: 5,
        conflicting_ast_categories: 12,
        missing_genomic_panel: 7,
        intermediate_or_nonbinary_category: 3,
        unresolved_determinant_variant: 6,
      },
      astRows: ceftriaxoneRows.length,
      uniquePairs: 226,
      duplicateRows: 14,
      agreement: 142 / 193,
    },
    // Primary research pairing: E. coli × ceftriaxone. Derived from injected scenario counts,
    // not from the engine, so a regression in the engine cannot silently move this key.
    escherichia_coli_ceftriaxone: {
      eligiblePairs: ecEligible,
      classifications: {
        concordant_resistant: ecCr,
        concordant_susceptible: ecCs,
        candidate_gene_positive_phenotype_susceptible: ecScenarioCount("gene_pos_s"),
        candidate_phenotype_resistant_no_known_determinant: ecScenarioCount("r_no_det") + ecScenarioCount("unknown_gene_r"),
      },
      indeterminatePairs: ecIndeterminate,
      exclusionsByReason: {
        unmatched_ast_isolate: 6,
        missing_ast_category: ecScenarioCount("missing_category"),
        conflicting_ast_categories: ecScenarioCount("conflict") * 2,
        missing_genomic_panel: ecScenarioCount("missing_panel"),
        intermediate_or_nonbinary_category: ecScenarioCount("intermediate"),
        unresolved_determinant_variant: ecScenarioCount("unresolved_s"),
      },
      astRows: ecAstRows,
      uniquePairs: ecIds.size + 6,
      duplicateRows: ecScenarioCount("cs_duplicate") + ecScenarioCount("conflict"),
      agreement: (ecCr + ecCs) / ecEligible,
    },
  },
  limitations: [
    "Synthetic data; scenario probabilities were injected deliberately and are not epidemiological estimates.",
    "Only a subset of resistance mechanisms is represented.",
    "No clinical validation is implied.",
  ],
};

fs.writeFileSync(path.join(OUT_FIXTURES, "demo-benchmark-truth.json"), JSON.stringify(truth, null, 2));

const manifest = {
  datasetName: "AMR PULSE synthetic demonstration dataset",
  datasetType: "SYNTHETIC",
  generatorVersion: GENERATOR_VERSION,
  generatorScript: "scripts/generate-demo-dataset.ts",
  seed: SEED,
  generatedAt: new Date().toISOString(),
  label: "Synthetic demonstration data — not real isolates, patients, hospitals or surveillance findings.",
  counts: {
    isolates: isolates.length,
    escherichiaColi: isolates.filter((i) => i.organism === "Escherichia coli").length,
    klebsiellaPneumoniae: isolates.filter((i) => i.organism === "Klebsiella pneumoniae").length,
    geneCalls: geneCalls.length,
    astRows: astRows.length,
    astCeftriaxoneRows: ceftriaxoneRows.length,
    evidenceMappings: EVIDENCE_ROWS.length,
  },
  files: [
    "demo-isolates.csv",
    "demo-gene-calls.csv",
    "demo-ast-results.csv",
    "gene-drug-evidence.csv",
    "demo-manifest.json",
    "data-dictionary.md",
  ],
  intendedUse: [
    "Demonstrate the AMR PULSE import, validation, matching, analysis and reporting workflow.",
    "Software benchmark with injected, known scenarios (see src/server/fixtures/demo-benchmark-truth.json).",
  ],
  limitations: [
    "Synthetic records must never be pooled with real research data.",
    "Gene–drug mappings are limited to selected, curated examples and are not a complete resistance catalogue.",
    "Scenario counts are deliberately balanced and are not prevalence estimates.",
  ],
  provenance: { source: "Deterministic generator", licence: "MIT (project code); synthetic content" },
};
fs.writeFileSync(path.join(OUT_DEMO, "demo-manifest.json"), JSON.stringify(manifest, null, 2));

const dataDictionary = `# AMR PULSE demo dataset — data dictionary

**Dataset type: SYNTHETIC.** Generated by \`scripts/generate-demo-dataset.ts\` with fixed seed \`${SEED}\`.
Identifiers are prefixed \`SYN-\`; no real isolate, patient, hospital or surveillance record is represented.
Do not treat counts as prevalence estimates.

## demo-isolates.csv
| Column | Description | Notes |
|---|---|---|
| isolate_id | Synthetic isolate identifier | \`SYN-EC-\` / \`SYN-KP-\` |
| biosample_accession | Synthetic BioSample-style accession (\`SAMNSYN…\`) | Not a real NCBI accession |
| organism | \`Escherichia coli\` or \`Klebsiella pneumoniae\` | |
| collection_date | ISO date; blank for some records | Deliberate missingness |
| country | ISO-3 code; blank for some records | Synthetic context only |
| isolation_source | Body site or environment | |
| assembly_accession | Synthetic assembly accession | Not a real accession |
| genome_quality | High / Medium | |
| amr_panel_version | Screening provenance; blank in \`missing_panel\` scenarios | Drives eligibility |
| study_id | Synthetic study label | |

## demo-gene-calls.csv
| Column | Description |
|---|---|
| isolate_id | Synthetic isolate identifier |
| gene_symbol | AMRFinderPlus-style gene symbol; \`blaSYN-1\` is a deliberate uncharacterised placeholder |
| gene_name | Descriptive name |
| drug_class | Reported drug class |
| mechanism | Reported mechanism |
| detection_method | AMRFinderPlus or curated |
| database / database_version | Annotation provenance |
| identity_pct / coverage_pct | Detection metrics |
| contig_id | Synthetic contig |

## demo-ast-results.csv
| Column | Description |
|---|---|
| ast_record_id | Unique AST observation identifier |
| isolate_id | Synthetic isolate identifier |
| antibiotic | Tested agent |
| drug_class | Agent class |
| ast_method | Disk diffusion or broth dilution (MIC) |
| measurement / measurement_unit | Optional numeric result (mm or mg/L) |
| interpretation | Original category: S, I, R, or blank |
| interpretation_standard | CLSI / EUCAST / blank |
| breakpoint_version | Breakpoint edition when reported |
| testing_year | Year of testing |
| lab_id | Synthetic laboratory identifier |

## gene-drug-evidence.csv
| Column | Description |
|---|---|
| organism | Species-specific mapping |
| gene_or_mutation | Gene family or allele; family entries match allele symbols |
| drug | Antibiotic |
| drug_class | Class |
| mechanism | Resistance mechanism |
| evidence_level | established / strong / moderate / context-dependent |
| evidence_source / source_url | Curator source |
| database / database_version | Catalogue provenance |
| verification_status | Only \`verified\` established/strong rows contribute |
| mapping_version | Versioned mapping identifier |
| notes | Curation notes |

## Deliberate scenarios
Concordant resistant, concordant susceptible, gene-positive/phenotype-susceptible, phenotype-resistant/no-known-determinant,
unresolved generic TEM/SHV, intermediate, missing interpretation, conflicting duplicate AST, duplicate identical AST,
missing genomic-panel provenance, unmatched AST, and an uncharacterised gene (\`blaSYN-1\`).
Exact expectations are in \`src/server/fixtures/demo-benchmark-truth.json\`.
`;
fs.writeFileSync(path.join(OUT_DEMO, "data-dictionary.md"), dataDictionary);

console.log(
  JSON.stringify({ isolates: isolates.length, geneCalls: geneCalls.length, astRows: astRows.length, ceftriaxoneRows: ceftriaxoneRows.length, evidence: EVIDENCE_ROWS.length }, null, 2)
);
