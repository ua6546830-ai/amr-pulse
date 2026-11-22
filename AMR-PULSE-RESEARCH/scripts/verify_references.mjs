#!/usr/bin/env node
/** Literature verification via Europe PMC (PubMed/MEDLINE-backed). One paced request per query. */
import fs from "node:fs";

const QUERIES = [
  ["AMRFinderPlus", "AMRFinderPlus and the Reference Gene Catalog facilitate examination of the genomic links"],
  ["CARD2023", "CARD 2023 expanded curation support for machine learning resistome prediction"],
  ["ResFinder4", "ResFinder 4.0 for predictions of phenotypes from genotypes"],
  ["AMRFinderValidation", "Validating the AMRFinder tool and resistance gene database genotype-phenotype correlations"],
  ["BVBRC", "Introducing the Bacterial and Viral Bioinformatics Resource Center BV-BRC comparative pathogen genomics"],
  ["NCBI_PD", "NCBI Pathogen Detection foodborne bacterial pathogens surveillance"],
  ["Ecoli_WGS_AST", "Predicting antimicrobial resistance from whole-genome sequencing Escherichia coli"],
  ["Su2019", "Genome-based prediction of bacterial antibiotic resistance"],
  ["Boolchandani", "Sequencing-based methods and resources to study antimicrobial resistance"],
  ["WGS_review", "whole genome sequencing prediction antimicrobial resistance systematic review"],
  ["ML_review", "machine learning antimicrobial resistance prediction current practice limitations clinical perspective"],
  ["AMASS", "AMASS large-scale dataset antimicrobial resistance surveillance whole genome sequencing"],
  ["CARD2013", "The Comprehensive Antibiotic Resistance Database"],
  ["Zankari2012", "Identification of acquired antimicrobial resistance genes"],
  ["STROBE", "STROBE statement strengthening the reporting of observational studies in epidemiology"],
  ["Wilson1927", "Probable inference the law of succession and statistical inference"],
  ["Kleb_WGS", "whole genome sequencing prediction antimicrobial resistance Klebsiella pneumoniae"],
  ["AmpC", "AmpC beta-lactamase overexpression resistance Enterobacteriaceae"],
  ["Porins", "OmpK35 OmpK36 porin loss carbapenem resistance Klebsiella pneumoniae"],
  ["Discordance", "discordance genotypic phenotypic antimicrobial resistance testing"],
  ["CTXM", "CTX-M extended-spectrum beta-lactamases epidemiology"],
  ["MCR1", "Emergence of plasmid-mediated colistin resistance mechanism MCR-1"],
  ["GLASS", "Global Antimicrobial Resistance and Use Surveillance System GLASS"],
  ["EUCAST_disk", "EUCAST disk diffusion method antimicrobial susceptibility testing"],
  ["AMR_predict_review", "machine learning whole genome sequencing antimicrobial resistance prediction review"],
];

const results = [];
for (const [id, q] of QUERIES) {
  const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(q)}&format=json&pageSize=3&resultType=core`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "AMR-PULSE-literature-verification/1.0" } });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = JSON.parse(text);
    const rows = (json.resultList?.result ?? []).map((r) => ({
      title: r.title,
      authors: r.authorString,
      year: r.pubYear,
      journal: r.journalInfo?.journal?.title ?? r.journalTitle,
      doi: r.doi ?? null,
      pmid: r.pmid ?? null,
      pmcid: r.pmcid ?? null,
    }));
    results.push({ id, query: q, rows });
    console.log(`\n## ${id}`);
    for (const r of rows) console.log(`- ${r.year} | ${r.title?.slice(0, 110)} | ${r.journal} | ${r.doi} | PMID ${r.pmid}`);
  } catch (err) {
    console.error(`FAIL ${id}: ${err.message}`);
    results.push({ id, query: q, error: err.message, rows: [] });
  }
  await new Promise((r) => setTimeout(r, 600));
}
fs.mkdirSync("AMR-PULSE-RESEARCH/analysis", { recursive: true });
fs.writeFileSync("AMR-PULSE-RESEARCH/analysis/europepmc_candidates.json", JSON.stringify(results, null, 2));
console.log("\nSaved.");
