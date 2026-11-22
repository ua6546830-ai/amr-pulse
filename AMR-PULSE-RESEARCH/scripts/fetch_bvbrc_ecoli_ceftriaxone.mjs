#!/usr/bin/env node
/**
 * AMR PULSE — real public-data extraction.
 * Source: BV-BRC (https://www.bv-brc.org) Solr data API.
 * Tables: genome_amr (laboratory AST), sp_gene (AMR determinants), genome (metadata).
 *
 * Primary pairing fixed BEFORE inspecting outcome distribution:
 *   Escherichia coli (taxon 562) + ceftriaxone (third-generation cephalosporin).
 *
 * API note: BV-BRC rejects offset pagination (start(0) => "undefined field object"),
 * so rows are retrieved with a single large limit per partition; chunks are split if truncated.
 * Writes immutable raw snapshots + an extraction manifest. No record is edited.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "..", "raw_data");
fs.mkdirSync(OUT, { recursive: true });

const API = "https://www.bv-brc.org/api";
const TAXON = 562;
const TAXON_NAME = "Escherichia coli";
const DRUG = "ceftriaxone";
const AST_LIMIT = 20000;
const GENE_CHUNK = 20;
const GENE_LIMIT = 12000;
const META_CHUNK = 100;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function enc(s) {
  return encodeURIComponent(s).replace(/%2C/gi, ",");
}

async function api(table, queryParams, { retries = 5 } = {}) {
  const url = `${API}/${table}/?${queryParams}&http_accept=${encodeURIComponent("application/solr+json")}`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "AMR-PULSE-research/1.0 (academic reuse of public BV-BRC API)" },
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      const json = JSON.parse(text);
      if (!json.response) throw new Error(`Unexpected payload: ${text.slice(0, 160)}`);
      return { numFound: json.response.numFound, docs: json.response.docs || [] };
    } catch (err) {
      if (attempt === retries) throw err;
      const backoff = 800 * Math.pow(2, attempt);
      console.warn(`  retry ${attempt + 1}/${retries} in ${backoff}ms (${String(err.message).slice(0, 110)})`);
      await sleep(backoff);
    }
  }
}

async function fetchAll(table, filter, select, limit, label) {
  let { numFound, docs } = await api(table, `${filter}${select}&limit(${limit})`);
  process.stdout.write(`\r${label}: ${docs.length}/${numFound}   `);
  if (docs.length < numFound) {
    throw new Error(`${label}: truncated (${docs.length}/${numFound}); reduce chunk size`);
  }
  process.stdout.write("\n");
  return docs;
}

function toCsv(rows, columns) {
  const esc = (v) => {
    if (v === undefined || v === null) return "";
    let s = Array.isArray(v) ? v.join(";") : String(v);
    if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [columns.join(","), ...rows.map((r) => columns.map((c) => esc(r[c])).join(","))].join("\n") + "\n";
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

const AST_COLS = [
  "genome_id","genome_name","antibiotic","resistant_phenotype","measurement","measurement_value",
  "measurement_unit","measurement_sign","laboratory_typing_method","testing_standard","testing_standard_year",
  "vendor","pmid","evidence",
];
const GENE_COLS = ["genome_id","genome_name","gene","product","antibiotics","antibiotics_class","classification","evidence","source","property_source","pmid"];
const GENOME_COLS = ["genome_id","biosample_accession","assembly_accession","genome_name","species","collection_year","isolation_country","isolation_source","host","strain","antimicrobial_resistance","antimicrobial_resistance_evidence","genome_quality","checkm_completeness","checkm_contamination"];
const selectOf = (cols) => `&select(${cols.join(",")})`;

const startedAt = new Date().toISOString();
console.log("AMR PULSE — BV-BRC extraction");
console.log("Primary pairing: E. coli (562) + ceftriaxone, laboratory AST");

const astFilter = `eq(taxon_id,${TAXON})&eq(antibiotic,${enc(DRUG)})&eq(evidence,${enc('"Laboratory Method"')})`;
const ast = await fetchAll("genome_amr", astFilter, selectOf(AST_COLS), AST_LIMIT, "AST");
const genomeIds = [...new Set(ast.map((r) => r.genome_id).filter(Boolean))];
console.log(`Unique genomes with AST: ${genomeIds.length}`);

const genomes = [];
for (let i = 0; i < genomeIds.length; i += META_CHUNK) {
  const chunk = genomeIds.slice(i, i + META_CHUNK);
  const rows = await fetchAll("genome", `in(genome_id,(${chunk.join(",")}))`, selectOf(GENOME_COLS), 500, `metadata ${i + 1}-${i + chunk.length}`);
  genomes.push(...rows);
  await sleep(100);
}

const screenedIds = [...new Set(
  genomes
    .filter((g) => String(g.antimicrobial_resistance_evidence || "").toLowerCase().includes("amr"))
    .map((g) => g.genome_id)
)];
console.log(`Genomes with documented AMR panel screening: ${screenedIds.length}/${genomeIds.length}`);

const genes = [];
let failedChunks = 0;
for (let i = 0; i < screenedIds.length; i += GENE_CHUNK) {
  const chunk = screenedIds.slice(i, i + GENE_CHUNK);
  try {
    const rows = await fetchAll(
      "sp_gene",
      `in(genome_id,(${chunk.join(",")}))&eq(property,${enc('"Antibiotic Resistance"')})`,
      selectOf(GENE_COLS),
      GENE_LIMIT,
      `genes ${i + 1}-${i + chunk.length}`
    );
    genes.push(...rows);
  } catch (err) {
    // subdivide a truncated chunk rather than dropping records
    console.warn(`  chunk failed (${chunk.length}); subdividing: ${err.message.slice(0, 80)}`);
    for (const id of chunk) {
      try {
        const rows = await fetchAll(
          "sp_gene",
          `eq(genome_id,${id})&eq(property,${enc('"Antibiotic Resistance"')})`,
          selectOf(GENE_COLS),
          GENE_LIMIT,
          `gene ${id}`
        );
        genes.push(...rows);
      } catch (inner) {
        failedChunks += 1;
        console.error(`  FAILED genome ${id}: ${inner.message.slice(0, 100)}`);
      }
    }
  }
  await sleep(100);
}

const context = {};
for (const drug of ["cefotaxime", "ceftazidime", "cefepime", "meropenem"]) {
  const f = `eq(taxon_id,${TAXON})&eq(antibiotic,${enc(drug)})&eq(evidence,${enc('"Laboratory Method"')})`;
  const { numFound } = await api("genome_amr", `${f}&limit(0)`);
  context[drug] = numFound;
}

const files = {
  ast: path.join(OUT, "bvbrc_ecoli_ceftriaxone_ast_raw.json"),
  genes: path.join(OUT, "bvbrc_ecoli_amr_genes_raw.json"),
  genomes: path.join(OUT, "bvbrc_ecoli_genomes_raw.json"),
};
fs.writeFileSync(files.ast, JSON.stringify(ast, null, 1));
fs.writeFileSync(files.genes, JSON.stringify(genes, null, 1));
fs.writeFileSync(files.genomes, JSON.stringify(genomes, null, 1));
const csvFiles = {
  "bvbrc_ecoli_ceftriaxone_ast_raw.csv": toCsv(ast, AST_COLS),
  "bvbrc_ecoli_amr_genes_raw.csv": toCsv(genes, GENE_COLS),
  "bvbrc_ecoli_genomes_raw.csv": toCsv(genomes, GENOME_COLS),
};
for (const [name, content] of Object.entries(csvFiles)) {
  fs.writeFileSync(path.join(OUT, name), content);
}

const manifest = {
  source: "BV-BRC (Bacterial and Viral Bioinformatics Resource Center)",
  source_url: "https://www.bv-brc.org",
  api: "https://www.bv-brc.org/api",
  extracted_at_utc: startedAt,
  completed_at_utc: new Date().toISOString(),
  taxon: { id: TAXON, name: TAXON_NAME },
  primary_drug: DRUG,
  inclusion_queries: {
    ast: `genome_amr where taxon_id=${TAXON} AND antibiotic=${DRUG} AND evidence="Laboratory Method"`,
    genes: `sp_gene where genome_id IN (AMR-panel-screened AST genomes) AND property="Antibiotic Resistance"`,
    metadata: `genome where genome_id IN (AST genomes)`,
  },
  counts: {
    ast_rows: ast.length,
    genomes_with_ast: genomeIds.length,
    genomes_with_amr_panel_screening: screenedIds.length,
    gene_rows: genes.length,
    genomes_with_at_least_one_amr_gene: new Set(genes.map((g) => g.genome_id)).size,
    genome_metadata_rows: genomes.length,
    failed_gene_chunks: failedChunks,
  },
  context_counts_laboratory_ast: context,
  api_quirks: ["Offset pagination start(n) returns HTTP 400 (undefined field object); single large limit() used instead."],
  files: Object.fromEntries(
    [...Object.keys(files).map((k) => path.basename(files[k])), ...Object.keys(csvFiles)].map((name) => [
      name, { bytes: fs.statSync(path.join(OUT, name)).size, sha256: sha256(path.join(OUT, name)) },
    ])
  ),
  licence_and_access: {
    note: "Public BV-BRC data reuse; see https://www.bv-brc.org/docs/ for terms. Records are third-party submitted AST and genome annotations.",
    no_patient_data: true,
  },
  caveat: "Raw snapshot retained unmodified. Phenotype/genotype interpretation happens only in analysis scripts.",
};
fs.writeFileSync(path.join(OUT, "extraction_manifest.json"), JSON.stringify(manifest, null, 2));
console.log("DONE", JSON.stringify(manifest.counts));
