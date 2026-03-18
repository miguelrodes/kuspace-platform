import { ReactNode } from "react";
import { cn } from "@/lib/utils/index";

export function TableWrapper({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-[var(--radius-surface)] border border-border",
        className,
      )}
    >
      <table className="min-w-full border-collapse bg-panel">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="bg-panel-2">{children}</thead>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TR({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr className={cn("border-t border-border hover:bg-white/5", className)}>
      {children}
    </tr>
  );
}

export function TH({ children }: { children: ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-body-sm font-medium uppercase tracking-widerish text-muted">
      {children}
    </th>
  );
}

export function TD({ children }: { children: ReactNode }) {
  return <td className="px-4 py-3 text-body text-fg">{children}</td>;
}
