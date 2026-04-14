"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/index";

export type DropdownSelectOption<T extends string = string> = {
  value: T;
  label: string;
  disabled?: boolean;
};

type DropdownSelectProps<T extends string = string> = {
  value: T;
  options: Array<DropdownSelectOption<T>>;
  onChange: (value: T) => void;
  className?: string;
  labelClassName?: string;
  menuClassName?: string;
  optionClassName?: string;
  disabled?: boolean;
  ariaLabel?: string;
};

export function DropdownSelect<T extends string = string>({
  value,
  options,
  onChange,
  className,
  labelClassName,
  menuClassName,
  optionClassName,
  disabled = false,
  ariaLabel,
}: DropdownSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen((current) => !current);
          }
        }}
        className={cn(
          "inline-flex items-center justify-between gap-2 disabled:cursor-not-allowed disabled:text-muted",
          className,
        )}
      >
        <span className={cn("whitespace-nowrap", labelClassName)}>{selected?.label ?? ""}</span>
        <span className={cn("shrink-0 text-body-sm transition", open ? "rotate-180" : "")}>
          ▾
        </span>
      </button>

      {open && !disabled ? (
        <div
          className={cn(
            "absolute left-0 top-[calc(100%+0.35rem)] z-20 min-w-full rounded-[var(--radius-surface)] border border-border bg-panel p-1 shadow-[0_12px_30px_rgba(0,0,0,0.28)]",
            menuClassName,
          )}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={option.disabled}
              onClick={() => {
                if (option.disabled) {
                  return;
                }
                onChange(option.value);
                setOpen(false);
              }}
              className={cn(
                "block w-full rounded-[var(--radius-button-tag)] px-2 py-1.5 text-left transition disabled:cursor-not-allowed disabled:opacity-45",
                option.value === value
                  ? "bg-panel-2 text-fg"
                  : "text-muted hover:bg-panel-2 hover:text-fg",
                option.disabled ? "hover:bg-transparent hover:text-muted" : "",
                optionClassName,
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
