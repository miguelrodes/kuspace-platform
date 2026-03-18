import { OfficeShell } from "@/components/layout/office-shell";
import { OfficeTabs } from "@/components/layout/office-tabs";
import { defaultOfficeStatus } from "@/lib/mock-data";

export default function OfficePage() {
  return (
    <OfficeShell
      eyebrow="Recruiter Office"
      title="Office"
      description="Recruiter workspace scaffold for the calendar, event sections, and primary New Event action."
      tabs={<OfficeTabs activeTab={defaultOfficeStatus} />}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Recruiter office dashboard scaffold. Upcoming / Live / Draft / Past stay as internal UI sections, not routes. */}
        <div className="rounded-[var(--radius-surface)] border border-border bg-panel p-4">
          <p className="text-body-sm uppercase tracking-widerish text-muted">
            Office Sections
          </p>
          <p className="mt-2 text-body text-muted">
            Internal office UI should organize events into Upcoming, Live,
            Draft, and Past sections.
          </p>
        </div>
      </div>
    </OfficeShell>
  );
}
