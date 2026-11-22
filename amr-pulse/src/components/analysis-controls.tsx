"use client";

import { useRouter } from "next/navigation";
import { Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/input";

export function AnalysisControls({
  organisms,
  drugs,
  selectedOrganism,
  selectedAntibiotic,
}: {
  organisms: string[];
  drugs: string[];
  selectedOrganism: string;
  selectedAntibiotic: string;
}) {
  const router = useRouter();

  function run(form: FormData) {
    const organism = String(form.get("organism") ?? "all");
    const antibiotic = String(form.get("antibiotic") ?? "all");
    const params = new URLSearchParams();
    if (organism && organism !== "all") params.set("organism", organism);
    if (antibiotic && antibiotic !== "all") params.set("antibiotic", antibiotic);
    router.push(`/analysis${params.size > 0 ? `?${params.toString()}` : ""}`);
  }

  return (
    <form
      action={(formData) => run(formData)}
      className="rounded-xl border border-line bg-white p-3 shadow-card"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1">
          <Label htmlFor="organism" className="text-[10.5px]">Organism stratum</Label>
          <Select id="organism" name="organism" defaultValue={selectedOrganism} className="mt-1 h-8 text-[11.5px]">
            <option value="all">All organisms</option>
            {organisms.map((organism) => (
              <option key={organism} value={organism}>{organism}</option>
            ))}
          </Select>
        </div>
        <div className="flex-1">
          <Label htmlFor="antibiotic" className="text-[10.5px]">Antibiotic stratum</Label>
          <Select id="antibiotic" name="antibiotic" defaultValue={selectedAntibiotic} className="mt-1 h-8 text-[11.5px]">
            <option value="all">All mapped antibiotics</option>
            {drugs.map((drug) => (
              <option key={drug} value={drug}>{drug}</option>
            ))}
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm"><Play className="h-3.5 w-3.5" /> Run analysis</Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => router.push("/analysis")}>
            <RotateCcw className="h-3.5 w-3.5" /> Default
          </Button>
        </div>
      </div>
      <p className="mt-2 text-[10.5px] leading-relaxed text-muted">
        The analysis runs deterministically on the server for every request. Genomic screening provenance is always
        required; intermediate, SDD and NS categories are reported but excluded from the binary denominator.
      </p>
    </form>
  );
}
