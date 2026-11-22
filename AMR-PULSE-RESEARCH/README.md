# AMR PULSE — Research Package (feasibility stage)

Reproducible acquisition and profiling of public genotype–AST data for the companion study:

> **Candidate genotype–phenotype discordance in *Escherichia coli* × third-generation cephalosporins.**

This directory contains the **feasibility / data-acquisition stage**, not a completed empirical paper. The public application ships a separate **synthetic** demo dataset. No results from this package are presented as clinical or epidemiological findings, and no ethics approval is claimed.

---

## Data source

- **BV-BRC** (Bacterial and Viral Bioinformatics Resource Center), <https://www.bv-brc.org>.
- Taxon: *Escherichia coli* (NCBI taxon 562).
- Primary drug: **ceftriaxone**.
- AST filter: `genome_amr` where `taxon_id = 562`, `antibiotic = ceftriaxone`, `evidence = "Laboratory Method"`.
- Gene filter: `sp_gene` where `genome_id` belongs to the AMR-panel-screened AST genome set and `property = "Antibiotic Resistance"`.
- Metadata: `genome` records for the AST genome set.
- Snapshot: **2026-11-22T19:28–19:33 UTC**.

### Extract summary

| Item | Count |
| --- | --- |
| Ceftriaxone AST rows | 4,632 |
| Genomes with ceftriaxone AST | 3,985 |
| Genomes with AMR-panel screening recorded | 1,173 |
| Gene rows (screened genomes) | 268,796 |
| Genome metadata rows | 3,985 |
| Failed gene chunks | 0 |

### Profiled screened cohort

| Item | Value |
| --- | --- |
| Screened AST rows | 1,470 |
| Unique screened genomes | 1,173 |
| Susceptible / resistant | 751 / 506 |
| Missing phenotype / blank | 124 / 87 |
| Intermediate | 2 |
| Genomes with multiple AST rows | 297 |
| Genomes with conflicting phenotypes | 87 |
| Missing measurement | 655 (44.6%) |
| Missing testing standard year | 60.1% |

These facts motivate the product's data-quality-first design. They are **feasibility counts**, not a discordance estimate.

---

## Reproduce

Node.js ≥ 20.9 is required.

```bash
cd AMR-PULSE-RESEARCH

# Re-download the BV-BRC snapshot (~195 MB; skipped by Git)
node scripts/fetch_bvbrc_ecoli_ceftriaxone.mjs

# Profile the extracted tables
node scripts/profile_data.mjs

# Verify literature candidates via Crossref / Europe PMC
node scripts/verify_references.mjs
```

Outputs:

```text
raw_data/
  bvbrc_ecoli_ceftriaxone_ast_raw.{json,csv}
  bvbrc_ecoli_amr_genes_raw.{json,csv}
  bvbrc_ecoli_genomes_raw.{json,csv}
  extraction_manifest.json          # committed
analysis/
  data_profile.json
  crossref_candidates.json
  europepmc_candidates.json
```

Verification checksums for every raw file are recorded in `raw_data/extraction_manifest.json`.

---

## Why raw data is not in Git

- The largest extract is 125 MB, above GitHub's 100 MB per-file limit.
- Raw third-party snapshots are reproducible from a pinned script and checksum manifest.
- Keeping the repository lightweight makes the application deployable and reviewable.

The unmodified snapshot remains available locally at `raw_data/`. Do not edit raw files; interpretation belongs in analysis scripts.

---

## Scientific boundaries

- Unit of analysis: **matched isolate–antibiotic pair**, not isolate.
- S/I/R are kept separate; intermediate is not silently forced into susceptible or resistant.
- CLSI and EUCAST records are not pooled without documented harmonisation.
- No breakpoints are recomputed from zone diameters.
- Detection is not equated with causation; absence of detection is not proof of absence.
- Repeated observations per isolate are not independent.
- Duplicate and conflicting records are counted, not silently collapsed.
- Missing genomic screening provenance makes a "negative" genome uninterpretable for that determinant.

## Status and next steps

Completed:

1. Public data access and reproducible extraction.
2. Data profiling and feasibility assessment.
3. Reference-candidate harvesting for manual verification.

Not included in this repository:

- Final eligibility adjudication and a complete exclusion flowchart.
- Principal discordance analysis with Wilson 95% CIs.
- Figures, tables and the STROBE manuscript.
- Ethics/IRB determination (must be obtained independently).

Do not represent this package as a finished study. Any publication must report the actual final counts, the dated snapshot, the evidence-map version, and the limitations above.
