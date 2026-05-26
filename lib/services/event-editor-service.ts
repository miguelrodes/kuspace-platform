import type {
  BudgetItem,
  EventStatus,
  GuestlistEntry,
  LineupEntry,
  TicketSection,
  TimetableRow,
} from "@/types/event";
import { badRequest, forbidden, notFound } from "@/lib/http/errors";
import { isLockedEventStatus } from "@/lib/event-status";
import {
  budgetUpdateSchema,
  budgetItemMutationSchema,
  coverUpdateSchema,
  guestlistEntryMutationSchema,
  guestlistMutationSchema,
  labelsUpdateSchema,
  lineupEntryMutationSchema,
  lineupUpdateSchema,
  ticketPhaseMutationSchema,
  ticketSectionMutationSchema,
  ticketsUpdateSchema,
  timetableRowMutationSchema,
  timetableUpdateSchema,
} from "@/lib/validation/store";
import { saveEventRepositoryAggregate } from "@/lib/db/repositories/event-repository";
import { requireOwnedRecruiterEventService } from "@/lib/services/access-service";

type OwnedRecruiterEvent = Awaited<ReturnType<typeof requireOwnedRecruiterEventService>>["event"];
type LineupEntryMutationInput = ReturnType<typeof lineUpEntryPayloadFromUnknown>;
type TimetableRowMutationInput = ReturnType<typeof timetableRowPayloadFromUnknown>;
type GuestlistEntryMutationInput = ReturnType<typeof guestlistEntryPayloadFromUnknown>;
type BudgetItemMutationInput = ReturnType<typeof budgetItemPayloadFromUnknown>;
type TicketSectionMutationInput = ReturnType<typeof ticketSectionPayloadFromUnknown>;
type TicketPhaseMutationInput = ReturnType<typeof ticketPhasePayloadFromUnknown>;

function assertEditableEventStatus(status: EventStatus) {
  if (isLockedEventStatus(status)) {
    throw forbidden("Locked events cannot be edited through section update routes.");
  }
}

function resolveCoverRoom(eventRooms: NonNullable<OwnedRecruiterEvent["cover"]["rooms"]>, roomRef: string) {
  return eventRooms.find((room) => room.id === roomRef || room.name === roomRef) ?? null;
}

function getEventRooms(event: OwnedRecruiterEvent) {
  return event.cover.rooms ?? [];
}

function getEventAccessGroupIds(event: OwnedRecruiterEvent) {
  return new Set((event.guestlist.accessGroups ?? []).map((group) => group.id));
}

function assertValidAccessGroupId(event: OwnedRecruiterEvent, accessGroupId: string) {
  if (!getEventAccessGroupIds(event).has(accessGroupId)) {
    throw badRequest("Access group must reference an existing event access group.");
  }
}

function normalizeLineupEntryRooms(
  event: OwnedRecruiterEvent,
  entry: LineupEntryMutationInput & { id: string },
): LineupEntry {
  const eventRooms = getEventRooms(event);
  const roomRefs = [...new Set([...(entry.roomIds ?? []), ...(entry.roomId ? [entry.roomId] : [])].filter(Boolean))];

  const roomIds = roomRefs.map((roomRef) => {
    const room = resolveCoverRoom(eventRooms, roomRef);
    if (!room) {
      throw badRequest("Lineup room assignments must reference existing cover rooms.");
    }

    return room.id;
  });

  return {
    ...entry,
    roomIds: roomIds.length > 0 ? roomIds : undefined,
    roomId: roomIds[0] ?? undefined,
  };
}

function normalizeTimetableRows(rows: TimetableRow[]) {
  return [...rows]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((row, index) => ({
      ...row,
      sortOrder: index,
    }));
}

function assertTimetableLineupReference(
  event: OwnedRecruiterEvent,
  lineupEntryId?: string,
) {
  if (!lineupEntryId) {
    return;
  }

  const entryExists = event.lineup.entries.some((entry) => entry.id === lineupEntryId);
  if (!entryExists) {
    throw badRequest("Timetable lineup references must point to an existing lineup entry.");
  }
}

