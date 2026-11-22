import type { Metadata } from "next";
import { Microscope } from "lucide-react";
import { IsolatesTable, type IsolateListRow } from "@/components/tables/isolates-table";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { getDemoDataset } from "@/server/demo/load";
import type { Classification } from "@/types/domain";

export const metadata: Metadata = { title: "Isolate Explorer" };

export default async function IsolatesPage() {
  const demo = await getDemoDataset();

  const rows: IsolateListRow[] = demo.isolates.map((isolate) => {
    const pair = demo.analysis.pairs.find((p) => p.isolateId === isolate.isolateId && p.antibiotic === "ceftriaxone");
    const phenotype = pair?.phenotype ?? "—";
    return {
      isolateId: isolate.isolateId,
      organism: isolate.organism,
      country: isolate.country ?? "",
      year: (isolate.collectionDate ?? "").slice(0, 4),
      geneCount: demo.geneCalls.filter((call) => call.isolateId === isolate.isolateId).length,
      astCount: demo.ast.filter((row) => row.isolateId === isolate.isolateId).length,
      phenotype,
      classification: (pair?.classification ?? "not_analysed") as Classification | "not_analysed",
    };
  });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">Explorer</Badge>
            <Badge variant="amber">Synthetic data</Badge>
            <span className="text-[11px] text-muted">{demo.isolates.length} isolates</span>
          </div>
        }
        title="Isolate explorer"
        description="Inspect any isolate's metadata, curated gene calls, submitted susceptibility results and the deterministic classification for each matched antibiotic."
        actions={<Badge variant="neutral"><Microscope className="h-3.5 w-3.5" /> Ceftriaxone column shown by default</Badge>}
      />

      <Alert variant="info" title="Per-isolate evidence, not a patient record">
        These are synthetic isolates with no patient identifiers. Opening a record shows only the fields present in the
        imported tables, plus the analysis provenance attached by the engine.
      </Alert>

      <IsolatesTable rows={rows} />
    </div>
  );
}
