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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <OfficeEventTabs activeTab={activeTab} onChange={onTabChange} />

        <Link href="/office/event-editor/new">
          <Button
            variant="ghost"
            className="h-8 px-4 text-heading uppercase tracking-[0.14em]"
            style={{ color: "var(--accent-hex)" }}
          >
            NEW EVENT
          </Button>
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="text-body-sm text-muted">No events in this section.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {events.map((event) => (
            <OfficeEventRow
              key={event.id}
              event={event}
            />
          ))}
        </div>
      )}
    </section>
  );
}
