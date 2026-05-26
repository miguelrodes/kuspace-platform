"use client";

import Link from "next/link";

type EventEditorHeaderProps = {
  attendeesHref?: string;
};

export function EventEditorHeader({ attendeesHref }: EventEditorHeaderProps) {
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

      {attendeesHref ? (
        <Link
          href={attendeesHref}
          className="inline-flex items-center justify-center rounded-[var(--radius-button-tag)] border border-white/10 bg-white/6 px-4 py-1 text-body-sm font-medium text-fg transition hover:bg-white/10"
        >
          Attendees
        </Link>
      ) : null}
    </div>
  );
}
