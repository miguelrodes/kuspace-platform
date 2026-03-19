"use client";

import { SectionNav } from "@/components/ui/section-nav";
import type { EventStatus } from "@/types/event";

const officeTabLabelMap = {
  upcoming: "Upcoming",
  live: "Live",
  draft: "Draft",
  past: "Past",
} as const;

type OfficeTab = keyof typeof officeTabLabelMap;

type OfficeTabsProps = {
  activeTab: OfficeTab;
  onChange?: (tab: OfficeTab) => void;
  className?: string;
};

const officeTabs: OfficeTab[] = ["live", "upcoming", "draft", "past"];

export function OfficeTabs({
  activeTab,
  onChange,
  className,
}: OfficeTabsProps) {
  return (
    <SectionNav
      className={className}
      items={officeTabs.map((tab) => officeTabLabelMap[tab])}
      activeItem={officeTabLabelMap[activeTab]}
      onChange={
        onChange
          ? (item) => {
              const nextTab = officeTabs.find(
                (tab) => officeTabLabelMap[tab] === item
              );

              if (nextTab) {
                onChange(nextTab);
              }
            }
          : undefined
      }
    />
  );
}

export type OfficeStatusTab = Extract<
  EventStatus,
  "upcoming" | "live" | "draft" | "past"
>;
