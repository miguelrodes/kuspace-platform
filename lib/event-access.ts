import type {
  Event,
  EventAccessAssignment,
  EventAccessAssignmentSource,
  EventApplication,
  EventAccessPaymentState,
  GuestlistEntry,
} from "@/types/event";
import type {
  ConsumerTicketStatus,
  ConsumerUser,
  ConsumerTicketWalletEntry,
} from "@/types/user";
import {
  deriveConsumerTicketStatusFromAssignment,
  isQrActiveForPaymentState,
} from "@/lib/event-access-assignment";
import {
  buildEventApplicationRecord,
  canUseEventApplications,
} from "@/lib/event-applications";
import {
  getVisibleTicketSectionsForAssignment,
} from "@/lib/event-ticket-visibility";
import { conflict, notFound } from "@/lib/http/errors";

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

export function getConsumerTicketStatus(params: {
  walletStatus?: ConsumerTicketStatus;
  assignment?: EventAccessAssignment;
}): ConsumerTicketStatus {
  const { walletStatus, assignment } = params;

  if (walletStatus) {
    return walletStatus;
  }

  return deriveConsumerTicketStatusFromAssignment(assignment) ?? "inactive";
}

export function getVisibleTicketSectionsForUser(
  event: Event,
  userId?: string,
) {
  const assignment = userId ? getEventAccessAssignment(event, userId) : undefined;
  return getVisibleTicketSectionsForAssignment(event, assignment);
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

export function getConsumerWalletStatusForPaymentState(
  paymentState: EventAccessPaymentState,
): ConsumerTicketStatus {
  return isQrActiveForPaymentState(paymentState) ? "active" : "inactive";
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
    ticketPhaseId?: string;
    quantity?: number;
    purchasedAt?: string;
    checkedIn?: boolean;
    paymentState?: EventAccessPaymentState;
    source?: EventAccessAssignmentSource;
  },
): Event {
  const purchasedAt = purchase.purchasedAt ?? new Date().toISOString();
  const checkedIn = purchase.checkedIn ?? false;
  const paymentState = purchase.paymentState ?? "paid";
  const source = purchase.source ?? "purchase";
  const quantity = purchase.quantity ?? 1;
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
      source,
      paymentState,
      checkedIn: existingAssignment?.checkedIn ?? checkedIn,
      assignedAt: existingAssignment?.assignedAt ?? purchasedAt,
      assignedBy: existingAssignment?.assignedBy,
      notes: existingAssignment?.notes,
    },
  ];

  const nextSections = purchase.ticketPhaseId
    ? (event.tickets.sections ?? []).map((section) => {
        const targetPhase = section.phases.find((phase) => phase.id === purchase.ticketPhaseId);

        if (!targetPhase) {
          return section;
        }

        if (section.accessGroupId !== purchase.accessGroupId) {
          throw conflict("Checkout ticket phase does not match the ticket section access group.");
        }

        return {
          ...section,
          phases: section.phases.map((phase) => {
            if (phase.id !== purchase.ticketPhaseId) {
              return phase;
            }

            const quantitySold = phase.quantitySold ?? 0;
            const nextQuantitySold = quantitySold + quantity;

            if (nextQuantitySold > phase.quantityAvailable) {
              throw conflict("Confirmed payment would exceed the available ticket inventory.");
            }

            return {
              ...phase,
              quantitySold: nextQuantitySold,
              status: nextQuantitySold >= phase.quantityAvailable ? "sold_out" : phase.status,
            };
          }),
        };
      })
    : event.tickets.sections;

  if (purchase.ticketPhaseId && !(nextSections ?? []).some((section) => section.phases.some((phase) => phase.id === purchase.ticketPhaseId))) {
    throw notFound("Ticket phase not found");
  }

  return {
    ...event,
    guestlist: {
      ...event.guestlist,
      entries: nextEntries,
      summary: buildGuestlistSummary(nextEntries),
    },
    accessAssignments: nextAssignments,
    tickets: {
      ...event.tickets,
      sections: nextSections,
    },
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
            status: purchase.status ?? entry.status,
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
  if (!canUseEventApplications(event)) {
    return event;
  }

  const existingApplication = getEventApplication(event, userId);
  const nextApplication: EventApplication = buildEventApplicationRecord({
    eventId: event.id,
    userId,
    status: "pending",
    appliedAt: existingApplication?.appliedAt ?? appliedAt,
    notes: existingApplication?.notes,
  });

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
  if (!canUseEventApplications(event)) {
    return event;
  }

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
      buildEventApplicationRecord({
        eventId: event.id,
        userId: approval.userId,
        status: "accepted",
        appliedAt: existingApplication?.appliedAt ?? reviewedAt,
        reviewedAt,
        reviewedBy: approval.reviewedBy,
        accessGroupId: approval.accessGroupId,
        notes: existingApplication?.notes,
      }),
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
  if (!canUseEventApplications(event)) {
    return event;
  }

  const reviewedAt = denial.reviewedAt ?? new Date().toISOString();
  const existingApplication = getEventApplication(event, denial.userId);

  return {
    ...event,
    applications: [
      ...event.applications.filter((application) => application.userId !== denial.userId),
      buildEventApplicationRecord({
        eventId: event.id,
        userId: denial.userId,
        status: "denied",
        appliedAt: existingApplication?.appliedAt ?? reviewedAt,
        reviewedAt,
        reviewedBy: denial.reviewedBy,
        accessGroupId: existingApplication?.accessGroupId,
        notes: existingApplication?.notes,
      }),
    ],
  };
}
