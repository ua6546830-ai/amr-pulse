import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-all duration-200 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/45 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px",
  {
    variants: {
      variant: {
        primary:
          "bg-navy-900 text-white shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_10px_24px_-14px_rgba(16,36,58,0.7)] hover:bg-navy-800",
        accent: "bg-brand-600 text-white shadow-[0_10px_24px_-14px_rgba(18,169,133,0.8)] hover:bg-brand-700",
        secondary: "border border-line bg-white text-ink shadow-sm hover:border-line-strong hover:bg-canvas",
        ghost: "text-muted hover:bg-navy-900/[0.04] hover:text-ink",
        outline: "border border-line-strong bg-transparent text-ink hover:border-navy-700 hover:bg-white",
        subtle: "bg-brand-50 text-brand-700 hover:bg-brand-100",
        danger: "bg-danger-600 text-white hover:bg-[#A9353F]",
        link: "text-brand-700 underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-3.5 text-[12.5px]",
        md: "h-10 px-4 text-[13px]",
        lg: "h-11 px-6 text-[13.5px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size }), className);
    if (asChild && React.isValidElement(props.children)) {
      const child = props.children as React.ReactElement<{ className?: string }>;
      return React.cloneElement(child, {
        ...props,
        ...child.props,
        className: cn(classes, child.props.className),
        ref,
      } as React.Attributes & { className: string; ref: React.ForwardedRef<HTMLButtonElement> });
    }
    return <button ref={ref} className={classes} {...props} />;
  }
);
Button.displayName = "Button";

export { buttonVariants };
