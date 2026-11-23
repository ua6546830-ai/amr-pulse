import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Bot, Database, Download, FileJson, Gauge, KeyRound, Lock, Settings2, ShieldCheck, Workflow } from "lucide-react";
import { LocalDataManager } from "@/components/local-data-manager";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, KeyValue } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { getAiConfig } from "@/lib/ai/config";
import { getDemoDataset } from "@/server/demo/load";
import { MAX_FILE_BYTES, MAX_ROWS } from "@/lib/imports/adapters";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ai = getAiConfig();
  const demo = await getDemoDataset();
  let host = "—";
  if (ai.baseUrl) {
    try {
      host = new URL(ai.baseUrl).host;
    } catch {
      host = "invalid URL";
    }
  }

  const envRows = [
    { name: "AI_PROVIDER", set: Boolean(process.env.AI_PROVIDER), purpose: "openai-compatible or anthropic; server-side only." },
    { name: "AI_API_KEY", set: Boolean(process.env.AI_API_KEY), purpose: "Provider key. Never sent to the browser or logged." },
    { name: "AI_MODEL", set: Boolean(process.env.AI_MODEL), purpose: "Model identifier passed to the provider." },
    { name: "AI_BASE_URL", set: Boolean(process.env.AI_BASE_URL), purpose: "Optional compatible endpoint; defaults per provider." },
    { name: "AI_REQUESTS_PER_HOUR", set: Boolean(process.env.AI_REQUESTS_PER_HOUR), purpose: "Per-client fixed-window limit (default 30)." },
    { name: "NEXT_PUBLIC_SUPABASE_URL", set: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL), purpose: "Optional workspace mode. Public URL only." },
    { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", set: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY), purpose: "Optional workspace mode. RLS-constrained anon key." },
    { name: "SUPABASE_SERVICE_ROLE_KEY", set: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY), purpose: "Server-only; never expose to the browser." },
  ];

  const limits = [
    { label: "Upload size per file", value: `${(MAX_FILE_BYTES / (1024 * 1024)).toFixed(0)} MB`, note: "Rejected client- and server-side." },
    { label: "Rows parsed per table", value: `${MAX_ROWS.toLocaleString("en-US")}`, note: "Excess rows are truncated and reported." },
    { label: "Rows per normalisation chunk", value: "400", note: "Chunked to keep requests bounded." },
    { label: "AI question length", value: "2,000 characters", note: "History capped at the last 10 messages." },
    { label: "AI run budget", value: "3 model turns / 6 tool calls", note: "30-second provider timeout." },
    { label: "AI rate limit", value: `${ai.maxRequestsPerHour} / hour / client`, note: "Fixed-window in-memory limiter." },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<Badge variant="outline">Workspace</Badge>}
        title="Settings and data policy"
        description="Configuration is server-driven through environment variables. The public demo works without an account, database or AI key; workspace mode adds persistence but never weakens the read-only analysis guarantees."
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link href="/api/manifest">
              <FileJson className="h-3.5 w-3.5" /> Manifest JSON
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="h-3.5 w-3.5 text-brand-600" /> Workspace mode
              </CardTitle>
              <p className="mt-0.5 text-xs text-muted">Mode A is active in this deployment unless Supabase variables are also set.</p>
            </div>
            <Badge variant="green">Mode A · public demo</Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-[12px] leading-relaxed text-ink/80">
            <KeyValue label="Active dataset" value={`${demo.manifest.datasetName} (${demo.manifest.label})`} />
            <KeyValue label="Dataset seed" value={demo.manifest.seed} mono />
            <KeyValue label="Analysis engine" value={demo.primary.meta.analysisVersion} mono />
            <KeyValue label="Evidence map" value={demo.primary.meta.mappingVersion} mono />
            <KeyValue label="Files" value={`${demo.manifest.files.length} bundled demo files`} />
            <KeyValue label="Accounts" value="Not required; demo is public and read-only." />
            <KeyValue label="Persistence" value="Browser-local drafts only. No server-side writes." />
            <p className="rounded-lg border border-line bg-canvas/60 p-2.5 text-[11px] text-muted">
              Mode B (research workspace) enables authenticated projects, dataset persistence and saved analyses. Its schema and RLS policies are versioned SQL migrations; the demo path never depends on them.
            </p>
            <Button asChild variant="secondary" size="sm">
              <Link href="/datasets">
                <Database className="h-3.5 w-3.5" /> Review datasets
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-3.5 w-3.5 text-brand-600" /> AI provider
              </CardTitle>
              <p className="mt-0.5 text-xs text-muted">Keys are read only by route handlers and never included in client bundles or audit logs.</p>
            </div>
            <Badge variant={ai.configured ? "blue" : "amber"}>{ai.configured ? "Configured" : "Deterministic fallback"}</Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-[12px] text-ink/80">
            <KeyValue label="Provider" value={ai.provider === "none" ? "none" : ai.provider} mono />
            <KeyValue label="Model" value={ai.model || "not set"} mono />
            <KeyValue label="Endpoint host" value={host} mono />
            <KeyValue label="API key" value={ai.apiKey ? "present (value never displayed)" : "not set"} />
            <KeyValue label="Rate limit" value={`${ai.maxRequestsPerHour} requests/hour`} mono />
            {!ai.configured ? <Alert variant="warning" title="No provider configured">{ai.reason ?? "Set the AI variables to enable model-written summaries."} Deterministic tool-derived answers remain available.</Alert> : null}
            <p className="flex items-start gap-2 rounded-lg border border-line bg-canvas/60 p-2.5 text-[11px] text-muted">
              <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Rotate keys by changing the deployment environment. Never prefix a secret with <span className="font-mono">NEXT_PUBLIC_</span>.
            </p>
            <Button asChild variant="secondary" size="sm">
              <Link href="/ai-workspace">
                <ShieldCheck className="h-3.5 w-3.5" /> Open AI workspace
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-3.5 w-3.5 text-brand-600" /> Limits
              </CardTitle>
              <p className="mt-0.5 text-xs text-muted">Limits are enforced at the boundary; they are not advisory UI messages.</p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Setting</TH>
                  <TH>Value</TH>
                  <TH>Behaviour</TH>
                </TR>
              </THead>
              <TBody>
                {limits.map((limit) => (
                  <TR key={limit.label}>
                    <TD>{limit.label}</TD>
                    <TD className="font-mono text-[11.5px]">{limit.value}</TD>
                    <TD className="text-muted">{limit.note}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-3.5 w-3.5 text-brand-600" /> Environment variables
              </CardTitle>
              <p className="mt-0.5 text-xs text-muted">Presence only. Secret values are never rendered, even to authenticated users.</p>
            </div>
            <Badge variant="neutral">{envRows.filter((row) => row.set).length}/{envRows.length} present</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Variable</TH>
                  <TH>Status</TH>
                  <TH>Purpose</TH>
                </TR>
              </THead>
              <TBody>
                {envRows.map((row) => (
                  <TR key={row.name}>
                    <TD className="font-mono text-[11px]">{row.name}</TD>
                    <TD>
                      <Badge variant={row.set ? "green" : "neutral"}>{row.set ? "set" : "unset"}</Badge>
                    </TD>
                    <TD className="text-muted">{row.purpose}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <LocalDataManager />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-brand-600" /> Privacy and compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-[12px] leading-relaxed text-ink/80">
            <p className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn-600" /> Do not upload identifiable patient data, clinical notes, names, MRNs or dates of birth. The platform is designed for isolate-level surveillance and genomic records.
            </p>
            <p>Uploaded files are processed in memory for validation; the public demo does not persist them. If you enable workspace persistence, confirm your lawful basis and data-retention obligations first.</p>
            <p>No HIPAA, ISO 27001, GDPR certification or other regulatory compliance is claimed. Any such assessment requires independent review. No ethics approval is claimed for the demonstration dataset.</p>
            <p className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok-600" /> Research use only. No diagnosis, treatment recommendation, dosing or patient-specific advice is produced.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-3.5 w-3.5 text-brand-600" /> Reproducibility
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-[12px] text-ink/80">
            <p>The manifest captures software versions, dataset identity, analysis counts and the exact evidence mapping used.</p>
            <ul className="ml-4 list-disc space-y-1 text-muted">
              <li><Link href="/api/manifest" className="text-brand-700 hover:underline">/api/manifest</Link> — JSON manifest</li>
              <li><Link href="/methods" className="text-brand-700 hover:underline">Methods &amp; reproducibility</Link> — pipeline, statistics and references</li>
              <li><Link href="/api/analysis/export?resource=pairs" className="text-brand-700 hover:underline">Pairs CSV</Link> — every analysed pair with classification</li>
              <li><Link href="/api/quality/issues" className="text-brand-700 hover:underline">Validation issues CSV</Link> — code-level audit trail</li>
            </ul>
            <p className="text-[11px] text-muted">Demo generation: <span className="font-mono">{demo.manifest.generatorScript}</span> (seed {demo.manifest.seed}).</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
