import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const styles = {
  info: { wrap: "border-sci-cyan/25 bg-sci-cyan/[0.07] text-[#17647A]", icon: Info },
  success: { wrap: "border-brand-200/70 bg-brand-50/70 text-brand-800", icon: CheckCircle2 },
  warning: { wrap: "border-warn-100 bg-warn-50 text-warn-700", icon: AlertTriangle },
  danger: { wrap: "border-danger-100 bg-danger-50 text-danger-600", icon: XCircle },
} as const;

export function Alert({
  variant = "info",
  title,
  children,
  className,
  action,
}: {
  variant?: keyof typeof styles;
  title?: string;
  children?: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  const { wrap, icon: Icon } = styles[variant];
  return (
    <div className={cn("flex gap-3 rounded-xl border px-4 py-3.5 text-[13px] leading-relaxed", wrap, className)} role="alert">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold tracking-[-0.005em]">{title}</p> : null}
        {children ? <div className={cn(title && "mt-1", "text-ink/75")}>{children}</div> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {Icon ? (
        <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-canvas text-muted">
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
      <p className="text-[14px] font-semibold text-ink">{title}</p>
      {description ? <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
