"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Event } from "@/types/event";
import { cn } from "@/lib/utils/index";
import { CalendarEventCell } from "@/components/office/calendar-event-cell";

export type OfficeCalendarDay = {
  key: string;
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  events: Event[];
};

type CalendarGridProps = {
  weekdayLabels: string[];
  days: OfficeCalendarDay[];
  activeDayKey: string | null;
  onDayOpen: (dayKey: string) => void;
  onDayClose: () => void;
};

export function CalendarGrid({
  weekdayLabels,
  days,
  activeDayKey,
  onDayOpen,
  onDayClose,
}: CalendarGridProps) {
  const visibleWeeksHeight = "calc(3 * 9.5rem)";
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const activeDay = days.find((day) => day.key === activeDayKey) ?? null;

  useEffect(() => {
    if (!activeDay) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!overlayRef.current?.contains(event.target as Node)) {
        onDayClose();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [activeDay, onDayClose]);

  return (
    <div className="relative overflow-x-auto">
      <div className="min-w-[56rem]">
        <div className="office-content-reveal office-weekdays-reveal grid grid-cols-7 border-b border-border bg-panel-2">
          {weekdayLabels.map((label) => (
            <div
              key={label}
              className="border-r border-border px-3 py-2 text-body-sm uppercase tracking-widerish text-muted last:border-r-0"
            >
              {label}
            </div>
          ))}
        </div>

        <div
          className="overflow-y-auto"
          style={{ maxHeight: visibleWeeksHeight }}
        >
          <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const overflowCount = Math.max(day.events.length - 2, 0);

            return (
              <div
                key={day.key}
                className={cn(
                  "office-content-reveal office-day-reveal",
                  (index + 1) % 7 === 0 && "[&>div]:border-r-0",
                )}
                style={{
                  animationDelay: `${200 + Math.min(Math.floor(index / 7) * 35 + (index % 7) * 20, 240)}ms`,
                }}
              >
                <CalendarEventCell
                  dayNumber={day.dayNumber}
                  isCurrentMonth={day.isCurrentMonth}
                  events={day.events}
                  overflowCount={overflowCount}
                  onOpen={() => onDayOpen(day.key)}
                />
              </div>
            );
          })}
          </div>
        </div>
      </div>

      {activeDay ? (
        <div className="absolute inset-0 z-30 flex items-start justify-center p-6">
          <div
            ref={overlayRef}
            style={{ borderColor: "#FFFFFF" }}
            className="w-full max-w-4xl rounded-[var(--radius-surface)] border bg-[rgba(24,27,34,0.98)] shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-body text-fg">
                {new Intl.DateTimeFormat("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                }).format(new Date(`${activeDay.date}T12:00:00`))}
              </p>
              <button
                type="button"
                onClick={onDayClose}
                className="text-body-sm uppercase tracking-widerish text-muted transition hover:text-fg"
              >
                Close
              </button>
            </div>

            <div className="max-h-[26rem] overflow-y-auto px-4 py-4">
              {activeDay.events.length === 0 ? (
                <p className="text-body-sm text-muted">
                  No events scheduled for this date.
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {activeDay.events.map((event) => (
                    <Link
                      key={event.id}
                      href={`/office/event-editor/${event.id}`}
                      onClick={onDayClose}
                      style={
                        event.status === "live"
                          ? { borderColor: "hsla(223,100%,52%,0.98)" }
                          : undefined
                      }
                      className={cn(
                        "group block overflow-hidden rounded-[var(--radius-surface)] border bg-panel transition hover:border-white/20",
                        event.status === "draft"
                          ? "border-dashed border-white/10 opacity-65"
                          : event.status === "past"
                            ? "border-white/10 opacity-65"
                            : "border-white/10",
                      )}
                    >
                      <div className="aspect-[2.4/1] overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={event.cover.imageUrl}
                          alt={event.cover.imageAlt}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="space-y-1 px-3 py-3">
                        <p className="overflow-hidden whitespace-nowrap text-body text-fg text-ellipsis">
                          {event.cover.title}
                        </p>
                        <p className="text-body-sm text-muted">
                          {event.cover.location}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
