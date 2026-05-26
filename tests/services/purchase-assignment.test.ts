import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildConsumerUser, buildLivePublicEvent } from "@/tests/helpers/fixtures";
import type { Event } from "@/types/event";
import type { TicketOrder } from "@/types/order";
import type { ConsumerUser } from "@/types/user";

let currentEvent: Event;
let currentUser: ConsumerUser;
let nextOrderId = 1;
const orderStore = new Map<string, TicketOrder>();

const mocks = vi.hoisted(() => ({
  requireOwnedConsumerUserService: vi.fn(),
  requireConsumerActor: vi.fn(),
  getConsumerRepositoryById: vi.fn(),
  saveConsumerRepository: vi.fn(),
  getEventTicketRepositoryByEventId: vi.fn(),
  saveEventTicketRepository: vi.fn(),
  getOrganizationRepositoryById: vi.fn(),
  createTicketOrderRepository: vi.fn(),
  getTicketOrderRepositoryById: vi.fn(),
  getTicketOrderRepositoryByStripeCheckoutSessionId: vi.fn(),
  getTicketOrderRepositoryByStripePaymentIntentId: vi.fn(),
  updateTicketOrderRepository: vi.fn(),
  getStripeServerClient: vi.fn(),
  getStripeConfig: vi.fn(),
  isStripeConfigured: vi.fn(),
  stripeCheckoutSessionsCreate: vi.fn(),
  stripeCheckoutSessionsRetrieve: vi.fn(),
  stripeWebhooksConstructEvent: vi.fn(),
  stripeAccountsRetrieve: vi.fn(),
  stripeConnectedAccountsRetrieve: vi.fn(),
}));

vi.mock("@/lib/services/access-service", () => ({
  requireOwnedConsumerUserService: mocks.requireOwnedConsumerUserService,
}));

vi.mock("@/lib/auth/actor", () => ({
  requireConsumerActor: mocks.requireConsumerActor,
}));

vi.mock("@/lib/db/repositories/consumer-repository", () => ({
  getConsumerRepositoryById: mocks.getConsumerRepositoryById,
  saveConsumerRepository: mocks.saveConsumerRepository,
}));

vi.mock("@/lib/db/repositories/ticket-repository", () => ({
  getEventTicketRepositoryByEventId: mocks.getEventTicketRepositoryByEventId,
  saveEventTicketRepository: mocks.saveEventTicketRepository,
}));

vi.mock("@/lib/db/repositories/organization-repository", () => ({
  getOrganizationRepositoryById: mocks.getOrganizationRepositoryById,
}));

vi.mock("@/lib/db/repositories/order-repository", () => ({
  createTicketOrderRepository: mocks.createTicketOrderRepository,
  getTicketOrderRepositoryById: mocks.getTicketOrderRepositoryById,
  getTicketOrderRepositoryByStripeCheckoutSessionId: mocks.getTicketOrderRepositoryByStripeCheckoutSessionId,
  getTicketOrderRepositoryByStripePaymentIntentId: mocks.getTicketOrderRepositoryByStripePaymentIntentId,
  updateTicketOrderRepository: mocks.updateTicketOrderRepository,
}));

vi.mock("@/lib/stripe/server", () => ({
  getStripeServerClient: mocks.getStripeServerClient,
}));

vi.mock("@/lib/stripe/config", () => ({
  getStripeConfig: mocks.getStripeConfig,
  isStripeConfigured: mocks.isStripeConfigured,
}));

import {
  createCheckoutIntentService,
  getTicketCheckoutStatusService,
  handleStripeEventService,
  handleStripeWebhookService,
  simulateInternalTicketPurchaseService,
  verifyAndHandleStripeWebhookEventService,
} from "@/lib/services/checkout-service";

