import { OfficeShell } from "@/components/layout/office-shell";
import { OfficeDashboard } from "@/components/office/office-dashboard";

export default function OfficePage() {
  return (
    <OfficeShell
      eyebrow=""
      title="BACK-OFFICE"
      titleClassName="text-heading !font-normal uppercase"
      titleStyle={{ color: "var(--accent-hex)" }}
      descriptionStyle={{ color: "#FFFFFF" }}
      description="Manage live, upcoming, draft, and archived events from one calendar view."
    >
      <OfficeDashboard />
    </OfficeShell>
  );
}
