"use client";

import Link from "next/link";
import type { Event } from "@/types/event";
import type { RecruiterProfile } from "@/types/profile";
import { Button } from "@/components/ui/button";
import {
  OfficeEventTabs,
  type OfficeListTab,
} from "@/components/office/office-event-tabs";
import { OfficeEventRow } from "@/components/office/office-event-row";

type OfficeEventListProps = {
  activeTab: OfficeListTab;
  events: Event[];
  recruiter: RecruiterProfile;
  onTabChange: (tab: OfficeListTab) => void;
};

export function OfficeEventList({
  activeTab,
  events,
  onTabChange,
}: OfficeEventListProps) {
  return (
    <section className="space-y-3.5">
      <div className="office-content-reveal office-event-controls-reveal flex flex-wrap items-end justify-between gap-4">
        <OfficeEventTabs activeTab={activeTab} onChange={onTabChange} />

        <Link href="/office/event-editor/new" className="inline-flex items-end">
          <Button
            variant="ghost"
            className="h-auto px-4 pt-0 pb-1 text-body leading-[var(--text-base-line-height)] uppercase tracking-[0.14em]"
            style={{ color: "var(--accent-hex)" }}
          >
            NEW EVENT
          </Button>
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="office-content-reveal office-card-reveal text-body-sm text-muted">No events in this section.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {events.map((event, index) => (
            <OfficeEventRow
              key={event.id}
              event={event}
              revealIndex={index}
            />
          ))}
        </div>
      )}
    </section>
  );
}
