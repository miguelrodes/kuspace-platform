"use client";

import { useState } from "react";
import {
  DropdownSelect,
  type DropdownSelectOption,
} from "@/components/ui/dropdown-select";

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
  const [genre, setGenre] = useState<(typeof uiOnlyFilters.genre)[number]>(
    uiOnlyFilters.genre[0],
  );
  const [location, setLocation] = useState<(typeof uiOnlyFilters.location)[number]>(
    uiOnlyFilters.location[0],
  );
  const [type, setType] = useState<(typeof uiOnlyFilters.type)[number]>(
    uiOnlyFilters.type[0],
  );

  const baseTriggerClassName =
    "h-7 justify-start gap-1.5 rounded-[var(--radius-button-tag)] bg-transparent px-2.5 py-0 text-body-sm tracking-widerish text-fg transition hover:opacity-80";
  const baseOptionClassName = "text-body-sm tracking-widerish";

  const dateDropdownOptions: Array<DropdownSelectOption<DateFilter>> = dateOptions;
  const genreOptions = uiOnlyFilters.genre.map((value) => ({ value, label: value }));
  const locationOptions = uiOnlyFilters.location.map((value) => ({ value, label: value }));
  const typeOptions = uiOnlyFilters.type.map((value) => ({ value, label: value }));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="-ml-2 flex flex-wrap items-center gap-3">
        <DropdownSelect
          value={date}
          options={dateDropdownOptions}
          onChange={onDateChange}
          className={baseTriggerClassName}
          optionClassName={baseOptionClassName}
        />

        <DropdownSelect
          value={genre}
          options={genreOptions}
          onChange={setGenre}
          className={baseTriggerClassName}
          optionClassName={baseOptionClassName}
        />
        <DropdownSelect
          value={location}
          options={locationOptions}
          onChange={setLocation}
          className={baseTriggerClassName}
          optionClassName={baseOptionClassName}
        />
        <DropdownSelect
          value={type}
          options={typeOptions}
          onChange={setType}
          className={baseTriggerClassName}
          optionClassName={baseOptionClassName}
        />
      </div>

      <div className="ml-auto translate-x-2 inline-flex items-center gap-2">
        {statusOptions.map((option, index) => {
          const isActive = status === option.value;

          return (
            <div key={option.value} className="inline-flex items-end gap-2">
              {index > 0 ? (
                <span className="pb-[1px] text-lg uppercase tracking-widerish leading-none text-white">
                  |
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => onStatusChange(option.value)}
                className={[
                  "h-auto rounded-[var(--radius-button-tag)] px-2.5 pb-0 pt-0 text-lg uppercase tracking-widerish leading-none transition",
                  isActive
                    ? "bg-transparent text-white"
                    : "text-muted hover:text-fg",
                ].join(" ")}
              >
                {option.label}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type { DateFilter, HomeStatusFilter };
