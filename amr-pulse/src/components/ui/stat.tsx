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

const TONE: Record<string, { value: string; bar: string; icon: string }> = {
  default: { value: "text-ink", bar: "from-navy-800/70 to-navy-800/0", icon: "text-faint" },
  good: { value: "text-brand-700", bar: "from-brand-600/80 to-brand-600/0", icon: "text-brand-600" },
  warn: { value: "text-warn-700", bar: "from-warn-600/70 to-warn-600/0", icon: "text-warn-600" },
  bad: { value: "text-danger-600", bar: "from-danger-600/70 to-danger-600/0", icon: "text-danger-600" },
  info: { value: "text-navy-800", bar: "from-sci-cyan/80 to-sci-cyan/0", icon: "text-sci-cyan" },
};

export function StatCard({
  label,
  value,
  denominator,
  hint,
  tone = "default",
  icon: Icon,
  tooltip,
}: {
  label: string;
  value: React.ReactNode;
  denominator?: React.ReactNode;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad" | "info";
  icon?: React.ComponentType<{ className?: string }>;
  tooltip?: string;
}) {
  const theme = TONE[tone] ?? TONE.default;
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-line bg-white p-5 shadow-card hover-lift">
      <span className={cn("absolute inset-x-0 top-0 h-px bg-gradient-to-r", theme.bar)} />
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn("text-[10.5px] font-semibold uppercase tracking-[0.11em] text-muted", tooltip && "cursor-help border-b border-dotted border-line-strong")}
          title={tooltip}
        >
          {label}
        </p>
        {Icon ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-canvas ring-1 ring-line/70">
            <Icon className={cn("h-4 w-4", theme.icon)} />
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className={cn("display font-mono text-[30px] font-semibold leading-none tabular-nums", theme.value)}>{value}</span>
        {denominator ? <span className="text-[11.5px] text-muted">{denominator}</span> : null}
      </div>
      {hint ? <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted">{hint}</p> : null}
    </div>
  );
}
