import { EditorTabs } from "@/components/layout/editor-tabs";
import { OfficeShell } from "@/components/layout/office-shell";
import { requireOfficeRecruiterNavigation } from "@/lib/auth/office-navigation";
import { getCurrentAppActorService } from "@/lib/services/auth-actor-service";
import type { EditorTab } from "@/types/event";

const defaultTab: EditorTab = "cover";

type EditEventPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditEventPage({ params }: EditEventPageProps) {
  const actor = await getCurrentAppActorService();
  requireOfficeRecruiterNavigation(actor);

  const { id } = await params;

  return (
    <OfficeShell
      eyebrow="Event Editor"
      title="Edit Event"
      description="Edit-mode event editor scaffold with the same shared shell and tab strip as create mode."
      tabs={<EditorTabs activeTab={defaultTab} />}
    >
      <div className="mx-auto max-w-5xl space-y-4">
        {/* Recruiter event editor scaffold in edit mode. Editor tabs remain internal UI state, defaulting to cover. */}
        <p className="text-body text-muted">
          Edit-mode event editor scaffold for <code>{id}</code>. Default tab:{" "}
          <code>{defaultTab}</code>.
        </p>
      </div>
    </OfficeShell>
  );
}
