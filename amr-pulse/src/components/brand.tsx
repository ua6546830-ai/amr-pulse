import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  compact = false,
  tone = "light",
  href = "/dashboard",
}: {
  className?: string;
  compact?: boolean;
  tone?: "light" | "dark";
  href?: string;
}) {
  const dark = tone === "dark";
  return (
    <Link href={href} className={cn("group flex items-center gap-2.5", className)} aria-label="AMR PULSE — overview">
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-navy-950 shadow-[0_6px_18px_-8px_rgba(8,23,38,0.8)] ring-1 ring-white/10">
        <span className="absolute inset-0 bg-[radial-gradient(120%_120%_at_20%_0%,rgba(66,184,213,0.35),transparent_58%),radial-gradient(120%_120%_at_90%_100%,rgba(118,101,232,0.3),transparent_60%)]" />
        <svg viewBox="0 0 64 64" className="relative h-6 w-6" fill="none" aria-hidden>
          <defs>
            <linearGradient id="pulse-grad" x1="8" y1="36" x2="56" y2="30" gradientUnits="userSpaceOnUse">
              <stop stopColor="#8FE9DA" />
              <stop offset="0.55" stopColor="#35C7AE" />
              <stop offset="1" stopColor="#42B8D5" />
            </linearGradient>
          </defs>
          <polyline
            points="8,36 20,36 25,20 32,48 38,26 44,36 56,36"
            stroke="url(#pulse-grad)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {compact ? null : (
        <span className="min-w-0">
          <span
            className={cn(
              "block text-[13.5px] font-semibold tracking-[0.14em]",
              dark ? "text-white" : "text-ink"
            )}
          >
            AMR PULSE
          </span>
          <span
            className={cn(
              "block text-[9px] uppercase tracking-[0.18em]",
              dark ? "text-teal-100/70" : "text-faint"
            )}
          >
            Genotype · Phenotype · Evidence
          </span>
        </span>
      )}
    </Link>
  );
}
