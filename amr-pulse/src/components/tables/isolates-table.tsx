"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpRight } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { CLASSIFICATION_META } from "@/lib/presentation";
import type { Classification } from "@/types/domain";

export interface IsolateListRow {
  isolateId: string;
  organism: string;
  country: string;
  year: string;
  geneCount: number;
  astCount: number;
  phenotype: string;
  classification: Classification | "not_analysed";
}

const columns: ColumnDef<IsolateListRow, unknown>[] = [
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
  { accessorKey: "country", header: "Country", cell: (c) => <span className="text-[11px]">{String(c.getValue() || "—")}</span> },
  { accessorKey: "year", header: "Year", cell: (c) => <span className="font-mono text-[10.5px]">{String(c.getValue() || "—")}</span> },
  { accessorKey: "geneCount", header: "Genes", cell: (c) => <span className="font-mono tabular-nums">{Number(c.getValue())}</span> },
  { accessorKey: "astCount", header: "AST rows", cell: (c) => <span className="font-mono tabular-nums">{Number(c.getValue())}</span> },
  {
    accessorKey: "phenotype",
    header: "Ceftriaxone",
    cell: (c) => {
      const value = String(c.getValue());
      return value === "—" ? <span className="text-muted">—</span> : <Badge variant={value === "R" ? "red" : value === "S" ? "blue" : "amber"}>{value}</Badge>;
    },
  },
  {
    accessorKey: "classification",
    header: "Classification",
    cell: (c) => {
      const value = String(c.getValue()) as Classification | "not_analysed";
      if (value === "not_analysed") return <span className="text-[10.5px] text-muted">not analysed</span>;
      const meta = CLASSIFICATION_META[value];
      return <Badge variant={meta.variant}>{meta.short}</Badge>;
    },
  },
  {
    id: "actions",
    header: "",
    cell: (c) => (
      <Link href={`/isolates/${encodeURIComponent(c.row.original.isolateId)}`} className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-700 hover:text-brand-800">
        Inspect <ArrowUpRight className="h-3 w-3" />
      </Link>
    ),
  },
];

export function IsolatesTable({ rows }: { rows: IsolateListRow[] }) {
  const [organism, setOrganism] = useState("all");
  const [discordantOnly, setDiscordantOnly] = useState(false);
  const organisms = useMemo(() => [...new Set(rows.map((row) => row.organism))], [rows]);
  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          (organism === "all" || row.organism === organism) &&
          (!discordantOnly || row.classification === "candidate_gene_positive_phenotype_susceptible" || row.classification === "candidate_phenotype_resistant_no_known_determinant")
      ),
    [rows, organism, discordantOnly]
  );

  return (
    <DataTable
      columns={columns}
      data={filtered}
      searchPlaceholder="Search isolate identifier or country"
      pageSize={15}
      toolbar={
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] text-muted">
            <input
              type="checkbox"
              checked={discordantOnly}
              onChange={(event) => setDiscordantOnly(event.target.checked)}
              className="h-3.5 w-3.5 rounded border-line text-brand-600"
            />
            Discordant only
          </label>
          <Select aria-label="Filter by organism" value={organism} onChange={(event) => setOrganism(event.target.value)} className="h-8 w-auto text-[11px]">
            <option value="all">All organisms</option>
            {organisms.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </Select>
        </div>
      }
    />
  );
}