describe("ticket purchase assignment creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentEvent = buildLivePublicEvent();
    currentUser = buildConsumerUser();
    nextOrderId = 1;
    orderStore.clear();

    mocks.requireOwnedConsumerUserService.mockResolvedValue({
      actor: { currentConsumerUserId: currentUser.id },
      user: currentUser,
    });
    mocks.requireConsumerActor.mockResolvedValue({
      role: "consumer",
      clerkUserId: "clerk-user-1",
      currentConsumerUserId: currentUser.id,
      currentRecruiterProfileId: null,
    });
    mocks.getEventTicketRepositoryByEventId.mockImplementation(async () => currentEvent);
    mocks.getConsumerRepositoryById.mockImplementation(async () => currentUser);
    mocks.saveEventTicketRepository.mockImplementation(async (nextEvent) => {
      currentEvent = nextEvent;
      return nextEvent;
    });
    mocks.saveConsumerRepository.mockImplementation(async (nextUser) => {
      currentUser = nextUser;
      return nextUser;
    });
    mocks.getOrganizationRepositoryById.mockResolvedValue({
      id: "organization-recruiter-neon-harbor",
      slug: "neon-harbor",
      name: "Neon Harbor",
      type: "nightclub",
      stripeAccountId: "acct_123",
      stripeChargesEnabled: true,
      stripePayoutsEnabled: true,
      stripeDetailsSubmitted: true,
    });
    mocks.getStripeConfig.mockReturnValue({
      STRIPE_SECRET_KEY: "sk_test_123",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_123",
      STRIPE_WEBHOOK_SECRET: "whsec_123",
      STRIPE_CONNECT_RETURN_URL: "http://localhost:3000/office",
      STRIPE_CONNECT_REFRESH_URL: "http://localhost:3000/office",
      STRIPE_CHECKOUT_SUCCESS_URL: "http://localhost:3000/tickets/success",
      STRIPE_CHECKOUT_CANCEL_URL: "http://localhost:3000/tickets/cancel",
    });
    mocks.isStripeConfigured.mockReturnValue(true);
    mocks.stripeCheckoutSessionsCreate.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.test/session/cs_test_123",
      payment_intent: "pi_test_123",
    });
    mocks.stripeCheckoutSessionsRetrieve.mockResolvedValue({
      id: "cs_test_123",
      status: "complete",
      payment_status: "paid",
      payment_intent: "pi_test_123",
    });
    mocks.stripeAccountsRetrieve.mockResolvedValue({
      country: "ES",
    });
    mocks.stripeConnectedAccountsRetrieve.mockResolvedValue({
      identity: {
        country: "ES",
      },
    });
    mocks.getStripeServerClient.mockReturnValue({
      checkout: {
        sessions: {
          create: mocks.stripeCheckoutSessionsCreate,
          retrieve: mocks.stripeCheckoutSessionsRetrieve,
        },
      },
      webhooks: {
        constructEvent: mocks.stripeWebhooksConstructEvent,
      },
      accounts: {
        retrieve: mocks.stripeAccountsRetrieve,
      },
      v2: {
        core: {
          accounts: {
            retrieve: mocks.stripeConnectedAccountsRetrieve,
          },
        },
      },
    });
    mocks.createTicketOrderRepository.mockImplementation(async (order: {
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
      const storedOrder: TicketOrder = {
        id: `order-${nextOrderId++}`,
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
          id: `item-${index + 1}`,
          orderId: `order-${nextOrderId - 1}`,
          ticketSectionId: item.ticketSectionId,
          ticketPhaseId: item.ticketPhaseId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          createdAt: "2026-04-25T00:00:00.000Z",
        })),
      };

      orderStore.set(storedOrder.id, storedOrder);
      return storedOrder;
    });
    mocks.getTicketOrderRepositoryById.mockImplementation(async (id) => orderStore.get(id) ?? null);
    mocks.getTicketOrderRepositoryByStripeCheckoutSessionId.mockImplementation(async (stripeCheckoutSessionId) =>
      Array.from(orderStore.values()).find((order) => order.stripeCheckoutSessionId === stripeCheckoutSessionId) ?? null,
    );
    mocks.getTicketOrderRepositoryByStripePaymentIntentId.mockImplementation(async (stripePaymentIntentId) =>
      Array.from(orderStore.values()).find((order) => order.stripePaymentIntentId === stripePaymentIntentId) ?? null,
    );
    mocks.updateTicketOrderRepository.mockImplementation(async (id, update) => {
      const existing = orderStore.get(id);

      if (!existing) {
        throw new Error(`Missing order ${id}`);
      }

      const nextOrder: TicketOrder = {
        ...existing,
        ...update,
        updatedAt: "2026-04-26T00:00:00.000Z",
      };

      orderStore.set(id, nextOrder);
      return nextOrder;
    });
  });

  it("creates wallet entries, quantitySold, and event access assignments for no-payment tickets", async () => {
    currentEvent = buildLivePublicEvent({
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
                price: 0,
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

    const result = await simulateInternalTicketPurchaseService({
      eventId: currentEvent.id,
      userId: currentUser.id,
      sectionId: "ticket-section-regular-entry",
      quantity: 2,
    });

    expect(result.fulfilled).toBe(true);
    expect(result.order.status).toBe("paid");
    expect(result.event?.tickets.sections?.[0]?.phases[0]?.quantitySold).toBe(2);
    expect(result.event?.accessAssignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: currentUser.id,
          accessGroupId: "group-regular-entry",
          source: "purchase",
          paymentState: "not_required",
        }),
      ]),
    );
    expect(result.user?.ticketWalletEntries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventSlug: currentEvent.slug,
          quantity: 2,
          accessGroupId: "group-regular-entry",
          status: "active",
        }),
      ]),
    );
  });

  it("creates a checkout-started order for paid tickets without fulfilling access immediately", async () => {
    const result = await createCheckoutIntentService({
      eventId: currentEvent.id,
      userId: currentUser.id,
      sectionId: "ticket-section-regular-entry",
      quantity: 2,
    });

    expect(result.fulfilled).toBe(false);
    expect(result.order.status).toBe("checkout_started");
    expect(result.order.stripeConnectedAccountId).toBe("acct_123");
    expect(result.order.stripeCheckoutSessionId).toBe("cs_test_123");
    expect(result.order.stripePaymentIntentId).toBe("pi_test_123");
    expect(result.intent.orderId).toBe(result.order.id);
    expect(result.intent.paymentState).toBe("pending");
    expect(result.intent.providerReference).toBe("cs_test_123");
    expect(result.checkout.requiresWebhookConfirmation).toBe(true);
    expect(result.checkout.stripeCheckoutSessionId).toBe("cs_test_123");
    expect(result.checkout.stripeCheckoutUrl).toBe(
      "https://checkout.stripe.test/session/cs_test_123",
    );
    expect(mocks.stripeCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        client_reference_id: result.order.id,
        metadata: expect.objectContaining({
          orderId: result.order.id,
        }),
        payment_intent_data: expect.objectContaining({
          transfer_data: {
            destination: "acct_123",
          },
        }),
      }),
    );
    expect(currentEvent.accessAssignments).toHaveLength(0);
    expect(currentUser.ticketWalletEntries).toHaveLength(0);
    expect(currentEvent.tickets.sections?.[0]?.phases[0]?.quantitySold).toBe(0);
  });

  it("sets on_behalf_of for cross-region destination charges", async () => {
    mocks.stripeConnectedAccountsRetrieve.mockResolvedValue({
      identity: {
        country: "US",
      },
    });

    await createCheckoutIntentService({
      eventId: currentEvent.id,
      userId: currentUser.id,
      sectionId: "ticket-section-regular-entry",
      quantity: 1,
    });

    expect(mocks.stripeCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_intent_data: expect.objectContaining({
          on_behalf_of: "acct_123",
          transfer_data: {
            destination: "acct_123",
          },
        }),
      }),
    );
  });

  it("returns processing from the checkout status endpoint until the webhook marks the order paid", async () => {
    const checkoutIntent = await createCheckoutIntentService({
      eventId: currentEvent.id,
      userId: currentUser.id,
      sectionId: "ticket-section-regular-entry",
      quantity: 1,
    });

    const result = await getTicketCheckoutStatusService({
      orderId: checkoutIntent.order.id,
      stripeCheckoutSessionId: "cs_test_123",
    });

    expect(mocks.stripeCheckoutSessionsRetrieve).toHaveBeenCalledWith("cs_test_123");
    expect(result.checkout.state).toBe("processing");
    expect(result.checkout.stripeCheckoutSessionId).toBe("cs_test_123");
    expect(result.checkout.stripePaymentIntentId).toBe("pi_test_123");
  });

  it("returns paid from checkout status after webhook fulfillment completes", async () => {
    const checkoutIntent = await createCheckoutIntentService({
      eventId: currentEvent.id,
      userId: currentUser.id,
      sectionId: "ticket-section-regular-entry",
      quantity: 1,
    });

    await handleStripeWebhookService({
      orderId: checkoutIntent.order.id,
      status: "paid",
      stripeCheckoutSessionId: "cs_test_123",
      stripePaymentIntentId: "pi_test_123",
      occurredAt: "2026-04-26T00:00:00.000Z",
    });

    const result = await getTicketCheckoutStatusService({
      orderId: checkoutIntent.order.id,
    });

    expect(result.checkout.state).toBe("paid");
  });

  it("handles checkout.session.completed events from Stripe without fulfilling from the redirect", async () => {
    const checkoutIntent = await createCheckoutIntentService({
      eventId: currentEvent.id,
      userId: currentUser.id,
      sectionId: "ticket-section-regular-entry",
      quantity: 1,
    });

    const result = await handleStripeEventService({
      id: "evt_123",
      type: "checkout.session.completed",
      created: 1714176000,
      data: {
        object: {
          id: "cs_test_123",
          payment_status: "paid",
          payment_intent: "pi_test_123",
          metadata: {
            orderId: checkoutIntent.order.id,
          },
        },
      },
    } as never);

    expect(result.handled).toBe(true);
    expect(result).toMatchObject({
      fulfilled: true,
    });
    if (!("order" in result)) {
      throw new Error("Expected Stripe checkout completion to resolve an order");
    }
    expect(result.order.status).toBe("paid");
  });

  it("marks orders as payment_failed from async Stripe failure events", async () => {
    const checkoutIntent = await createCheckoutIntentService({
      eventId: currentEvent.id,
      userId: currentUser.id,
      sectionId: "ticket-section-regular-entry",
      quantity: 1,
    });

    const result = await handleStripeEventService({
      id: "evt_124",
      type: "checkout.session.async_payment_failed",
      created: 1714176000,
      data: {
        object: {
          id: "cs_test_123",
          payment_status: "unpaid",
          payment_intent: "pi_test_123",
          metadata: {
            orderId: checkoutIntent.order.id,
          },
        },
      },
    } as never);

    expect(result.handled).toBe(true);
    expect(result).toMatchObject({
      fulfilled: false,
    });
    if (!("order" in result)) {
      throw new Error("Expected Stripe async failure to resolve an order");
    }
    expect(result.order.status).toBe("payment_failed");
  });

  it("verifies Stripe signatures before handling webhook payloads", async () => {
    mocks.stripeWebhooksConstructEvent.mockReturnValue({
      id: "evt_125",
      type: "payment_intent.succeeded",
      created: 1714176000,
      data: {
        object: {
          id: "pi_test_123",
          metadata: {
            orderId: "order-1",
          },
        },
      },
    });

    orderStore.set("order-1", {
      id: "order-1",
      eventId: currentEvent.id,
      organizationId: "organization-recruiter-neon-harbor",
      consumerUserId: currentUser.id,
      status: "checkout_started",
      currency: "EUR",
      subtotalAmount: 40,
      totalAmount: 40,
      stripeConnectedAccountId: "acct_123",
      stripeCheckoutSessionId: "cs_test_123",
      stripePaymentIntentId: "pi_test_123",
      createdAt: "2026-04-25T00:00:00.000Z",
      updatedAt: "2026-04-25T00:00:00.000Z",
      items: [
        {
          id: "item-1",
          orderId: "order-1",
          ticketSectionId: "ticket-section-regular-entry",
          ticketPhaseId: "ticket-phase-general",
          quantity: 1,
          unitPrice: 40,
          totalPrice: 40,
          createdAt: "2026-04-25T00:00:00.000Z",
        },
      ],
    });

    const result = await verifyAndHandleStripeWebhookEventService(
      "{\"id\":\"evt_125\"}",
      "t=1,v1=test",
    );

    expect(mocks.stripeWebhooksConstructEvent).toHaveBeenCalledWith(
      "{\"id\":\"evt_125\"}",
      "t=1,v1=test",
      "whsec_123",
    );
    expect(result.received).toBe(true);
    expect(result.eventType).toBe("payment_intent.succeeded");
  });

  it("rejects paid checkout when the organization is not Stripe Connect ready", async () => {
    mocks.getOrganizationRepositoryById.mockResolvedValue({
      id: "organization-recruiter-neon-harbor",
      slug: "neon-harbor",
      name: "Neon Harbor",
      type: "nightclub",
      stripeAccountId: "acct_123",
      stripeChargesEnabled: false,
      stripePayoutsEnabled: true,
      stripeDetailsSubmitted: true,
    });

    await expect(
      createCheckoutIntentService({
        eventId: currentEvent.id,
        userId: currentUser.id,
        sectionId: "ticket-section-regular-entry",
        quantity: 1,
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
      message: "This organization cannot sell paid tickets until Stripe charges are enabled.",
    });

    expect(orderStore.size).toBe(0);
  });

  it("rejects internal provider requests for paid tickets", async () => {
    await expect(
      createCheckoutIntentService({
        eventId: currentEvent.id,
        userId: currentUser.id,
        sectionId: "ticket-section-regular-entry",
        quantity: 1,
        provider: "internal",
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
      message: "Paid ticket checkout must use Stripe.",
    });

    expect(orderStore.size).toBe(0);
  });

  it("fulfills paid orders once when webhook confirmation arrives", async () => {
    const checkoutIntent = await createCheckoutIntentService({
      eventId: currentEvent.id,
      userId: currentUser.id,
      sectionId: "ticket-section-regular-entry",
      quantity: 2,
    });

    const paidResult = await handleStripeWebhookService({
      orderId: checkoutIntent.order.id,
      status: "paid",
      stripeCheckoutSessionId: "cs_test_123",
      stripePaymentIntentId: "pi_test_123",
      occurredAt: "2026-04-26T00:00:00.000Z",
    });

    expect(paidResult.fulfilled).toBe(true);
    expect(paidResult.order.status).toBe("paid");
    expect(paidResult.event?.tickets.sections?.[0]?.phases[0]?.quantitySold).toBe(2);
    expect(paidResult.user?.ticketWalletEntries?.[0]?.quantity).toBe(2);

    const duplicateResult = await handleStripeWebhookService({
      orderId: checkoutIntent.order.id,
      status: "paid",
      stripeCheckoutSessionId: "cs_test_123",
      stripePaymentIntentId: "pi_test_123",
      occurredAt: "2026-04-26T00:05:00.000Z",
    });

    expect(duplicateResult.fulfilled).toBe(false);
    expect(currentEvent.tickets.sections?.[0]?.phases[0]?.quantitySold).toBe(2);
    expect(currentUser.ticketWalletEntries?.[0]?.quantity).toBe(2);
  });
});
