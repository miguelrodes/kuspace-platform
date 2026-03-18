import { ReactNode } from "react";
import { cn } from "@/lib/utils/index";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-surface)] border border-border bg-panel px-4 py-4 text-body-lg shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
