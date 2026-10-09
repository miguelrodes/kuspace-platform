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
    <div
      className="office-content-reveal office-calendar-controls-reveal flex flex-wrap items-center justify-end gap-6 pb-1 pl-4 pr-0 xl:absolute xl:right-0 xl:z-10"
      style={{ top: "-2.25rem" }}
    >
      <label className="inline-flex items-center gap-2 text-body-sm uppercase tracking-widerish text-muted">
        <span className="sr-only">Month</span>
        <DropdownSelect
          aria-label="Month"
          value={String(month)}
          options={monthOptions}
          onChange={(value) => onMonthChange(Number(value))}
          className="h-8 rounded-[var(--radius-surface)] px-3 pr-0 text-body-sm text-fg outline-none transition focus-visible:ring-2 focus-visible:ring-white/50"
          optionClassName="text-body-sm"
        />
      </label>

      <label className="inline-flex items-center gap-2 text-body-sm uppercase tracking-widerish text-muted">
        <span className="sr-only">Year</span>
        <DropdownSelect
          aria-label="Year"
          value={String(year)}
          options={yearOptions}
          onChange={(value) => onYearChange(Number(value))}
          className="h-8 rounded-[var(--radius-surface)] px-3 pr-0 text-body-sm text-fg outline-none transition focus-visible:ring-2 focus-visible:ring-white/50"
          optionClassName="text-body-sm"
        />
      </label>
    </div>
  );
}
