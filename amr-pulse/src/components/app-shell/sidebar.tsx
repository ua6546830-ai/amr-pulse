"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Database,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Menu,
  Microscope,
  PlayCircle,
  Radar,
  Settings,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PRIMARY = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/import", label: "New Analysis", icon: UploadCloud },
  { href: "/investigations", label: "Findings", icon: Radar },
  { href: "/ai-workspace", label: "AI Assistant", icon: Sparkles },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/methods", label: "Data & Methods", icon: BookOpen },
];

const SECONDARY = [
  { href: "/quality", label: "Data quality", icon: ShieldCheck },
  { href: "/isolates", label: "Isolates", icon: Microscope },
  { href: "/datasets", label: "Datasets", icon: Database },
];

export function Sidebar({ aiConfigured }: { aiConfigured: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname === href || pathname.startsWith(`${href}/`);

  const nav = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-5">
        <Logo />
        <button
          type="button"
          className="rounded-lg p-1.5 text-muted hover:bg-canvas lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mx-4 mb-4 rounded-2xl border border-line bg-white/80 p-3.5 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <span className="mono-label">Active dataset</span>
          <Badge variant="amber">Synthetic</Badge>
        </div>
        <p className="mt-1.5 truncate text-[12.5px] font-semibold text-ink">Demo workspace</p>
        <p className="truncate font-mono text-[10.5px] text-muted">220 isolates · seed 20261122</p>
        <div className="mt-2.5 flex items-center gap-1.5 border-t border-line pt-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          <span className="text-[10.5px] text-muted">Engine 1.0.0 · deterministic</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Primary">
        <p className="px-2.5 pb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-faint">Research loop</p>
        <ul className="space-y-0.5">
          {PRIMARY.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-all duration-200",
                    active
                      ? "bg-navy-900 font-medium text-white shadow-[0_10px_24px_-16px_rgba(16,36,58,0.9)]"
                      : "text-slate-600 hover:bg-navy-900/[0.045] hover:text-ink"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-[17px] w-[17px] transition-colors",
                      active ? "text-[#5FE0C0]" : "text-faint group-hover:text-navy-700"
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                  {item.href === "/ai-workspace" ? (
                    <span
                      className={cn(
                        "ml-auto rounded-full px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.1em]",
                        active ? "bg-white/15 text-white" : "bg-ai-soft text-ai-deep"
                      )}
                    >
                      AI
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="mt-6 px-2.5 pb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-faint">Supporting views</p>
        <ul className="space-y-0.5">
          {SECONDARY.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2 text-[12.5px] transition-colors",
                    active ? "bg-canvas font-medium text-ink" : "text-slate-500 hover:bg-navy-900/[0.04] hover:text-ink"
                  )}
                >
                  <Icon className={cn("h-4 w-4", active ? "text-brand-600" : "text-faint group-hover:text-navy-700")} />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              aria-current={isActive("/settings") ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2 text-[12.5px] transition-colors",
                isActive("/settings") ? "bg-canvas font-medium text-ink" : "text-slate-500 hover:bg-navy-900/[0.04] hover:text-ink"
              )}
            >
              <Settings className={cn("h-4 w-4", isActive("/settings") ? "text-brand-600" : "text-faint group-hover:text-navy-700")} />
              <span className="truncate">Settings</span>
            </Link>
          </li>
        </ul>
      </nav>

      <div className="shrink-0 p-3">
        <Link
          href="/demo"
          onClick={() => setOpen(false)}
          className="group block overflow-hidden rounded-2xl bg-navy-950 px-3.5 py-3 text-white shadow-lift"
        >
          <div className="flex items-center gap-2">
            <PlayCircle className="h-4 w-4 text-[#5FE0C0]" />
            <p className="text-[12px] font-semibold">Demo mode · 5 min</p>
            <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-[#8FE9DA] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </div>
          <p className="mt-1 text-[10.5px] leading-snug text-slate-300">
            Problem → import → compare → findings → report.
          </p>
        </Link>
        <div className="mt-2 flex items-center gap-1.5 px-1">
          <FlaskConical className="h-3.5 w-3.5 text-brand-600" />
          <span className="text-[10px] text-muted">Research support only</span>
          <Badge className="ml-auto" variant={aiConfigured ? "green" : "neutral"}>
            {aiConfigured ? "AI configured" : "Deterministic AI"}
          </Badge>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-3 top-3 z-40 rounded-xl border border-line bg-white p-2.5 text-muted shadow-card lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-4 w-4" />
      </button>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[268px] border-r border-line/80 bg-white/80 backdrop-blur-xl lg:block print:hidden">
        {nav}
      </aside>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-navy-950/40 backdrop-blur-sm" aria-label="Close navigation overlay" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[280px] bg-white shadow-pop">{nav}</aside>
        </div>
      ) : null}
    </>
  );
}
