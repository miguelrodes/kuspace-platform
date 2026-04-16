import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/index";

type ButtonVariant = "primary" | "ghost" | "subtle";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-0 bg-[var(--accent-hex)] text-white hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--accent-hex)]",
  ghost:
    "border-0 bg-transparent text-fg hover:bg-panel-2 focus-visible:ring-2 focus-visible:ring-[var(--accent-hex)]",
  subtle:
    "border border-white/10 bg-white/6 text-fg hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[var(--accent-hex)]",
};

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "appearance-none border-solid inline-flex cursor-pointer items-center justify-center rounded-[var(--radius-button-tag)] px-5 py-px whitespace-nowrap text-body leading-none font-medium transition outline-none disabled:cursor-not-allowed",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
