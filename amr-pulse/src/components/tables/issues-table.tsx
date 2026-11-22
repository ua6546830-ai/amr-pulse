"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import type { ValidationIssue } from "@/lib/validation/engine";
import { severityVariant, validationLabel } from "@/lib/presentation";

const columns: ColumnDef<ValidationIssue, unknown>[] = [
  {
    accessorKey: "severity",
    header: "Severity",
    cell: (c) => {
      const value = String(c.getValue()) as ValidationIssue["severity"];
      return <Badge variant={severityVariant(value)}>{value}</Badge>;
    },
  },
  {
    accessorKey: "code",
    header: "Issue",
    cell: (c) => {
      const code = String(c.getValue());
      return <span className="whitespace-nowrap text-[11.5px]">{validationLabel(code)}</span>;
    },
  },
  { accessorKey: "recordId", header: "Record", cell: (c) => <span className="font-mono text-[10.5px]">{String(c.getValue())}</span> },
  { accessorKey: "field", header: "Field", cell: (c) => <span className="font-mono text-[10.5px] text-muted">{String(c.getValue())}</span> },
  {
    accessorKey: "problem",
    header: "Problem",
    cell: (c) => <span className="block min-w-[180px] max-w-[240px] text-[11.5px]">{String(c.getValue())}</span>,
  },
  {
    accessorKey: "originalValue",
    header: "Original value",
    cell: (c) => {
      const value = String(c.getValue() ?? "");
      return <span className="block max-w-[140px] truncate font-mono text-[10.5px] text-slate-600" title={value}>{value || "(blank)"}</span>;
    },
  },
  {
    accessorKey: "explanation",
    header: "Explanation",
    cell: (c) => <span className="block min-w-[220px] max-w-[300px] text-[11px] leading-relaxed text-slate-600">{String(c.getValue())}</span>,
  },
  {
    accessorKey: "suggestion",
    header: "Suggested action",
    cell: (c) => {
      const value = String(c.getValue() ?? "");
      return <span className="block min-w-[160px] max-w-[220px] text-[11px] leading-relaxed text-slate-600">{value || "Review manually"}</span>;
    },
  },
];

export function IssuesTable({ issues }: { issues: ValidationIssue[] }) {
  return <DataTable columns={columns} data={issues} searchPlaceholder="Search issue, record or field" pageSize={12} />;
}
