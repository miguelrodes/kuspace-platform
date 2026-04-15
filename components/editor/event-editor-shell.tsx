"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Event, EditorTab, EventStatus } from "@/types/event";
import { createDraftEventSeed } from "@/lib/mock-data";
import { resolveManualAssignmentPaymentState } from "@/lib/event-access";
import { isLockedEventStatus } from "@/lib/event-status";
import { useMockEventsStore } from "@/lib/mock-store";
import { EventEditorHeader } from "@/components/editor/event-editor-header";
import { EditorTabNav } from "@/components/editor/editor-tab-nav";
import { EditorActionBar } from "@/components/editor/editor-action-bar";
import { ConfirmDialog, DIALOG_ACTION_CLASS, DIALOG_TITLE_CLASS } from "@/components/ui/action-dialog";
import {
  CoverTab,
  type CoverFormState,
  type RoomDraft,
} from "@/components/editor/cover-tab";
import {
  LineupTab,
  type LineupFormState,
} from "@/components/editor/lineup-tab";
import {
  TimetableTab,
  type TimetableFormState,
  type TimetableRowDraft,
  type TimetableRowErrors,
} from "@/components/editor/timetable-tab";
import {
  GuestlistTab,
  type GuestlistFormState,
} from "@/components/editor/guestlist-tab";
import {
  BudgetTab,
  type BudgetFormState,
} from "@/components/editor/budget-tab";
import {
  TicketsTab,
  type TicketsFormState,
  buildInitialTicketsState,
  createEmptyTicketsState,
  buildEventTicketsPatch,
} from "@/components/editor/tickets-tab";
import type {
  ArtistProfile,
  EventAccessAssignment,
  EventApplication,
  LineupEntry,
} from "@/types/event";
import type { ConsumerUser } from "@/types/user";

type EventEditorShellProps =
  | {
      mode: "new";
    }
  | {
      mode: "edit";
      eventId: string;
    };

type CoverFieldErrors = Partial<
  Record<"title" | "date" | "location" | "genres", string>
>;

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeRoomAssignment(value: string[] | string | undefined): string[] {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return [value];
  }

  return [];
}

function buildInitialRooms(event: Event): RoomDraft[] {
  if (event.cover.rooms?.length) {
    return event.cover.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      capacity: String(room.capacity),
      genres: room.genres ?? [],
    }));
  }

  return Array.from({ length: event.cover.numberOfRooms ?? 0 }, (_, index) => ({
    id: `room-${index + 1}`,
    name: `Room ${index + 1}`,
    capacity: "",
    genres: [],
  }));
}

function buildInitialLineupState(
  event: Event,
  artists: ArtistProfile[],
): LineupFormState {
  return {
    displayMode: event.lineup.displayMode ?? "event",
    selectedArtists: event.lineup.entries.map((entry) => {
      const existingArtist = artists.find((artist) => artist.id === entry.artistId);

      return (
        existingArtist ?? {
          id: entry.artistId,
          name: entry.name,
        }
      );
    }),
    manualInput: "",
    libraryQuery: "",
    roomAssignments: Object.fromEntries(
      event.lineup.entries.map((entry) => [
        entry.artistId,
        entry.roomIds ?? (entry.roomId ? [entry.roomId] : []),
      ]),
    ),
  };
}

function buildInitialTimetableState(event: Event): TimetableFormState {
  return {
    startTime: event.timetable.startTime ?? event.cover.time?.start ?? "",
    endTime: event.timetable.endTime ?? event.cover.time?.end ?? "",
    rows: event.timetable.rows.map((row) => ({
      id: row.id,
      title: row.title,
      lineupEntryId: row.lineupEntryId ?? "",
      room: row.room ?? "",
      notes: row.notes ?? "",
      startTime: row.startTime,
      endTime: row.endTime,
    })),
  };
}

function buildInitialGuestlistState(event: Event): GuestlistFormState {
  return {
    accessGroups: event.guestlist.accessGroups,
    entries: event.guestlist.entries,
    searchQuery: "",
    sort: "default",
  };
}

function buildInitialBudgetState(event: Event): BudgetFormState {
  return {
    budgetCap: event.budget.totalBudget ? String(event.budget.totalBudget) : "",
    items: event.budget.items.map((item) => ({
      id: item.id,
      category: item.category,
      title: item.title,
      amount: String(item.amount),
      paid: item.paid,
      notes: item.notes ?? "",
    })),
  };
}

