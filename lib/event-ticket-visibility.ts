import type { Event, EventAccessAssignment, TicketSection } from "@/types/event";

export function canUserSeeTicketSection(
  section: Pick<TicketSection, "visibility" | "allowedGroupIds">,
  assignment?: Pick<EventAccessAssignment, "accessGroupId">,
) {
  if (section.visibility === "hidden") {
    return false;
  }

  if (section.visibility === "public") {
    return true;
  }

  if (!assignment) {
    return false;
  }

  return section.allowedGroupIds.includes(assignment.accessGroupId);
}

export function getVisibleTicketSectionsForAssignment(
  event: Pick<Event, "admissionMode" | "tickets">,
  assignment?: Pick<EventAccessAssignment, "accessGroupId">,
) {
  if (event.admissionMode === "curated" && !assignment) {
    return [];
  }

  return (event.tickets.sections ?? []).filter(
    (section) => section.phases.length > 0 && canUserSeeTicketSection(section, assignment),
  );
}
