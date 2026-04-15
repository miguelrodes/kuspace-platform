"use client";

import type { EventStatus } from "@/types/event";
import { Button } from "@/components/ui/button";

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
    <div className="flex flex-wrap items-center gap-3">
      {isDraft ? (
        <>
          <Button
            type="button"
            variant="ghost"
            className="!h-7 !px-2.5 text-body-sm uppercase tracking-[0.1em]"
            style={{ color: "var(--accent-hex)" }}
            onClick={onLock}
          >
            Lock Event
          </Button>
        </>
      ) : null}

      {isUpcoming ? (
        <>
          <Button
            type="button"
            variant="ghost"
            className="!h-7 !px-2.5 text-body-sm uppercase tracking-[0.1em] text-muted hover:text-[hsl(var(--warning))]"
            onClick={onRevertToDraft}
          >
            Revert to Draft
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="!h-7 !px-2.5 text-body-sm uppercase tracking-[0.1em]"
            style={{ color: "var(--accent-hex)" }}
            onClick={onPublish}
          >
            Publish
          </Button>
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
