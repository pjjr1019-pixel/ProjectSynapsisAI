import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../utils/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "ghost" | "danger";
}

const variantClass: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-cyan-500/90 text-slate-950 hover:bg-cyan-400",
  ghost: "bg-slate-800 text-slate-200 hover:bg-slate-700",
  danger: "bg-rose-500/90 text-white hover:bg-rose-400"
};

export function Button({ children, className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "rounded-md px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variantClass[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
