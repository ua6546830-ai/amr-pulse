import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-tight",
  {
    variants: {
      variant: {
        neutral: "border-line bg-canvas text-muted",
        blue: "border-brand-100 bg-brand-50 text-brand-700",
        cyan: "border-cyan-100 bg-cyan-50 text-cyan-700",
        teal: "border-teal-100 bg-teal-50 text-teal-700",
        green: "border-emerald-100 bg-ok-50 text-ok-600",
        amber: "border-amber-100 bg-warn-50 text-warn-600",
        red: "border-red-100 bg-danger-50 text-danger-600",
        outline: "border-line-strong bg-white text-ink",
        dark: "border-ink bg-ink text-white",
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
