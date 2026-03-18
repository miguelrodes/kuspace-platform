"use client";

type HomeStatusFilter = "upcoming" | "past";
type DateFilter = "all" | "sep-1-10" | "sep-11-20" | "sep-21-30";

type FilterBarProps = {
  status: HomeStatusFilter;
  date: DateFilter;
  onStatusChange: (status: HomeStatusFilter) => void;
  onDateChange: (date: DateFilter) => void;
};

const statusOptions: Array<{ value: HomeStatusFilter; label: string }> = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
];

const dateOptions: Array<{ value: DateFilter; label: string }> = [
  { value: "all", label: "All Dates" },
  { value: "sep-1-10", label: "Sep 1-10" },
  { value: "sep-11-20", label: "Sep 11-20" },
  { value: "sep-21-30", label: "Sep 21-30" },
];

const uiOnlyFilters = {
  genre: ["All Genres", "House", "Techno", "Disco"],
  location: ["All Locations", "Northport", "Barcelona", "Madrid"],
  type: ["All Types", "Room", "Terrace", "Festival", "Warehouse"],
} as const;

export function FilterBar({
  status,
  date,
  onStatusChange,
  onDateChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={date}
          onChange={(event) => onDateChange(event.target.value as DateFilter)}
          className="min-w-0 w-auto rounded-[var(--radius-button-tag)] border border-white/10 bg-transparent px-3 py-1 text-body-sm uppercase tracking-widerish text-muted outline-none transition hover:border-white/20 hover:text-fg"
        >
          {dateOptions.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="bg-panel text-fg"
            >
              {option.label}
            </option>
          ))}
        </select>

        {Object.entries(uiOnlyFilters).map(([label, values]) => (
          <select
            key={label}
            defaultValue={values[0]}
            className="rounded-[var(--radius-button-tag)] border border-white/10 bg-transparent px-3 py-1 text-body-sm uppercase tracking-widerish text-muted outline-none transition hover:border-white/20 hover:text-fg"
          >
            {values.map((value) => (
              <option key={value} value={value} className="bg-panel text-fg">
                {value}
              </option>
            ))}
          </select>
        ))}
      </div>

      <div className="ml-auto inline-flex overflow-hidden rounded-[var(--radius-button-tag)] border border-white/10">
        {statusOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onStatusChange(option.value)}
            className={[
              "min-w-[8.5rem] px-3 py-1 text-center text-body-sm uppercase tracking-widerish transition",
              status === option.value
                ? "bg-white/8 text-fg"
                : "bg-transparent text-muted hover:text-fg",
            ].join(" ")}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export type { DateFilter, HomeStatusFilter };
