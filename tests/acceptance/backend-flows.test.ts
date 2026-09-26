import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getConsumerWalletStatusForPaymentState,
  syncTicketPurchaseToEvent,
  syncTicketPurchaseToUser,
} from "@/lib/event-access";
import { conflict, notFound } from "@/lib/http/errors";
import { buildConsumerUser, buildLiveCuratedEvent, buildRecruiterProfile } from "@/tests/helpers/fixtures";
import type { Event } from "@/types/event";
import type { TicketOrder } from "@/types/order";
import type { RecruiterProfile } from "@/types/profile";
import type { ConsumerUser } from "@/types/user";
import type { WorkspaceOrganization } from "@/types/workspace";

type AcceptanceState = {
  role: "recruiter" | "consumer";
  recruiterProfile: RecruiterProfile;
  consumerUser: ConsumerUser;
  events: Map<string, Event>;
  orders: Map<string, TicketOrder>;
  organization: WorkspaceOrganization;
  nextOrderId: number;
};

const state = vi.hoisted<AcceptanceState>(() => ({
  role: "recruiter" as "recruiter" | "consumer",
  recruiterProfile: {
    id: "recruiter-neon-harbor",
    organizationId: "organization-recruiter-neon-harbor",
    slug: "neon-harbor",
    recruiterType: "nightclub" as const,
    displayName: "Neon Harbor",
  },
  consumerUser: {
    id: "consumer-luca-dea",
    username: "lucadea",
    firstName: "Luca",
    lastName: "Dea",
    email: "luca@example.com",
    city: "Northport",
    favoriteGenres: ["House"],
    notificationsEnabled: true,
    profileVisibility: "public" as const,
    savedEventSlugs: [],
    upcomingTicketEventSlugs: [],
    pastTicketEventSlugs: [],
    ticketWalletEntries: [],
    createdAt: "2026-04-01T00:00:00.000Z",
  } satisfies ConsumerUser,
  events: new Map<string, Event>(),
  orders: new Map<string, TicketOrder>(),
  organization: {
    id: "organization-recruiter-neon-harbor",
    slug: "neon-harbor",
    name: "Neon Harbor",
    type: "nightclub",
    stripeAccountId: "acct_123",
    stripeChargesEnabled: true,
    stripePayoutsEnabled: true,
    stripeDetailsSubmitted: true,
  },
  nextOrderId: 1,
}));

const stripeMocks = vi.hoisted(() => ({
  getStripeServerClient: vi.fn(),
  getStripeConfig: vi.fn(),
  isStripeConfigured: vi.fn(),
  stripeCheckoutSessionsCreate: vi.fn(),
  stripeAccountsRetrieve: vi.fn(),
  stripeConnectedAccountsRetrieve: vi.fn(),
}));

vi.mock("@/lib/services/access-service", async () => {
  const { forbidden, notFound } = await import("@/lib/http/errors");

  return {
    requireCurrentRecruiterProfileService: vi.fn(async () => {
      if (state.role !== "recruiter") {
        throw forbidden("Recruiter access is required for this action.");
      }

      return {
        actor: {
          role: "recruiter" as const,
          currentRecruiterProfileId: state.recruiterProfile.id,
          currentConsumerUserId: null,
          currentOrganizationId: state.recruiterProfile.organizationId ?? null,
          currentOrganizationRole: "owner" as const,
        },
        profile: state.recruiterProfile,
      };
    }),
    requireOwnedRecruiterEventService: vi.fn(async (eventId: string) => {
      if (state.role !== "recruiter") {
        throw forbidden("Recruiter access is required for this action.");
      }

      const event = state.events.get(eventId);
      if (!event) {
        throw notFound("Event not found");
      }

      return {
        actor: {
          role: "recruiter" as const,
          currentRecruiterProfileId: state.recruiterProfile.id,
          currentConsumerUserId: null,
          currentOrganizationId: state.recruiterProfile.organizationId ?? null,
          currentOrganizationRole: "owner" as const,
        },
        event,
      };
    }),
    requireOwnedConsumerUserService: vi.fn(async (userId: string) => {
      if (state.role !== "consumer" || state.consumerUser.id !== userId) {
        throw forbidden("You can only act for your own consumer profile.");
      }

      return {
        actor: {
          role: "consumer" as const,
          currentConsumerUserId: state.consumerUser.id,
          currentRecruiterProfileId: null,
        },
        user: state.consumerUser,
      };
    }),
  };
});

