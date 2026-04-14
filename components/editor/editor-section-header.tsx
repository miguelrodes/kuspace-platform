import type { ReactNode } from "react";
import { EditorSectionTitle } from "@/components/editor/editor-section-title";

type EditorSectionHeaderProps = {
  title: string;
  actions?: ReactNode;
};

export function EditorSectionHeader({ title, actions }: EditorSectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <EditorSectionTitle>{title}</EditorSectionTitle>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