function buildInitialCoverState(event: Event, mode: EventEditorShellProps["mode"]): CoverFormState {
  if (mode === "new") {
    return {
      title: "",
      description: "",
      admissionMode: event.admissionMode,
      genreDisplayMode: event.cover.genreDisplayMode ?? "event",
      date: "",
      startTime: "",
      endTime: "",
      location: "",
      venue: "",
      capacityTarget: "",
      imageUrl: event.cover.imageUrl,
      imageAlt: event.cover.imageAlt,
      genres: [],
      genreInput: "",
      rooms: [],
    };
  }

  return {
    title: event.cover.title,
    description: event.cover.description ?? "",
    admissionMode: event.admissionMode,
    genreDisplayMode: event.cover.genreDisplayMode ?? "event",
    date: event.cover.date,
    startTime: event.cover.time?.start ?? "",
    endTime: event.cover.time?.end ?? "",
    location: event.cover.location,
    venue: event.cover.venue,
    capacityTarget: String(event.cover.capacityTarget ?? ""),
    imageUrl: event.cover.imageUrl,
    imageAlt: event.cover.imageAlt,
    genres: event.cover.genres,
    genreInput: "",
    rooms: buildInitialRooms(event),
  };
}

function validateCover(state: CoverFormState): CoverFieldErrors {
  const errors: CoverFieldErrors = {};

  if (!state.title.trim()) {
    errors.title = "Title is required before locking.";
  }

  if (!state.date.trim()) {
    errors.date = "Date is required before locking.";
  }

  if (!state.location.trim()) {
    errors.location = "Location is required before locking.";
  }

  const hasGenres =
    state.genreDisplayMode === "event"
      ? state.genres.length > 0
      : state.rooms.some((room) => room.genres.length > 0);

  if (!hasGenres) {
    errors.genres = "Add at least one genre or style before locking.";
  }

  return errors;
}

function hasNonDefaultAccessGroups(value: GuestlistFormState) {
  const defaultGroups = [
    ["group-regular-entry", "Regular Entry"],
    ["group-vip", "VIP"],
    ["group-guestlist", "Guestlist"],
  ];

  if (value.accessGroups.length !== defaultGroups.length) {
    return true;
  }

  return value.accessGroups.some((group, index) => {
    const [defaultId, defaultName] = defaultGroups[index] ?? [];
    return group.id !== defaultId || group.name !== defaultName;
  });
}

function hasCustomTicketSections(value: TicketsFormState) {
  const defaultSections = [
    {
      name: "Regular Entry",
      visibility: "public",
      accessGroupId: "group-regular-entry",
      allowedGroupIdsLength: 0,
      hasPhases: true,
    },
    {
      name: "VIP",
      visibility: "public",
      accessGroupId: "group-vip",
      allowedGroupIdsLength: 0,
      hasPhases: true,
    },
    {
      name: "Guestlist",
      visibility: "restricted",
      accessGroupId: "group-guestlist",
      allowedGroupIdsLength: 1,
      hasPhases: false,
    },
  ] as const;

  if (value.sections.length !== defaultSections.length) {
    return true;
  }

  return value.sections.some((section, index) => {
    const defaultSection = defaultSections[index];

    if (!defaultSection) {
      return true;
    }

    return (
      section.name !== defaultSection.name ||
      section.visibility !== defaultSection.visibility ||
      section.accessGroupId !== defaultSection.accessGroupId ||
      section.allowedGroupIds.length !== defaultSection.allowedGroupIdsLength ||
      (defaultSection.allowedGroupIdsLength === 1 &&
        section.allowedGroupIds[0] !== defaultSection.accessGroupId) ||
      (defaultSection.hasPhases
        ? section.phases.length !== 1 ||
          section.phases[0]?.name !== "Phase 1" ||
          section.phases[0]?.price !== "" ||
          section.phases[0]?.quantityAvailable !== "" ||
          section.phases[0]?.quantitySold !== "0" ||
          section.phases[0]?.status !== "upcoming" ||
          section.phases[0]?.salesStart !== "" ||
          section.phases[0]?.salesEnd !== "" ||
          section.phases[0]?.releaseMode !== "manual"
        : section.phases.length !== 0)
    );
  });
}

