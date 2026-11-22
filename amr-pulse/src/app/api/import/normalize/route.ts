import { NextResponse } from "next/server";
import {
  SCHEMAS,
  applyMapping,
  toAst,
  toEvidence,
  toGeneCalls,
  toIsolates,
  type Row,
  type TableKind,
} from "@/lib/imports/adapters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS: TableKind[] = ["isolates", "genes", "ast", "evidence"];
const MAX_ROWS_PER_CHUNK = 1000;
const MAX_BODY_CHARS = 3_000_000;

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_CHARS) {
    return NextResponse.json({ error: "Chunk exceeds the 3 MB limit. Reduce the chunk size." }, { status: 413 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const body = (parsed ?? {}) as { kind?: unknown; mapping?: unknown; rows?: unknown };
  if (!KINDS.includes(body.kind as TableKind)) {
    return NextResponse.json({ error: "Unsupported table kind." }, { status: 400 });
  }
  const kind = body.kind as TableKind;
  const mapping = (body.mapping ?? {}) as Record<string, string | null>;
  const rows = body.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows in this chunk." }, { status: 400 });
  }
  if (rows.length > MAX_ROWS_PER_CHUNK) {
    return NextResponse.json({ error: `Chunk exceeds ${MAX_ROWS_PER_CHUNK} rows.` }, { status: 413 });
  }

  const allowedKeys = new Set(SCHEMAS[kind].map((field) => field.key));
  for (const [key, value] of Object.entries(mapping)) {
    if (!allowedKeys.has(key)) {
      return NextResponse.json({ error: `Unknown canonical field in mapping: ${key}` }, { status: 400 });
    }
    if (value !== null && typeof value !== "string") {
      return NextResponse.json({ error: `Invalid mapping value for ${key}.` }, { status: 400 });
    }
  }
  const missingRequired = SCHEMAS[kind].filter((field) => field.required && !mapping[field.key]).map((field) => field.key);
  if (missingRequired.length > 0) {
    return NextResponse.json({ error: `Required fields are unmapped: ${missingRequired.join(", ")}` }, { status: 422 });
  }

  const safeRows: Row[] = rows.map((row) => {
    const out: Row = {};
    if (row && typeof row === "object") {
      for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
        out[key] = value === null || value === undefined ? "" : String(value).slice(0, 2000);
      }
    }
    return out;
  });
  const mapped = applyMapping(safeRows, mapping);

  const records =
    kind === "isolates" ? toIsolates(mapped)
    : kind === "genes" ? toGeneCalls(mapped)
    : kind === "ast" ? toAst(mapped)
    : toEvidence(mapped);

  return NextResponse.json({
    kind,
    receivedRows: safeRows.length,
    records,
    droppedRows: safeRows.length - records.length,
  });
}
