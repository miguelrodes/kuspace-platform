import { OfficeShell } from "@/components/layout/office-shell";
import { EventEditorShell } from "@/components/editor/event-editor-shell";

export default function NewEventEditorPage() {
  return (
    <OfficeShell
      eyebrow=""
      title=""
    >
      <EventEditorShell mode="new" />
    </OfficeShell>
  );
}
