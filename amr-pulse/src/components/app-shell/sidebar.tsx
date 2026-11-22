"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  Bug,
  Database,
  FileText,
  FlaskConical,
  GitCompare,
  LayoutDashboard,
  Menu,
  Microscope,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const GROUPS = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/datasets", label: "Research Datasets", icon: Database },
    ],
  },
  {
    label: "Research workflow",
    items: [
      { href: "/import", label: "Data Import", icon: Upload },
      { href: "/quality", label: "Data Quality", icon: ShieldCheck },
      { href: "/analysis", label: "Geno–Pheno Analysis", icon: GitCompare },
      { href: "/isolates", label: "Isolate Explorer", icon: Microscope },
    ],
  },
  {
    label: "Investigation",
    items: [
      { href: "/investigations", label: "Discordance", icon: Bug },
      { href: "/ai-workspace", label: "AI Research Assistant", icon: Sparkles },
    ],
  },
  {
    label: "Output",
    items: [
      { href: "/reports", label: "Research Reports", icon: FileText },
      { href: "/methods", label: "Methods & Reproducibility", icon: BookOpen },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar({ aiConfigured }: { aiConfigured: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between border-b border-line px-4">
        <Logo />
        <button
          type="button"
          className="rounded-md p-1.5 text-muted hover:bg-canvas lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="border-b border-line px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="mono-label">Dataset</span>
          <Badge variant="amber">SYNTHETIC</Badge>
        </div>
        <p className="mt-1 truncate text-[11.5px] font-medium text-ink">Demo workspace</p>
        <p className="truncate text-[10.5px] text-muted">220 isolates · seed 20261122</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Primary">
        {GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="px-2 pb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-slate-400">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12.5px] transition-colors",
                        active ? "bg-brand-50 font-medium text-brand-700" : "text-slate-600 hover:bg-canvas hover:text-ink"
                      )}
                    >
                      <Icon className={cn("h-4 w-4", active ? "text-brand-600" : "text-slate-400 group-hover:text-slate-600")} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-line p-3">
        <div className="rounded-lg border border-line bg-canvas/70 p-2.5">
          <div className="flex items-center gap-1.5">
            <FlaskConical className="h-3.5 w-3.5 text-teal-600" />
            <p className="text-[10.5px] font-medium text-ink">Research-support platform</p>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-muted">Not a diagnostic device. No patient-level data.</p>
          <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
            <span className="text-[9.5px] text-muted">AI service</span>
            <Badge variant={aiConfigured ? "green" : "neutral"}>{aiConfigured ? "configured" : "deterministic mode"}</Badge>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-3 top-3 z-40 rounded-md border border-line bg-white p-2 text-muted shadow-card lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-4 w-4" />
      </button>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] border-r border-line bg-white lg:block print:hidden">
        {nav}
      </aside>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-ink/30" aria-label="Close navigation overlay" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[270px] bg-white shadow-pop">{nav}</aside>
        </div>
      ) : null}
    </>
  );
}
