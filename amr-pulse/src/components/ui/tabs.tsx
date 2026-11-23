"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Tabs({
  tabs,
  children,
  className,
}: {
  tabs: Array<{ id: string; label: string; count?: number }>;
  children: React.ReactNode;
  className?: string;
}) {
  const panels = React.Children.toArray(children);
  const [active, setActive] = React.useState(tabs[0]?.id ?? "");

  React.useEffect(() => {
    const sync = () => {
      const id = window.location.hash.replace("#", "");
      if (tabs.some((tab) => tab.id === id)) setActive(id);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [tabs]);

  function select(id: string) {
    setActive(id);
    try {
      window.history.replaceState(null, "", `#${id}`);
    } catch {
      // History may be unavailable; selection still works.
    }
  }

  return (
    <div className={className}>
      <div role="tablist" aria-label="Methods sections" className="no-print flex flex-wrap gap-1 rounded-xl border border-line bg-white p-1 shadow-card">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => select(tab.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] transition-colors",
              active === tab.id ? "bg-navy-900 font-medium text-white shadow-sm" : "text-slate-600 hover:bg-canvas hover:text-ink"
            )}
          >
            {tab.label}
            {typeof tab.count === "number" ? (
              <span className={cn("font-mono text-[9.5px]", active === tab.id ? "text-slate-300" : "text-muted")}>{tab.count}</span>
            ) : null}
          </button>
        ))}
      </div>
      {panels.map((panel, index) => {
        const tab = tabs[index];
        if (!tab) return null;
        return (
          <div key={tab.id} id={tab.id} role="tabpanel" aria-labelledby={tab.id} hidden={active !== tab.id} className="mt-3 space-y-3 print:block">
            {panel}
          </div>
        );
      })}
    </div>
  );
}
