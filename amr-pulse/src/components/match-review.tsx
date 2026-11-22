"use client";

import { useEffect, useState } from "react";
import { Check, Download, Link2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MatchSuggestion } from "@/lib/matching";

type Decision = "approved" | "rejected";

const STORAGE_KEY = "amr-pulse:match-reviews";

export function MatchReview({ suggestions }: { suggestions: MatchSuggestion[] }) {
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) setDecisions(JSON.parse(raw) as Record<string, Decision>);
    } catch {
      // Session storage can be unavailable in private or restricted contexts.
    }
  }, []);

  function record(key: string, decision: Decision) {
    const next = { ...decisions, [key]: decision };
    setDecisions(next);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Decisions remain in memory for this view if storage fails.
    }
  }

  function download() {
    const payload = {
      recordedAt: new Date().toISOString(),
      note: "Session-only human review decisions. Not persisted to a database; no dataset was modified.",
      reviews: suggestions.map((suggestion) => ({
        astRecordId: suggestion.astRecordId,
        unmatchedIdentifier: suggestion.unmatchedIdentifier,
        suggestedIsolateId: suggestion.suggestedIsolateId,
        confidence: suggestion.confidence,
        decision: decisions[`${suggestion.astRecordId}:${suggestion.suggestedIsolateId}`] ?? null,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "amr-pulse-match-review.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (suggestions.length === 0) {
    return <p className="text-[11.5px] text-muted">No near-match suggestions were generated for unmatched AST rows.</p>;
  }

  return (
    <div>
      <div className="divide-y divide-line rounded-lg border border-line">
        {suggestions.map((suggestion) => {
          const key = `${suggestion.astRecordId}:${suggestion.suggestedIsolateId}`;
          const decision = decisions[key];
          return (
            <div key={key} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] text-ink">
                  Submitted <span className="font-mono">{suggestion.unmatchedIdentifier || "(blank)"}</span>
                  <Link2 className="mx-1.5 inline h-3 w-3 text-slate-400" />
                  suggested <span className="font-mono">{suggestion.suggestedIsolateId}</span>
                  <Badge variant={suggestion.confidence === "medium" ? "amber" : "neutral"} className="ml-1.5">{suggestion.confidence}</Badge>
                </p>
                <p className="mt-0.5 text-[10.5px] text-muted">
                  AST record {suggestion.astRecordId} · {suggestion.reason}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {decision ? <Badge variant={decision === "approved" ? "green" : "neutral"}>{decision}</Badge> : null}
                <Button size="sm" variant="secondary" onClick={() => record(key, "rejected")}>
                  <X className="h-3 w-3" /> Reject
                </Button>
                <Button size="sm" onClick={() => record(key, "approved")}>
                  <Check className="h-3 w-3" /> Approve
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10.5px] text-muted">
          Decisions are recorded in this browser session only and do not modify the demo dataset. An approved mapping
          would apply to the next import when a persistent workspace is configured.
        </p>
        <Button size="sm" variant="outline" onClick={download} disabled={Object.keys(decisions).length === 0}>
          <Download className="h-3.5 w-3.5" /> Download review log
        </Button>
      </div>
    </div>
  );
}
