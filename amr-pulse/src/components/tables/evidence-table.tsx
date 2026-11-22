"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import type { GeneDrugEvidence } from "@/types/domain";

const columns: ColumnDef<GeneDrugEvidence, unknown>[] = [
  { accessorKey: "organism", header: "Organism", cell: (c) => <span className="italic">{String(c.getValue())}</span> },
  { accessorKey: "geneOrMutation", header: "Gene / mutation", cell: (c) => <span className="font-mono text-[11.5px]">{String(c.getValue())}</span> },
  { accessorKey: "drug", header: "Drug" },
  { accessorKey: "drugClass", header: "Class" },
  { accessorKey: "mechanism", header: "Mechanism" },
  {
    accessorKey: "evidenceLevel",
    header: "Evidence",
    cell: (c) => {
      const value = String(c.getValue());
      const variant = value === "established" ? "teal" : value === "strong" ? "blue" : value === "context-dependent" ? "amber" : "neutral";
      return <Badge variant={variant}>{value}</Badge>;
    },
  },
  {
    accessorKey: "verificationStatus",
    header: "Verification",
    cell: (c) => {
      const value = String(c.getValue());
      return <Badge variant={value === "verified" ? "green" : value === "context_dependent" ? "amber" : "neutral"}>{value.replace(/_/g, " ")}</Badge>;
    },
  },
  { accessorKey: "database", header: "Database" },
  { accessorKey: "databaseVersion", header: "Version", cell: (c) => <span className="font-mono text-[11px]">{String(c.getValue())}</span> },
  {
    accessorKey: "sourceUrl",
    header: "Source",
    cell: (c) => {
      const url = String(c.getValue() ?? "");
      if (!url) return <span className="text-muted">—</span>;
      return (
        <a href={url} target="_blank" rel="noreferrer noopener" className="text-brand-700 underline decoration-brand-200 hover:decoration-brand-600">
          Link
        </a>
      );
    },
  },
  { accessorKey: "mappingVersion", header: "Map version", cell: (c) => <span className="font-mono text-[10.5px] text-muted">{String(c.getValue())}</span> },
];

export function EvidenceTable({ data }: { data: GeneDrugEvidence[] }) {
  return <DataTable columns={columns} data={data} searchPlaceholder="Search organism, gene, drug or database" pageSize={8} />;
}
