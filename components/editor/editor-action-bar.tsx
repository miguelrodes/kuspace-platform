"use client";

import type { EventStatus } from "@/types/event";

type EditorActionBarProps = {
  status: EventStatus;
  readOnly?: boolean;
  onPublish: () => void;
  onLock: () => void;
  onRevertToDraft: () => void;
};

export function EditorActionBar({
  status,
  readOnly = false,
  onPublish,
  onLock,
  onRevertToDraft,
}: EditorActionBarProps) {
  const actionButtonClassName =
    "relative z-10 inline-flex h-7 items-center justify-center whitespace-nowrap rounded-[var(--radius-button-tag)] border-0 bg-transparent px-2.5 text-body-sm uppercase tracking-[0.1em] leading-none outline-none transition";

  if (readOnly) {
    return (
      <p className="text-body-sm uppercase tracking-[0.08em] text-muted">
        Past events are read-only
      </p>
    );
  }

  const isDraft = status === "draft";
  const isUpcoming = status === "upcoming";
  const isLive = status === "live";

  return (
    <div className="relative z-10 flex flex-wrap items-center gap-3">
      {isDraft ? (
        <>
          <a
            href="#"
            className={actionButtonClassName}
            style={{
              color: "var(--accent-hex)",
            }}
            onClick={(event) => {
              event.preventDefault();
              onLock();
            }}
          >
            Lock Event
          </a>
        </>
      ) : null}

      {isUpcoming ? (
        <>
          <a
            href="#"
            className={`${actionButtonClassName} text-muted hover:text-[hsl(var(--warning))]`}
            onClick={(event) => {
              event.preventDefault();
              onRevertToDraft();
            }}
          >
            Revert to Draft
          </a>
          <a
            href="#"
            className={actionButtonClassName}
            style={{
              color: "var(--accent-hex)",
            }}
            onClick={(event) => {
              event.preventDefault();
              onPublish();
            }}
          >
            Publish
          </a>
        </>
      ) : null}

      {isLive ? (
        <p className="text-body-sm uppercase tracking-[0.08em] text-muted">
          Live events are locked
        </p>
      ) : null}
    </div>
  );
}
