"use client";

import { DropdownSelect } from "@/components/ui/dropdown-select";

type CalendarHeaderProps = {
  month: number;
  year: number;
  availableYears: number[];
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
};

const monthLabels = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function CalendarHeader({
  month,
  year,
  availableYears,
  onMonthChange,
  onYearChange,
}: CalendarHeaderProps) {
  const monthOptions = monthLabels.map((label, index) => ({
    value: String(index),
    label,
  }));
  const yearOptions = availableYears.map((option) => ({
    value: String(option),
    label: String(option),
  }));

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
      <label className="inline-flex items-center gap-2 text-body-sm uppercase tracking-widerish text-muted">
        <span className="sr-only">Month</span>
        <DropdownSelect
          aria-label="Month"
          value={String(month)}
          options={monthOptions}
          onChange={(value) => onMonthChange(Number(value))}
          className="h-8 rounded-[var(--radius-surface)] border border-border bg-panel px-3 text-body text-fg outline-none transition focus:border-[var(--accent-hex)]"
          optionClassName="text-body"
        />
      </label>

      <label className="inline-flex items-center gap-2 text-body-sm uppercase tracking-widerish text-muted">
        <span className="sr-only">Year</span>
        <DropdownSelect
          aria-label="Year"
          value={String(year)}
          options={yearOptions}
          onChange={(value) => onYearChange(Number(value))}
          className="h-8 rounded-[var(--radius-surface)] border border-border bg-panel px-3 text-body text-fg outline-none transition focus:border-[var(--accent-hex)]"
          optionClassName="text-body"
        />
      </label>
    </div>
  );
}
