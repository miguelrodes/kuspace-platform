"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Event } from "@/types/event";
import { EventCard } from "@/components/events/event-card";
import { ConfirmDialog } from "@/components/ui/action-dialog";
import { useMockEventsStore } from "@/lib/mock-store";

type OfficeEventRowProps = {
  event: Event;
};

export function OfficeEventRow({ event }: OfficeEventRowProps) {
  const router = useRouter();
  const { deleteEvent } = useMockEventsStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const lineupPreview = event.lineup.entries.map((entry) => entry.name).join(", ");
  const isDraft = event.status === "draft";

  useEffect(() => {
    function handlePointerDown(nextEvent: MouseEvent) {
      if (!menuRef.current?.contains(nextEvent.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <>
      <EventCard
        variant="large"
        imageUrl={event.cover.imageUrl}
        imageAlt={event.cover.imageAlt}
        date={event.cover.date}
        title={event.cover.title}
        lineupPreview={lineupPreview}
        href={`/office/event-editor/${event.id}`}
        ariaLabel={`Edit ${event.cover.title}`}
        footer={
          <>
            <span className="overflow-hidden text-ellipsis whitespace-nowrap">
              {event.cover.location || "Location"}
            </span>
            <span className="overflow-hidden text-ellipsis whitespace-nowrap">
              {event.cover.venue || "Venue"}
            </span>
          </>
        }
        topRightSlot={
          isDraft ? (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                aria-label={`Open draft actions for ${event.cover.title}`}
                className="inline-flex h-5 w-5 items-center justify-center rounded-[0.3rem] bg-black/35 text-white/82 backdrop-blur-sm transition hover:text-white"
                onClick={(nextEvent) => {
                  nextEvent.preventDefault();
                  nextEvent.stopPropagation();
                  setMenuOpen((current) => !current);
                }}
              >
                <span className="flex h-full w-full items-center justify-center text-[0.9rem] leading-none">⋮</span>
              </button>

              {menuOpen ? (
                <div className="absolute right-0 top-[calc(100%+0.35rem)] z-20 min-w-[12rem] rounded-[var(--radius-surface)] border border-border bg-panel p-1 shadow-[0_12px_30px_rgba(0,0,0,0.28)]">
                  <button
                    type="button"
                    className="block w-full rounded-[var(--radius-button-tag)] px-2 py-1.5 text-left text-body-sm tracking-widerish text-fg transition hover:bg-panel-2"
                    onClick={(nextEvent) => {
                      nextEvent.preventDefault();
                      nextEvent.stopPropagation();
                      setMenuOpen(false);
                      router.push(`/office/event-editor/${event.id}`);
                    }}
                  >
                    Continue editing
                  </button>
                  <button
                    type="button"
                    className="block w-full rounded-[var(--radius-button-tag)] px-2 py-1.5 text-left text-body-sm tracking-widerish transition hover:bg-panel-2"
                    style={{ color: "var(--accent-hex)" }}
                    onClick={(nextEvent) => {
                      nextEvent.preventDefault();
                      nextEvent.stopPropagation();
                      setMenuOpen(false);
                      setShowDeleteConfirm(true);
                    }}
                  >
                    Delete draft
                  </button>
                </div>
              ) : null}
            </div>
          ) : null
        }
      />

      {showDeleteConfirm ? (
        <ConfirmDialog
          title="Delete Event Draft"
          message="Delete this event draft? This cannot be undone."
          confirmLabel="Delete"
          confirmTone="accent"
          titleColor="#FFFFFF"
          messageClassName="mt-2 whitespace-nowrap"
          panelClassName="max-w-[27.5rem] px-5 pt-4.5 pb-4.5"
          actionsClassName="mt-3"
          confirmButtonClassName="px-2 leading-none font-medium"
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={() => {
            deleteEvent(event.id);
            setShowDeleteConfirm(false);
          }}
        />
      ) : null}
    </>
  );
}
