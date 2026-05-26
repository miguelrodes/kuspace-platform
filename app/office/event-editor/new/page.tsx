import { OfficeShell } from "@/components/layout/office-shell";
import { EventEditorShell } from "@/components/editor/event-editor-shell";
import { requireOfficeRecruiterNavigation } from "@/lib/auth/office-navigation";
import { getCurrentAppActorService } from "@/lib/services/auth-actor-service";

export default async function NewEventEditorPage() {
  const actor = await getCurrentAppActorService();
  requireOfficeRecruiterNavigation(actor);

  return (
    <OfficeShell
      eyebrow=""
      title=""
    >
      <EventEditorShell mode="new" />
    </OfficeShell>
  );
}
