"use client";

import type { EditorTab } from "@/types/event";
import { EditorTabs } from "@/components/layout/editor-tabs";

type EditorTabNavProps = {
  activeTab: EditorTab;
  onChange: (tab: EditorTab) => void;
};

export function EditorTabNav({ activeTab, onChange }: EditorTabNavProps) {
  return <EditorTabs activeTab={activeTab} onChange={onChange} />;
}
