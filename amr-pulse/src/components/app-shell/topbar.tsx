"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Radar,
  Search,
  Sparkles,
  UploadCloud,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const LABELS: Record<string, string> = {
  dashboard: "Overview",
  datasets: "Datasets",
  import: "New Analysis",
  quality: "Data quality",
  analysis: "Analysis results",
  isolates: "Isolate explorer",
  investigations: "Findings",
  "ai-workspace": "AI assistant",
  reports: "Reports",
  methods: "Data & methods",
  settings: "Settings",
  demo: "Demo mode",
};

const SEARCH_ROUTES = [
  { href: "/dashboard", label: "Overview", hint: "Workspace metrics and recent findings", icon: LayoutDashboard },
  { href: "/import", label: "New analysis", hint: "Upload, map and validate a dataset", icon: UploadCloud },
  { href: "/investigations", label: "Findings", hint: "Candidate discordance queue", icon: Radar },
  { href: "/analysis", label: "Analysis results", hint: "Agreement, classes and statistics", icon: FileText },
  { href: "/ai-workspace", label: "AI assistant", hint: "Ask questions with cited evidence", icon: Sparkles },
  { href: "/reports", label: "Reports", hint: "Build and export a research report", icon: FileText },
  { href: "/demo", label: "Demo mode", hint: "Five-step guided walkthrough", icon: Sparkles },
];

function useCrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    const label = LABELS[segment] ?? decodeURIComponent(segment);
    return { href, label, last: index === segments.length - 1 };
  });
}

export function Topbar({ aiConfigured }: { aiConfigured: boolean }) {
  const crumbs = useCrumbs();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return SEARCH_ROUTES.filter(
      (r) => r.label.toLowerCase().includes(q) || r.hint.toLowerCase().includes(q) || r.href.includes(q)
    ).slice(0, 6);
  }, [query]);

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-white/70 backdrop-blur-xl print:hidden">
      <div className="flex h-16 items-center gap-3 px-4 pl-14 lg:px-6 lg:pl-6">
        <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
          <ol className="flex items-center gap-1.5 text-[12px]">
            <li className="text-faint">
              <Link href="/dashboard" className="transition-colors hover:text-ink">Workspace</Link>
            </li>
            {crumbs.map((crumb) => (
              <li key={crumb.href} className="flex min-w-0 items-center gap-1.5">
                <ChevronRight className="h-3 w-3 shrink-0 text-slate-300" aria-hidden />
                {crumb.last ? (
                  <span className="truncate font-medium text-ink" aria-current="page">{crumb.label}</span>
                ) : (
                  <Link href={crumb.href} className="truncate text-faint transition-colors hover:text-ink">{crumb.label}</Link>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workspace…"
            aria-label="Search workspace"
            className="h-9 w-56 rounded-xl border border-line bg-canvas/70 pl-9 pr-3 text-[12px] text-ink placeholder:text-faint focus:border-brand-500/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-600/15 lg:w-64"
          />
          {query.trim() ? (
            <div className="absolute left-0 right-0 top-11 overflow-hidden rounded-xl border border-line bg-white p-1.5 shadow-pop">
              {results.length ? (
                <ul className="space-y-0.5">
                  {results.map((r) => {
                    const Icon = r.icon;
                    return (
                      <li key={r.href}>
                        <Link
                          href={r.href}
                          onClick={() => setQuery("")}
                          className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 hover:bg-canvas"
                        >
                          <Icon className="mt-0.5 h-3.5 w-3.5 text-brand-600" />
                          <span className="min-w-0">
                            <span className="block text-[12px] font-medium text-ink">{r.label}</span>
                            <span className="block truncate text-[10.5px] text-muted">{r.hint}</span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="px-3 py-2 text-[11.5px] text-muted">No matching view.</p>
              )}
            </div>
          ) : null}
        </div>

        <div className="hidden items-center gap-1.5 xl:flex">
          <Badge variant="amber">Demo dataset</Badge>
          <Badge variant={aiConfigured ? "ai" : "neutral"}>{aiConfigured ? "AI configured" : "Deterministic AI"}</Badge>
        </div>

        <details className="relative">
          <summary className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-muted transition-colors hover:bg-canvas hover:text-ink" aria-label="Notifications">
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand-500" />
          </summary>
          <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-white p-2 shadow-pop">
            <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Workspace status</p>
            <ul className="space-y-0.5 text-[12px]">
              <li className="rounded-xl px-2.5 py-2 hover:bg-canvas">
                <p className="font-medium text-ink">Synthetic demo dataset loaded</p>
                <p className="mt-0.5 text-[10.5px] text-muted">220 fictional isolates · seed 20261122</p>
              </li>
              <li className="rounded-xl px-2.5 py-2 hover:bg-canvas">
                <p className="font-medium text-ink">Analysis engine 1.0.0</p>
                <p className="mt-0.5 text-[10.5px] text-muted">Evidence map amr-pulse-evidmap-2026.11.1</p>
              </li>
              <li className="rounded-xl px-2.5 py-2 hover:bg-canvas">
                <p className="font-medium text-ink">{aiConfigured ? "AI provider reachable" : "AI provider not configured"}</p>
                <p className="mt-0.5 text-[10.5px] text-muted">
                  {aiConfigured ? "Every answer still validates against read-only tools." : "Deterministic answers and all analyses remain available."}
                </p>
              </li>
            </ul>
          </div>
        </details>

        <details className="relative">
          <summary className="flex cursor-pointer items-center gap-2 rounded-xl py-1 pl-1 pr-2 transition-colors hover:bg-canvas" aria-label="Account menu">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 text-[10px] font-semibold text-white">DV</span>
            <span className="hidden text-left sm:block">
              <span className="block text-[11.5px] font-medium leading-tight text-ink">Demo visitor</span>
              <span className="block text-[9.5px] leading-tight text-faint">Local workspace</span>
            </span>
            <ChevronDown className="h-3 w-3 text-faint" />
          </summary>
          <div className="absolute right-0 mt-2 w-60 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-white p-2 shadow-pop">
            <div className="border-b border-line px-2.5 py-2">
              <p className="text-[12px] font-medium text-ink">Demo visitor</p>
              <p className="mt-0.5 text-[10.5px] text-muted">No account · local session</p>
            </div>
            <Link href="/settings" className="mt-1 flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] text-slate-700 hover:bg-canvas">
              <User className="h-3.5 w-3.5 text-muted" /> Workspace settings
            </Link>
          </div>
        </details>
      </div>
      <div className="border-t border-warn-100/80 bg-warn-50/60 px-4 py-1.5 lg:px-6">
        <p className="flex flex-wrap items-center gap-x-2 text-[10.5px] leading-relaxed text-warn-700">
          <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-[0.1em]">
            <span className="h-1.5 w-1.5 rounded-full bg-warn-600" />
            Demonstration dataset · synthetic data
          </span>
          <span className="text-warn-700/70">Every isolate is fictional — research support only, not a diagnostic device.</span>
        </p>
      </div>
    </header>
  );
}
