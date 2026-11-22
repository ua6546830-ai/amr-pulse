import * as React from "react";
import { cn } from "@/lib/utils";

export function Progress({
  value,
  max = 100,
  className,
  indicatorClassName,
  label,
}: {
  value: number;
  max?: number;
  className?: string;
  indicatorClassName?: string;
  label?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div>
      <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-line", className)}>
        <div className={cn("h-full rounded-full bg-brand-600 transition-[width]", indicatorClassName)} style={{ width: `${pct}%` }} />
      </div>
      {label ? <p className="mt-1.5 text-[11px] text-muted">{label}</p> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  denominator,
  hint,
  tone = "default",
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  denominator?: React.ReactNode;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad" | "info";
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const toneClass =
    tone === "good"
      ? "text-ok-600"
      : tone === "warn"
        ? "text-warn-600"
        : tone === "bad"
          ? "text-danger-600"
          : tone === "info"
            ? "text-brand-700"
            : "text-ink";
  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted">{label}</p>
        {Icon ? <Icon className="h-4 w-4 text-slate-400" /> : null}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className={cn("font-mono text-2xl font-semibold tabular-nums tracking-tight", toneClass)}>{value}</span>
        {denominator ? <span className="text-xs text-muted">{denominator}</span> : null}
      </div>
      {hint ? <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{hint}</p> : null}
    </div>
  );
}
