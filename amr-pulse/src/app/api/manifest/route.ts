import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getDemoDataset } from "@/server/demo/load";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const demo = await getDemoDataset();
  let appVersion = "1.0.0";
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as {
      version?: string;
      dependencies?: Record<string, string>;
    };
    appVersion = pkg.version ?? appVersion;
  } catch {
    // Version metadata is decorative; the manifest still records engine versions.
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    software: {
      name: "AMR PULSE",
      version: appVersion,
      runtime: `node ${process.version}`,
      kind: "browser and server research-support application",
      disclaimer: "Not a diagnostic device. Not clinically validated. No regulatory certification claimed.",
    },
    dataset: {
      name: demo.manifest.datasetName,
      type: demo.manifest.datasetType,
      seed: demo.manifest.seed,
      generatorVersion: demo.manifest.generatorVersion,
      generatorScript: demo.manifest.generatorScript,
      generatedAt: demo.manifest.generatedAt,
      label: demo.manifest.label,
      counts: demo.manifest.counts,
      intendedUse: demo.manifest.intendedUse,
      limitations: demo.manifest.limitations,
      files: demo.manifest.files,
    },
    analysis: {
      analysisVersion: demo.analysis.meta.analysisVersion,
      mappingVersion: demo.analysis.meta.mappingVersion,
      generatedAt: demo.analysis.meta.generatedAt,
      options: { requirePanel: true, organism: "All organisms", antibiotic: "All mapped antibiotics" },
      counts: demo.analysis.counts,
      summary: demo.analysis.summary,
      exclusions: demo.analysis.exclusions.map(({ reason, count, explanation }) => ({ reason, count, explanation })),
      standardsPolicy: "CLSI and EUCAST categories are not pooled; the interpretation standard is reported per record.",
      statistics: {
        interval: "Wilson score interval, z = 1.959963984540054",
        unit: "matched isolate-antibiotic pair",
        repeatedObservations: "Multiple antibiotics per isolate are not independent; denominators count pairs.",
        missingData: "Reported and excluded with reasons; no imputation.",
      },
    },
    validation: {
      checkedAt: demo.validation.checkedAt,
      issueCount: demo.validation.issues.length,
      bySeverity: demo.validation.bySeverity,
      byCode: demo.validation.byCode,
    },
    evidence: {
      rows: demo.evidence.length,
      version: demo.analysis.meta.mappingVersion,
      contributingRule: "verification_status = verified AND evidence_level in (established, strong)",
    },
    references: { source: "src/lib/citations/library.ts", verifiedOn: "2026-11-22" },
  };

  return NextResponse.json(manifest, {
    headers: {
      "content-disposition": 'attachment; filename="amr-pulse-reproducibility-manifest.json"',
      "cache-control": "no-store",
    },
  });
}
