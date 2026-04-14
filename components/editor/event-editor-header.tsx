"use client";

import { EventStatusBadge } from "@/components/editor/event-status-badge";
import type { EventStatus } from "@/types/event";

type EventEditorHeaderProps = {
  status: EventStatus;
};

export function EventEditorHeader({ status }: EventEditorHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h1
        className="text-subheading uppercase"
        style={{
          color: "var(--accent-hex)",
          fontFamily: "var(--font-space-grotesk)",
          letterSpacing: "0.12em",
        }}
      >
        Event Editor
      </h1>

      <EventStatusBadge status={status} />
    </div>
  );
}
