import type {
  Event,
  EventAccessAssignment,
  EventApplication,
  EventAccessPaymentState,
  GuestlistEntry,
  TicketSection,
} from "@/types/event";
import type { ConsumerUser, ConsumerTicketWalletEntry } from "@/types/user";

export function getEventAccessAssignment(
  event: Event,
  userId: string,
): EventAccessAssignment | undefined {
  return event.accessAssignments.find((assignment) => assignment.userId === userId);
}

export function getEventApplication(
  event: Event,
  userId: string,
): EventApplication | undefined {
  return event.applications.find((application) => application.userId === userId);
}

export function isQrActiveForPaymentState(paymentState: EventAccessPaymentState) {
  return (
    paymentState === "paid" ||
    paymentState === "not_required" ||
    paymentState === "waived"
  );
}

export function isQrActiveForAssignment(
  assignment: EventAccessAssignment | undefined,
) {
  if (!assignment) {
    return false;
  }

  return isQrActiveForPaymentState(assignment.paymentState);
}

export function canUserSeeTicketSection(
  section: TicketSection,
  assignment: EventAccessAssignment | undefined,
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

export function getVisibleTicketSectionsForUser(
  event: Event,
  userId?: string,
) {
  const assignment = userId ? getEventAccessAssignment(event, userId) : undefined;

  if (event.admissionMode === "curated" && !assignment) {
    return [];
  }

  return (event.tickets.sections ?? []).filter(
    (section) =>
      section.phases.length > 0 && canUserSeeTicketSection(section, assignment),
  );
}

export function resolveManualAssignmentPaymentState(
  event: Event,
  accessGroupId: string,
): EventAccessPaymentState {
  const matchingSections = (event.tickets.sections ?? []).filter(
    (section) => section.accessGroupId === accessGroupId,
  );

  if (matchingSections.some((section) => section.phases.some((phase) => phase.price <= 0))) {
    return "not_required";
  }

  if (matchingSections.some((section) => section.phases.some((phase) => phase.price > 0))) {
    return "pending";
  }

  return accessGroupId === "group-guestlist" ? "not_required" : "pending";
}

function buildGuestlistSummary(entries: GuestlistEntry[]) {
  return {
    manualGuests: entries.filter((entry) => entry.source === "manual").length,
    ticketsSold: entries.filter((entry) => entry.source === "user").length,
    totalAttending: entries.length,
  };
}

export function syncTicketPurchaseToEvent(
  event: Event,
  purchase: {
    userId: string;
    accessGroupId: string;
    purchasedAt?: string;
    checkedIn?: boolean;
  },
): Event {
  const purchasedAt = purchase.purchasedAt ?? new Date().toISOString();
  const checkedIn = purchase.checkedIn ?? false;
  const existingEntry = event.guestlist.entries.find(
    (entry) => entry.source === "user" && entry.userId === purchase.userId,
  );
  const existingAssignment = event.accessAssignments.find(
    (assignment) => assignment.userId === purchase.userId,
  );

  const nextEntries = [
    ...event.guestlist.entries.filter(
      (entry) => !(entry.source === "user" && entry.userId === purchase.userId),
    ),
    {
      id: existingEntry?.id ?? `${event.id}-ticket-${purchase.userId}`,
      source: "user" as const,
      userId: purchase.userId,
      accessGroupId: purchase.accessGroupId,
      checkedIn: existingEntry?.checkedIn ?? checkedIn,
      createdAt: existingEntry?.createdAt ?? purchasedAt,
    },
  ];

  const nextAssignments = [
    ...event.accessAssignments.filter((assignment) => assignment.userId !== purchase.userId),
    {
      eventId: event.id,
      userId: purchase.userId,
      accessGroupId: purchase.accessGroupId,
      source: "purchase" as const,
      paymentState: "paid" as const,
      checkedIn: existingAssignment?.checkedIn ?? checkedIn,
      assignedAt: existingAssignment?.assignedAt ?? purchasedAt,
      assignedBy: existingAssignment?.assignedBy,
      notes: existingAssignment?.notes,
    },
  ];

  return {
    ...event,
    guestlist: {
      ...event.guestlist,
      entries: nextEntries,
      summary: buildGuestlistSummary(nextEntries),
    },
    accessAssignments: nextAssignments,
  };
}

export function syncTicketPurchaseToUser(
  user: ConsumerUser,
  purchase: ConsumerTicketWalletEntry,
): ConsumerUser {
  const existingEntries = user.ticketWalletEntries ?? [];
  const existingIndex = existingEntries.findIndex(
    (entry) =>
      entry.eventSlug === purchase.eventSlug &&
      entry.accessGroupId === purchase.accessGroupId &&
      (entry.ticketLabel ?? "") === (purchase.ticketLabel ?? ""),
  );

  if (existingIndex === -1) {
    return {
      ...user,
      ticketWalletEntries: [...existingEntries, purchase],
    };
  }

  return {
    ...user,
    ticketWalletEntries: existingEntries.map((entry, index) =>
      index === existingIndex
        ? {
            ...entry,
            quantity: entry.quantity + purchase.quantity,
            ticketLabel: purchase.ticketLabel ?? entry.ticketLabel,
          }
        : entry,
    ),
  };
}

export function syncUserWalletPurchasesIntoEvents(
  events: Event[],
  users: ConsumerUser[],
) {
  return users.reduce((nextEvents, user) => {
    return (user.ticketWalletEntries ?? []).reduce((currentEvents, entry) => {
      return currentEvents.map((event) =>
        event.slug === entry.eventSlug
          ? syncTicketPurchaseToEvent(event, {
              userId: user.id,
              accessGroupId: entry.accessGroupId,
            })
          : event,
      );
    }, nextEvents);
  }, events);
}

export function applyToCuratedEvent(
  event: Event,
  userId: string,
  appliedAt = new Date().toISOString(),
): Event {
  const existingApplication = getEventApplication(event, userId);
  const nextApplication: EventApplication = {
    eventId: event.id,
    userId,
    status: "pending",
    appliedAt: existingApplication?.appliedAt ?? appliedAt,
    reviewedAt: undefined,
    reviewedBy: undefined,
    accessGroupId: undefined,
    notes: existingApplication?.notes,
  };

  return {
    ...event,
    applications: [
      ...event.applications.filter((application) => application.userId !== userId),
      nextApplication,
    ],
  };
}

export function approveCuratedApplication(
  event: Event,
  approval: {
    userId: string;
    accessGroupId: string;
    reviewedAt?: string;
    reviewedBy?: string;
  },
): Event {
  const reviewedAt = approval.reviewedAt ?? new Date().toISOString();
  const existingApplication = getEventApplication(event, approval.userId);
  const paymentState = resolveManualAssignmentPaymentState(event, approval.accessGroupId);
  const existingEntry = event.guestlist.entries.find(
    (entry) => entry.source === "user" && entry.userId === approval.userId,
  );
  const existingAssignment = getEventAccessAssignment(event, approval.userId);

  const nextEntries = [
    ...event.guestlist.entries.filter(
      (entry) => !(entry.source === "user" && entry.userId === approval.userId),
    ),
    {
      id: existingEntry?.id ?? `${event.id}-approval-${approval.userId}`,
      source: "user" as const,
      userId: approval.userId,
      accessGroupId: approval.accessGroupId,
      checkedIn: existingEntry?.checkedIn ?? false,
      createdAt: existingEntry?.createdAt ?? reviewedAt,
    },
  ];

  const nextAssignments = [
    ...event.accessAssignments.filter((assignment) => assignment.userId !== approval.userId),
    {
      eventId: event.id,
      userId: approval.userId,
      accessGroupId: approval.accessGroupId,
      source: "approval" as const,
      paymentState: existingAssignment?.paymentState ?? paymentState,
      checkedIn: existingAssignment?.checkedIn ?? false,
      assignedAt: existingAssignment?.assignedAt ?? reviewedAt,
      assignedBy: approval.reviewedBy ?? existingAssignment?.assignedBy,
      notes: existingAssignment?.notes,
    },
  ];

  return {
    ...event,
    guestlist: {
      ...event.guestlist,
      entries: nextEntries,
      summary: buildGuestlistSummary(nextEntries),
    },
    accessAssignments: nextAssignments,
    applications: [
      ...event.applications.filter((application) => application.userId !== approval.userId),
      {
        eventId: event.id,
        userId: approval.userId,
        status: "accepted",
        appliedAt: existingApplication?.appliedAt ?? reviewedAt,
        reviewedAt,
        reviewedBy: approval.reviewedBy,
        accessGroupId: approval.accessGroupId,
        notes: existingApplication?.notes,
      },
    ],
  };
}

export function denyCuratedApplication(
  event: Event,
  denial: {
    userId: string;
    reviewedAt?: string;
    reviewedBy?: string;
  },
): Event {
  const reviewedAt = denial.reviewedAt ?? new Date().toISOString();
  const existingApplication = getEventApplication(event, denial.userId);

  return {
    ...event,
    applications: [
      ...event.applications.filter((application) => application.userId !== denial.userId),
      {
        eventId: event.id,
        userId: denial.userId,
        status: "denied",
        appliedAt: existingApplication?.appliedAt ?? reviewedAt,
        reviewedAt,
        reviewedBy: denial.reviewedBy,
        accessGroupId: existingApplication?.accessGroupId,
        notes: existingApplication?.notes,
      },
    ],
  };
}
