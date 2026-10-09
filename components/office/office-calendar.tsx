"use client";

import { useMemo, useState } from "react";
import type { Event } from "@/types/event";
import { CalendarHeader } from "@/components/office/calendar-header";
import { CalendarGrid, type OfficeCalendarDay } from "@/components/office/calendar-grid";

type OfficeCalendarProps = {
  events: Event[];
  closeSignal?: string;
};

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function getInitialVisibleMonth(events: Event[]) {
  const liveEvent = events.find((event) => event.status === "live");
  const sourceDate = liveEvent ? parseDate(liveEvent.cover.date) : new Date();

  return {
    month: sourceDate.getMonth(),
    year: sourceDate.getFullYear(),
  };
}

function buildCalendarDays(
  month: number,
  year: number,
  eventsByDate: Map<string, Event[]>,
): OfficeCalendarDay[] {
  const firstDay = new Date(year, month, 1, 12, 0, 0);
  const start = new Date(firstDay);
  start.setDate(start.getDate() - start.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);

    const isoDate = `${current.getFullYear()}-${String(
      current.getMonth() + 1,
    ).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;

    return {
      key: isoDate,
      date: isoDate,
      dayNumber: current.getDate(),
      isCurrentMonth: current.getMonth() === month,
      events: eventsByDate.get(isoDate) ?? [],
    };
  });
}

export function OfficeCalendar({ events, closeSignal }: OfficeCalendarProps) {
  const initialVisibleMonth = useMemo(() => getInitialVisibleMonth(events), [events]);
  const [visibleMonth, setVisibleMonth] = useState(initialVisibleMonth.month);
  const [visibleYear, setVisibleYear] = useState(initialVisibleMonth.year);
  const [activePopover, setActivePopover] = useState<{
    dayKey: string;
    closeSignal?: string;
  } | null>(null);

  const availableYears = useMemo(() => {
    const years = new Set(events.map((event) => parseDate(event.cover.date).getFullYear()));
    years.add(visibleYear);
    return Array.from(years).sort((left, right) => left - right);
  }, [events, visibleYear]);
  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, Event[]>();

    events.forEach((event) => {
      const existing = grouped.get(event.cover.date);

      if (existing) {
        existing.push(event);
        return;
      }

      grouped.set(event.cover.date, [event]);
    });

    grouped.forEach((groupedEvents) => {
      groupedEvents.sort((left, right) => left.cover.date.localeCompare(right.cover.date));
    });

    return grouped;
  }, [events]);

  const days = useMemo(
    () => buildCalendarDays(visibleMonth, visibleYear, eventsByDate),
    [eventsByDate, visibleMonth, visibleYear],
  );

  return (
    <div className="relative">
      <CalendarHeader
        month={visibleMonth}
        year={visibleYear}
        availableYears={availableYears}
        onMonthChange={(nextMonth) => {
          setVisibleMonth(nextMonth);
          setActivePopover(null);
        }}
        onYearChange={(nextYear) => {
          setVisibleYear(nextYear);
          setActivePopover(null);
        }}
      />
      <section className="overflow-hidden rounded-[var(--radius-surface)] border border-border bg-panel">
        <CalendarGrid
          weekdayLabels={weekdayLabels}
          days={days}
          activeDayKey={
            activePopover?.closeSignal === closeSignal
              ? activePopover?.dayKey ?? null
              : null
          }
          onDayOpen={(dayKey) => setActivePopover({ dayKey, closeSignal })}
          onDayClose={() => setActivePopover(null)}
        />
      </section>
    </div>
  );
}
