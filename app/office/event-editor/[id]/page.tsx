import { OfficeShell } from "@/components/layout/office-shell";
import { EventEditorShell } from "@/components/editor/event-editor-shell";

type EditEventEditorPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditEventEditorPage({
  params,
}: EditEventEditorPageProps) {
  const { id } = await params;

  return (
    <OfficeShell
      eyebrow=""
      title=""
    >
      <EventEditorShell mode="edit" eventId={id} />
    </OfficeShell>
  );
}
