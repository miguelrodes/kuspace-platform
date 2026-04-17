"use client";

import type { EventStatus } from "@/types/event";

type EventStatusBadgeProps = {
  status: EventStatus;
};

const statusLabelMap: Record<Extract<EventStatus, "draft" | "live" | "upcoming" | "past">, string> = {
  draft: "Draft",
  live: "Live",
  upcoming: "Upcoming",
  past: "Past",
};

const statusColorMap: Record<
  Extract<EventStatus, "draft" | "live" | "upcoming" | "past">,
  string
> = {
  draft: "hsl(var(--warning))",
  live: "hsl(var(--success))",
  upcoming: "#60A5FA",
  past: "hsl(var(--muted))",
} as const;

export function EventStatusBadge({ status }: EventStatusBadgeProps) {
  if (status === "cancelled") {
    return null;
  }

  return (
    <span
      className="block w-full text-right text-body-sm uppercase tracking-widerish leading-none"
      style={{ color: statusColorMap[status] }}
    >
      {statusLabelMap[status]}
    </span>
  );
}
