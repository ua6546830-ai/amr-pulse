import { NextResponse } from "next/server";
import {
  SCHEMAS,
  detectSourceFormat,
  guessKindFromHeaders,
  parseTable,
  suggestMapping,
  type TableKind,
} from "@/lib/imports/adapters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS: TableKind[] = ["isolates", "genes", "ast", "evidence"];
const MAX_PREVIEW_CHARS = 400_000;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const payload = (body ?? {}) as { text?: unknown; kind?: unknown; filename?: unknown };
  const text = typeof payload.text === "string" ? payload.text : "";
  if (!text.trim()) return NextResponse.json({ error: "Empty file content." }, { status: 400 });
  if (text.length > MAX_PREVIEW_CHARS) {
    return NextResponse.json({ error: `Preview exceeds ${MAX_PREVIEW_CHARS} characters. Send the first part of the file only.` }, { status: 413 });
  }

  const requestedKind = KINDS.includes(payload.kind as TableKind) ? (payload.kind as TableKind) : null;
  const table = parseTable(text);
  if (table.headers.length === 0) {
    return NextResponse.json({ error: "No header row could be detected. Supply a CSV/TSV file with a header row." }, { status: 422 });
  }
  const detectedKind = guessKindFromHeaders(table.headers);
  const kind = requestedKind ?? (detectedKind === "unknown" ? null : detectedKind);
  if (!kind) {
    return NextResponse.json(
      { error: "Could not infer the table kind. Choose the table type explicitly before mapping." },
      { status: 422 }
    );
  }
  const suggestion = suggestMapping(table.headers, kind);
  return NextResponse.json({
    kind,
    detectedKind,
    sourceFormat: detectSourceFormat(table.headers),
    headers: table.headers,
    sample: table.rows.slice(0, 8),
    mapping: suggestion.mapping,
    confidence: suggestion.confidence,
    unmappedHeaders: suggestion.unmappedHeaders,
    missingRequired: suggestion.missingRequired,
    requiredFields: SCHEMAS[kind].filter((field) => field.required).map((field) => field.key),
    fields: SCHEMAS[kind],
    parsedRows: table.rows.length,
    truncated: table.truncated,
    errors: table.errors,
    filename: typeof payload.filename === "string" ? payload.filename.slice(0, 200) : null,
  });
}