function normalizeTimetableRow(
  event: OwnedRecruiterEvent,
  row: TimetableRowMutationInput & { id: string },
  fallbackSortOrder: number,
): TimetableRow {
  assertTimetableLineupReference(event, row.lineupEntryId);

  const eventRooms = getEventRooms(event);
  let normalizedRoom: string | undefined;

  if (row.room) {
    const room = resolveCoverRoom(eventRooms, row.room);
    if (!room) {
      throw badRequest("Timetable room references must match an existing cover room.");
    }

    normalizedRoom = room.id;
  }

  return {
    ...row,
    room: normalizedRoom,
    lineupEntryId: row.lineupEntryId || undefined,
    notes: row.notes || undefined,
    sortOrder: row.sortOrder ?? fallbackSortOrder,
  };
}

function lineUpEntryPayloadFromUnknown(payload: unknown) {
  return lineupEntryMutationSchema.parse(payload).entry;
}

function timetableRowPayloadFromUnknown(payload: unknown) {
  return timetableRowMutationSchema.parse(payload).row;
}

function guestlistEntryPayloadFromUnknown(payload: unknown) {
  return guestlistEntryMutationSchema.parse(payload).entry;
}

function budgetItemPayloadFromUnknown(payload: unknown) {
  return budgetItemMutationSchema.parse(payload).item;
}

function ticketSectionPayloadFromUnknown(payload: unknown) {
  return ticketSectionMutationSchema.parse(payload).section;
}

function ticketPhasePayloadFromUnknown(payload: unknown) {
  return ticketPhaseMutationSchema.parse(payload).phase;
}

function normalizeGuestlistEntry(
  event: OwnedRecruiterEvent,
  entry: GuestlistEntryMutationInput & { id: string },
): GuestlistEntry {
  assertValidAccessGroupId(event, entry.accessGroupId);

  if (entry.source === "user") {
    return {
      id: entry.id,
      source: "user",
      accessGroupId: entry.accessGroupId,
      userId: entry.userId,
      checkedIn: entry.checkedIn ?? false,
      createdAt: entry.createdAt ?? new Date().toISOString(),
    };
  }

  return {
    id: entry.id,
    source: "manual",
    accessGroupId: entry.accessGroupId,
    firstName: entry.firstName,
    lastName: entry.lastName,
    userId: entry.userId || undefined,
    checkedIn: entry.checkedIn ?? false,
    createdAt: entry.createdAt ?? new Date().toISOString(),
    notes: entry.notes || undefined,
  };
}

function normalizeBudgetItems(items: BudgetItem[]) {
  return [...items];
}

function normalizeBudgetItem(item: BudgetItemMutationInput & { id: string }): BudgetItem {
  return {
    id: item.id,
    category: item.category,
    title: item.title,
    amount: item.amount,
    paid: item.paid,
    notes: item.notes || undefined,
  };
}

function normalizeTicketSection(event: OwnedRecruiterEvent, section: TicketSectionMutationInput & { id: string }): TicketSection {
  assertValidAccessGroupId(event, section.accessGroupId);
  const accessGroupIds = getEventAccessGroupIds(event);

  const allowedGroupIds = section.visibility === "restricted"
    ? [...new Set(section.allowedGroupIds.filter((id) => accessGroupIds.has(id)))]
    : [];

  if (section.visibility === "restricted" && allowedGroupIds.length === 0) {
    throw badRequest("Restricted ticket sections must allow at least one access group.");
  }

  if (section.allowedGroupIds.some((id) => !accessGroupIds.has(id))) {
    throw badRequest("Allowed groups must reference existing event access groups.");
  }

  return {
    id: section.id,
    name: section.name,
    visibility: section.visibility,
    accessGroupId: section.accessGroupId,
    allowedGroupIds,
    phases: (section.phases ?? []).map((phase, index) => ({
      ...phase,
      id: phase.id || `ticket-phase-${crypto.randomUUID()}`,
      sortOrder: phase.sortOrder ?? index,
    })),
  };
}

