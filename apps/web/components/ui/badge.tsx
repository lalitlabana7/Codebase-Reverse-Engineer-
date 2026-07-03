import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center font-mono transition-colors uppercase tracking-wider",
  {
    variants: {
      variant: {
        default:
          "terminal-badge",
        primary:
          "terminal-badge",
        secondary:
          "terminal-badge-secondary",
        success:
          "terminal-badge-success",
        warning:
          "terminal-badge-accent",
        danger:
          "terminal-badge-danger",
        outline: "terminal-badge opacity-70",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