function isMeaningfullyStartedEventDraft(params: {
  coverValue: CoverFormState;
  lineupValue: LineupFormState;
  timetableValue: TimetableFormState;
  guestlistValue: GuestlistFormState;
  budgetValue: BudgetFormState;
  ticketsValue: TicketsFormState;
}) {
  const {
    coverValue,
    lineupValue,
    timetableValue,
    guestlistValue,
    budgetValue,
    ticketsValue,
  } = params;

  if (
    coverValue.title.trim() ||
    coverValue.description.trim() ||
    coverValue.date.trim() ||
    coverValue.startTime.trim() ||
    coverValue.endTime.trim() ||
    coverValue.location.trim() ||
    coverValue.venue.trim() ||
    coverValue.capacityTarget.trim() ||
    coverValue.genres.length > 0 ||
    coverValue.rooms.some((room) => room.name.trim() || room.capacity.trim() || room.genres.length > 0)
  ) {
    return true;
  }

  if (
    lineupValue.selectedArtists.length > 0 ||
    lineupValue.manualInput.trim() ||
    timetableValue.startTime.trim() ||
    timetableValue.endTime.trim() ||
    timetableValue.rows.length > 0 ||
    guestlistValue.entries.length > 0 ||
    hasNonDefaultAccessGroups(guestlistValue) ||
    budgetValue.budgetCap.trim() ||
    budgetValue.items.length > 0 ||
    hasCustomTicketSections(ticketsValue)
  ) {
    return true;
  }

  return false;
}

function buildEventCoverPatch(
  existingEvent: Event,
  coverValue: CoverFormState,
): Event["cover"] {
  const rooms = coverValue.rooms
    .filter((room) => room.name.trim() || room.capacity.trim() || room.genres.length > 0)
    .map((room, index) => ({
      id: room.id || `room-${index + 1}`,
      name: room.name.trim() || `Room ${index + 1}`,
      capacity: Number(room.capacity) || 0,
      genres: room.genres,
    }));

  const totalRoomCapacity = rooms.reduce((total, room) => total + room.capacity, 0);
  const fallbackRoomSize = Number(coverValue.capacityTarget) || existingEvent.cover.roomSize || 0;

  return {
    ...existingEvent.cover,
    title: coverValue.title,
    shortDescription: coverValue.description,
    description: coverValue.description,
    genreDisplayMode: coverValue.genreDisplayMode,
    date: coverValue.date,
    time: {
      start: coverValue.startTime,
      end: coverValue.endTime,
    },
    imageUrl: coverValue.imageUrl || existingEvent.cover.imageUrl,
    imageAlt: coverValue.imageAlt || existingEvent.cover.imageAlt,
    location: coverValue.location,
    venue: coverValue.venue,
    capacityTarget: Number(coverValue.capacityTarget) || 0,
    genres: coverValue.genres,
    numberOfRooms: rooms.length,
    roomSize: totalRoomCapacity || fallbackRoomSize,
    rooms,
  };
}

function buildEventLineupPatch(lineupValue: LineupFormState): Event["lineup"] {
  return {
    displayMode: lineupValue.displayMode,
    entries: lineupValue.selectedArtists.map((artist, index) => ({
      id: `${slugify(artist.name)}-${index + 1}`,
      artistId: artist.id,
      name: artist.name,
      kind: index < 2 ? "opener" : "main",
      roomIds:
        lineupValue.displayMode === "room"
          ? normalizeRoomAssignment(lineupValue.roomAssignments[artist.id])
          : undefined,
      roomId:
        lineupValue.displayMode === "room"
          ? normalizeRoomAssignment(lineupValue.roomAssignments[artist.id])[0] || undefined
          : undefined,
    })),
  };
}

function buildEventTimetablePatch(timetableValue: TimetableFormState) {
  return {
    startTime: timetableValue.startTime,
    endTime: timetableValue.endTime,
    rows: timetableValue.rows.map((row, index) => ({
      id: row.id,
      title: row.title,
      lineupEntryId: row.lineupEntryId || undefined,
      room: row.room || undefined,
      notes: row.notes || undefined,
      startTime: row.startTime,
      endTime: row.endTime,
      sortOrder: index,
    })),
  };
}

