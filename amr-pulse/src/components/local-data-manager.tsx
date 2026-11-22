"use client";

import * as React from "react";
import { Database, Download, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const KEYS = [
  { key: "amr-pulse:saved-reports", label: "Saved reports and AI drafts" },
  { key: "amr-pulse:match-reviews", label: "Human match-review decisions" },
  { key: "amr-pulse:investigation-notes", label: "Investigation notes" },
  { key: "amr-pulse:last-import", label: "Last import summary" },
];

type Entry = { key: string; label: string; bytes: number; present: boolean };

export function LocalDataManager() {
  const [entries, setEntries] = React.useState<Entry[]>([]);
  const [flash, setFlash] = React.useState<string | null>(null);

  const scan = React.useCallback(() => {
    setEntries(
      KEYS.map((entry) => {
        const value = localStorage.getItem(entry.key) ?? "";
        return { ...entry, bytes: new Blob([value]).size, present: value.length > 0 };
      })
    );
  }, []);

  React.useEffect(() => {
    scan();
  }, [scan]);

  function exportAll() {
    const payload = Object.fromEntries(KEYS.map((entry) => [entry.key, localStorage.getItem(entry.key) ?? null]));
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), keys: payload }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "amr-pulse-browser-data.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function clearAll() {
    if (!window.confirm("Delete all AMR PULSE browser-local data (saved drafts, match reviews, notes, last import summary)? This cannot be undone.")) return;
    for (const entry of KEYS) localStorage.removeItem(entry.key);
    scan();
    setFlash("Browser-local data cleared.");
    setTimeout(() => setFlash(null), 1800);
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-3.5 w-3.5 text-brand-600" /> Browser-local data
          </CardTitle>
          <p className="mt-0.5 text-xs text-muted">Drafts, review decisions and notes live only in this browser. Nothing is uploaded unless you import a file into the server route.</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="divide-y divide-line rounded-lg border border-line">
          {entries.map((entry) => (
            <div key={entry.key} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-ink">{entry.label}</p>
                <p className="truncate font-mono text-[10px] text-muted">{entry.key}</p>
              </div>
              <span className="shrink-0 font-mono text-[10.5px] text-muted">{entry.present ? `${entry.bytes} B` : "empty"}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={scan}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button variant="secondary" size="sm" onClick={exportAll}>
            <Download className="h-3.5 w-3.5" /> Export JSON
          </Button>
          <Button variant="danger" size="sm" onClick={clearAll}>
            <Trash2 className="h-3.5 w-3.5" /> Clear browser data
          </Button>
        </div>
        {flash ? <p className="text-[11px] text-ok-600">{flash}</p> : null}
      </CardContent>
    </Card>
  );
}
