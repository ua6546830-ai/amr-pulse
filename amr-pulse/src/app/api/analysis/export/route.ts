import { NextResponse } from "next/server";
import { getDemoDataset } from "@/server/demo/load";
import { runAnalysis } from "@/lib/analysis/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(value: unknown): string {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((header) => csvCell(row[header])).join(","));
  return lines.join("\r\n");
}

export async function GET(request: Request) {
  const demo = await getDemoDataset();
  const url = new URL(request.url);
  const resource = url.searchParams.get("resource") ?? "pairs";
  const format = url.searchParams.get("format") ?? "csv";
  const organism = url.searchParams.get("organism") || undefined;
  const antibiotic = url.searchParams.get("antibiotic") || undefined;

  const analysis = runAnalysis({
    isolates: demo.isolates,
    geneCalls: demo.geneCalls,
    astResults: demo.ast,
    evidence: demo.evidence,
    options: { requirePanel: true, organism, antibiotic },
  });

  const base = `amr-pulse-demo-${organism ? organism.toLowerCase().replace(/[^a-z]+/g, "-") : "all-organisms"}-${antibiotic ?? "all-drugs"}`;

  if (format === "json") {
    return NextResponse.json(
      {
        provenance: {
          dataset: demo.manifest.datasetName,
          datasetType: demo.manifest.datasetType,
          seed: demo.manifest.seed,
          analysisVersion: analysis.meta.analysisVersion,
          mappingVersion: analysis.meta.mappingVersion,
          generatedAt: analysis.meta.generatedAt,
          note: "Synthetic demonstration data. Not research evidence.",
        },
        analysis,
      },
      {
        headers: {
          "content-disposition": `attachment; filename="${base}-analysis.json"`,
          "cache-control": "no-store",
        },
      }
    );
  }

  if (resource === "exclusions") {
    const rows = analysis.exclusions.map((group) => ({
      reason: group.reason,
      explanation: group.explanation,
      record_count: group.count,
      example_record_ids: group.recordIds.slice(0, 10).join("; "),
    }));
    return new NextResponse(toCsv(rows), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${base}-exclusions.csv"`,
        "cache-control": "no-store",
      },
    });
  }

  if (resource === "discordances") {
    const rows = analysis.discordances.map((pair) => ({
      isolate_id: pair.isolateId,
      organism: pair.organism,
      antibiotic: pair.antibiotic,
      ast_record_id: pair.astRecordId,
      phenotype: pair.phenotype,
      determinant_status: pair.determinantStatus,
      detected_genes: pair.detectedGenes.join("; "),
      classification: pair.classification,
      ast_standard: pair.astStandard ?? "",
      ast_method: pair.astMethod ?? "",
      testing_year: pair.testingYear ?? "",
      review_prompt: "Candidate discordance requiring human review; not a laboratory error determination.",
    }));
    return new NextResponse(toCsv(rows), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${base}-candidate-discordance.csv"`,
        "cache-control": "no-store",
      },
    });
  }

  if (resource === "by-drug") {    const rows = analysis.byDrug.map((drug) => ({
      antibiotic: drug.drug,
      drug_class: drug.drugClass,
      eligible_pairs: drug.eligible,
      concordant_resistant: drug.concordantResistant,
      concordant_susceptible: drug.concordantSusceptible,
      gene_positive_susceptible: drug.genePositiveSusceptible,
      resistant_no_known_determinant: drug.resistantNoKnownDeterminant,
      indeterminate: drug.indeterminate,
      agreement: drug.agreement === null ? "" : drug.agreement.toFixed(6),
    }));
    return new NextResponse(toCsv(rows), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${base}-by-drug.csv"`,
        "cache-control": "no-store",
      },
    });
  }

  const rows = analysis.pairs.map((pair) => ({
    isolate_id: pair.isolateId,
    organism: pair.organism,
    antibiotic: pair.antibiotic,
    ast_record_id: pair.astRecordId,
    phenotype: pair.phenotype,
    phenotype_raw: pair.phenotypeRaw,
    determinant_status: pair.determinantStatus,
    detected_genes: pair.detectedGenes.join("; "),
    unresolved_genes: pair.unresolvedGenes.join("; "),
    classification: pair.classification,
    included_in_primary: pair.includedInPrimary,
    exclusion_reason: pair.exclusionReason ?? "",
    ast_method: pair.astMethod ?? "",
    ast_standard: pair.astStandard ?? "",
    testing_year: pair.testingYear ?? "",
    measurement: pair.measurement ?? "",
    measurement_unit: pair.measurementUnit ?? "",
  }));
  return new NextResponse(toCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${base}-pairs.csv"`,
      "cache-control": "no-store",
    },
  });
}