function buildEventGuestlistPatch(guestlistValue: GuestlistFormState) {
  const manualGuests = guestlistValue.entries.filter((entry) => entry.source === "manual").length;

  return {
    accessGroups: guestlistValue.accessGroups,
    entries: guestlistValue.entries,
    summary: {
      manualGuests,
      ticketsSold: guestlistValue.entries.filter((entry) => entry.source === "user").length,
      totalAttending: guestlistValue.entries.length,
    },
  };
}

function buildEventAccessAssignments(
  event: Event,
  guestlistValue: GuestlistFormState,
  users: ConsumerUser[],
): EventAccessAssignment[] {
  const existingAssignments = new Map(
    (event.accessAssignments ?? []).map((assignment) => [assignment.userId, assignment]),
  );
  const nextAssignments = new Map<string, EventAccessAssignment>();

  guestlistValue.entries.forEach((entry) => {
    let resolvedUserId: string | undefined;
    let source: EventAccessAssignment["source"];

    if (entry.source === "user") {
      resolvedUserId = entry.userId;
      source = existingAssignments.get(entry.userId)?.source ?? "purchase";
    } else {
      const linkedUser = entry.userId
        ? users.find(
            (user) =>
              user.id === entry.userId ||
              user.username.toLowerCase() === entry.userId?.toLowerCase(),
          )
        : undefined;

      if (!linkedUser) {
        return;
      }

      resolvedUserId = linkedUser.id;
      source = existingAssignments.get(linkedUser.id)?.source ?? "manual";
    }

    const existingAssignment = existingAssignments.get(resolvedUserId);
    const defaultPaymentState =
      source === "purchase"
        ? "paid"
        : resolveManualAssignmentPaymentState(event, entry.accessGroupId);
    const preservedPaymentState = existingAssignment?.paymentState ?? defaultPaymentState;
    const preservedSource = existingAssignment?.source ?? source;

    nextAssignments.set(resolvedUserId, {
      eventId: event.id,
      userId: resolvedUserId,
      accessGroupId: entry.accessGroupId,
      // Recruiter reassignment is operational-only for MVP:
      // keep the existing financial state instead of recalculating refunds or charges.
      source: preservedSource,
      paymentState: preservedPaymentState,
      checkedIn: entry.checkedIn,
      assignedAt: existingAssignment?.assignedAt ?? entry.createdAt,
      assignedBy: existingAssignment?.assignedBy,
      notes: existingAssignment?.notes,
    });
  });

  return Array.from(nextAssignments.values());
}

function buildEventBudgetPatch(budgetValue: BudgetFormState) {
  return {
    totalBudget: Number(budgetValue.budgetCap) || 0,
    items: budgetValue.items.map((item) => ({
      id: item.id,
      category: item.category,
      title: item.title,
      amount: Number(item.amount) || 0,
      paid: item.paid,
      notes: item.notes || undefined,
    })),
  };
}

function calculateTicketRevenue(event: Event) {
  return event.tickets.tiers.reduce(
    (sum, tier) => sum + tier.price * (tier.quantitySold ?? 0),
    0,
  );
}

function validateTimetableRows(rows: TimetableRowDraft[]) {
  return rows.reduce<Record<string, TimetableRowErrors>>((acc, row) => {
    const nextErrors: TimetableRowErrors = {};

    if (!row.title.trim()) {
      nextErrors.title = "Title is required.";
    }

    if (!row.startTime.trim()) {
      nextErrors.startTime = "Start time is required.";
    }

    if (!row.endTime.trim()) {
      nextErrors.endTime = "End time is required.";
    }

    if (Object.keys(nextErrors).length > 0) {
      acc[row.id] = nextErrors;
    }

    return acc;
  }, {});
}

