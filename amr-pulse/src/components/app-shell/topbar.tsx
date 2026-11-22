"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BookOpen, ChevronDown, ChevronRight, CircleHelp, LogOut, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  datasets: "Research Datasets",
  import: "Data Import",
  quality: "Data Quality",
  analysis: "Geno–Pheno Analysis",
  isolates: "Isolate Explorer",
  investigations: "Discordance Investigation",
  "ai-workspace": "AI Research Assistant",
  reports: "Research Reports",
  methods: "Methods & Reproducibility",
  settings: "Settings",
};

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

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur print:hidden">
      <div className="flex h-14 items-center gap-3 px-4 pl-14 lg:px-6 lg:pl-6">
        <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
          <ol className="flex items-center gap-1.5 text-[11.5px]">
            <li className="text-muted">
              <Link href="/dashboard" className="hover:text-ink">Workspace</Link>
            </li>
            {crumbs.map((crumb) => (
              <li key={crumb.href} className="flex min-w-0 items-center gap-1.5">
                <ChevronRight className="h-3 w-3 text-slate-300" aria-hidden />
                {crumb.last ? (
                  <span className="truncate font-medium text-ink" aria-current="page">{crumb.label}</span>
                ) : (
                  <Link href={crumb.href} className="truncate text-muted hover:text-ink">{crumb.label}</Link>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <div className="hidden items-center gap-1.5 md:flex">
          <Badge variant="amber">SYNTHETIC DATA</Badge>
          <Badge variant={aiConfigured ? "green" : "neutral"}>{aiConfigured ? "AI configured" : "AI off · deterministic"}</Badge>
        </div>

        <details className="relative">
          <summary className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted hover:bg-canvas hover:text-ink" aria-label="Notifications">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand-600" />
          </summary>
          <div className="absolute right-0 mt-1 w-80 rounded-lg border border-line bg-white p-1.5 shadow-pop">
            <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Workspace status</p>
            <ul className="space-y-0.5 text-[12px]">
              <li className="rounded-md px-2 py-2 hover:bg-canvas">
                <p className="font-medium text-ink">Synthetic demo dataset loaded</p>
                <p className="text-[10.5px] text-muted">220 fictional isolates · generated with seed 20261122</p>
              </li>
              <li className="rounded-md px-2 py-2 hover:bg-canvas">
                <p className="font-medium text-ink">Analysis engine 1.0.0</p>
                <p className="text-[10.5px] text-muted">Evidence map amr-pulse-evidmap-2026.11.1</p>
              </li>
              <li className="rounded-md px-2 py-2 hover:bg-canvas">
                <p className="font-medium text-ink">{aiConfigured ? "AI provider reachable configuration detected" : "AI provider not configured"}</p>
                <p className="text-[10.5px] text-muted">
                  {aiConfigured ? "Tools still validate every result deterministically." : "All analyses, reports and exports remain available."}
                </p>
              </li>
            </ul>
          </div>
        </details>

        <details className="relative">
          <summary className="flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-canvas" aria-label="Help">
            <CircleHelp className="h-4 w-4 text-muted" />
          </summary>
          <div className="absolute right-0 mt-1 w-64 rounded-lg border border-line bg-white p-1.5 shadow-pop">
            <Link href="/methods" className="flex items-center gap-2 rounded-md px-2 py-2 text-[12px] text-slate-700 hover:bg-canvas">
              <BookOpen className="h-3.5 w-3.5 text-muted" /> Methods & reproducibility
            </Link>
            <Link href="/import" className="flex items-center gap-2 rounded-md px-2 py-2 text-[12px] text-slate-700 hover:bg-canvas">
              <User className="h-3.5 w-3.5 text-muted" /> Public data import guides
            </Link>
          </div>
        </details>

        <details className="relative">
          <summary className="flex cursor-pointer items-center gap-2 rounded-md py-1 pl-1 pr-2 hover:bg-canvas" aria-label="Account menu">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-[10px] font-semibold text-brand-700">DV</span>
            <span className="hidden text-left sm:block">
              <span className="block text-[11.5px] font-medium leading-tight text-ink">Demo visitor</span>
              <span className="block text-[9.5px] leading-tight text-muted">Local workspace</span>
            </span>
            <ChevronDown className="h-3 w-3 text-muted" />
          </summary>
          <div className="absolute right-0 mt-1 w-60 rounded-lg border border-line bg-white p-1.5 shadow-pop">
            <div className="border-b border-line px-2 py-2">
              <p className="text-[12px] font-medium text-ink">Demo visitor</p>
              <p className="text-[10.5px] text-muted">No account · local session</p>
            </div>
            <Link href="/settings" className="mt-1 flex items-center gap-2 rounded-md px-2 py-2 text-[12px] text-slate-700 hover:bg-canvas">
              <User className="h-3.5 w-3.5 text-muted" /> Workspace settings
            </Link>
            <span className={cn("flex items-center gap-2 rounded-md px-2 py-2 text-[12px]", "cursor-not-allowed text-slate-400")}>
              <LogOut className="h-3.5 w-3.5" /> Sign out — unavailable in demo
            </span>
          </div>
        </details>
      </div>
      <div className="border-t border-amber-200/70 bg-amber-50/80 px-4 py-1.5 lg:px-6">
        <p className="text-[10.5px] leading-relaxed text-amber-900">
          <span className="font-semibold">Synthetic demonstration data.</span> Every isolate is fictional (SYN- prefix). Research-support only — not a diagnostic device, no clinical or prescribing use.
        </p>
      </div>
    </header>
  );
}