vi.mock("@/lib/db/repositories/event-repository", () => ({
  saveEventRepositoryAggregate: vi.fn(async (event: Event) => {
    state.events.set(event.id, event);
    return event;
  }),
  deleteEventRepositoryAggregate: vi.fn(async (id: string) => {
    state.events.delete(id);
  }),
  getEventRepositoryById: vi.fn(async (id: string) => state.events.get(id) ?? null),
  getEventRepositoryBySlug: vi.fn(async (slug: string) =>
    Array.from(state.events.values()).find((event) => event.slug === slug) ?? null,
  ),
}));

vi.mock("@/lib/db/repositories/access-repository", () => ({
  getEventAccessRepositoryByEventId: vi.fn(async (id: string) => state.events.get(id) ?? null),
  saveEventAccessRepository: vi.fn(async (event: Event) => {
    state.events.set(event.id, event);
    return event;
  }),
}));

vi.mock("@/lib/db/repositories/ticket-repository", () => ({
  getEventTicketRepositoryByEventId: vi.fn(async (id: string) => state.events.get(id) ?? null),
  saveEventTicketRepository: vi.fn(async (event: Event) => {
    state.events.set(event.id, event);
    return event;
  }),
}));

vi.mock("@/lib/db/repositories/consumer-repository", () => ({
  getConsumerRepositoryById: vi.fn(async (id: string) => (id === state.consumerUser.id ? state.consumerUser : null)),
  getConsumersRepositoryByIds: vi.fn(async (ids: string[]) =>
    ids
      .map((id) => (id === state.consumerUser.id ? state.consumerUser : null))
      .filter((user): user is ConsumerUser => user !== null),
  ),
  saveConsumerRepository: vi.fn(async (user: ConsumerUser) => {
    state.consumerUser = user;
    return user;
  }),
}));

vi.mock("@/lib/db/repositories/organization-repository", () => ({
  getOrganizationRepositoryById: vi.fn(async (id: string) =>
    id === state.organization.id ? state.organization : null,
  ),
}));

