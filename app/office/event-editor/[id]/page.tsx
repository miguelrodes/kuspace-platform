import { OfficeShell } from "@/components/layout/office-shell";
import { EventEditorShell } from "@/components/editor/event-editor-shell";
import { requireOfficeRecruiterNavigation } from "@/lib/auth/office-navigation";
import { getCurrentAppActorService } from "@/lib/services/auth-actor-service";

type EditEventEditorPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditEventEditorPage({
  params,
}: EditEventEditorPageProps) {
  const actor = await getCurrentAppActorService();
  requireOfficeRecruiterNavigation(actor);

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
