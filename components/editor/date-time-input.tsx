"use client";

import { InputHTMLAttributes, useRef } from "react";
import { cn } from "@/lib/utils/index";

type PickerInputElement = HTMLInputElement & {
  showPicker?: () => void;
};

type DateTimeInputProps = InputHTMLAttributes<HTMLInputElement> & {
  picker: "date" | "time";
};

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 14" />
    </svg>
  );
}

export function DateTimeInput({
  picker,
  className,
  ...props
}: DateTimeInputProps) {
  const inputRef = useRef<PickerInputElement | null>(null);

  const openPicker = () => {
    const input = inputRef.current;

    if (!input) {
      return;
    }

    input.focus();

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.click();
  };

  return (
    <div className="relative mt-1">
      <input
        {...props}
        ref={inputRef}
        type={picker}
        className={cn(
          "editor-date-time-input h-8 w-full rounded-[var(--radius-surface)] border border-border bg-panel px-3 pr-10 text-body text-white/72 outline-none placeholder:text-body-sm placeholder:text-muted focus:border-[var(--accent-hex)] focus:shadow-glow",
          className,
        )}
      />
      <button
        type="button"
        aria-label={picker === "date" ? "Open date picker" : "Open time picker"}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-[var(--accent-hex)] transition-opacity hover:opacity-85"
        onClick={openPicker}
      >
        {picker === "date" ? <CalendarIcon /> : <ClockIcon />}
      </button>
    </div>
  );
}
