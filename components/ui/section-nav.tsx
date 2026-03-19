"use client";

import { cn } from "@/lib/utils/index";

type SectionNavProps = {
  items: string[];
  activeItem: string;
  onChange?: (item: string) => void;
  className?: string;
};

export function SectionNav({
  items,
  activeItem,
  onChange,
  className,
}: SectionNavProps) {
  return (
    <nav aria-label="Section navigation" className={className}>
      <ul className="flex flex-wrap items-end gap-8">
        {items.map((item) => {
          const isActive = item === activeItem;

          return (
            <li key={item}>
              <button
                type="button"
                onClick={() => onChange?.(item)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative border-0 bg-transparent px-0 pb-1 text-subheading uppercase tracking-widerish transition outline-none",
                  isActive ? "text-fg" : "text-muted hover:text-fg",
                )}
              >
                {item}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-0 bottom-0 h-px bg-[var(--accent-hex)] transition-opacity",
                    isActive ? "opacity-100" : "opacity-0",
                  )}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
