"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, icon, suffix, ...props }, ref) => {
    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="text-sm font-medium text-white/70">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
              {icon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              "flex h-12 w-full rounded-xl border bg-black/40 px-4 text-white",
              "placeholder:text-white/40",
              "border-white/10 focus:border-[#00D4FF]/50",
              "focus:ring-2 focus:ring-[#00D4FF]/20 focus:shadow-[0_0_20px_rgba(0,212,255,0.2)]",
              "transition-all duration-300 outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50",
              icon && "pl-12",
              suffix && "pr-20",
              error && "border-[#FF0055]/50 focus:border-[#FF0055] focus:ring-[#FF0055]/20",
              className
            )}
            ref={ref}
            {...props}
          />
          {suffix && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 font-medium">
              {suffix}
            </div>
          )}
        </div>
        {error && (
          <p className="text-sm text-[#FF0055]">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="text-sm font-medium text-white/70">
            {label}
          </label>
        )}
        <textarea
          className={cn(
            "flex min-h-[120px] w-full rounded-xl border bg-black/40 px-4 py-3 text-white",
            "placeholder:text-white/40",
            "border-white/10 focus:border-[#00D4FF]/50",
            "focus:ring-2 focus:ring-[#00D4FF]/20 focus:shadow-[0_0_20px_rgba(0,212,255,0.2)]",
            "transition-all duration-300 outline-none resize-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-[#FF0055]/50 focus:border-[#FF0055] focus:ring-[#FF0055]/20",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-sm text-[#FF0055]">{error}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Input, Textarea };