function EventEditorScaffold({
  tab,
  coverValue,
  coverErrors,
  lineupValue,
  timetableValue,
  guestlistValue,
  budgetValue,
  ticketRevenue,
  ticketsValue,
  currentEventStatus,
  currentEventId,
  timetableRowErrors,
  availableArtists,
  users,
  applications,
  onCoverChange,
  onLineupChange,
  onTimetableChange,
  onGuestlistChange,
  onBudgetChange,
  onTicketsChange,
  onArtistsCatalogChange,
  onApproveApplication,
  onDenyApplication,
}: {
  tab: EditorTab;
  coverValue: CoverFormState;
  coverErrors: CoverFieldErrors;
  lineupValue: LineupFormState;
  timetableValue: TimetableFormState;
  guestlistValue: GuestlistFormState;
  budgetValue: BudgetFormState;
  ticketRevenue: number;
  ticketsValue: TicketsFormState;
  currentEventStatus: EventStatus;
  currentEventId: string | null;
  timetableRowErrors: Record<string, TimetableRowErrors>;
  availableArtists: ArtistProfile[];
  users: ConsumerUser[];
  applications: EventApplication[];
  onCoverChange: (nextState: CoverFormState) => void;
  onLineupChange: (nextState: LineupFormState) => void;
  onTimetableChange: (nextState: TimetableFormState) => void;
  onGuestlistChange: (nextState: GuestlistFormState) => void;
  onBudgetChange: (nextState: BudgetFormState) => void;
  onTicketsChange: (nextState: TicketsFormState) => void;
  onArtistsCatalogChange: (artists: ArtistProfile[]) => void;
  onApproveApplication: (userId: string, accessGroupId: string) => void;
  onDenyApplication: (userId: string) => void;
}) {
  if (tab === "cover") {
    return (
      <CoverTab
        value={coverValue}
        errors={coverErrors}
        lineupPreview={lineupValue.selectedArtists.map((artist) => artist.name).join(", ")}
        onChange={onCoverChange}
      />
    );
  }

  if (tab === "lineup") {
    return (
      <LineupTab
        value={lineupValue}
        availableArtists={availableArtists}
        roomOptions={coverValue.rooms}
        onChange={onLineupChange}
        onArtistsCatalogChange={onArtistsCatalogChange}
      />
    );
  }

  if (tab === "timetable") {
      return (
        <TimetableTab
          eventTitle={coverValue.title}
          eventDate={coverValue.date}
          value={timetableValue}
          rowErrors={timetableRowErrors}
          lineupArtists={lineupValue.selectedArtists}
        roomOptions={coverValue.rooms}
        onChange={onTimetableChange}
      />
    );
  }

  if (tab === "guestlist") {
    return (
      <GuestlistTab
        eventId={currentEventId ?? "draft-event"}
        admissionMode={coverValue.admissionMode}
        value={guestlistValue}
        applications={applications}
        users={users}
        onChange={onGuestlistChange}
        onApproveApplication={onApproveApplication}
        onDenyApplication={onDenyApplication}
      />
    );
  }

  if (tab === "budget") {
    return (
      <BudgetTab
        value={budgetValue}
        ticketRevenue={ticketRevenue}
        onChange={onBudgetChange}
      />
    );
  }

  if (tab === "tickets") {
    return (
      <TicketsTab
        value={ticketsValue}
        eventStatus={currentEventStatus}
        accessGroups={guestlistValue.accessGroups}
        onChange={onTicketsChange}
      />
    );
  }

  return null;
}