function normalizeTicketPhase(
  section: TicketSection,
  phase: TicketPhaseMutationInput & { id: string },
): TicketSection["phases"][number] {
  if (phase.quantitySold && phase.quantitySold > phase.quantityAvailable) {
    throw badRequest("Ticket phase sold quantity cannot exceed quantity available.");
  }

  if (phase.price < 0) {
    throw badRequest("Ticket phase price cannot be negative.");
  }

  if (phase.releaseMode === "scheduled" && !phase.salesStart) {
    throw badRequest("Scheduled ticket phases must include a sales start date.");
  }

  if (phase.releaseMode === "after_previous_sold_out" && !phase.releaseAfterTierId) {
    throw badRequest("Chained ticket phases must reference a previous tier.");
  }

  if (phase.releaseAfterTierId === phase.id) {
    throw badRequest("Ticket phases cannot release after themselves.");
  }

  if (phase.releaseAfterTierId && !section.phases.some((existingPhase) => existingPhase.id === phase.releaseAfterTierId)) {
    throw badRequest("Release-after tier must reference an existing phase in the same section.");
  }

  if (phase.status === "sold_out" && (phase.quantitySold ?? 0) < phase.quantityAvailable) {
    throw badRequest("Sold-out ticket phases must have sold quantity equal to quantity available.");
  }

  if (phase.salesStart && phase.salesEnd && phase.salesStart > phase.salesEnd) {
    throw badRequest("Ticket phase sales end must be after sales start.");
  }

  return {
    id: phase.id,
    name: phase.name,
    price: phase.price,
    quantityAvailable: phase.quantityAvailable,
    quantitySold: phase.quantitySold ?? 0,
    visibility: phase.visibility,
    status: phase.status,
    sortOrder: phase.sortOrder ?? section.phases.length,
    salesStart: phase.salesStart || undefined,
    salesEnd: phase.salesEnd || undefined,
    releaseMode: phase.releaseMode ?? "manual",
    releaseAfterTierId: phase.releaseAfterTierId || undefined,
  };
}

export async function getOwnedEventEditorAggregateService(eventId: string) {
  const { event } = await requireOwnedRecruiterEventService(eventId, "load");
  return event;
}

export async function updateEventCoverService(eventId: string, payload: unknown) {
  const { event } = await requireOwnedRecruiterEventService(eventId, "update");
  assertEditableEventStatus(event.status);
  const { cover, slug, admissionMode } = coverUpdateSchema.parse(payload);
  return saveEventRepositoryAggregate({
    ...event,
    slug: slug?.trim() ? slug : event.slug,
    admissionMode: admissionMode ?? event.admissionMode,
    cover,
  });
}

export async function updateEventLineupService(eventId: string, payload: unknown) {
  const { event } = await requireOwnedRecruiterEventService(eventId, "update");
  assertEditableEventStatus(event.status);
  const { lineup } = lineupUpdateSchema.parse(payload);
  return saveEventRepositoryAggregate({
    ...event,
    lineup: {
      ...lineup,
      entries: lineup.entries.map((entry) => normalizeLineupEntryRooms(event, { ...entry, id: entry.id })),
    },
  });
}

export async function updateEventTimetableService(eventId: string, payload: unknown) {
  const { event } = await requireOwnedRecruiterEventService(eventId, "update");
  assertEditableEventStatus(event.status);
  const { timetable } = timetableUpdateSchema.parse(payload);
  return saveEventRepositoryAggregate({
    ...event,
    timetable: {
      ...timetable,
      rows: normalizeTimetableRows(
        timetable.rows.map((row, index) => normalizeTimetableRow(event, { ...row, id: row.id }, row.sortOrder ?? index)),
      ),
    },
  });
}

export async function updateEventGuestlistService(eventId: string, payload: unknown) {
  const { event } = await requireOwnedRecruiterEventService(eventId, "update");
  assertEditableEventStatus(event.status);
  const { guestlist } = guestlistMutationSchema.parse(payload);
  return saveEventRepositoryAggregate({
    ...event,
    guestlist: {
      ...guestlist,
      entries: guestlist.entries.map((entry) => normalizeGuestlistEntry(event, { ...entry, id: entry.id })),
    },
  });
}

export async function updateEventBudgetService(eventId: string, payload: unknown) {
  const { event } = await requireOwnedRecruiterEventService(eventId, "update");
  assertEditableEventStatus(event.status);
  const { budget } = budgetUpdateSchema.parse(payload);
  return saveEventRepositoryAggregate({
    ...event,
    budget: {
      ...budget,
      items: normalizeBudgetItems(budget.items),
    },
  });
}

export async function updateEventTicketsService(eventId: string, payload: unknown) {
  const { event } = await requireOwnedRecruiterEventService(eventId, "update");
  assertEditableEventStatus(event.status);
  const { tickets } = ticketsUpdateSchema.parse(payload);
  return saveEventRepositoryAggregate({
    ...event,
    tickets: {
      ...tickets,
      sections: (tickets.sections ?? []).map((section) => normalizeTicketSection(event, { ...section, id: section.id })),
    },
  });
}

