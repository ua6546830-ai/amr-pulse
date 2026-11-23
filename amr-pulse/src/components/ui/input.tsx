import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-xl border border-line bg-white px-3.5 text-[13px] text-ink shadow-[inset_0_1px_1px_rgba(16,36,58,0.03)] placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-[12px] font-medium text-ink", className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-xl border border-line bg-white px-3 text-[13px] text-ink focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[13px] text-ink placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15",
        className
      )}
      {...props}
    />
  );
}

export function FieldHint({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1.5 text-[11.5px] leading-relaxed text-muted", className)} {...props} />;
}
