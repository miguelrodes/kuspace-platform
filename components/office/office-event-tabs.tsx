"use client";

import { SectionNav } from "@/components/ui/section-nav";

export type OfficeListTab = "live" | "upcoming" | "draft" | "past";

const officeListTabLabelMap: Record<OfficeListTab, string> = {
  live: "Live",
  upcoming: "Upcoming",
  draft: "Draft",
  past: "Past",
};

const officeListTabs: OfficeListTab[] = ["live", "upcoming", "draft", "past"];

type OfficeEventTabsProps = {
  activeTab: OfficeListTab;
  onChange: (tab: OfficeListTab) => void;
  className?: string;
};

export function OfficeEventTabs({
  activeTab,
  onChange,
  className,
}: OfficeEventTabsProps) {
  return (
    <SectionNav
      className={className ?? "[&>ul]:gap-3 xl:[&>ul]:gap-8"}
      itemClassName="text-body"
      items={officeListTabs.map((tab) => officeListTabLabelMap[tab])}
      activeItem={officeListTabLabelMap[activeTab]}
      onChange={(item) => {
        const nextTab = officeListTabs.find(
          (tab) => officeListTabLabelMap[tab] === item,
        );

        if (nextTab) {
          onChange(nextTab);
        }
      }}
    />
  );
}

export function getOfficeListTabLabel(tab: OfficeListTab) {
  return officeListTabLabelMap[tab];
}