vi.mock("@/lib/db/repositories/order-repository", () => ({
  createTicketOrderRepository: vi.fn(async (order: {
    eventId: string;
    organizationId: string;
    consumerUserId: string;
    status: TicketOrder["status"];
    currency: string;
    subtotalAmount: number;
    totalAmount: number;
    stripeConnectedAccountId?: string;
    stripeCheckoutSessionId?: string;
    stripePaymentIntentId?: string;
    items: Array<{
      ticketSectionId: string;
      ticketPhaseId: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
  }) => {
    const orderId = `order-${state.nextOrderId++}`;
    const storedOrder: TicketOrder = {
      id: orderId,
      eventId: order.eventId,
      organizationId: order.organizationId,
      consumerUserId: order.consumerUserId,
      status: order.status,
      currency: order.currency,
      subtotalAmount: order.subtotalAmount,
      totalAmount: order.totalAmount,
      stripeConnectedAccountId: order.stripeConnectedAccountId,
      stripeCheckoutSessionId: order.stripeCheckoutSessionId,
      stripePaymentIntentId: order.stripePaymentIntentId,
      createdAt: "2026-04-25T00:00:00.000Z",
      updatedAt: "2026-04-25T00:00:00.000Z",
      items: order.items.map((item: {
        ticketSectionId: string;
        ticketPhaseId: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }, index: number) => ({
        id: `${orderId}-item-${index + 1}`,
        orderId,
        ticketSectionId: item.ticketSectionId,
        ticketPhaseId: item.ticketPhaseId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        createdAt: "2026-04-25T00:00:00.000Z",
      })),
    };

    state.orders.set(orderId, storedOrder);
    return storedOrder;
  }),
  fulfillPaidTicketOrderRepository: vi.fn(async (params: {
    orderId: string;
    occurredAt: string;
    stripeConnectedAccountId?: string;
    stripeCheckoutSessionId?: string;
    stripePaymentIntentId?: string;
  }) => {
    const existingOrder = state.orders.get(params.orderId);

    if (!existingOrder) {
      throw notFound("Ticket order not found");
    }

    if (existingOrder.status === "paid") {
      return {
        order: existingOrder,
        fulfilled: false,
      };
    }

    if (existingOrder.status !== "pending" && existingOrder.status !== "checkout_started") {
      throw conflict("Ticket order cannot transition to paid from its current state.");
    }

    const nextOrder: TicketOrder = {
      ...existingOrder,
      status: "paid",
      stripeConnectedAccountId:
        params.stripeConnectedAccountId ?? existingOrder.stripeConnectedAccountId,
      stripeCheckoutSessionId:
        params.stripeCheckoutSessionId ?? existingOrder.stripeCheckoutSessionId,
      stripePaymentIntentId:
        params.stripePaymentIntentId ?? existingOrder.stripePaymentIntentId,
      updatedAt: params.occurredAt,
    };
    const paymentState = nextOrder.totalAmount > 0 ? "paid" : "not_required";
    const event = state.events.get(nextOrder.eventId);

    if (!event) {
      throw notFound("Event not found");
    }

    let nextEvent = event;
    let nextUser = state.consumerUser;

    for (const item of nextOrder.items) {
      const section = (nextEvent.tickets.sections ?? []).find(
        (candidate) => candidate.id === item.ticketSectionId,
      );

      if (!section) {
        throw notFound("Ticket section not found for order item.");
      }

      const phase = section.phases.find((candidate) => candidate.id === item.ticketPhaseId);

      if (!phase) {
        throw notFound("Ticket phase not found for order item.");
      }

      if ((phase.quantitySold ?? 0) + item.quantity > phase.quantityAvailable) {
        throw conflict("Confirmed payment would exceed the available ticket inventory.");
      }

      nextEvent = syncTicketPurchaseToEvent(nextEvent, {
        userId: nextOrder.consumerUserId,
        accessGroupId: section.accessGroupId,
        ticketPhaseId: phase.id,
        quantity: item.quantity,
        purchasedAt: params.occurredAt,
        paymentState,
        source: "purchase",
      });

      nextUser = syncTicketPurchaseToUser(nextUser, {
        eventSlug: nextEvent.slug,
        quantity: item.quantity,
        accessGroupId: section.accessGroupId,
        ticketLabel: section.name,
        status: getConsumerWalletStatusForPaymentState(paymentState),
      });
    }

    const upcomingTicketEventSlugs = new Set(nextUser.upcomingTicketEventSlugs ?? []);
    const pastTicketEventSlugs = new Set(nextUser.pastTicketEventSlugs ?? []);

    if (nextEvent.status === "past") {
      upcomingTicketEventSlugs.delete(nextEvent.slug);
      pastTicketEventSlugs.add(nextEvent.slug);
    } else {
      pastTicketEventSlugs.delete(nextEvent.slug);
      upcomingTicketEventSlugs.add(nextEvent.slug);
    }

    state.consumerUser = {
      ...nextUser,
      upcomingTicketEventSlugs: Array.from(upcomingTicketEventSlugs),
      pastTicketEventSlugs: Array.from(pastTicketEventSlugs),
    };
    state.events.set(nextEvent.id, nextEvent);
    state.orders.set(nextOrder.id, nextOrder);

    return {
      order: nextOrder,
      fulfilled: true,
      event: nextEvent,
      user: state.consumerUser,
    };
  }),
  getTicketOrderRepositoryById: vi.fn(async (id: string) => state.orders.get(id) ?? null),
  getTicketOrderRepositoryByStripeCheckoutSessionId: vi.fn(async (stripeCheckoutSessionId: string) =>
    Array.from(state.orders.values()).find((order) => order.stripeCheckoutSessionId === stripeCheckoutSessionId) ?? null,
  ),
  getTicketOrderRepositoryByStripePaymentIntentId: vi.fn(async (stripePaymentIntentId: string) =>
    Array.from(state.orders.values()).find((order) => order.stripePaymentIntentId === stripePaymentIntentId) ?? null,
  ),
  listTicketOrdersRepositoryByEventId: vi.fn(async (
    eventId: string,
    options?: {
      status?: TicketOrder["status"];
    },
  ) =>
    Array.from(state.orders.values())
      .filter((order) => {
        if (order.eventId !== eventId) {
          return false;
        }

        if (options?.status && order.status !== options.status) {
          return false;
        }

        return true;
      })
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || right.createdAt.localeCompare(left.createdAt))),
  listPaidTicketSalesSummaryRepositoryByEventId: vi.fn(async (eventId: string) => {
    const event = state.events.get(eventId);

    if (!event) {
      return [];
    }

    const sectionsById = new Map((event.tickets.sections ?? []).map((section) => [section.id, section]));
    const phasesById = new Map(
      (event.tickets.sections ?? []).flatMap((section) =>
        section.phases.map((phase) => [phase.id, phase] as const),
      ),
    );
    const summaryByKey = new Map<string, {
      ticketSectionId: string;
      ticketSectionName: string;
      ticketPhaseId: string;
      ticketPhaseName: string;
      ticketsSold: number;
      remainingInventory: number;
      grossRevenue: number;
    }>();

    for (const order of Array.from(state.orders.values()).filter(
      (candidate) => candidate.eventId === eventId && candidate.status === "paid",
    )) {
      for (const item of order.items) {
        const section = sectionsById.get(item.ticketSectionId);
        const phase = phasesById.get(item.ticketPhaseId);
        const key = `${item.ticketSectionId}:${item.ticketPhaseId}`;
        const existing = summaryByKey.get(key);

        summaryByKey.set(key, {
          ticketSectionId: item.ticketSectionId,
          ticketSectionName: section?.name ?? "Archived section",
          ticketPhaseId: item.ticketPhaseId,
          ticketPhaseName: phase?.name ?? "Archived phase",
          ticketsSold: (existing?.ticketsSold ?? 0) + item.quantity,
          remainingInventory: phase
            ? Math.max(phase.quantityAvailable - (phase.quantitySold ?? 0), 0)
            : 0,
          grossRevenue: (existing?.grossRevenue ?? 0) + item.totalPrice,
        });
      }
    }

    return [...summaryByKey.values()];
  }),
  updateTicketOrderRepository: vi.fn(async (id: string, update) => {
    const existing = state.orders.get(id);

    if (!existing) {
      throw new Error(`Missing ticket order ${id}`);
    }

    const nextOrder: TicketOrder = {
      ...existing,
      ...update,
      updatedAt: "2026-04-26T00:00:00.000Z",
    };

    state.orders.set(id, nextOrder);
    return nextOrder;
  }),
}));

