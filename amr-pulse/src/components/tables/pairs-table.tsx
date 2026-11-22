"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { AST_CATEGORY_META, CLASSIFICATION_META } from "@/lib/presentation";
import type { AnalysedPair, Classification } from "@/types/domain";

const columns: ColumnDef<AnalysedPair, unknown>[] = [
  {
    accessorKey: "isolateId",
    header: "Isolate",
    cell: (c) => (
      <Link href={`/isolates/${encodeURIComponent(String(c.getValue()))}`} className="font-mono text-[11px] text-brand-700 hover:underline">
        {String(c.getValue())}
      </Link>
    ),
  },
  { accessorKey: "organism", header: "Organism", cell: (c) => <span className="whitespace-nowrap text-[11.5px] italic">{String(c.getValue())}</span> },
  { accessorKey: "antibiotic", header: "Antibiotic", cell: (c) => <span className="capitalize">{String(c.getValue())}</span> },
  {
    accessorKey: "phenotype",
    header: "Phenotype",
    cell: (c) => {
      const value = String(c.getValue()) as keyof typeof AST_CATEGORY_META;
      return <Badge variant={AST_CATEGORY_META[value].variant}>{value}</Badge>;
    },
  },
  {
    accessorKey: "determinantStatus",
    header: "Determinant",
    cell: (c) => (
      <span className="whitespace-nowrap font-mono text-[10.5px] text-slate-600">
        {String(c.getValue()).replace(/_/g, " ")}
      </span>
    ),
  },
  {
    accessorKey: "detectedGenes",
    header: "Detected genes",
    cell: (c) => {
      const genes = c.getValue() as string[];
      return <span className="block max-w-[160px] truncate font-mono text-[10.5px]" title={genes.join(", ")}>{genes.length > 0 ? genes.join(", ") : "—"}</span>;
    },
  },
  {
    accessorKey: "classification",
    header: "Classification",
    cell: (c) => {
      const value = String(c.getValue()) as Classification;
      const meta = CLASSIFICATION_META[value];
      return <Badge variant={meta.variant}>{meta.short}</Badge>;
    },
  },
  { accessorKey: "astMethod", header: "Method", cell: (c) => <span className="whitespace-nowrap text-[11px] text-muted">{String(c.getValue() || "—")}</span> },
  { accessorKey: "astStandard", header: "Standard", cell: (c) => <span className="whitespace-nowrap text-[11px] text-muted">{String(c.getValue() || "not reported")}</span> },
  {
    accessorKey: "measurement",
    header: "Measurement",
    cell: (c) => <span className="whitespace-nowrap font-mono text-[10.5px] text-slate-600">{String(c.getValue() || "—")}</span>,
  },
];

export function PairsTable({ data }: { data: AnalysedPair[] }) {
  const [filter, setFilter] = useState<"all" | Classification>("all");
  const filtered = useMemo(() => (filter === "all" ? data : data.filter((pair) => pair.classification === filter)), [data, filter]);

  return (
    <DataTable
      columns={columns}
      data={filtered}
      searchPlaceholder="Search isolate, gene or drug"
      pageSize={12}
      toolbar={
        <Select
          aria-label="Filter by classification"
          value={filter}
          onChange={(event) => setFilter(event.target.value as "all" | Classification)}
          className="h-8 w-auto text-[11px]"
        >
          <option value="all">All classifications ({data.length})</option>
          {(Object.keys(CLASSIFICATION_META) as Classification[]).map((key) => (
            <option key={key} value={key}>
              {CLASSIFICATION_META[key].label} ({data.filter((pair) => pair.classification === key).length})
            </option>
          ))}
        </Select>
      }
    />
  );
}
