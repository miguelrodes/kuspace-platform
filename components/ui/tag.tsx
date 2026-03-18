import { ReactNode } from "react";
import { cn } from "@/lib/utils/index";

type TagTone = "draft" | "published" | "past" | "neutral";

type TagProps = {
  children: ReactNode;
  tone?: TagTone;
  className?: string;
};

const toneClasses: Record<TagTone, string> = {
  draft:
    "border-[hsla(38,92%,55%,0.4)] bg-[hsla(38,92%,55%,0.1)] text-[hsl(var(--warning))]",
  published:
    "border-[hsla(142,70%,45%,0.4)] bg-[hsla(142,70%,45%,0.1)] text-[hsl(var(--success))]",
  past: "border-[hsla(215,14%,62%,0.3)] bg-white/5 text-muted",
  neutral: "border-border bg-panel-2 text-fg",
};

export function Tag({ children, tone = "neutral", className }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-[var(--radius-button-tag)] border px-2.5 py-0 text-body-sm uppercase tracking-widerish leading-none",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
