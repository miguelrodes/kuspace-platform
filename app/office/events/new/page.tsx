import { EditorTabs } from "@/components/layout/editor-tabs";
import { OfficeShell } from "@/components/layout/office-shell";
import { requireOfficeRecruiterNavigation } from "@/lib/auth/office-navigation";
import { getCurrentAppActorService } from "@/lib/services/auth-actor-service";
import type { EditorTab } from "@/types/event";

const defaultTab: EditorTab = "cover";

export default async function NewEventPage() {
  const actor = await getCurrentAppActorService();
  requireOfficeRecruiterNavigation(actor);

  return (
    <OfficeShell
      eyebrow="Event Editor"
      title="New Event"
      description="Create-mode event editor scaffold with a shared editor shell and internal tab state."
      tabs={<EditorTabs activeTab={defaultTab} />}
    >
      <div className="mx-auto max-w-5xl space-y-4">
        {/* Recruiter event editor scaffold in create mode. Editor tabs remain internal UI state, defaulting to cover. */}
        <p className="text-body text-muted">
          Create-mode event editor scaffold. Default tab:{" "}
          <code>{defaultTab}</code>.
        </p>
      </div>
    </OfficeShell>
  );
}