export async function updateEventLabelsService(eventId: string, payload: unknown) {
  const { event } = await requireOwnedRecruiterEventService(eventId, "update");
  assertEditableEventStatus(event.status);
  const { labels } = labelsUpdateSchema.parse(payload);
  return saveEventRepositoryAggregate({ ...event, labels });
}

export async function upsertEventBudgetItemService(eventId: string, payload: unknown) {
  const { event } = await requireOwnedRecruiterEventService(eventId, "update");
  assertEditableEventStatus(event.status);
  const itemPayload = budgetItemPayloadFromUnknown(payload);
  const item = normalizeBudgetItem({
    ...itemPayload,
    id: itemPayload.id || `budget-item-${crypto.randomUUID()}`,
  });
  const nextItems = (event.budget.items ?? []).some((candidate) => candidate.id === item.id)
    ? event.budget.items.map((candidate) => (candidate.id === item.id ? item : candidate))
    : [...event.budget.items, item];

  return saveEventRepositoryAggregate({
    ...event,
    budget: {
      ...event.budget,
      items: nextItems,
    },
  });
}

export async function upsertEventTicketSectionService(eventId: string, payload: unknown) {
  const { event } = await requireOwnedRecruiterEventService(eventId, "update");
  assertEditableEventStatus(event.status);
  const sectionPayload = ticketSectionPayloadFromUnknown(payload);
  const existingSection = (event.tickets.sections ?? []).find((candidate) => candidate.id === sectionPayload.id);
  const section = normalizeTicketSection(event, {
    ...sectionPayload,
    id: sectionPayload.id || `ticket-section-${crypto.randomUUID()}`,
    phases: sectionPayload.phases ?? existingSection?.phases ?? [],
  });
  const nextSections = (event.tickets.sections ?? []).some((candidate) => candidate.id === section.id)
    ? (event.tickets.sections ?? []).map((candidate) => (candidate.id === section.id ? section : candidate))
    : [...(event.tickets.sections ?? []), section];

  return saveEventRepositoryAggregate({
    ...event,
    tickets: {
      ...event.tickets,
      sections: nextSections,
    },
  });
}

export async function upsertEventTicketPhaseService(eventId: string, sectionId: string, payload: unknown) {
  const { event } = await requireOwnedRecruiterEventService(eventId, "update");
  assertEditableEventStatus(event.status);
  const section = (event.tickets.sections ?? []).find((candidate) => candidate.id === sectionId);

  if (!section) {
    throw notFound("Ticket section not found");
  }

  const phasePayload = ticketPhasePayloadFromUnknown(payload);
  const phase = normalizeTicketPhase(section, {
    ...phasePayload,
    id: phasePayload.id || `ticket-phase-${crypto.randomUUID()}`,
  });

  const nextSections = (event.tickets.sections ?? []).map((candidate) =>
    candidate.id !== sectionId
      ? candidate
      : {
          ...candidate,
          phases: candidate.phases.some((existingPhase) => existingPhase.id === phase.id)
            ? candidate.phases.map((existingPhase) => (existingPhase.id === phase.id ? phase : existingPhase))
            : [...candidate.phases, phase],
        },
  );

  return saveEventRepositoryAggregate({
    ...event,
    tickets: {
      ...event.tickets,
      sections: nextSections,
    },
  });
}

export async function createEventLineupEntryService(eventId: string, payload: unknown) {
  const { event } = await requireOwnedRecruiterEventService(eventId, "update");
  assertEditableEventStatus(event.status);
  const entryPayload = lineUpEntryPayloadFromUnknown(payload);
  const entry = normalizeLineupEntryRooms(event, {
    ...entryPayload,
    id: entryPayload.id || `lineup-entry-${crypto.randomUUID()}`,
  });

  if (event.lineup.entries.some((candidate) => candidate.id === entry.id)) {
    throw badRequest("Lineup entry already exists.");
  }

  return saveEventRepositoryAggregate({
    ...event,
    lineup: {
      ...event.lineup,
      entries: [...event.lineup.entries, entry],
    },
  });
}

