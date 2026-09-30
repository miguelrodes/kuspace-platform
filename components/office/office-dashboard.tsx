"use client";

import { useMemo, useState } from "react";
import type { Event } from "@/types/event";
import { useAppStore } from "@/lib/app-store";
import { OfficeCalendar } from "@/components/office/office-calendar";
import { OfficeEventList } from "@/components/office/office-event-list";
import type { OfficeListTab } from "@/components/office/office-event-tabs";

function parseDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function sortEventsByTab(events: Event[], tab: OfficeListTab) {
  const sorted = [...events];

  sorted.sort((left, right) => {
    const leftDate = parseDate(left.cover.date).getTime();
    const rightDate = parseDate(right.cover.date).getTime();

    if (tab === "past") {
      return rightDate - leftDate;
    }

    return leftDate - rightDate;
  });

  return sorted;
}

export function OfficeDashboard() {
  const { profile, events } = useAppStore();
  const [activeTab, setActiveTab] = useState<OfficeListTab>("live");

  const visibleEvents = useMemo(() => {
    const matchingEvents = events.filter((event) => event.status === activeTab);
    return sortEventsByTab(matchingEvents, activeTab);
  }, [activeTab, events]);

  return (
    <div className="-mt-4 border-x border-border pl-4 pr-4 md:pl-5 md:pr-5">
      <div className="space-y-6">
        <OfficeCalendar events={events} closeSignal={activeTab} />
        <div className="pt-2">
          <OfficeEventList
            activeTab={activeTab}
            events={visibleEvents}
            recruiter={profile}
            onTabChange={setActiveTab}
          />
        </div>
      </div>
    </div>
  );
}
