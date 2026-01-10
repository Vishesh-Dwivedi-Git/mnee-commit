"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-500 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden",
  {
    variants: {
      variant: {
        primary: 
          "bg-[#1a1a1a] text-[#e8e8e8] border border-[rgba(201,162,39,0.2)] hover:border-[rgba(201,162,39,0.4)] hover:text-white hover:shadow-[0_0_30px_rgba(201,162,39,0.1)] active:scale-[0.98]",
        gold:
          "bg-gradient-to-r from-[#1a1a1a] via-[#252525] to-[#1a1a1a] text-[#d4af37] border border-[rgba(201,162,39,0.3)] hover:text-[#f0d060] hover:border-[rgba(201,162,39,0.5)] hover:shadow-[0_0_40px_rgba(201,162,39,0.15)]",
        ghost:
          "text-[#a0a0a0] hover:text-[#e8e8e8] hover:bg-[rgba(255,255,255,0.03)]",
        outline:
          "border border-[rgba(255,255,255,0.1)] text-[#cccccc] hover:border-[rgba(255,255,255,0.2)] hover:text-white",
        danger:
          "bg-[#1a1a1a] text-[#cc6666] border border-[rgba(204,102,102,0.2)] hover:border-[rgba(204,102,102,0.4)]",
      },
      size: {
        sm: "h-9 px-4 text-sm rounded-sm",
        md: "h-11 px-6 text-sm rounded-sm",
        lg: "h-14 px-8 text-base rounded-sm tracking-wide",
        xl: "h-16 px-10 text-lg rounded-sm tracking-wide",
        icon: "h-10 w-10 rounded-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={loading || props.disabled}
        {...props}
      >
        {/* Gold line scan effect */}
        <span className="absolute top-0 left-[-100%] w-[50%] h-[1px] bg-gradient-to-r from-transparent via-[#c9a227] to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-[line-scan_3s_ease-in-out_1]" />
        
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="font-light italic">Loading...</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
