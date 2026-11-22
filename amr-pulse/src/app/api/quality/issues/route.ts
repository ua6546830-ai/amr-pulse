import { NextResponse } from "next/server";
import { getDemoDataset } from "@/server/demo/load";
import { validationLabel } from "@/lib/presentation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(value: unknown): string {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET() {
  const demo = await getDemoDataset();
  const header = ["severity", "code", "label", "record_id", "field", "problem", "original_value", "explanation", "suggestion", "resolution_status"];
  const lines = [header.join(",")];
  for (const issue of demo.validation.issues) {
    lines.push(
      [
        issue.severity,
        issue.code,
        validationLabel(issue.code),
        issue.recordId,
        issue.field,
        issue.problem,
        issue.originalValue,
        issue.explanation,
        issue.suggestion ?? "",
        issue.resolutionStatus,
      ]
        .map(csvCell)
        .join(",")
    );
  }
  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="amr-pulse-demo-quality-issues.csv"',
      "cache-control": "no-store",
    },
  });
}
