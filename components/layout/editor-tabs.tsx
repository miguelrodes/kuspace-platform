"use client";

import { SectionNav } from "@/components/ui/section-nav";
import type { EditorTab } from "@/types/event";

const editorTabLabelMap: Record<EditorTab, string> = {
  cover: "Cover",
  lineup: "Lineup",
  timetable: "Timetable",
  guestlist: "Guestlist",
  budget: "Costs",
  tickets: "Tickets",
};

const editorTabs: EditorTab[] = [
  "cover",
  "lineup",
  "timetable",
  "guestlist",
  "budget",
  "tickets",
];

type EditorTabsProps = {
  activeTab: EditorTab;
  onChange?: (tab: EditorTab) => void;
  className?: string;
};

export function EditorTabs({
  activeTab,
  onChange,
  className,
}: EditorTabsProps) {
  return (
    <SectionNav
      className={className}
      itemClassName="text-body-lg"
      items={editorTabs.map((tab) => editorTabLabelMap[tab])}
      activeItem={editorTabLabelMap[activeTab]}
      onChange={
        onChange
          ? (item) => {
              const nextTab = editorTabs.find(
                (tab) => editorTabLabelMap[tab] === item
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
