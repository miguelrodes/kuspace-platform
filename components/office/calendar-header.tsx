"use client";

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
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
      <label className="inline-flex items-center gap-2 text-body-sm uppercase tracking-widerish text-muted">
        <span className="sr-only">Month</span>
        <select
          aria-label="Month"
          value={month}
          onChange={(event) => onMonthChange(Number(event.target.value))}
          className="h-8 rounded-[var(--radius-surface)] border border-border bg-panel-2 px-3 text-body text-fg outline-none transition focus:border-[var(--accent-hex)]"
        >
          {monthLabels.map((label, index) => (
            <option key={label} value={index}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="inline-flex items-center gap-2 text-body-sm uppercase tracking-widerish text-muted">
        <span className="sr-only">Year</span>
        <select
          aria-label="Year"
          value={year}
          onChange={(event) => onYearChange(Number(event.target.value))}
          className="h-8 rounded-[var(--radius-surface)] border border-border bg-panel-2 px-3 text-body text-fg outline-none transition focus:border-[var(--accent-hex)]"
        >
          {availableYears.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
