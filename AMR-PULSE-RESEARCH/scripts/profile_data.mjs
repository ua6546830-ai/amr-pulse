#!/usr/bin/env node
/**
 * Feasibility profiling of the BV-BRC extract. Descriptive only.
 * Deliberately reports phenotype distribution AFTER the pre-specified eligibility rule
 * (AMR-panel-screened genomes) so the choice of primary dataset is documented.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.resolve(__dirname, "..", "raw_data");
const ast = JSON.parse(fs.readFileSync(path.join(RAW, "bvbrc_ecoli_ceftriaxone_ast_raw.json"), "utf8"));
const genes = JSON.parse(fs.readFileSync(path.join(RAW, "bvbrc_ecoli_amr_genes_raw.json"), "utf8"));
const genomes = JSON.parse(fs.readFileSync(path.join(RAW, "bvbrc_ecoli_genomes_raw.json"), "utf8"));

const gmap = new Map(genomes.map((g) => [g.genome_id, g]));
const screened = new Set(genomes.filter((g) => /amr/i.test(String(g.antimicrobial_resistance_evidence || ""))).map((g) => g.genome_id));

const count = (arr, fn) => arr.reduce((m, x) => { const k = fn(x) ?? "(missing)"; m[k] = (m[k] || 0) + 1; return m; }, {});
const pct = (n, d) => d ? `${((n / d) * 100).toFixed(1)}%` : "n/a";

const astScreened = ast.filter((r) => screened.has(r.genome_id));
const byGenome = new Map();
for (const r of astScreened) {
  if (!byGenome.has(r.genome_id)) byGenome.set(r.genome_id, []);
  byGenome.get(r.genome_id).push(r);
}
const multi = [...byGenome.values()].filter((v) => v.length > 1);
const conflicts = multi.filter((v) => new Set(v.map((x) => String(x.resistant_phenotype).toLowerCase())).size > 1);

const geneByGenome = new Map();
for (const g of genes) {
  if (!geneByGenome.has(g.genome_id)) geneByGenome.set(g.genome_id, []);
  geneByGenome.get(g.genome_id).push(g);
}

const norm = (v) => (Array.isArray(v) ? v.join("; ") : String(v ?? "")).trim();
const geneCounts = new Map();
for (const g of genes) {
  const symbol = norm(g.gene).split(",")[0].trim();
  if (symbol) geneCounts.set(symbol, (geneCounts.get(symbol) || 0) + 1);
}
const topGenes = [...geneCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40);

const betaPattern = /^bla/i;
const esblPattern = /^bla(CTX|SHV-(2|5|12|31|32|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|33|34|35|36|37|38|39|40|41|42|43|44|45|46|47|48|49|50|51|52|53|54|55|56|57|58|59|60|61|62|63|64|65|66|67|68|69|70|71|72|73|74|75|76|77|78|79|80|81|82|83|84|85|86|87|88|89|90|91|92|93|94|95|96|97|98|99|100|101|102|103|104|105|106|107|108|109|110|111|112|113|114|115|116|117|118|119|120|121|122|123|124|125|126|127|128|129|130|131|132|133|134|135|136|137|138|139|140|141|142|143|144|145|146|147|148|149|150|151|152|153|154|155|156|157|158|159|160|161|162|163|164|165|166|167|168|169|170|171|172|173|174|175|176|177|178|179|180|181|182|183|184|185|186|187|188|189|190|191|192|193|194|195|196|197|198|199|200))/i;
const ampC = /^bla(CMY|DHA|FOX|ACC|ACT|MIR|MOX|LAT|BIL)/i;
const carba = /^bla(NDM|KPC|VIM|IMP|OXA-(48|181|232|204|162|244)|GES|SPM|SIM|DIM|NMC|SME|GIM)/i;
const temShvGeneric = /^bla(TEM|SHV)(-1)?$/i;

const classifyGene = (symbol) => {
  if (!betaPattern.test(symbol)) return null;
  if (esblPattern.test(symbol)) return "ESBL";
  if (ampC.test(symbol)) return "AmpC";
  if (carba.test(symbol)) return "carbapenemase";
  if (temShvGeneric.test(symbol) || /^bla(TEM|SHV)\b/i.test(symbol)) return "TEM/SHV unresolved";
  if (/^blaOXA-1$/i.test(symbol)) return "OXA-1 (not 3GC)";
  return "other beta-lactamase";
};

const betaClassCounts = {};
for (const g of genes) {
  const s = norm(g.gene).split(",")[0].trim();
  const c = classifyGene(s);
  if (c) betaClassCounts[c] = (betaClassCounts[c] || 0) + 1;
}

const screenedGenomes = [...screened];
const withAst = screenedGenomes.filter((id) => byGenome.has(id));
const phenotypeCounts = count(astScreened, (r) => r.resistant_phenotype);
const methodCounts = count(astScreened, (r) => r.laboratory_typing_method);
const standardCounts = count(astScreened, (r) => r.testing_standard);
const missingMeasurement = astScreened.filter((r) => !norm(r.measurement_value) && !norm(r.measurement)).length;
const missingYear = astScreened.filter((r) => !r.testing_standard_year).length;

const detStatus = (id) => {
  const rows = geneByGenome.get(id) || [];
  const symbols = rows.map((g) => norm(g.gene).split(",")[0].trim()).filter(Boolean);
  const mapped = symbols.map(classifyGene).filter((c) => c === "ESBL" || c === "AmpC" || c === "carbapenemase");
  const unresolved = symbols.map(classifyGene).filter((c) => c === "TEM/SHV unresolved");
  return { mapped: [...new Set(mapped)], unresolved: [...new Set(unresolved)] };
};

const uniqueAst = [...byGenome.entries()].map(([id, rows]) => {
  const phenotypes = [...new Set(rows.map((r) => String(r.resistant_phenotype).toLowerCase()))];
  const status = detStatus(id);
  return {
    id, n: rows.length, conflicting: phenotypes.length > 1, phenotype: phenotypes.length === 1 ? phenotypes[0] : "conflict",
    mapped: status.mapped, unresolved: status.unresolved,
  };
});

const cross = {};
for (const u of uniqueAst) {
  const k = `${u.conflicting ? "conflict" : u.phenotype}|${u.mapped.length ? "mapped" : u.unresolved.length ? "unresolved" : "none"}`;
  cross[k] = (cross[k] || 0) + 1;
}

const profile = {
  source: "BV-BRC extract (E. coli, ceftriaxone, laboratory AST)",
  generated_at: new Date().toISOString(),
  totals: {
    ast_rows: ast.length,
    unique_genomes_ast: byGenome.size + (ast.length - astScreened.length ? 0 : 0),
    ast_rows_all: ast.length,
    ast_rows_screened: astScreened.length,
    unique_genomes_screened: byGenome.size,
    screened_genomes_without_ast: screenedGenomes.length - withAst.length,
    gene_rows: genes.length,
    screened_genomes: screened.size,
  },
  ast_quality_screened: {
    phenotype_counts: phenotypeCounts,
    method_counts: methodCounts,
    standard_counts: standardCounts,
    missing_measurement: missingMeasurement,
    missing_measurement_pct: pct(missingMeasurement, astScreened.length),
    missing_testing_standard_year_pct: pct(missingYear, astScreened.length),
    genomes_with_multiple_ast_rows: multi.length,
    genomes_with_conflicting_phenotypes: conflicts.length,
  },
  metadata_completeness_screened: {
    collection_year: screenedGenomes.filter((id) => gmap.get(id)?.collection_year).length,
    country: screenedGenomes.filter((id) => gmap.get(id)?.isolation_country).length,
    source: screenedGenomes.filter((id) => gmap.get(id)?.isolation_source).length,
  },
  gene_annotation: {
    top_symbols: topGenes,
    beta_lactam_class_counts: betaClassCounts,
    genomes_with_mapped_3gc_determinant: uniqueAst.filter((u) => u.mapped.length).length,
    genomes_with_unresolved_tem_shv_only: uniqueAst.filter((u) => !u.mapped.length && u.unresolved.length).length,
  },
  phenotype_by_determinant_status: cross,
};
const OUT = path.resolve(__dirname, "..", "analysis");
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "data_profile.json"), JSON.stringify(profile, null, 2));
console.log(JSON.stringify(profile, null, 2).slice(0, 6000));
