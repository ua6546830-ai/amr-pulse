"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, CircleDot, FileCheck2, MessageSquareQuote, ShieldQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface PreviewClassification {
  key: string;
  label: string;
  short: string;
  count: number;
  pct: number;
  color: string;
}

export interface PreviewFinding {
  id: string;
  antibiotic: string;
  phenotype: string;
  genes: string[];
  classification: string;
  variant: "amber" | "red";
}

export interface PreviewDrug {
  name: string;
  agreement: number;
  eligible: number;
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "investigation", label: "Investigation" },
  { id: "assistant", label: "AI assistant" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export function ProductPreview({
  eligible,
  indeterminate,
  classifications,
  findings,
  drugs,
  engine,
}: {
  eligible: number;
  indeterminate: number;
  classifications: PreviewClassification[];
  findings: PreviewFinding[];
  drugs: PreviewDrug[];
  engine: string;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const finding = findings[0];
  const total = classifications.reduce((sum, item) => sum + item.count, 0);
  let cursor = 0;
  const stops = classifications
    .filter((item) => item.count > 0)
    .map((item) => {
      const from = (cursor / Math.max(1, total)) * 100;
      cursor += item.count;
      const to = (cursor / Math.max(1, total)) * 100;
      return `${item.color} ${from}% ${to}%`;
    })
    .join(", ");

  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-[30px] bg-[radial-gradient(70%_60%_at_70%_0%,rgba(66,184,213,0.22),transparent_70%),radial-gradient(60%_60%_at_10%_100%,rgba(118,101,232,0.16),transparent_70%)] blur-2xl" aria-hidden />
      <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-glass backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2 border-b border-line/80 bg-white/60 px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <span className="flex gap-1" aria-hidden>
              <span className="h-2 w-2 rounded-full bg-[#E8A23B]/70" />
              <span className="h-2 w-2 rounded-full bg-sci-cyan/70" />
              <span className="h-2 w-2 rounded-full bg-brand-500/70" />
            </span>
            <span className="hidden font-mono text-[10px] text-faint sm:inline">amr-pulse · workspace</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="amber">Demo dataset</Badge>
            <span className="hidden font-mono text-[9.5px] text-faint sm:inline">engine {engine}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 border-b border-line/70 px-3 pt-2.5">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-pressed={tab === item.id}
              className={cn(
                "relative rounded-t-lg px-3 py-2 text-[11.5px] font-medium transition-colors",
                tab === item.id ? "text-ink" : "text-muted hover:text-ink"
              )}
            >
              {item.label}
              {tab === item.id ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" /> : null}
            </button>
          ))}
          <span className="ml-auto hidden items-center gap-1 pb-1.5 text-[9.5px] text-faint md:flex">
            <CircleDot className="h-2.5 w-2.5 text-brand-600" /> synthetic · reproducible
          </span>
        </div>

        <div className="h-[352px] overflow-hidden p-4 sm:h-[368px]">
          {tab === "overview" ? (
            <div className="animate-fade-in space-y-3.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[12.5px] font-semibold text-ink">E. coli × ceftriaxone</p>
                  <p className="text-[10px] text-muted">Primary analysis · 220 demo isolates</p>
                </div>
                <Link href="/dashboard" className="inline-flex items-center gap-1 text-[10.5px] font-medium text-brand-700 hover:text-brand-800">
                  Open workspace <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="grid grid-cols-[124px_1fr] items-center gap-4">
                <div className="relative mx-auto h-[124px] w-[124px]">
                  <div className="h-full w-full rounded-full" style={{ background: `conic-gradient(${stops || "#E4E9F1 0 100%"})` }} aria-hidden />
                  <div className="absolute inset-[18px] flex flex-col items-center justify-center rounded-full bg-white shadow-[inset_0_0_0_1px_rgba(16,36,58,0.06)]">
                    <span className="font-mono text-[20px] font-semibold tabular-nums text-ink">{eligible}</span>
                    <span className="text-[8.5px] uppercase tracking-[0.1em] text-faint">eligible</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {classifications.map((item) => (
                    <div key={item.key} className="flex items-center gap-2 text-[10.5px]">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: item.color }} />
                      <span className="truncate text-muted">{item.label}</span>
                      <span className="ml-auto shrink-0 font-mono tabular-nums text-ink">
                        {item.count}
                        <span className="ml-1 text-faint">{item.pct.toFixed(1)}%</span>
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-line pt-1.5 text-[10px] text-muted">
                    <span>Indeterminate · excluded</span>
                    <span className="font-mono tabular-nums text-ink">{indeterminate}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-line bg-white/70 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-muted">Agreement by antibiotic</p>
                  <span className="font-mono text-[9px] text-faint">n ≥ 5</span>
                </div>
                <div className="mt-2 space-y-1.5">
                  {drugs.slice(0, 3).map((drug) => (
                    <div key={drug.name} className="flex items-center gap-2">
                      <span className="w-24 truncate text-[10px] text-slate-600">{drug.name}</span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                        <span className="block h-full rounded-full bg-brand-600" style={{ width: `${drug.agreement}%` }} />
                      </span>
                      <span className="w-8 text-right font-mono text-[10px] tabular-nums text-ink">{drug.agreement}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {tab === "investigation" && finding ? (
            <div className="animate-fade-in space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[12px] font-medium text-ink">{finding.id}</span>
                <Badge variant={finding.variant}>{finding.classification}</Badge>
                <span className="text-[10px] text-muted">{finding.antibiotic}</span>
                <Link href={`/isolates/${encodeURIComponent(finding.id)}`} className="ml-auto inline-flex items-center gap-1 text-[10.5px] font-medium text-brand-700 hover:text-brand-800">
                  Source record <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-line bg-white/70 p-3">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-faint">Genotype</p>
                  <p className="mt-1.5 text-[13px] font-semibold text-ink">{finding.genes[0] ?? "No determinant"}</p>
                  <p className="mt-0.5 text-[10px] leading-snug text-muted">
                    {finding.genes.length ? `${finding.genes.length} curated determinant${finding.genes.length > 1 ? "s" : ""} detected` : "No curated determinant detected"}
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-white/70 p-3">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-faint">Phenotype</p>
                  <p className="mt-1.5 text-[13px] font-semibold text-ink">{finding.phenotype === "S" ? "Susceptible" : "Resistant"}</p>
                  <p className="mt-0.5 text-[10px] leading-snug text-muted">Submitted {finding.antibiotic} category</p>
                </div>
                <div className="rounded-xl border border-line bg-ai-soft/60 p-3">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-ai-deep">Interpretation</p>
                  <p className="mt-1.5 text-[11.5px] font-semibold leading-snug text-ink">Candidate discordance</p>
                  <p className="mt-0.5 text-[10px] leading-snug text-muted">Review prompt — not a laboratory error</p>
                </div>
              </div>
              <div className="rounded-xl border border-line bg-white/70 p-3">
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-faint">What the platform checked</p>
                <ul className="mt-1.5 grid gap-1 text-[10.5px] text-slate-600 sm:grid-cols-2">
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-brand-600" /> Exact isolate identifier match</li>
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-brand-600" /> Panel provenance documented</li>
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-brand-600" /> Evidence mapping version pinned</li>
                  <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-brand-600" /> Binary phenotype confirmed</li>
                </ul>
              </div>
              <p className="text-[9.5px] leading-relaxed text-faint">
                Preview uses the synthetic demo record. Investigation opens the full genotype, phenotype and provenance trail.
              </p>
            </div>
          ) : null}

          {tab === "assistant" ? (
            <div className="animate-fade-in flex h-full flex-col gap-2.5">
              <div className="ml-auto max-w-[86%] rounded-2xl rounded-br-md bg-navy-900 px-3.5 py-2.5 text-[11px] leading-relaxed text-white">
                Why might this isolate show resistance to {finding?.antibiotic ?? "the selected antibiotic"}?
              </div>
              <div className="rounded-2xl rounded-bl-md border border-line bg-white/80 p-3.5">
                <div className="flex items-center gap-2">
                  <MessageSquareQuote className="h-3.5 w-3.5 text-ai-deep" />
                  <span className="text-[10.5px] font-semibold text-ink">AMR PULSE assistant</span>
                  <Badge variant="ai" className="ml-auto">Deterministic fallback</Badge>
                </div>
                <div className="mt-2 space-y-2 text-[10.5px] leading-relaxed text-slate-600">
                  <p>
                    <span className="font-semibold text-ink">Observation.</span>{" "}
                    {finding
                      ? `${finding.id} is reported ${finding.phenotype === "S" ? "susceptible" : "resistant"} to ${finding.antibiotic} while ${finding.genes.length ? `${finding.genes.slice(0, 2).join(", ")} ${finding.genes.length > 1 ? "were" : "was"} detected.` : "no curated determinant was detected."}`
                      : "The selected pair is a candidate discordance."}
                  </p>
                  <p>
                    <span className="font-semibold text-ink">Evidence.</span> The pair is classified from curated
                    genotype–drug mappings, the submitted AST category and documented screening provenance. No external
                    literature claim is generated without a verified citation.
                  </p>
                  <p>
                    <span className="font-semibold text-ink">Next checks.</span> Confirm the reported category and
                    breakpoint standard, verify the screening panel version, and review the raw measurement before
                    interpreting this as a novel mechanism.
                  </p>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-line pt-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-line bg-canvas px-2 py-0.5 text-[9px] text-muted">
                    <FileCheck2 className="h-2.5 w-2.5" /> Evidence map pinned
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-line bg-canvas px-2 py-0.5 text-[9px] text-muted">
                    <ShieldQuestion className="h-2.5 w-2.5" /> Human review required
                  </span>
                  <Link href="/ai-workspace" className="ml-auto text-[9.5px] font-medium text-brand-700 hover:text-brand-800">
                    Try the assistant
                  </Link>
                </div>
              </div>
              <p className="mt-auto text-[9.5px] leading-relaxed text-faint">
                Illustrative preview of the in-app assistant. Answers are labelled when produced by the deterministic
                engine; no model response is simulated.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
