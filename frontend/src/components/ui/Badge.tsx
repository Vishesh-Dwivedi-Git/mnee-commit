"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm font-normal transition-all duration-300 whitespace-nowrap tracking-wide",
  {
    variants: {
      variant: {
        default:
          "bg-[rgba(255,255,255,0.05)] text-[#a0a0a0] border border-[rgba(255,255,255,0.08)]",
        gold:
          "bg-[rgba(201,162,39,0.08)] text-[#d4af37] border border-[rgba(201,162,39,0.2)]",
        success:
          "bg-[rgba(100,150,100,0.1)] text-[#8fbc8f] border border-[rgba(100,150,100,0.2)]",
        warning:
          "bg-[rgba(180,150,80,0.1)] text-[#d4af37] border border-[rgba(180,150,80,0.2)]",
        error:
          "bg-[rgba(150,80,80,0.1)] text-[#cc8080] border border-[rgba(150,80,80,0.2)]",
        muted:
          "bg-transparent text-[#666666] border border-[rgba(255,255,255,0.04)]",
      },
      size: {
        sm: "text-xs px-2 py-0.5",
        md: "text-sm px-3 py-1",
        lg: "text-base px-4 py-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, dot, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant, size, className }))}
      {...props}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
      )}
      {children}
    </span>
  )
);
Badge.displayName = "Badge";

// Status-specific badges with artistic styling
const StatusBadge = ({ status }: { status: string }) => {
  const variants: Record<string, VariantProps<typeof badgeVariants>["variant"]> = {
    FUNDED: "gold",
    SUBMITTED: "warning",
    SETTLED: "success",
    DISPUTED: "error",
    REFUNDED: "muted",
    CREATED: "default",
  };

  return (
    <Badge variant={variants[status] || "default"} dot>
      <span className="font-light italic">{status.toLowerCase()}</span>
    </Badge>
  );
};

export { Badge, StatusBadge, badgeVariants };
