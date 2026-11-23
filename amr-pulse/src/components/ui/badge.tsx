import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold tracking-[0.02em] whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "border-line bg-canvas text-muted",
        blue: "border-cyan-100 bg-sci-cyan/10 text-[#1E7A93]",
        cyan: "border-cyan-100 bg-sci-cyan/10 text-[#1E7A93]",
        teal: "border-teal-100 bg-brand-50 text-brand-700",
        green: "border-emerald-100 bg-ok-50 text-ok-600",
        amber: "border-amber-100 bg-warn-50 text-warn-700",
        red: "border-red-100 bg-danger-50 text-danger-600",
        outline: "border-line-strong bg-white text-ink",
        dark: "border-navy-900 bg-navy-900 text-white",
        ai: "border-ai/20 bg-ai-soft text-ai-deep",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