export function EventEditorShell(props: EventEditorShellProps) {
  const router = useRouter();
  const {
    getEventById,
    createDraftEvent,
    updateEvent,
    deleteEvent,
    upsertArtists,
    approveCuratedApplication,
    denyCuratedApplication,
    artists,
    users,
  } = useMockEventsStore();

  const initialEvent = useMemo(() => {
    if (props.mode === "new") {
      return createDraftEventSeed();
    }

    return getEventById(props.eventId) ?? null;
  }, [getEventById, props]);

  const [activeTab, setActiveTab] = useState<EditorTab>("cover");
  const [currentEventId, setCurrentEventId] = useState<string | null>(
    props.mode === "edit" ? props.eventId : null,
  );
  const [localStatus, setLocalStatus] = useState<EventStatus>(
    initialEvent?.status ?? "draft",
  );
  const [coverValue, setCoverValue] = useState<CoverFormState>(() =>
    initialEvent ? buildInitialCoverState(initialEvent, props.mode) : buildInitialCoverState(createDraftEventSeed(), "new"),
  );
  const [lineupValue, setLineupValue] = useState<LineupFormState>(() =>
    initialEvent
      ? buildInitialLineupState(initialEvent, artists)
      : buildInitialLineupState(createDraftEventSeed(), artists),
  );
  const [timetableValue, setTimetableValue] = useState<TimetableFormState>(() =>
    initialEvent
      ? buildInitialTimetableState(initialEvent)
      : buildInitialTimetableState(createDraftEventSeed()),
  );
  const [guestlistValue, setGuestlistValue] = useState<GuestlistFormState>(() =>
    initialEvent
      ? buildInitialGuestlistState(initialEvent)
      : buildInitialGuestlistState(createDraftEventSeed()),
  );
  const [budgetValue, setBudgetValue] = useState<BudgetFormState>(() =>
    initialEvent
      ? buildInitialBudgetState(initialEvent)
      : buildInitialBudgetState(createDraftEventSeed()),
  );
  const [ticketsValue, setTicketsValue] = useState<TicketsFormState>(() =>
    initialEvent
      ? buildInitialTicketsState(initialEvent)
      : createEmptyTicketsState(createDraftEventSeed().guestlist.accessGroups),
  );
  const [coverErrors, setCoverErrors] = useState<CoverFieldErrors>({});
  const [timetableRowErrors, setTimetableRowErrors] = useState<Record<string, TimetableRowErrors>>({});
  const [hasPendingAutosave, setHasPendingAutosave] = useState(false);
  const [showCoverEditWarning, setShowCoverEditWarning] = useState(false);
  const [pendingCoverValue, setPendingCoverValue] = useState<CoverFormState | null>(null);
  const [hasAcknowledgedCoverEditWarning, setHasAcknowledgedCoverEditWarning] = useState(false);
  const hasMountedRef = useRef(false);
  const isReadOnly = localStatus === "past";
  const isLocked = isLockedEventStatus(localStatus);
  const isCoverEditableStatus =
    localStatus === "draft" || localStatus === "upcoming" || localStatus === "live";
  const isLineupEditableStatus =
    localStatus === "draft" || localStatus === "upcoming" || localStatus === "live";
  const isTimetableEditableStatus =
    localStatus === "draft" || localStatus === "upcoming" || localStatus === "live";
  const isGuestlistEditableStatus =
    localStatus === "draft" || localStatus === "upcoming" || localStatus === "live";
  const isBudgetEditableStatus =
    localStatus === "draft" || localStatus === "upcoming" || localStatus === "live";
  const isTicketsEditableStatus =
    localStatus === "draft" || localStatus === "upcoming" || localStatus === "live";
  const isEditableLockedTab =
    (activeTab === "cover" && isCoverEditableStatus) ||
    (activeTab === "lineup" && isLineupEditableStatus) ||
    (activeTab === "timetable" && isTimetableEditableStatus) ||
    (activeTab === "guestlist" && isGuestlistEditableStatus) ||
    (activeTab === "budget" && isBudgetEditableStatus) ||
    (activeTab === "tickets" && isTicketsEditableStatus);
  const isActiveTabDisabled = isReadOnly || (isLocked && !isEditableLockedTab);
  const shouldWarnBeforeCoverEdit = localStatus === "upcoming" || localStatus === "live";

  const persistStatus = (nextStatus: EventStatus) => {
    setLocalStatus(nextStatus);
  };

  const persistEditorDraft = useCallback((nextStatus: EventStatus) => {
    if (!initialEvent) {
      return;
    }

    if (isReadOnly) {
      return;
    }

    if (
      props.mode === "new" &&
      !currentEventId &&
      !isMeaningfullyStartedEventDraft({
        coverValue,
        lineupValue,
        timetableValue,
        guestlistValue,
        budgetValue,
        ticketsValue,
      })
    ) {
      return;
    }

    const coverPatch = buildEventCoverPatch(initialEvent, coverValue);
    const lineupPatch = buildEventLineupPatch(lineupValue);
    const timetablePatch = buildEventTimetablePatch(timetableValue);
    const guestlistPatch = buildEventGuestlistPatch(guestlistValue);
    const accessAssignmentsPatch = buildEventAccessAssignments(initialEvent, guestlistValue, users);
    const budgetPatch = buildEventBudgetPatch(budgetValue);
    const ticketsPatch = buildEventTicketsPatch(ticketsValue, localStatus);
    upsertArtists(lineupValue.selectedArtists);

    if (
      props.mode === "new" &&
      currentEventId &&
      nextStatus === "draft" &&
      !isMeaningfullyStartedEventDraft({
        coverValue,
        lineupValue,
        timetableValue,
        guestlistValue,
        budgetValue,
        ticketsValue,
      })
    ) {
      deleteEvent(currentEventId);
      setCurrentEventId(null);
      persistStatus("draft");
      router.replace("/office/event-editor/new");
      return;
    }

    if (currentEventId) {
      updateEvent({
        id: currentEventId,
        status: nextStatus,
        admissionMode: coverValue.admissionMode,
        slug: coverValue.title.trim()
          ? `${slugify(coverValue.title)}-${coverValue.date || new Date().toISOString().slice(0, 10)}`
          : initialEvent.slug,
        cover: coverPatch,
        timetable: timetablePatch,
        lineup: lineupPatch,
        guestlist: guestlistPatch,
        accessAssignments: accessAssignmentsPatch,
        budget: budgetPatch,
        tickets: ticketsPatch,
      });
      persistStatus(nextStatus);
      return;
    }

    const createdEvent = createDraftEvent({
      status: nextStatus,
      admissionMode: coverValue.admissionMode,
      slug: coverValue.title.trim()
        ? `${slugify(coverValue.title)}-${coverValue.date || new Date().toISOString().slice(0, 10)}`
        : initialEvent.slug,
      cover: coverPatch,
      timetable: timetablePatch,
      lineup: lineupPatch,
      guestlist: guestlistPatch,
      accessAssignments: accessAssignmentsPatch,
      budget: budgetPatch,
      tickets: ticketsPatch,
    });

    setCurrentEventId(createdEvent.id);
    persistStatus(nextStatus);

    if (nextStatus === "draft") {
      router.replace(`/office/event-editor/${createdEvent.id}`);
      return;
    }

    router.replace("/office");
  }, [
    budgetValue,
    coverValue,
    currentEventId,
    createDraftEvent,
    deleteEvent,
    guestlistValue,
    initialEvent,
    isReadOnly,
    lineupValue,
    localStatus,
    props.mode,
    router,
    ticketsValue,
    timetableValue,
    updateEvent,
    upsertArtists,
    users,
  ]);

  const handleLockEvent = () => {
    if (isReadOnly) {
      return;
    }

    const nextErrors = validateCover(coverValue);
    const nextTimetableErrors = validateTimetableRows(timetableValue.rows);
    setCoverErrors(nextErrors);
    setTimetableRowErrors(nextTimetableErrors);

    if (Object.keys(nextErrors).length > 0) {
      setActiveTab("cover");
      return;
    }

    if (Object.keys(nextTimetableErrors).length > 0) {
      setActiveTab("timetable");
      return;
    }

    persistEditorDraft("upcoming");
  };

  const applyCoverChange = useCallback(
    (nextState: CoverFormState) => {
      setCoverValue(nextState);
      setHasPendingAutosave(true);

      if (Object.keys(coverErrors).length > 0) {
        setCoverErrors(validateCover(nextState));
      }
    },
    [coverErrors],
  );

  const handleCoverChange = useCallback(
    (nextState: CoverFormState) => {
      if (isReadOnly) {
        return;
      }

      if (shouldWarnBeforeCoverEdit && !hasAcknowledgedCoverEditWarning) {
        setPendingCoverValue(nextState);
        setShowCoverEditWarning(true);
        return;
      }

      applyCoverChange(nextState);
    },
    [
      applyCoverChange,
      hasAcknowledgedCoverEditWarning,
      isReadOnly,
      shouldWarnBeforeCoverEdit,
    ],
  );

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (!hasPendingAutosave || isReadOnly) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      persistEditorDraft(localStatus);
      setHasPendingAutosave(false);
    }, 800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    budgetValue,
    coverValue,
    guestlistValue,
    hasPendingAutosave,
    isReadOnly,
    lineupValue,
    localStatus,
    persistEditorDraft,
    ticketsValue,
    timetableValue,
  ]);

  if (!initialEvent) {
    return (
      <div className="rounded-[var(--radius-surface)] border border-border bg-panel p-5">
        <p className="text-body text-muted">Event not found.</p>
      </div>
    );
  }

  const latestEvent = (currentEventId ? getEventById(currentEventId) : null) ?? initialEvent;
  const ticketRevenue = calculateTicketRevenue(latestEvent);

  return (
    <div className="-mt-6 space-y-2">
      <EventEditorHeader status={localStatus} />

      <div className="pt-3">
        <div className="flex flex-wrap items-center gap-4">
          <EditorTabNav activeTab={activeTab} onChange={setActiveTab} />
          <div className="ml-auto">
            <EditorActionBar
              status={localStatus}
              readOnly={isReadOnly}
              onPublish={() => persistEditorDraft("live")}
              onLock={handleLockEvent}
              onRevertToDraft={() => persistEditorDraft("draft")}
            />
          </div>
        </div>
      </div>

      <div className="min-w-0 max-w-full pt-1">
        <fieldset
          disabled={isActiveTabDisabled}
          className={`min-w-0 max-w-full ${isActiveTabDisabled ? "opacity-85" : ""}`}
        >
          <EventEditorScaffold
            tab={activeTab}
            coverValue={coverValue}
            coverErrors={coverErrors}
            lineupValue={lineupValue}
            timetableValue={timetableValue}
            guestlistValue={guestlistValue}
            budgetValue={budgetValue}
            ticketRevenue={ticketRevenue}
            ticketsValue={ticketsValue}
            currentEventStatus={localStatus}
            currentEventId={currentEventId}
            timetableRowErrors={timetableRowErrors}
            availableArtists={artists}
            users={users}
            applications={latestEvent.applications}
            onCoverChange={handleCoverChange}
            onLineupChange={(nextState) => {
              setLineupValue(nextState);
              setHasPendingAutosave(true);
            }}
            onTimetableChange={(nextState) => {
              setTimetableValue(nextState);
              setHasPendingAutosave(true);
              if (Object.keys(timetableRowErrors).length > 0) {
                setTimetableRowErrors(validateTimetableRows(nextState.rows));
              }
            }}
            onGuestlistChange={(nextState) => {
              setGuestlistValue(nextState);
              setHasPendingAutosave(true);
            }}
            onBudgetChange={(nextState) => {
              setBudgetValue(nextState);
              setHasPendingAutosave(true);
            }}
            onTicketsChange={(nextState) => {
              setTicketsValue(nextState);
              setHasPendingAutosave(true);
            }}
            onArtistsCatalogChange={upsertArtists}
            onApproveApplication={(userId, accessGroupId) => {
              if (!currentEventId) {
                return;
              }

              setGuestlistValue((current) => {
                const existingEntry = current.entries.find(
                  (entry) => entry.source === "user" && entry.userId === userId,
                );

                const nextEntries = existingEntry
                  ? current.entries.map((entry) =>
                      entry.source === "user" && entry.userId === userId
                        ? {
                            ...entry,
                            accessGroupId,
                          }
                        : entry,
                    )
                  : [
                      ...current.entries,
                      {
                        id: `${currentEventId}-approval-${userId}`,
                        source: "user" as const,
                        userId,
                        accessGroupId,
                        checkedIn: false,
                        createdAt: new Date().toISOString(),
                      },
                    ];

                return {
                  ...current,
                  entries: nextEntries,
                };
              });

              approveCuratedApplication({
                eventId: currentEventId,
                userId,
                accessGroupId,
              });
            }}
            onDenyApplication={(userId) => {
              if (!currentEventId) {
                return;
              }

              denyCuratedApplication({
                eventId: currentEventId,
                userId,
              });
            }}
          />
        </fieldset>
      </div>

      {showCoverEditWarning ? (
        <ConfirmDialog
          title="Edit Event Cover"
          message="This event is already public, and users may have already seen the original version. Are you sure you want to update this cover information?"
          confirmLabel="Continue"
          confirmTone="accent"
          hideClose
          titleColor="var(--accent-hex)"
          messageClassName="mt-3 text-[hsl(var(--warning))]"
          confirmButtonClassName="text-[var(--accent-hex)]"
          onClose={() => {
            setShowCoverEditWarning(false);
            setPendingCoverValue(null);
          }}
          onConfirm={() => {
            if (pendingCoverValue) {
              applyCoverChange(pendingCoverValue);
            }
            setHasAcknowledgedCoverEditWarning(true);
            setPendingCoverValue(null);
            setShowCoverEditWarning(false);
          }}
        />
      ) : null}
    </div>
  );
}
