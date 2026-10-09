"use client";

import { useAppStore } from "@/lib/app-store";
import { OfficeShell } from "@/components/layout/office-shell";
import { OfficeDashboard } from "@/components/office/office-dashboard";
import { EventEditorShell } from "@/components/editor/event-editor-shell";

export function SandboxOffice({ path }: { path: string[] }) {
  const { isBootstrapped, currentRole, events, users } =
    useAppStore();
  if (!isBootstrapped)
    return <p className="text-muted p-6">Loading your demo...</p>;
  if (currentRole !== "recruiter")
    return (
      <OfficeShell title="Organiser demo">
        <p>
          Choose the organiser role to manage events.{" "}
          <a className="underline" href="/">
            Choose a demo
          </a>
        </p>
      </OfficeShell>
    );
  if (!path.length)
    return (
      <OfficeShell
        title=""
        eyebrow=""
        descriptionClassName="office-content-reveal"
        description="Manage live, upcoming, draft, and archived events for this nightclub from one calendar view."
      >
        <OfficeDashboard />
      </OfficeShell>
    );
  const [section, id, action] = path;
  const editor =
    (section === "event-editor" && path.length === 2) ||
    (section === "events" && (action === "edit" || id === "new"));
  const event = events.find((item) => item.id === id);
  if (editor && id === "new")
    return (
      <OfficeShell title="" eyebrow="">
        <EventEditorShell mode="new" />
      </OfficeShell>
    );
  if (editor && event)
    return (
      <OfficeShell title="" eyebrow="">
        <EventEditorShell key={event.id} mode="edit" eventId={event.id} />
      </OfficeShell>
    );
  if (section === "events" && action === "attendees" && event)
    return (
      <OfficeShell
        title={event.cover.title + " Attendees"}
        description="Synthetic demo attendance, including your local changes. No real orders or payments."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="p-3">Attendee</th>
                <th>Access group</th>
                <th>Payment state</th>
                <th>Checked in</th>
              </tr>
            </thead>
            <tbody>
              {event.accessAssignments.map((assignment, index) => {
                const user = users.find(
                  (item) => item.id === assignment.userId,
                );
                return (
                  <tr key={index} className="border-border border-t">
                    <td className="p-3">
                      {user
                        ? user.firstName + " " + user.lastName
                        : "Demo attendee"}
                    </td>
                    <td>
                      {
                        event.guestlist.accessGroups.find(
                          (group) => group.id === assignment.accessGroupId,
                        )?.name
                      }
                    </td>
                    <td>{assignment.paymentState}</td>
                    <td>{assignment.checkedIn ? "Yes" : "No"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </OfficeShell>
    );
  return (
    <OfficeShell title="Event unavailable">
      <p>
        This event is not owned by the active workspace, or this demo page is
        unavailable. Switch workspace to manage its events.
      </p>
    </OfficeShell>
  );
}
