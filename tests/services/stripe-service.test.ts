import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getStripeServerClient: vi.fn(),
  getStripeConfig: vi.fn(),
  stripeAccountsCreate: vi.fn(),
  stripeAccountLinksCreate: vi.fn(),
  stripePlatformAccountRetrieve: vi.fn(),
  stripeConnectedAccountsRetrieve: vi.fn(),
  stripeCheckoutSessionsCreate: vi.fn(),
  stripeWebhooksConstructEvent: vi.fn(),
}));

vi.mock("@/lib/stripe/server", () => ({
  getStripeServerClient: mocks.getStripeServerClient,
}));

vi.mock("@/lib/stripe/config", () => ({
  getStripeConfig: mocks.getStripeConfig,
}));

import {
  createStripeCheckoutSession,
  createStripeConnectedAccount,
  getStripeConnectedAccountStatus,
  normalizeStripeEventToTicketOrderEvent,
  verifyStripeWebhookEvent,
} from "@/lib/stripe/stripe-service";

describe("stripe service", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getStripeConfig.mockReturnValue({
      STRIPE_SECRET_KEY: "sk_test_123",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_123",
      STRIPE_WEBHOOK_SECRET: "whsec_123",
      STRIPE_CONNECT_RETURN_URL: "http://localhost:3000/office",
      STRIPE_CONNECT_REFRESH_URL: "http://localhost:3000/office",
      STRIPE_CHECKOUT_SUCCESS_URL: "http://localhost:3000/tickets/success",
      STRIPE_CHECKOUT_CANCEL_URL: "http://localhost:3000/tickets/cancel",
    });
    mocks.stripeAccountsCreate.mockResolvedValue({
      id: "acct_123",
    });
    mocks.stripePlatformAccountRetrieve.mockResolvedValue({
      country: "ES",
    });
    mocks.stripeConnectedAccountsRetrieve.mockResolvedValue({
      id: "acct_123",
      identity: {
        country: "US",
      },
      requirements: {
        entries: [],
      },
      configuration: {
        merchant: {
          capabilities: {
            card_payments: { status: "active", status_details: [] },
          },
        },
        recipient: {
          capabilities: {
            stripe_balance: {
              payouts: { status: "active", status_details: [] },
              stripe_transfers: { status: "active", status_details: [] },
            },
          },
        },
      },
    });
    mocks.stripeCheckoutSessionsCreate.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.test/session/cs_test_123",
      payment_intent: "pi_test_123",
    });
    mocks.stripeWebhooksConstructEvent.mockReturnValue({
      id: "evt_123",
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
    mocks.getStripeServerClient.mockReturnValue({
      accounts: {
        retrieve: mocks.stripePlatformAccountRetrieve,
      },
      checkout: {
        sessions: {
          create: mocks.stripeCheckoutSessionsCreate,
        },
      },
      webhooks: {
        constructEvent: mocks.stripeWebhooksConstructEvent,
      },
      v2: {
        core: {
          accounts: {
            create: mocks.stripeAccountsCreate,
            retrieve: mocks.stripeConnectedAccountsRetrieve,
          },
          accountLinks: {
            create: mocks.stripeAccountLinksCreate,
          },
        },
      },
    });
  });

  it("creates Stripe Connect accounts with KUSPACE marketplace metadata", async () => {
    await createStripeConnectedAccount({
      organizationId: "organization-1",
      organizationName: "Aurora Quay",
      organizationSlug: "aurora-quay",
      organizationType: "nightclub",
      contactEmail: "owner@example.com",
      country: "ES",
    });

    expect(mocks.stripeAccountsCreate).toHaveBeenCalledWith({
      configuration: {
        merchant: {
          capabilities: {
            card_payments: { requested: true },
          },
        },
        recipient: {
          capabilities: {
            stripe_balance: {
              payouts: { requested: true },
              stripe_transfers: { requested: true },
            },
          },
        },
      },
      contact_email: "owner@example.com",
      dashboard: "express",
      defaults: {
        profile: {
          doing_business_as: "Aurora Quay",
          product_description: "Event ticket sales and access managed through KUSPACE.",
        },
        responsibilities: {
          fees_collector: "application",
          losses_collector: "application",
        },
      },
      display_name: "Aurora Quay",
      identity: {
        country: "ES",
      },
      metadata: {
        organizationId: "organization-1",
        organizationSlug: "aurora-quay",
        organizationType: "nightclub",
      },
    });
  });

  it("creates checkout sessions for the event-owning organization and sets on_behalf_of cross-region", async () => {
    const result = await createStripeCheckoutSession({
      order: {
        id: "order-1",
        eventId: "event-1",
        organizationId: "organization-1",
        consumerUserId: "consumer-1",
        status: "pending",
        currency: "EUR",
        subtotalAmount: 80,
        totalAmount: 80,
        stripeConnectedAccountId: "acct_123",
        stripeCheckoutSessionId: undefined,
        stripePaymentIntentId: undefined,
        createdAt: "2026-04-25T00:00:00.000Z",
        updatedAt: "2026-04-25T00:00:00.000Z",
        items: [],
      },
      customerEmail: "buyer@example.com",
      eventTitle: "Space Opening",
      stripeConnectedAccountId: "acct_123",
      lineItems: [
        {
          quantity: 2,
          unitAmount: 40,
          currency: "EUR",
          productName: "Regular Entry",
          productDescription: "General Admission",
        },
      ],
    });

    expect(mocks.stripeCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        client_reference_id: "order-1",
        customer_email: "buyer@example.com",
        metadata: {
          orderId: "order-1",
          eventId: "event-1",
          organizationId: "organization-1",
          consumerUserId: "consumer-1",
        },
        line_items: [
          {
            quantity: 2,
            price_data: {
              currency: "eur",
              unit_amount: 4000,
              product_data: {
                name: "Regular Entry",
                description: "Space Opening · General Admission",
              },
            },
          },
        ],
        payment_intent_data: {
          metadata: {
            orderId: "order-1",
            eventId: "event-1",
            organizationId: "organization-1",
            consumerUserId: "consumer-1",
          },
          on_behalf_of: "acct_123",
          transfer_data: {
            destination: "acct_123",
          },
        },
      }),
    );
    expect(result).toMatchObject({
      sessionId: "cs_test_123",
      sessionUrl: "https://checkout.stripe.test/session/cs_test_123",
      paymentIntentId: "pi_test_123",
      stripeOnBehalfOfAccountId: "acct_123",
      successUrl: "http://localhost:3000/tickets/success",
      cancelUrl: "http://localhost:3000/tickets/cancel",
    });
  });

  it("maps Stripe connected-account capability state into KUSPACE readiness flags", async () => {
    const result = await getStripeConnectedAccountStatus("acct_123");

    expect(mocks.stripeConnectedAccountsRetrieve).toHaveBeenCalledWith("acct_123", {
      include: ["configuration.merchant", "configuration.recipient", "requirements"],
    });
    expect(result.status).toEqual({
      stripeAccountId: "acct_123",
      stripeChargesEnabled: true,
      stripePayoutsEnabled: true,
      stripeDetailsSubmitted: true,
      onboardingComplete: true,
    });
  });

  it("verifies webhook signatures through Stripe and normalizes transition events", () => {
    const event = verifyStripeWebhookEvent("{\"id\":\"evt_123\"}", "t=1,v1=test");

    expect(mocks.stripeWebhooksConstructEvent).toHaveBeenCalledWith(
      "{\"id\":\"evt_123\"}",
      "t=1,v1=test",
      "whsec_123",
    );

    expect(
      normalizeStripeEventToTicketOrderEvent({
        id: "evt_124",
        type: "checkout.session.completed",
        created: 1714176000,
        data: {
          object: {
            id: "cs_test_123",
            payment_status: "paid",
            payment_intent: "pi_test_123",
            metadata: {
              orderId: "order-1",
            },
          },
        },
      } as never),
    ).toMatchObject({
      handled: true,
      eventType: "checkout.session.completed",
      transitionStatus: "paid",
      orderReference: {
        orderId: "order-1",
        stripeCheckoutSessionId: "cs_test_123",
        stripePaymentIntentId: "pi_test_123",
      },
    });

    expect(
      normalizeStripeEventToTicketOrderEvent({
        id: "evt_125",
        type: "checkout.session.completed",
        created: 1714176000,
        data: {
          object: {
            id: "cs_test_456",
            payment_status: "unpaid",
            payment_intent: "pi_test_456",
            metadata: {
              orderId: "order-2",
            },
          },
        },
      } as never),
    ).toMatchObject({
      handled: true,
      eventType: "checkout.session.completed",
      transitionStatus: undefined,
      orderReference: {
        orderId: "order-2",
        stripeCheckoutSessionId: "cs_test_456",
        stripePaymentIntentId: "pi_test_456",
      },
    });

    expect(event).toMatchObject({
      id: "evt_123",
      type: "payment_intent.succeeded",
    });
  });
});
