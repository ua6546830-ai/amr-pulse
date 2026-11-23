"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ClipboardCheck, Download, RotateCcw, Save, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
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
  const [query, setQuery] = useState("");
  const [antibiotic, setAntibiotic] = useState("all");
  const [phenotype, setPhenotype] = useState("all");
  const [organism, setOrganism] = useState("all");
  const [review, setReview] = useState<"all" | "reviewed" | "open">("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [notes, setNotes] = useState<NoteState>({});
  const [draft, setDraft] = useState("");
  const [checked, setChecked] = useState<number[]>([]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return pairs.filter((pair) => {
      if (filter !== "all" && pair.classification !== filter) return false;
      if (antibiotic !== "all" && pair.antibiotic !== antibiotic) return false;
      if (phenotype !== "all" && pair.phenotype !== phenotype) return false;
      if (organism !== "all" && pair.organism !== organism) return false;
      if (review === "reviewed" && !notes[pairKey(pair)]?.savedAt) return false;
      if (review === "open" && notes[pairKey(pair)]?.savedAt) return false;
      if (needle) {
        const haystack = [pair.isolateId, pair.antibiotic, pair.organism, pair.astRecordId, ...pair.detectedGenes].join(" ").toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [pairs, filter, antibiotic, phenotype, organism, review, query, notes]);

  const antibiotics = useMemo(() => [...new Set(pairs.map((pair) => pair.antibiotic))].sort(), [pairs]);
  const phenotypes = useMemo(() => [...new Set(pairs.map((pair) => pair.phenotype))].sort(), [pairs]);
  const organisms = useMemo(() => [...new Set(pairs.map((pair) => pair.organism))].sort(), [pairs]);
  const hasFilters = filter !== "all" || query !== "" || antibiotic !== "all" || phenotype !== "all" || organism !== "all" || review !== "all";
  const resetFilters = () => {
    setFilter("all");
    setQuery("");
    setAntibiotic("all");
    setPhenotype("all");
    setOrganism("all");
    setReview("all");
  };
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
      <div className="space-y-2.5 rounded-2xl border border-line bg-white p-3 shadow-card">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_170px_140px_150px_130px]">
          <div className="relative md:col-span-2 xl:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search isolate, gene or record"
              aria-label="Search findings"
              className="h-9 pl-9 text-[11.5px]"
            />
          </div>
          <Select aria-label="Filter by antibiotic" value={antibiotic} onChange={(event) => setAntibiotic(event.target.value)} className="h-9 text-[11px]">
            <option value="all">All antibiotics</option>
            {antibiotics.map((value) => <option key={value} value={value}>{value}</option>)}
          </Select>
          <Select aria-label="Filter by phenotype" value={phenotype} onChange={(event) => setPhenotype(event.target.value)} className="h-9 text-[11px]">
            <option value="all">All phenotypes</option>
            {phenotypes.map((value) => <option key={value} value={value}>{value}</option>)}
          </Select>
          <Select aria-label="Filter by organism" value={organism} onChange={(event) => setOrganism(event.target.value)} className="h-9 text-[11px]">
            <option value="all">All organisms</option>
            {organisms.map((value) => <option key={value} value={value}>{value}</option>)}
          </Select>
          <Select aria-label="Filter by review status" value={review} onChange={(event) => setReview(event.target.value as "all" | "reviewed" | "open")} className="h-9 text-[11px]">
            <option value="all">Any review status</option>
            <option value="open">Not reviewed</option>
            <option value="reviewed">Note saved</option>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10.5px] transition-colors",
                filter === option.value ? "border-brand-200 bg-brand-50 font-medium text-brand-700" : "border-line bg-white text-slate-600 hover:bg-canvas"
              )}
            >
              {option.label} <span className="font-mono text-[10px] text-muted">({option.count})</span>
            </button>
          ))}
          {hasFilters ? (
            <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10.5px] text-muted hover:text-ink">
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          ) : null}
          <span className="ml-auto text-[10.5px] text-muted">{filtered.length.toLocaleString()} of {pairs.length.toLocaleString()} shown</span>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-white shadow-card">
        <div className="max-h-[460px] overflow-auto">
          <table className="w-full text-left text-[11.5px]">
            <thead className="sticky top-0 z-10 border-b border-line bg-canvas/95 backdrop-blur">
              <tr className="text-[9.5px] uppercase tracking-wide text-muted">
                <th className="px-3 py-2 font-medium">Isolate</th>
                <th className="px-3 py-2 font-medium">Organism</th>
                <th className="px-3 py-2 font-medium">Antibiotic</th>
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
                    <td className="max-w-[130px] truncate px-3 py-2 text-[10.5px] italic text-slate-600">{pair.organism}</td>
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
                        {notes[key]?.savedAt ? "Reviewed" : "Inspect"} <ArrowUpRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-[11.5px] text-muted">No pairs match these filters.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {selected ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr]">
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
              Open investigation view <ArrowUpRight className="h-3 w-3" />
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
