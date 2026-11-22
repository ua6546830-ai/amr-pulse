"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ClipboardCheck, Download, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { AST_CATEGORY_META, CLASSIFICATION_META } from "@/lib/presentation";
import { cn } from "@/lib/utils";
import type { AnalysedPair, Classification } from "@/types/domain";

const CHECKLIST = [
  "Confirm the AST interpretation standard, breakpoint version and testing method.",
  "Confirm the isolate identifier and BioSample linkage (no name-based joins).",
  "Confirm the AMR screening panel and database version were recorded for this genome.",
  "Check for mixed culture, phenocopy or a technical testing failure.",
  "Check whether the gene symbol is an established determinant for this organism–drug pair.",
  "Check for an uncurated or novel mechanism before labelling the result discordant.",
];

type NoteState = Record<string, { text: string; checked: number[]; savedAt: string | null }>;
const STORAGE_KEY = "amr-pulse:investigation-notes";

function pairKey(pair: AnalysedPair) {
  return `${pair.isolateId}::${pair.antibiotic}::${pair.astRecordId}`;
}

export function DiscordanceWorkbench({ pairs }: { pairs: AnalysedPair[] }) {
  const [filter, setFilter] = useState<"all" | Classification>("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [notes, setNotes] = useState<NoteState>({});
  const [draft, setDraft] = useState("");
  const [checked, setChecked] = useState<number[]>([]);

  const filtered = useMemo(
    () => (filter === "all" ? pairs : pairs.filter((pair) => pair.classification === filter)),
    [pairs, filter]
  );
  const selected = pairs.find((pair) => pairKey(pair) === selectedKey) ?? null;

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) setNotes(JSON.parse(raw) as NoteState);
    } catch {
      // Session storage may be unavailable; notes remain in memory.
    }
  }, []);

  useEffect(() => {
    if (!selected) return;
    const existing = notes[pairKey(selected)];
    setDraft(existing?.text ?? "");
    setChecked(existing?.checked ?? []);
  }, [selected, notes]);

  function persist(next: NoteState) {
    setNotes(next);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Keep the in-memory copy if storage is unavailable.
    }
  }

  function saveNote() {
    if (!selected) return;
    persist({
      ...notes,
      [pairKey(selected)]: { text: draft, checked, savedAt: new Date().toISOString() },
    });
  }

  function downloadNote() {
    if (!selected) return;
    const payload = {
      isolateId: selected.isolateId,
      antibiotic: selected.antibiotic,
      astRecordId: selected.astRecordId,
      classification: selected.classification,
      phenotype: selected.phenotype,
      determinantStatus: selected.determinantStatus,
      detectedGenes: selected.detectedGenes,
      note: draft,
      checklistCompleted: checked.map((index) => CHECKLIST[index]),
      savedAt: notes[pairKey(selected)]?.savedAt ?? null,
      disclaimer: "Synthetic demo data. Human review note, session-only, not persisted to a database.",
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `amr-pulse-review-${selected.isolateId}-${selected.antibiotic}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const options: Array<{ value: "all" | Classification; label: string; count: number }> = [
    { value: "all", label: "All candidate discordance", count: pairs.length },
    {
      value: "candidate_gene_positive_phenotype_susceptible",
      label: "Gene positive / phenotype S",
      count: pairs.filter((p) => p.classification === "candidate_gene_positive_phenotype_susceptible").length,
    },
    {
      value: "candidate_phenotype_resistant_no_known_determinant",
      label: "Phenotype R / no known determinant",
      count: pairs.filter((p) => p.classification === "candidate_phenotype_resistant_no_known_determinant").length,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-[11px] transition-colors",
              filter === option.value ? "border-brand-200 bg-brand-50 text-brand-700" : "border-line bg-white text-slate-600 hover:bg-canvas"
            )}
          >
            {option.label} <span className="font-mono text-[10px] text-muted">({option.count})</span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-line bg-white shadow-card">
        <div className="max-h-[460px] overflow-auto">
          <table className="w-full text-left text-[11.5px]">
            <thead className="sticky top-0 z-10 border-b border-line bg-canvas/95 backdrop-blur">
              <tr className="text-[9.5px] uppercase tracking-wide text-muted">
                <th className="px-3 py-2 font-medium">Isolate</th>
                <th className="px-3 py-2 font-medium">Drug</th>
                <th className="px-3 py-2 font-medium">Phenotype</th>
                <th className="px-3 py-2 font-medium">Detected genes</th>
                <th className="px-3 py-2 font-medium">Standard</th>
                <th className="px-3 py-2 font-medium">Method</th>
                <th className="px-3 py-2 font-medium">Class</th>
                <th className="px-3 py-2 text-right font-medium">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((pair) => {
                const key = pairKey(pair);
                return (
                  <tr key={key} className={cn("cursor-pointer hover:bg-canvas/60", selectedKey === key && "bg-brand-50/50")} onClick={() => setSelectedKey(key)}>
                    <td className="px-3 py-2 font-mono text-[10.5px]">{pair.isolateId}</td>
                    <td className="px-3 py-2 capitalize">{pair.antibiotic}</td>
                    <td className="px-3 py-2"><Badge variant={AST_CATEGORY_META[pair.phenotype].variant}>{pair.phenotype}</Badge></td>
                    <td className="px-3 py-2 font-mono text-[10.5px]">{pair.detectedGenes.join(", ") || "none"}</td>
                    <td className="px-3 py-2 text-[10.5px] text-muted">{pair.astStandard || "not reported"}</td>
                    <td className="px-3 py-2 text-[10.5px] text-muted">{pair.astMethod || "not reported"}</td>
                    <td className="px-3 py-2"><Badge variant={CLASSIFICATION_META[pair.classification].variant}>{CLASSIFICATION_META[pair.classification].short}</Badge></td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-[10.5px] font-medium text-brand-700 hover:text-brand-800"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedKey(key);
                        }}
                      >
                        Inspect <ArrowUpRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-[11.5px] text-muted">No pairs in this filter.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {selected ? (
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-xl border border-line bg-white p-4 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="mono-label">Reviewing pair</p>
                <p className="mt-1 font-mono text-[13px] font-medium text-ink">{selected.isolateId}</p>
                <p className="text-[11px] capitalize text-muted">{selected.antibiotic} · {selected.organism}</p>
              </div>
              <Badge variant={CLASSIFICATION_META[selected.classification].variant}>{CLASSIFICATION_META[selected.classification].label}</Badge>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
              <div><dt className="text-muted">Phenotype</dt><dd className="mt-0.5 font-medium">{selected.phenotype} &ldquo;{selected.phenotypeRaw}&rdquo;</dd></div>
              <div><dt className="text-muted">Determinant</dt><dd className="mt-0.5 font-mono text-[10.5px]">{selected.determinantStatus.replace(/_/g, " ")}</dd></div>
              <div><dt className="text-muted">Genes</dt><dd className="mt-0.5 font-mono text-[10.5px]">{selected.detectedGenes.join(", ") || "none detected"}</dd></div>
              <div><dt className="text-muted">Measurement</dt><dd className="mt-0.5 font-mono text-[10.5px]">{selected.measurement ?? "not reported"} {selected.measurementUnit ?? ""}</dd></div>
              <div><dt className="text-muted">Standard</dt><dd className="mt-0.5">{selected.astStandard || "not reported"}</dd></div>
              <div><dt className="text-muted">Testing year</dt><dd className="mt-0.5 font-mono">{selected.testingYear || "not reported"}</dd></div>
            </dl>
            <p className="mt-3 rounded-lg border border-line bg-canvas/50 p-2.5 text-[11px] leading-relaxed text-slate-600">
              {CLASSIFICATION_META[selected.classification].description}
            </p>
            <Link href={`/isolates/${encodeURIComponent(selected.isolateId)}`} className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-brand-700 hover:text-brand-800">
              Open isolate evidence <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="rounded-xl border border-line bg-white p-4 shadow-card">
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink"><ClipboardCheck className="h-4 w-4 text-brand-600" /> Structured review</p>
            <ul className="mt-2 space-y-1.5">
              {CHECKLIST.map((item, index) => (
                <li key={item}>
                  <label className="flex cursor-pointer items-start gap-2 text-[11px] leading-relaxed text-slate-600">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-3.5 w-3.5 rounded border-line text-brand-600"
                      checked={checked.includes(index)}
                      onChange={(event) =>
                        setChecked((current) => (event.target.checked ? [...current, index] : current.filter((value) => value !== index)))
                      }
                    />
                    {item}
                  </label>
                </li>
              ))}
            </ul>
            <Textarea
              className="mt-3 min-h-[88px] text-[11.5px]"
              placeholder="Review note — record what you checked, what you found and what remains unresolved. Do not record patient identifiers."
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={saveNote}><Save className="h-3.5 w-3.5" /> Save note</Button>
              <Button size="sm" variant="secondary" onClick={downloadNote}><Download className="h-3.5 w-3.5" /> Export note</Button>
              <span className="text-[10px] text-muted">Session-only · not written to the dataset</span>
            </div>
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-line-strong bg-white px-3 py-2.5 text-[11px] text-muted">
          Select a pair to open the structured review panel. Notes are stored in this browser session only.
        </p>
      )}
    </div>
  );
}