export async function updateEventLineupEntryService(eventId: string, entryId: string, payload: unknown) {
  const { event } = await requireOwnedRecruiterEventService(eventId, "update");
  assertEditableEventStatus(event.status);
  const entryPayload = lineUpEntryPayloadFromUnknown(payload);
  const existingEntry = event.lineup.entries.find((candidate) => candidate.id === entryId);

  if (!existingEntry) {
    throw notFound("Lineup entry not found");
  }

  const entry = normalizeLineupEntryRooms(event, {
    ...existingEntry,
    ...entryPayload,
    id: entryId,
  });

  return saveEventRepositoryAggregate({
    ...event,
    lineup: {
      ...event.lineup,
      entries: event.lineup.entries.map((candidate) => (candidate.id === entryId ? entry : candidate)),
    },
  });
}

export async function deleteEventLineupEntryService(eventId: string, entryId: string) {
  const { event } = await requireOwnedRecruiterEventService(eventId, "delete");
  assertEditableEventStatus(event.status);

  if (!event.lineup.entries.some((candidate) => candidate.id === entryId)) {
    throw notFound("Lineup entry not found");
  }

  return saveEventRepositoryAggregate({
    ...event,
    lineup: {
      ...event.lineup,
      entries: event.lineup.entries.filter((candidate) => candidate.id !== entryId),
    },
    timetable: {
      ...event.timetable,
      rows: event.timetable.rows.map((row) =>
        row.lineupEntryId === entryId
          ? { ...row, lineupEntryId: undefined }
          : row,
      ),
    },
  });
}

export async function createEventTimetableRowService(eventId: string, payload: unknown) {
  const { event } = await requireOwnedRecruiterEventService(eventId, "update");
  assertEditableEventStatus(event.status);
  const rowPayload = timetableRowPayloadFromUnknown(payload);
  const row = normalizeTimetableRow(event, {
    ...rowPayload,
    id: rowPayload.id || `timetable-row-${crypto.randomUUID()}`,
  }, event.timetable.rows.length);

  if (event.timetable.rows.some((candidate) => candidate.id === row.id)) {
    throw badRequest("Timetable row already exists.");
  }

  const nextRows = normalizeTimetableRows([...event.timetable.rows, row]);

  return saveEventRepositoryAggregate({
    ...event,
    timetable: {
      ...event.timetable,
      rows: nextRows,
    },
  });
}

export async function updateEventTimetableRowService(eventId: string, rowId: string, payload: unknown) {
  const { event } = await requireOwnedRecruiterEventService(eventId, "update");
  assertEditableEventStatus(event.status);
  const rowPayload = timetableRowPayloadFromUnknown(payload);
  const existingRow = event.timetable.rows.find((candidate) => candidate.id === rowId);

  if (!existingRow) {
    throw notFound("Timetable row not found");
  }

  const row = normalizeTimetableRow(event, {
    ...existingRow,
    ...rowPayload,
    id: rowId,
  }, existingRow.sortOrder);

  const nextRows = normalizeTimetableRows(
    event.timetable.rows.map((candidate) => (candidate.id === rowId ? row : candidate)),
  );

  return saveEventRepositoryAggregate({
    ...event,
    timetable: {
      ...event.timetable,
      rows: nextRows,
    },
  });
}

export async function deleteEventTimetableRowService(eventId: string, rowId: string) {
  const { event } = await requireOwnedRecruiterEventService(eventId, "delete");
  assertEditableEventStatus(event.status);

  if (!event.timetable.rows.some((candidate) => candidate.id === rowId)) {
    throw notFound("Timetable row not found");
  }

  const nextRows = normalizeTimetableRows(
    event.timetable.rows.filter((candidate) => candidate.id !== rowId),
  );

  return saveEventRepositoryAggregate({
    ...event,
    timetable: {
      ...event.timetable,
      rows: nextRows,
    },
  });
}

export async function createEventGuestlistEntryService(eventId: string, payload: unknown) {
  const { event } = await requireOwnedRecruiterEventService(eventId, "update");
  assertEditableEventStatus(event.status);
  const entryPayload = guestlistEntryPayloadFromUnknown(payload);
  const entry = normalizeGuestlistEntry(event, {
    ...entryPayload,
    id: entryPayload.id || `guestlist-entry-${crypto.randomUUID()}`,
  });

  if (event.guestlist.entries.some((candidate) => candidate.id === entry.id)) {
    throw badRequest("Guestlist entry already exists.");
  }

  return saveEventRepositoryAggregate({
    ...event,
    guestlist: {
      ...event.guestlist,
      entries: [...event.guestlist.entries, entry],
    },
  });
}

