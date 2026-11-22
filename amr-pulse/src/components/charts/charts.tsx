"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const PALETTE = {
  teal: "#0F9D8A",
  blue: "#2563EB",
  amber: "#B45309",
  red: "#B91C1C",
  cyan: "#0891B2",
  slate: "#64748B",
  light: "#CBD5E1",
};

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string; payload?: Record<string, unknown> }>;
  label?: string | number;
}

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-[11.5px] shadow-pop">
      {label !== undefined ? <p className="mb-1 font-medium text-ink">{String(label)}</p> : null}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2 text-muted">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
          <span>{p.name}</span>
          <span className="ml-auto font-mono tabular-nums text-ink">{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</span>
        </p>
      ))}
    </div>
  );
}

const axisProps = {
  tick: { fill: "#64748B", fontSize: 10.5 },
  tickLine: false,
  axisLine: { stroke: "#E5EAF0" },
} as const;

export function ChartFrame({
  title,
  description,
  source,
  height = 240,
  children,
  action,
  className,
}: {
  title: string;
  description?: string;
  source?: string;
  height?: number;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-line bg-white p-4 shadow-card", className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[12.5px] font-semibold text-ink">{title}</p>
          {description ? <p className="mt-0.5 text-[11px] text-muted">{description}</p> : null}
        </div>
        {action}
      </div>
      <div style={{ height }}>{children}</div>
      {source ? <p className="mt-2 border-t border-line pt-2 text-[10px] text-slate-400">{source}</p> : null}
    </div>
  );
}

export function AgreementDonut({
  counts,
}: {
  counts: { concordantResistant: number; concordantSusceptible: number; genePositiveSusceptible: number; resistantNoDeterminant: number };
}) {
  const data = [
    { name: "Concordant R", value: counts.concordantResistant, color: PALETTE.teal },
    { name: "Concordant S", value: counts.concordantSusceptible, color: PALETTE.blue },
    { name: "Gene + / phenotype S", value: counts.genePositiveSusceptible, color: PALETTE.amber },
    { name: "Phenotype R / no known determinant", value: counts.resistantNoDeterminant, color: PALETTE.red },
  ];
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="relative h-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={1} stroke="#fff" strokeWidth={1}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-semibold tabular-nums text-ink">{total}</span>
        <span className="text-[10px] uppercase tracking-wide text-muted">eligible pairs</span>
      </div>
    </div>
  );
}

export function HorizontalBars({
  data,
  color = PALETTE.blue,
  suffix = "",
  dataKey = "value",
}: {
  data: Array<{ name: string; [key: string]: string | number }>;
  color?: string;
  suffix?: string;
  dataKey?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 30, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke="#EEF2F7" />
        <XAxis type="number" {...axisProps} />
        <YAxis type="category" dataKey="name" width={150} {...axisProps} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "#F7F9FC" }} />
        <Bar dataKey={dataKey} fill={color} radius={[0, 3, 3, 0]} barSize={12} label={{ position: "right", fill: "#475569", fontSize: 10.5, formatter: (value) => `${value ?? ""}${suffix}` }} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StackedAstBars({
  data,
}: {
  data: Array<{ drug: string; S: number; I: number; R: number; U: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: -18, right: 8, top: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#EEF2F7" />
        <XAxis dataKey="drug" {...axisProps} interval={0} angle={-18} textAnchor="end" height={52} />
        <YAxis {...axisProps} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "#F7F9FC" }} />
        <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 10.5 }} />
        <Bar dataKey="S" stackId="a" fill={PALETTE.blue} name="Susceptible" />
        <Bar dataKey="I" stackId="a" fill={PALETTE.amber} name="Intermediate" />
        <Bar dataKey="R" stackId="a" fill={PALETTE.red} name="Resistant" />
        <Bar dataKey="U" stackId="a" fill={PALETTE.light} name="Unknown" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SimpleBars({
  data,
  color = PALETTE.cyan,
  height = 220,
}: {
  data: Array<{ name: string; value: number }>;
  color?: string;
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -20, right: 8, top: 6 }}>
          <CartesianGrid vertical={false} stroke="#EEF2F7" />
          <XAxis dataKey="name" {...axisProps} interval={0} angle={-15} textAnchor="end" height={46} />
          <YAxis {...axisProps} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "#F7F9FC" }} />
          <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} maxBarSize={34} label={{ position: "top", fill: "#475569", fontSize: 10 }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OrganismSplit({ data }: { data: Array<{ name: string; value: number }> }) {
  const colors = [PALETTE.blue, PALETTE.cyan, PALETTE.slate, PALETTE.teal];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" outerRadius="82%" innerRadius="48%" paddingAngle={2} stroke="#fff">
          {data.map((d, i) => (
            <Cell key={d.name} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 10.5 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function CompletenessChart({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.name}>
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-[11px] text-muted">{d.name}</span>
            <span className="font-mono text-[11px] tabular-nums text-ink">{d.value.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, d.value)}%`,
                background: d.value >= 90 ? PALETTE.teal : d.value >= 70 ? PALETTE.amber : PALETTE.red,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