vi.mock("@/lib/stripe/server", () => ({
  getStripeServerClient: stripeMocks.getStripeServerClient,
}));

vi.mock("@/lib/stripe/config", () => ({
  getStripeConfig: stripeMocks.getStripeConfig,
  isStripeConfigured: stripeMocks.isStripeConfigured,
}));

import { getPublicReadableEvents } from "@/lib/auth/permissions";
import { resolveConsumerTicketStatus } from "@/lib/consumer-ticket-status";
import {
  createEventService,
  transitionEventStatusService,
} from "@/lib/services/event-service";
import { getOwnedEventAttendeeReportService } from "@/lib/services/attendee-service";
import {
  updateEventCoverService,
  updateEventLineupService,
  updateEventTimetableService,
  updateEventTicketsService,
} from "@/lib/services/event-editor-service";
import {
  createCheckoutIntentService,
  handleStripeWebhookService,
} from "@/lib/services/checkout-service";
import { saveConsumerEventService } from "@/lib/services/consumer-service";
import {
  applyToCuratedEventService,
  approveCuratedApplicationService,
} from "@/lib/services/application-service";

describe("backend acceptance flows", () => {
  beforeEach(() => {
    state.role = "recruiter";
    state.recruiterProfile = buildRecruiterProfile();
    state.consumerUser = buildConsumerUser();
    state.events = new Map();
    state.orders = new Map();
    state.organization = {
      id: "organization-recruiter-neon-harbor",
      slug: "neon-harbor",
      name: "Neon Harbor",
      type: "nightclub",
      stripeAccountId: "acct_123",
      stripeChargesEnabled: true,
      stripePayoutsEnabled: true,
      stripeDetailsSubmitted: true,
    };
    state.nextOrderId = 1;
    stripeMocks.getStripeConfig.mockReturnValue({
      STRIPE_SECRET_KEY: "sk_test_123",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_123",
      STRIPE_WEBHOOK_SECRET: "whsec_123",
      STRIPE_CONNECT_RETURN_URL: "http://localhost:3000/office",
      STRIPE_CONNECT_REFRESH_URL: "http://localhost:3000/office",
      STRIPE_CHECKOUT_SUCCESS_URL: "http://localhost:3000/tickets/success",
      STRIPE_CHECKOUT_CANCEL_URL: "http://localhost:3000/tickets/cancel",
    });
    stripeMocks.isStripeConfigured.mockReturnValue(true);
    stripeMocks.stripeCheckoutSessionsCreate.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.test/session/cs_test_123",
      payment_intent: "pi_test_123",
    });
    stripeMocks.stripeAccountsRetrieve.mockResolvedValue({
      country: "ES",
    });
    stripeMocks.stripeConnectedAccountsRetrieve.mockResolvedValue({
      identity: {
        country: "ES",
      },
    });
    stripeMocks.getStripeServerClient.mockReturnValue({
      checkout: {
        sessions: {
          create: stripeMocks.stripeCheckoutSessionsCreate,
        },
      },
      accounts: {
        retrieve: stripeMocks.stripeAccountsRetrieve,
      },
      v2: {
        core: {
          accounts: {
            retrieve: stripeMocks.stripeConnectedAccountsRetrieve,
          },
        },
      },
    });
  });

  it("covers recruiter draft creation through consumer save and purchase", async () => {
    const draftEvent = await createEventService({ slug: "space-opening-2026-08-01" });

    expect(draftEvent.status).toBe("draft");

    await updateEventCoverService(draftEvent.id, {
      cover: {
        ...draftEvent.cover,
        title: "Space Opening 2026",
        date: "2026-08-01",
        location: "Northport",
        venue: "Neon Harbor",
        imageUrl: "/mock/event-covers/opening.jpg",
        imageAlt: "Space Opening 2026",
        capacityTarget: 2000,
        genres: ["House"],
        type: "room",
        roomSize: 2000,
        numberOfRooms: 2,
        rooms: [
          { id: "room-main", name: "Main Room", capacity: 1200, genres: ["House"] },
          { id: "room-terrace", name: "Terrace", capacity: 800, genres: ["Disco"] },
        ],
      },
    });
    await updateEventLineupService(draftEvent.id, {
      lineup: {
        displayMode: "room",
        entries: [
          {
            id: "lineup-entry-carl-craig",
            artistId: "artist-carl-craig",
            name: "Carl Craig",
            kind: "main",
            roomIds: ["room-main"],
          },
        ],
      },
    });
    await updateEventTimetableService(draftEvent.id, {
      timetable: {
        startTime: "21:00",
        endTime: "06:00",
        rows: [
          {
            id: "row-1",
            title: "Carl Craig",
            lineupEntryId: "lineup-entry-carl-craig",
            room: "Main Room",
            startTime: "23:00",
            endTime: "01:00",
            sortOrder: 0,
          },
        ],
      },
    });
    await updateEventTicketsService(draftEvent.id, {
      tickets: {
        tiers: [],
        sections: [
          {
            id: "ticket-section-regular-entry",
            name: "Regular Entry",
            visibility: "public",
            accessGroupId: "group-regular-entry",
            allowedGroupIds: [],
            phases: [
              {
                id: "ticket-phase-general",
                name: "General Admission",
                price: 45,
                quantityAvailable: 100,
                quantitySold: 0,
                visibility: "public",
                status: "live",
                sortOrder: 0,
                releaseMode: "manual",
              },
            ],
          },
        ],
      },
    });

    const upcomingEvent = await transitionEventStatusService(draftEvent.id, "upcoming");
    expect(upcomingEvent).not.toBeNull();
    const liveEvent = await transitionEventStatusService(upcomingEvent!.id, "live");
    expect(liveEvent).not.toBeNull();

    expect(getPublicReadableEvents([liveEvent!]).map((event) => event.id)).toContain(liveEvent!.id);
    expect(Array.from(state.events.values()).map((event) => event.id)).toContain(liveEvent!.id);

    state.role = "consumer";
    const savedUser = await saveConsumerEventService(state.consumerUser.id, liveEvent!.slug);
    expect(savedUser!.savedEventSlugs).toContain(liveEvent!.slug);

    const checkoutIntent = await createCheckoutIntentService({
      eventId: liveEvent!.id,
      userId: state.consumerUser.id,
      sectionId: "ticket-section-regular-entry",
      quantity: 1,
    });
    expect(checkoutIntent.fulfilled).toBe(false);
    expect(checkoutIntent.order.status).toBe("checkout_started");
    expect(checkoutIntent.order.stripeConnectedAccountId).toBe(state.organization.stripeAccountId);
    expect(checkoutIntent.order.stripeCheckoutSessionId).toBe("cs_test_123");
    expect(checkoutIntent.checkout.stripeCheckoutUrl).toBe(
      "https://checkout.stripe.test/session/cs_test_123",
    );

    const purchaseResult = await handleStripeWebhookService({
      orderId: checkoutIntent.order.id,
      status: "paid",
      stripeCheckoutSessionId: "cs_test_123",
      stripePaymentIntentId: "pi_test_123",
      occurredAt: "2026-04-26T00:00:00.000Z",
    });
    expect(purchaseResult.fulfilled).toBe(true);
    if (!purchaseResult.event || !purchaseResult.user) {
      throw new Error("Expected fulfilled purchase result");
    }

    expect(purchaseResult.event.accessAssignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: state.consumerUser.id,
          accessGroupId: "group-regular-entry",
          paymentState: "paid",
        }),
      ]),
    );
    expect(purchaseResult.user.ticketWalletEntries?.[0]?.eventSlug).toBe(liveEvent!.slug);
    expect(purchaseResult.event.tickets.sections?.[0]?.phases[0]?.quantitySold).toBe(1);

    const duplicateWebhookResult = await handleStripeWebhookService({
      orderId: checkoutIntent.order.id,
      status: "paid",
      stripeCheckoutSessionId: "cs_test_123",
      stripePaymentIntentId: "pi_test_123",
      occurredAt: "2026-04-26T00:05:00.000Z",
    });
    expect(duplicateWebhookResult.fulfilled).toBe(false);
    expect(state.consumerUser.ticketWalletEntries?.[0]?.quantity).toBe(1);

    state.role = "recruiter";
    const attendeeReport = await getOwnedEventAttendeeReportService(liveEvent!.id);

    expect(attendeeReport.attendees).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          attendeeUsername: state.consumerUser.username,
          ticketSectionName: "Regular Entry",
          paymentState: "paid",
        }),
      ]),
    );
    expect(attendeeReport.summary.ticketsSold).toBe(1);
  });

  it("prevents consumers from buying restricted ticket sections they are not eligible to access", async () => {
    const restrictedEvent = buildLiveCuratedEvent({
      id: "event-restricted-2026-08-02",
      slug: "restricted-2026-08-02",
      admissionMode: "public",
      tickets: {
        tiers: [],
        sections: [
          {
            id: "ticket-section-guestlist",
            name: "Guestlist",
            visibility: "restricted",
            accessGroupId: "group-guestlist",
            allowedGroupIds: ["group-guestlist"],
            phases: [
              {
                id: "ticket-phase-guestlist",
                name: "Guestlist Access",
                price: 0,
                quantityAvailable: 50,
                quantitySold: 0,
                visibility: "public",
                status: "live",
                sortOrder: 0,
                releaseMode: "manual",
              },
            ],
          },
        ],
      },
    });
    state.events.set(restrictedEvent.id, restrictedEvent);

    state.role = "consumer";
    await expect(
      createCheckoutIntentService({
        eventId: restrictedEvent.id,
        userId: state.consumerUser.id,
        sectionId: "ticket-section-guestlist",
        phaseId: "ticket-phase-guestlist",
        quantity: 1,
      }),
    ).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
      message: "This ticket section is not available to the current user.",
    });
  });

  it("covers curated apply, approval, and ticket status derivation from assignment state", async () => {
    const curatedEvent = buildLiveCuratedEvent();
    state.events.set(curatedEvent.id, curatedEvent);

    state.role = "consumer";
    const appliedEvent = await applyToCuratedEventService({
      eventId: curatedEvent.id,
      userId: state.consumerUser.id,
    });
    expect(appliedEvent!.applications[0]).toMatchObject({
      userId: state.consumerUser.id,
      status: "pending",
    });

    state.role = "recruiter";
    const approvedEvent = await approveCuratedApplicationService({
      eventId: curatedEvent.id,
      userId: state.consumerUser.id,
      accessGroupId: "group-guestlist",
    });

    expect(approvedEvent.applications[0]).toMatchObject({
      userId: state.consumerUser.id,
      status: "accepted",
    });

    const checkedInAssignment = {
      ...approvedEvent.accessAssignments[0],
      checkedIn: true,
    };

    expect(resolveConsumerTicketStatus({}, checkedInAssignment)).toBe("scanned");
  });
});
