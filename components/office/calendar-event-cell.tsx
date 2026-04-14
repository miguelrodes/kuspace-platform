"use client";

import type { Event } from "@/types/event";
import { CalendarMiniEventCard } from "@/components/office/calendar-mini-event-card";
import { cn } from "@/lib/utils/index";

type CalendarEventCellProps = {
  dayNumber?: number;
  isCurrentMonth: boolean;
  events: Event[];
  overflowCount: number;
  onOpen: () => void;
};

export function CalendarEventCell({
  dayNumber,
  isCurrentMonth,
  events,
  overflowCount,
  onOpen,
}: CalendarEventCellProps) {
  return (
    <div
      className={cn(
        "relative h-[9.75rem] overflow-hidden border-r border-b border-border p-1.5 transition",
        !isCurrentMonth && "bg-black/10",
      )}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="flex h-full w-full flex-col items-start text-left">
        <div
          className={cn(
            "mb-1.5 text-body-sm tracking-tightish",
            isCurrentMonth ? "text-fg" : "text-muted/60",
          )}
        >
          {dayNumber ?? ""}
        </div>

        <div className="flex w-full flex-1 flex-col gap-1 overflow-hidden">
          {events.slice(0, 2).map((event) => (
            <CalendarMiniEventCard
              key={event.id}
              event={event}
              compact
              href={`/office/event-editor/${event.id}`}
            />
          ))}

          {overflowCount > 0 ? (
            <div
              className="text-body-sm font-semibold uppercase tracking-[0.12em]"
              style={{ color: "var(--accent-hex)" }}
            >
              +{overflowCount}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
