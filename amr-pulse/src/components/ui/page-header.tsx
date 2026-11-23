import * as React from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 pb-7 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-2.5">{eyebrow}</div> : null}
        <h1 className="display text-[28px] font-semibold leading-tight text-ink lg:text-[32px]">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionHeader({ title, description, actions, className }: { title: string; description?: string; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div>
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
        {description ? <p className="mt-1 text-[12px] leading-relaxed text-muted">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function KeyValue({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-2.5 last:border-0">
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd className={cn("max-w-[65%] text-right text-[12.5px] text-ink", mono && "font-mono text-[11.5px]")}>{value}</dd>
    </div>
  );
}
