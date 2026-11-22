# AMR PULSE — marketing kit

All copy below is accurate to the public demo: **220 synthetic isolates**, fixed seed, no clinical validation. Do not remove the synthetic-data caveat or imply diagnostic/regulatory status.

---

## Positioning

**One line:** Genotype–phenotype discordance, investigated properly.

**Short description (≈50 words):** AMR PULSE is a research workspace for bacterial AMR. It matches genomic resistance determinants to submitted AST results, counts every exclusion, and turns candidate genotype–phenotype discordance into a structured, reproducible investigation.

**Long description (≈120 words):** Most AMR dashboards report a single agreement percentage. AMR PULSE starts underneath it: which isolates actually matched, which AST categories were compatible, whether the genomic panel was screened, whether a gene is an established determinant for that organism and drug, and which records were duplicates or conflicts. Only then does it classify matched isolate–antibiotic pairs into five explicit outcomes, with Wilson 95% intervals and every exclusion counted. A seven-step workflow — Import, Map, Validate, Analyse, Investigate, Report, Reproduce — keeps the denominator, evidence-map version and audit trail attached to every number. An optional agentic assistant uses read-only tools and verified citations, with an honest deterministic fallback. The included demo is synthetic.

**Taglines**

- Genotype–phenotype discordance, investigated properly.
- Every record accounted for.
- Candidate discordance is a prompt, not a verdict.
- Count the exclusions before you count the finding.
- A denominator and an audit trail behind every number.
- AI that can read the evidence, not rewrite it.

---

## Feature bullets

- Five-class genotype–phenotype comparison for matched isolate–antibiotic pairs.
- Wilson 95% confidence intervals and denominator-first reporting.
- Data-quality audit with record-level exclusions and reasons.
- Exact identifier matching; no name-based joins; human-confirmed suggestions.
- Versioned gene–drug evidence map with verification status.
- Duplicate reconciliation and conflicting-category detection.
- Structured discordance workbench with review notes.
- Reproducible reports in Markdown/JSON and print/PDF.
- 19 read-only AI tools, citation whitelist, audit log, step/time limits.
- Deterministic fallback with no API key required.
- Synthetic 220-isolate demo loaded on first open; no account.
- Optional Supabase schema with RLS for research workspaces.

---

## Social copy

### LinkedIn

**Most AMR genotype–phenotype “discordance” is a data problem in disguise.**

Before a gene–phenotype mismatch means anything, you need to know:

- Did the isolate actually match — by identifier, not by organism name?
- Was the AST category binary, or intermediate/SDD/NS?
- Was the genomic panel actually screened?
- Is the detected gene an established determinant for this organism and drug?
- Were duplicate or conflicting AST rows counted twice?

AMR PULSE is a research workspace built around those questions. It classifies matched pairs into five explicit outcomes, reports Wilson 95% intervals, and counts every exclusion with a reason. Seven steps, one audit trail: Import → Map → Validate → Analyse → Investigate → Report → Reproduce.

The public demo is synthetic (220 fictional isolates) and runs without an account. It is research-support software — not a diagnostic device and not clinically validated.

Repo + demo: https://github.com/ua6546830-ai/amr-pulse

#AMR #AntimicrobialResistance #Bioinformatics #Genomics #PublicHealth #ResearchSoftware

### X / Bluesky

Genotype–phenotype discordance is usually treated as lab error — or ignored. Both are wrong defaults.

AMR PULSE counts what actually happened: matched pairs, exclusions, unresolved variants, missing panels.

Synthetic demo, no account:
https://github.com/ua6546830-ai/amr-pulse

Not a diagnostic device. Research use only.

### Conference / poster caption

**AMR PULSE: a reproducibility-first workspace for candidate genotype–phenotype discordance in bacterial AMR.** The platform matches genomic resistance determinants to submitted AST results at the isolate–antibiotic level, separates five outcomes, quantifies exclusions by reason, and reports Wilson 95% intervals with versioned evidence and audit metadata. A synthetic 220-isolate demo validates the end-to-end workflow; clinical validation is not claimed.

---

## Poster and banner

| Asset | Dimensions | Use |
| --- | --- | --- |
| `assets/banner.png` / `.svg` | 1200×630 | GitHub social preview, Open Graph, slide header |
| `assets/poster.png` / `.svg` | 1080×1350 | Conference poster, LinkedIn document post, print A3 |
| `screenshots/02-dashboard.png` | 1440×900 @2× | Product proof — overview |
| `screenshots/04-analysis.png` | 1440×900 @2× | Product proof — five-class analysis |
| `screenshots/05-investigation.png` | 1440×900 @2× | Product proof — investigation workbench |
| `screenshots/06-report-builder.png` | 1440×900 @2× | Product proof — report builder |

The poster uses synthetic demo counts and labels them explicitly. Do not present them as study findings.

---

## Brand

- Background `#F7F9FC`; ink `#172033`; muted `#64748B`.
- Blue `#2563EB`; cyan `#0891B2`; teal `#0F9D8A`; line `#E5EAF0`.
- Amber for synthetic-data notices; red for resistance; teal for concordance.
- UI: Segoe UI / Inter-style sans; identifiers in a monospace face.
- Tone: precise, calm, non-alarmist; mechanism-neutral; no “breakthrough” language.

---

## Language guardrails

**Say**

- “candidate genotype–phenotype discordance”
- “review prompt”
- “synthetic demonstration dataset”
- “not clinically validated”
- “research-support software”
- “excluded with a reason”
- “no known determinant detected in the screened panel”

**Do not say**

- “lab error”, “false result”, “misdiagnosis”
- “proves resistance”, “predicts treatment”
- “clinically validated”, “diagnostic”, “HIPAA compliant”, “ISO 27001 certified”
- “AI discovers”, “AI diagnoses”
- “real patient data”
- “published study” or “findings” for the synthetic demo

---

## SEO / metadata

**Title:** AMR PULSE — Genotype–phenotype discordance research workspace

**Description:** A reproducibility-first workspace for bacterial AMR genotype–phenotype concordance. Five-class comparison, Wilson 95% intervals, data-quality audit, read-only AI assistant, and a synthetic 220-isolate demo. Research use only.

**Keywords:** antimicrobial resistance, AMR, genotype phenotype discordance, AST, AMR surveillance, Escherichia coli, ceftriaxone, bioinformatics, research software, reproducibility, Wilson interval, BV-BRC.
