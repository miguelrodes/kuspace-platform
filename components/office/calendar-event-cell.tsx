"use client";

import Link from "next/link";
import type { Event } from "@/types/event";
import { cn } from "@/lib/utils/index";

type CalendarEventCellProps = {
  dayNumber?: number;
  isCurrentMonth: boolean;
  events: Event[];
  overflowCount: number;
  onOpen: () => void;
};

function getStatusCardClass(status: Event["status"]) {
  if (status === "live") {
    return "border-white/10";
  }

  if (status === "upcoming") {
    return "border-white/15";
  }

  if (status === "draft") {
    return "border-dashed border-white/10 opacity-65";
  }

  if (status === "past") {
    return "border-white/10 opacity-65";
  }

  return "border-white/10";
}

function CalendarMiniCard({
  event,
  compact = false,
  onNavigate,
}: {
  event: Event;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={`/office/events/${event.id}/edit`}
      onClick={(eventClick) => {
        eventClick.stopPropagation();
        onNavigate?.();
      }}
      style={
        event.status === "live"
          ? { borderColor: "hsla(223,100%,52%,0.98)" }
          : undefined
      }
      className={cn(
        "group block overflow-hidden rounded-[var(--radius-surface)] border bg-panel-2 transition hover:border-white/20",
        getStatusCardClass(event.status),
      )}
    >
      <div
        className={cn(
          "overflow-hidden",
          compact ? "aspect-[2.6/1]" : "aspect-[16/9]",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={event.cover.imageUrl}
          alt={event.cover.imageAlt}
          className="h-full w-full object-cover"
        />
      </div>

      <div className={cn("space-y-0.5", compact ? "px-1.5 py-1" : "px-3 py-3")}>
        <p
          className={cn(
            "overflow-hidden whitespace-nowrap text-fg text-ellipsis",
            compact ? "text-[0.68rem]" : "text-body",
          )}
        >
          {event.cover.title}
        </p>
        <p
          className={cn(
            "overflow-hidden text-muted",
            compact ? "text-[0.62rem]" : "text-body-sm",
          )}
          style={{
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 1,
          }}
        >
          {event.cover.location}
        </p>
      </div>
    </Link>
  );
}

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
            <CalendarMiniCard key={event.id} event={event} compact />
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