export async function updateEventGuestlistEntryService(eventId: string, entryId: string, payload: unknown) {
  const { event } = await requireOwnedRecruiterEventService(eventId, "update");
  assertEditableEventStatus(event.status);
  const existingEntry = event.guestlist.entries.find((candidate) => candidate.id === entryId);

  if (!existingEntry) {
    throw notFound("Guestlist entry not found");
  }

  const entryPayload = guestlistEntryPayloadFromUnknown(payload);
  const entry = normalizeGuestlistEntry(event, {
    ...existingEntry,
    ...entryPayload,
    id: entryId,
  });

  return saveEventRepositoryAggregate({
    ...event,
    guestlist: {
      ...event.guestlist,
      entries: event.guestlist.entries.map((candidate) => (candidate.id === entryId ? entry : candidate)),
    },
  });
}

export async function deleteEventGuestlistEntryService(eventId: string, entryId: string) {
  const { event } = await requireOwnedRecruiterEventService(eventId, "delete");
  assertEditableEventStatus(event.status);
  const existingEntry = event.guestlist.entries.find((candidate) => candidate.id === entryId);

  if (!existingEntry) {
    throw notFound("Guestlist entry not found");
  }

  if (existingEntry.checkedIn) {
    throw forbidden("Checked-in guestlist entries cannot be deleted.");
  }

  return saveEventRepositoryAggregate({
    ...event,
    guestlist: {
      ...event.guestlist,
      entries: event.guestlist.entries.filter((candidate) => candidate.id !== entryId),
    },
  });
}

export async function deleteEventBudgetItemService(eventId: string, itemId: string) {
  const { event } = await requireOwnedRecruiterEventService(eventId, "delete");
  assertEditableEventStatus(event.status);

  if (!event.budget.items.some((candidate) => candidate.id === itemId)) {
    throw notFound("Budget item not found");
  }

  return saveEventRepositoryAggregate({
    ...event,
    budget: {
      ...event.budget,
      items: event.budget.items.filter((candidate) => candidate.id !== itemId),
    },
  });
}

export async function deleteEventTicketSectionService(eventId: string, sectionId: string) {
  const { event } = await requireOwnedRecruiterEventService(eventId, "delete");
  assertEditableEventStatus(event.status);
  const section = (event.tickets.sections ?? []).find((candidate) => candidate.id === sectionId);

  if (!section) {
    throw notFound("Ticket section not found");
  }

  const hasHistoricalPhases = section.phases.some((phase) => phase.status === "sold_out" || (phase.quantitySold ?? 0) > 0);
  if (hasHistoricalPhases) {
    throw forbidden("Ticket sections with sold or sold-out phases cannot be deleted.");
  }

  return saveEventRepositoryAggregate({
    ...event,
    tickets: {
      ...event.tickets,
      sections: (event.tickets.sections ?? []).filter((candidate) => candidate.id !== sectionId),
    },
  });
}

export async function deleteEventTicketPhaseService(eventId: string, sectionId: string, phaseId: string) {
  const { event } = await requireOwnedRecruiterEventService(eventId, "delete");
  assertEditableEventStatus(event.status);
  const section = (event.tickets.sections ?? []).find((candidate) => candidate.id === sectionId);

  if (!section) {
    throw notFound("Ticket section not found");
  }

  const phase = section.phases.find((candidate) => candidate.id === phaseId);
  if (!phase) {
    throw notFound("Ticket phase not found");
  }

  if (phase.status === "sold_out" || (phase.quantitySold ?? 0) > 0) {
    throw forbidden("Sold or sold-out ticket phases cannot be deleted.");
  }

  const nextSections = (event.tickets.sections ?? []).map((candidate) =>
    candidate.id !== sectionId
      ? candidate
      : {
          ...candidate,
          phases: candidate.phases
            .filter((existingPhase) => existingPhase.id !== phaseId)
            .map((existingPhase, index) => ({
              ...existingPhase,
              sortOrder: index,
              releaseAfterTierId: existingPhase.releaseAfterTierId === phaseId ? undefined : existingPhase.releaseAfterTierId,
            })),
        },
  );

  return saveEventRepositoryAggregate({
    ...event,
    tickets: {
      ...event.tickets,
      sections: nextSections,
    },
  });
}
