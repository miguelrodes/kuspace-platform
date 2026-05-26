import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildConsumerUser, buildLivePublicEvent } from "@/tests/helpers/fixtures";
import type { Event } from "@/types/event";
import type { TicketOrder } from "@/types/order";

const mocks = vi.hoisted(() => ({
  requireOwnedRecruiterEventService: vi.fn(),
  listPaidTicketOrdersByEventService: vi.fn(),
  getConsumersRepositoryByIds: vi.fn(),
}));

vi.mock("@/lib/services/access-service", () => ({
  requireOwnedRecruiterEventService: mocks.requireOwnedRecruiterEventService,
}));

vi.mock("@/lib/services/order-service", () => ({
  listPaidTicketOrdersByEventService: mocks.listPaidTicketOrdersByEventService,
}));

vi.mock("@/lib/db/repositories/consumer-repository", () => ({
  getConsumersRepositoryByIds: mocks.getConsumersRepositoryByIds,
}));

import { getOwnedEventAttendeeReportService } from "@/lib/services/attendee-service";

describe("attendee service", () => {
  let currentEvent: Event;
  let currentOrders: TicketOrder[];

  beforeEach(() => {
    vi.clearAllMocks();

    currentEvent = buildLivePublicEvent({
      budget: {
        totalBudget: 0,
        doorTicketRevenue: 120,
        items: [],
      },
      accessAssignments: [
        {
          eventId: "event-space-opening-2026-08-01",
          userId: "consumer-luca-dea",
          accessGroupId: "group-regular-entry",
          source: "purchase",
          paymentState: "paid",
          checkedIn: false,
          assignedAt: "2026-04-26T00:00:00.000Z",
        },
      ],
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
                price: 40,
                quantityAvailable: 100,
                quantitySold: 2,
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

    currentOrders = [
      {
        id: "order-1",
        eventId: currentEvent.id,
        organizationId: "organization-recruiter-neon-harbor",
        consumerUserId: "consumer-luca-dea",
        status: "paid",
        currency: "EUR",
        subtotalAmount: 80,
        totalAmount: 80,
        stripeConnectedAccountId: "acct_123",
        stripeCheckoutSessionId: "cs_test_123",
        stripePaymentIntentId: "pi_test_123",
        createdAt: "2026-04-25T00:00:00.000Z",
        updatedAt: "2026-04-26T00:00:00.000Z",
        items: [
          {
            id: "order-1-item-1",
            orderId: "order-1",
            ticketSectionId: "ticket-section-regular-entry",
            ticketPhaseId: "ticket-phase-general",
            quantity: 2,
            unitPrice: 40,
            totalPrice: 80,
            createdAt: "2026-04-25T00:00:00.000Z",
          },
        ],
      },
    ];

    mocks.requireOwnedRecruiterEventService.mockResolvedValue({
      actor: {
        currentOrganizationId: "organization-recruiter-neon-harbor",
      },
      event: currentEvent,
    });
    mocks.listPaidTicketOrdersByEventService.mockResolvedValue(currentOrders);
    mocks.getConsumersRepositoryByIds.mockResolvedValue([
      buildConsumerUser(),
    ]);
  });

  it("builds a recruiter-scoped attendee report from paid orders and access assignments", async () => {
    const report = await getOwnedEventAttendeeReportService(currentEvent.id);

    expect(mocks.requireOwnedRecruiterEventService).toHaveBeenCalledWith(
      currentEvent.id,
      "view attendee reports for",
    );
    expect(mocks.listPaidTicketOrdersByEventService).toHaveBeenCalledWith(currentEvent.id);
    expect(mocks.getConsumersRepositoryByIds).toHaveBeenCalledWith(["consumer-luca-dea"]);

    expect(report.event).toMatchObject({
      id: currentEvent.id,
      title: currentEvent.cover.title,
      venue: currentEvent.cover.venue,
    });
    expect(report.summary).toEqual({
      totalPaidAttendees: 1,
      ticketsSold: 2,
      checkoutRevenueTotal: 80,
      doorTicketRevenue: 120,
      revenueEstimate: 200,
      remainingInventory: 98,
    });
    expect(report.attendees).toEqual([
      expect.objectContaining({
        orderId: "order-1",
        attendeeName: "Luca Dea",
        attendeeUsername: "lucadea",
        ticketSectionName: "Regular Entry",
        ticketPhaseName: "General Admission",
        quantity: 2,
        paymentState: "paid",
        accessGroupName: "Regular Entry",
        checkedIn: false,
        totalPrice: 80,
      }),
    ]);
    expect(report.salesSummary).toEqual([
      {
        ticketSectionId: "ticket-section-regular-entry",
        ticketSectionName: "Regular Entry",
        ticketPhaseId: "ticket-phase-general",
        ticketPhaseName: "General Admission",
        ticketsSold: 2,
        remainingInventory: 98,
        grossRevenue: 80,
      },
    ]);
  });
});
