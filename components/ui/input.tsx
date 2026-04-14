import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/index";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-8 w-full rounded-[var(--radius-surface)] border border-border bg-panel px-3 text-body-lg text-fg outline-none placeholder:text-body-sm placeholder:text-muted focus:border-[var(--accent-hex)] focus:shadow-glow",
        className,
      )}
      {...props}
    />
  );
});
