# Architecture

## Request flow

```text
Browser
  │
  ├── /dashboard, /analysis, /quality, …        Server Components
  │       └── getDemoDataset() ─► runAnalysis() ─► typed view models
  │
  ├── /api/manifest                             JSON manifest
  ├── /api/analysis/export                      CSV / JSON exports
  ├── /api/import/preview | normalize           Upload → mapping preview
  ├── /api/quality/issues                       Quality issue register
  └── /api/ai/chat                              SSE agent stream
          └── orchestrator ─► tools (read-only) ─► provider | fallback
```

The demo path never touches a database. Mode B adds Supabase behind server-side clients; it is optional.

## Deterministic engine

`src/lib/analysis/pipeline.ts`

1. Scope isolates, gene calls and AST rows to the requested organism.
2. Reconcile duplicate isolate and AST records.
3. Match by exact isolate ID or BioSample accession; unmatched records are retained as exclusions.
4. Classify determinant status: `positive`, `none_detected`, `unresolved_variant`, `not_screened`.
5. Apply the versioned gene–drug evidence map (verified + established/strong only).
6. Classify each eligible pair into one of five classes.
7. Summarise counts, proportions and Wilson 95% score intervals.
8. Emit per-reason exclusion groups and a provenance block.

The engine is pure with respect to its inputs and options. The same inputs and versions produce the same outputs.

## Classification contract

| Classification | Meaning |
| --- | --- |
| `concordant_resistant` | A contributing determinant was detected and the AST category is resistant. |
| `concordant_susceptible` | No contributing determinant was detected in a screened panel and the category is susceptible. |
| `candidate_gene_positive_phenotype_susceptible` | Contributing determinant detected, phenotype susceptible. Review candidate — not proof of error. |
| `candidate_phenotype_resistant_no_known_determinant` | Resistant phenotype, screened panel, no known contributing determinant. Review candidate. |
| `indeterminate` | Intermediate/SDD/NS, unresolved variant, missing provenance or another non-binary state. |

## Data ingestion

- Adapters in `src/lib/imports/adapters.ts` normalise headers, map aliases, preserve raw values and enforce row/size limits.
- Mapping suggestions are explicit; the user confirms before data is applied.
- Identifier matching (`src/lib/matching.ts`) strips case/whitespace for exact joins; edit-distance suggestions are advisory and stored separately with a human decision.
- Nothing is silently overwritten, imputed or deleted.

## Evidence map

- Version `amr-pulse-evidmap-2026.11.1`.
- Each row: organism, gene, drug, evidence level, verification status, source, source URL, database, database version, mapping version.
- Family-prefix matching supports allele-level symbols.
- `blaTEM` and `blaSHV` are unresolved for third-generation cephalosporins; `blaCTX-M` is established; `blaEC` context-dependent; OXA-48 is not mapped to ceftriaxone.

## AI layer

- `src/server/ai/orchestrator.ts` — plan, tool execution, provider loop, deterministic fallback, audit updates.
- `src/server/ai/tools.ts` — 19 tools, each with a Zod schema and read-only execution over the demo analysis.
- `src/server/ai/provider.ts` — OpenAI-compatible and Anthropic adapters.
- `src/server/ai/audit.ts` — bounded in-memory audit events.
- `src/server/ai/rate-limit.ts` — fixed-window per-client limiter.
- `src/app/api/ai/chat/route.ts` — validation, rate limiting, SSE transport.

The model receives only tool outputs and a citation whitelist. Unknown tools, invalid arguments and unknown citation IDs are rejected or stripped. No write tool exists.

## Security

- Secrets are read only from server-side environment variables.
- The Supabase service-role client throws if imported in a browser context.
- Security headers are set in `next.config.ts`.
- Uploads are size/row limited and parsed in the browser before preview.
- Imported text is treated as untrusted data in the AI system prompt.
- RLS covers all 15 Supabase tables; workspace policies are ownership-based.

## Versions

| Component | Version |
| --- | --- |
| Application | 1.0.0 |
| Analysis engine | 1.0.0 |
| Evidence map | amr-pulse-evidmap-2026.11.1 |
| Demo evidence map | amr-pulse-demo-evidmap-2026.11.1 |
| Demo generator | 1.0.0 |
| Demo seed | 20261122 |

These values appear in the UI, report footer, `/api/manifest` and exports.
