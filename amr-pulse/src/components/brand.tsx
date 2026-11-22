import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/dashboard" className={cn("flex items-center gap-2.5", className)} aria-label="AMR PULSE home">
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-ink text-white shadow-sm">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
          <path d="M3 13h4l2-5 3 10 2.5-7 1.8 4H21" stroke="#5EEAD4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="5" cy="13" r="1.1" fill="#93C5FD" />
          <circle cx="19" cy="15" r="1.1" fill="#93C5FD" />
        </svg>
      </span>
      {compact ? null : (
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold tracking-[0.08em] text-ink">AMR PULSE</span>
          <span className="block text-[9.5px] uppercase tracking-[0.12em] text-muted">Geno–pheno intelligence</span>
        </span>
      )}
    </Link>
  );
}
