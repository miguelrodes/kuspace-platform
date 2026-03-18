import { ReactNode } from "react";
import { cn } from "@/lib/utils/index";

type MetaTagProps = {
  children: ReactNode;
  className?: string;
};

export function MetaTag({ children, className }: MetaTagProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-[var(--radius-button-tag)] border border-border bg-panel-2 px-2.5 py-0 text-body-sm tracking-widerish leading-none text-fg",
        className,
      )}
    >
      {children}
    </span>
  );
}
