-- AMR PULSE — initial workspace schema
-- Version: 2026-11-22.1
-- Apply with: supabase db push   (or psql -f supabase/migrations/202611220001_initial_schema.sql)
-- RLS model: a workspace is owned by one auth user. Every workspace-scoped row is visible only when
-- workspace_id belongs to a workspace owned by auth.uid(). The service role bypasses RLS and must stay server-side.
-- The public demo never reads these tables; workspace mode is strictly opt-in.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.workspace_is_owned(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.workspaces w where w.id = target and w.owner_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- 1. profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  role text not null default 'researcher' check (role in ('researcher', 'reviewer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. workspaces
-- ---------------------------------------------------------------------------
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists workspaces_owner_idx on public.workspaces (owner_id);

-- ---------------------------------------------------------------------------
-- 3. research_projects
-- ---------------------------------------------------------------------------
create table if not exists public.research_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  description text,
  organism_focus text,
  antibiotic_focus text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists research_projects_workspace_idx on public.research_projects (workspace_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 4. datasets
-- ---------------------------------------------------------------------------
create table if not exists public.datasets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid references public.research_projects (id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('isolates', 'genes', 'ast', 'evidence', 'bundle')),
  source_format text not null default 'unknown',
  data_label text not null default 'synthetic' check (data_label in ('synthetic', 'real', 'mixed', 'unknown')),
  file_name text,
  row_count integer not null default 0 check (row_count >= 0),
  content_hash text,
  manifest jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists datasets_workspace_idx on public.datasets (workspace_id, created_at desc);
create index if not exists datasets_project_idx on public.datasets (project_id);

-- ---------------------------------------------------------------------------
-- 5. isolate_records
-- ---------------------------------------------------------------------------
create table if not exists public.isolate_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  dataset_id uuid not null references public.datasets (id) on delete cascade,
  isolate_id text not null,
  biosample_accession text,
  organism text not null,
  collection_date text,
  country text,
  isolation_source text,
  assembly_accession text,
  genome_quality text,
  amr_panel_version text,
  study_id text,
  created_at timestamptz not null default now(),
  unique (dataset_id, isolate_id)
);
create index if not exists isolate_records_dataset_idx on public.isolate_records (dataset_id);
create index if not exists isolate_records_biosample_idx on public.isolate_records (workspace_id, biosample_accession);
create index if not exists isolate_records_organism_idx on public.isolate_records (workspace_id, organism);

-- ---------------------------------------------------------------------------
-- 6. gene_calls
-- ---------------------------------------------------------------------------
create table if not exists public.gene_calls (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  dataset_id uuid not null references public.datasets (id) on delete cascade,
  isolate_id text not null,
  gene_symbol text not null,
  gene_name text,
  drug_class text,
  mechanism text,
  detection_method text,
  database text,
  database_version text,
  identity_pct numeric check (identity_pct is null or (identity_pct >= 0 and identity_pct <= 100)),
  coverage_pct numeric check (coverage_pct is null or (coverage_pct >= 0 and coverage_pct <= 100)),
  contig_id text,
  created_at timestamptz not null default now()
);
create index if not exists gene_calls_dataset_idx on public.gene_calls (dataset_id);
create index if not exists gene_calls_isolate_idx on public.gene_calls (workspace_id, isolate_id);
create index if not exists gene_calls_symbol_idx on public.gene_calls (workspace_id, lower(gene_symbol));

-- ---------------------------------------------------------------------------
-- 7. ast_results
-- ---------------------------------------------------------------------------
create table if not exists public.ast_results (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  dataset_id uuid not null references public.datasets (id) on delete cascade,
  ast_record_id text not null,
  isolate_id text not null,
  antibiotic text not null,
  drug_class text,
  ast_method text,
  measurement text,
  measurement_unit text,
  interpretation text not null check (upper(interpretation) in ('S', 'I', 'R', 'SDD', 'NS', 'U')),
  interpretation_standard text,
  breakpoint_version text,
  testing_year text,
  lab_id text,
  created_at timestamptz not null default now(),
  unique (dataset_id, ast_record_id)
);
create index if not exists ast_results_dataset_idx on public.ast_results (dataset_id);
create index if not exists ast_results_pair_idx on public.ast_results (workspace_id, isolate_id, lower(antibiotic));

-- ---------------------------------------------------------------------------
-- 8. isolate_match_reviews
-- ---------------------------------------------------------------------------
create table if not exists public.isolate_match_reviews (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  dataset_id uuid not null references public.datasets (id) on delete cascade,
  ast_record_id text not null,
  unmatched_identifier text not null,
  suggested_isolate_id text not null,
  confidence text not null default 'low' check (confidence in ('low', 'medium')),
  decision text not null default 'pending' check (decision in ('pending', 'accepted', 'rejected')),
  reason text,
  reviewed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (dataset_id, ast_record_id, suggested_isolate_id)
);
create index if not exists match_reviews_workspace_idx on public.isolate_match_reviews (workspace_id, decision);

-- ---------------------------------------------------------------------------
-- 9. gene_drug_evidence
-- ---------------------------------------------------------------------------
create table if not exists public.gene_drug_evidence (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  organism text not null,
  gene_or_mutation text not null,
  drug text not null,
  drug_class text not null,
  mechanism text not null,
  evidence_level text not null check (evidence_level in ('established', 'strong', 'moderate', 'context-dependent', 'unresolved')),
  evidence_source text not null,
  source_url text not null,
  database text not null,
  database_version text not null,
  verification_status text not null check (verification_status in ('verified', 'needs_review', 'context_dependent', 'unverified')),
  mapping_version text not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (workspace_id, mapping_version, organism, gene_or_mutation, drug)
);
create index if not exists evidence_lookup_idx on public.gene_drug_evidence (workspace_id, lower(organism), lower(drug));
create index if not exists evidence_gene_idx on public.gene_drug_evidence (workspace_id, lower(gene_or_mutation));

-- ---------------------------------------------------------------------------
-- 10. analysis_runs
-- ---------------------------------------------------------------------------
create table if not exists public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid references public.research_projects (id) on delete set null,
  dataset_id uuid references public.datasets (id) on delete set null,
  organism text,
  antibiotic text,
  require_panel boolean not null default true,
  analysis_version text not null,
  mapping_version text not null,
  engine text not null default 'amr-pulse-deterministic',
  status text not null default 'completed' check (status in ('running', 'completed', 'failed')),
  counts jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  exclusions jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists analysis_runs_workspace_idx on public.analysis_runs (workspace_id, created_at desc);
create index if not exists analysis_runs_dataset_idx on public.analysis_runs (dataset_id);

-- ---------------------------------------------------------------------------
-- 11. analysis_findings
-- ---------------------------------------------------------------------------
create table if not exists public.analysis_findings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  run_id uuid not null references public.analysis_runs (id) on delete cascade,
  isolate_id text not null,
  antibiotic text not null,
  phenotype text not null check (upper(phenotype) in ('S', 'I', 'R', 'SDD', 'NS', 'U')),
  determinant_status text not null check (determinant_status in ('positive', 'none_detected', 'unresolved_variant', 'not_screened')),
  classification text not null check (classification in ('concordant_resistant', 'concordant_susceptible', 'candidate_gene_positive_phenotype_susceptible', 'candidate_phenotype_resistant_no_known_determinant', 'indeterminate')),
  included_in_primary boolean not null default false,
  exclusion_reason text,
  detected_genes text[] not null default '{}',
  unresolved_genes text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (run_id, isolate_id, antibiotic)
);
create index if not exists findings_run_idx on public.analysis_findings (run_id, classification);
create index if not exists findings_workspace_candidate_idx on public.analysis_findings (workspace_id, classification) where classification in ('candidate_gene_positive_phenotype_susceptible', 'candidate_phenotype_resistant_no_known_determinant');

-- ---------------------------------------------------------------------------
-- 12. ai_workflow_runs
-- ---------------------------------------------------------------------------
create table if not exists public.ai_workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid references public.research_projects (id) on delete set null,
  question_hash text not null,
  question_length integer not null check (question_length >= 0),
  mode text not null check (mode in ('deterministic', 'ai', 'failed')),
  model text,
  status text not null default 'running' check (status in ('running', 'completed', 'error')),
  tools text[] not null default '{}',
  citations text[] not null default '{}',
  elapsed_ms integer,
  error text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists ai_runs_workspace_idx on public.ai_workflow_runs (workspace_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 13. ai_tool_events
-- ---------------------------------------------------------------------------
create table if not exists public.ai_tool_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  run_id uuid not null references public.ai_workflow_runs (id) on delete cascade,
  tool_name text not null,
  status text not null check (status in ('completed', 'error')),
  duration_ms integer,
  citations text[] not null default '{}',
  payload_summary text,
  created_at timestamptz not null default now()
);
create index if not exists ai_tool_events_run_idx on public.ai_tool_events (run_id, created_at);

-- ---------------------------------------------------------------------------
-- 14. saved_reports
-- ---------------------------------------------------------------------------
create table if not exists public.saved_reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid references public.research_projects (id) on delete set null,
  run_id uuid references public.analysis_runs (id) on delete set null,
  kind text not null default 'report' check (kind in ('report', 'ai-draft')),
  title text not null,
  body text not null,
  citations jsonb not null default '[]'::jsonb,
  limitations text[] not null default '{}',
  mode text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists saved_reports_workspace_idx on public.saved_reports (workspace_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 15. audit_events
-- ---------------------------------------------------------------------------
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces (id) on delete set null,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_events_workspace_idx on public.audit_events (workspace_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists workspaces_set_updated_at on public.workspaces;
create trigger workspaces_set_updated_at before update on public.workspaces for each row execute function public.set_updated_at();
drop trigger if exists research_projects_set_updated_at on public.research_projects;
create trigger research_projects_set_updated_at before update on public.research_projects for each row execute function public.set_updated_at();
drop trigger if exists saved_reports_set_updated_at on public.saved_reports;
create trigger saved_reports_set_updated_at before update on public.saved_reports for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.research_projects enable row level security;
alter table public.datasets enable row level security;
alter table public.isolate_records enable row level security;
alter table public.gene_calls enable row level security;
alter table public.ast_results enable row level security;
alter table public.isolate_match_reviews enable row level security;
alter table public.gene_drug_evidence enable row level security;
alter table public.analysis_runs enable row level security;
alter table public.analysis_findings enable row level security;
alter table public.ai_workflow_runs enable row level security;
alter table public.ai_tool_events enable row level security;
alter table public.saved_reports enable row level security;
alter table public.audit_events enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select using (id = auth.uid());
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert with check (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists workspaces_owner_all on public.workspaces;
create policy workspaces_owner_all on public.workspaces for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'research_projects', 'datasets', 'isolate_records', 'gene_calls', 'ast_results',
    'isolate_match_reviews', 'gene_drug_evidence', 'analysis_runs', 'analysis_findings',
    'ai_workflow_runs', 'ai_tool_events', 'saved_reports'
  ]
  loop
    execute format('drop policy if exists %I_workspace_all on public.%I', table_name, table_name);
    execute format(
      'create policy %I_workspace_all on public.%I for all using (public.workspace_is_owned(workspace_id)) with check (public.workspace_is_owned(workspace_id))',
      table_name, table_name
    );
  end loop;
end;
$$;

drop policy if exists audit_events_select on public.audit_events;
create policy audit_events_select on public.audit_events for select using (workspace_id is not null and public.workspace_is_owned(workspace_id));
drop policy if exists audit_events_insert on public.audit_events;
create policy audit_events_insert on public.audit_events for insert with check (workspace_id is not null and public.workspace_is_owned(workspace_id));

-- ---------------------------------------------------------------------------
-- Least-privilege grants for the authenticated role (service role bypasses RLS).
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.profiles, public.workspaces, public.research_projects, public.datasets,
  public.isolate_records, public.gene_calls, public.ast_results, public.isolate_match_reviews,
  public.gene_drug_evidence, public.analysis_runs, public.analysis_findings,
  public.ai_workflow_runs, public.ai_tool_events, public.saved_reports, public.audit_events
to authenticated;
