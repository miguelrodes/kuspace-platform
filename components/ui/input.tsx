import { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/index";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-8 w-full rounded-[var(--radius-surface)] border border-border bg-panel-2 px-3 text-body-lg text-fg outline-none placeholder:text-body-sm placeholder:text-muted focus:border-[var(--accent-hex)] focus:shadow-glow",
        className,
      )}
      {...props}
    />
  );
}
