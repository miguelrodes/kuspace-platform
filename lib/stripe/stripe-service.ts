import "server-only";

import type Stripe from "stripe";
import { conflict } from "@/lib/http/errors";
import { getStripeConfig } from "@/lib/stripe/config";
import { getStripeServerClient } from "@/lib/stripe/server";
import type { TicketOrder } from "@/types/order";
import type { OrganizationType } from "@/types/workspace";

export type StripeTicketOrderTransitionStatus =
  | "paid"
  | "payment_failed"
  | "cancelled"
  | "expired";

export type StripeTicketOrderReference = {
  orderId?: string;
  stripeConnectedAccountId?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
};

export type StripeConnectedAccountCreateInput = {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  organizationType: OrganizationType;
  contactEmail: string;
  country?: string;
};

export type StripeConnectedAccountStatus = {
  stripeAccountId: string;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  stripeDetailsSubmitted: boolean;
  onboardingComplete: boolean;
};

export type StripeCheckoutSessionLineItem = {
  quantity: number;
  unitAmount: number;
  currency: string;
  productName: string;
  productDescription?: string;
};

export type StripeCheckoutSessionCreateInput = {
  order: TicketOrder;
  customerEmail: string;
  eventTitle: string;
  stripeConnectedAccountId: string;
  lineItems: StripeCheckoutSessionLineItem[];
};

export type StripeCheckoutSessionCreateResult = {
  session: Stripe.Checkout.Session;
  sessionId: string;
  sessionUrl: string;
  paymentIntentId?: string;
  stripeOnBehalfOfAccountId?: string;
  successUrl: string;
  cancelUrl: string;
};

export type NormalizedStripeTicketOrderEvent =
  | {
      handled: true;
      eventType: Stripe.Event["type"];
      occurredAt: string;
      orderReference: StripeTicketOrderReference;
      transitionStatus?: StripeTicketOrderTransitionStatus;
    }
  | {
      handled: false;
      eventType: Stripe.Event["type"];
    };

function buildConnectedAccountCreateParams(params: StripeConnectedAccountCreateInput) {
  return {
    contact_email: params.contactEmail,
    dashboard: "express" as const,
    defaults: {
      profile: {
        doing_business_as: params.organizationName,
        product_description: "Event ticket sales and access managed through KUSPACE.",
      },
      responsibilities: {
        fees_collector: "application" as const,
        losses_collector: "application" as const,
      },
    },
    display_name: params.organizationName,
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
    ...(params.country ? { identity: { country: params.country } } : {}),
    metadata: {
      organizationId: params.organizationId,
      organizationSlug: params.organizationSlug,
      organizationType: params.organizationType,
    },
  };
}

function buildStripeHostedOnboardingUseCase(params: {
  refreshUrl: string;
  returnUrl: string;
}) {
  const configurations: Array<"merchant" | "recipient"> = ["merchant", "recipient"];

  return {
    type: "account_onboarding" as const,
    account_onboarding: {
      collection_options: {
        fields: "eventually_due" as const,
        future_requirements: "include" as const,
      },
      configurations,
      refresh_url: params.refreshUrl,
      return_url: params.returnUrl,
    },
  };
}

function buildCheckoutRedirectUrl(baseUrl: string, params: Record<string, string>) {
  const destination = new URL(baseUrl);

  for (const [key, value] of Object.entries(params)) {
    destination.searchParams.set(key, value);
  }

  return destination.toString();
}

function buildStripeCheckoutMetadata(order: TicketOrder) {
  return {
    orderId: order.id,
    eventId: order.eventId,
    organizationId: order.organizationId,
    consumerUserId: order.consumerUserId,
  };
}

function toStripeAmountMinorUnits(amount: number) {
  return Math.round(amount * 100);
}

function isCapabilityActive(status?: "active" | "pending" | "restricted" | "unsupported") {
  return status === "active";
}

export function isStripeDetailsSubmitted(account: Stripe.V2.Core.Account) {
  return !(
    account.requirements?.entries?.some((entry) => entry.awaiting_action_from === "user") ?? false
  );
}

export function getStripeCheckoutSessionPaymentIntentId(session: Stripe.Checkout.Session) {
  return typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id;
}

export function getStripeCheckoutSessionOrderReference(
  session: Stripe.Checkout.Session,
  stripeConnectedAccountId?: string,
): StripeTicketOrderReference {
  return {
    orderId:
      typeof session.metadata?.orderId === "string" && session.metadata.orderId.length > 0
        ? session.metadata.orderId
        : undefined,
    stripeConnectedAccountId,
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: getStripeCheckoutSessionPaymentIntentId(session),
  };
}

function getStripePaymentIntentOrderReference(
  paymentIntent: Stripe.PaymentIntent,
  stripeConnectedAccountId?: string,
): StripeTicketOrderReference {
  const orderId = paymentIntent.metadata?.orderId;

  return {
    orderId: typeof orderId === "string" && orderId.length > 0 ? orderId : undefined,
    stripeConnectedAccountId,
    stripePaymentIntentId: paymentIntent.id,
  };
}

async function getStripeCheckoutOnBehalfOfAccountId(stripeConnectedAccountId: string) {
  const stripe = getStripeServerClient();
  const [platformAccount, connectedAccount] = await Promise.all([
    stripe.accounts.retrieve(null),
    stripe.v2.core.accounts.retrieve(stripeConnectedAccountId, {
      include: ["identity"],
    }),
  ]);

  const platformCountry = platformAccount.country?.toUpperCase() ?? null;
  const connectedCountry = connectedAccount.identity?.country?.toUpperCase() ?? null;

  if (!platformCountry || !connectedCountry) {
    return undefined;
  }

  return platformCountry !== connectedCountry ? stripeConnectedAccountId : undefined;
}

function getStripeEventOccurredAt(event: Stripe.Event) {
  return new Date(event.created * 1000).toISOString();
}

function getStripeEventConnectedAccountId(event: Stripe.Event) {
  return typeof event.account === "string" && event.account.length > 0
    ? event.account
    : undefined;
}

export async function createStripeConnectedAccount(
  input: StripeConnectedAccountCreateInput,
) {
  const stripe = getStripeServerClient();
  return stripe.v2.core.accounts.create(buildConnectedAccountCreateParams(input));
}

export async function createStripeConnectedAccountOnboardingLink(params: {
  stripeAccountId: string;
  requestUrl: string;
}) {
  const config = getStripeConfig();
  const requestOrigin = new URL(params.requestUrl).origin;
  const refreshUrl = new URL(
    "/api/workspace/organizations/current/connect-account/onboarding/refresh",
    requestOrigin,
  ).toString();
  const returnUrl = new URL(
    "/api/workspace/organizations/current/connect-account/onboarding/return",
    requestOrigin,
  ).toString();
  const stripe = getStripeServerClient();
  const accountLink = await stripe.v2.core.accountLinks.create({
    account: params.stripeAccountId,
    use_case: buildStripeHostedOnboardingUseCase({
      refreshUrl,
      returnUrl,
    }),
  });

  return {
    onboardingUrl: accountLink.url,
    expiresAt: accountLink.expires_at,
    returnDestination: config.STRIPE_CONNECT_RETURN_URL,
    refreshDestination: config.STRIPE_CONNECT_REFRESH_URL,
  };
}

export async function getStripeConnectedAccountStatus(stripeAccountId: string) {
  const stripe = getStripeServerClient();
  const account = await stripe.v2.core.accounts.retrieve(stripeAccountId, {
    include: ["configuration.merchant", "configuration.recipient", "requirements"],
  });
  const stripeChargesEnabled = isCapabilityActive(
    account.configuration?.merchant?.capabilities?.card_payments?.status,
  );
  const stripePayoutsEnabled = isCapabilityActive(
    account.configuration?.recipient?.capabilities?.stripe_balance?.payouts?.status,
  );
  const stripeDetailsSubmitted = isStripeDetailsSubmitted(account);
  const onboardingComplete =
    stripeChargesEnabled && stripePayoutsEnabled && stripeDetailsSubmitted;

  return {
    account,
    status: {
      stripeAccountId: account.id,
      stripeChargesEnabled,
      stripePayoutsEnabled,
      stripeDetailsSubmitted,
      onboardingComplete,
    } satisfies StripeConnectedAccountStatus,
  };
}

export async function createStripeCheckoutSession(
  input: StripeCheckoutSessionCreateInput,
): Promise<StripeCheckoutSessionCreateResult> {
  const config = getStripeConfig();
  const metadata = buildStripeCheckoutMetadata(input.order);
  const stripeOnBehalfOfAccountId =
    await getStripeCheckoutOnBehalfOfAccountId(input.stripeConnectedAccountId);
  const stripe = getStripeServerClient();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: input.order.id,
    customer_email: input.customerEmail,
    success_url: buildCheckoutRedirectUrl(config.STRIPE_CHECKOUT_SUCCESS_URL, {
      orderId: input.order.id,
      session_id: "{CHECKOUT_SESSION_ID}",
    }),
    cancel_url: buildCheckoutRedirectUrl(config.STRIPE_CHECKOUT_CANCEL_URL, {
      orderId: input.order.id,
    }),
    line_items: input.lineItems.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: item.currency.toLowerCase(),
        unit_amount: toStripeAmountMinorUnits(item.unitAmount),
        product_data: {
          name: item.productName,
          ...(item.productDescription
            ? { description: `${input.eventTitle} · ${item.productDescription}` }
            : {}),
        },
      },
    })),
    metadata,
    payment_intent_data: {
      metadata,
      transfer_data: {
        destination: input.stripeConnectedAccountId,
      },
      ...(stripeOnBehalfOfAccountId
        ? { on_behalf_of: stripeOnBehalfOfAccountId }
        : {}),
    },
  });

  if (!session.url) {
    throw conflict("Stripe Checkout did not return a redirect URL.");
  }

  return {
    session,
    sessionId: session.id,
    sessionUrl: session.url,
    paymentIntentId: getStripeCheckoutSessionPaymentIntentId(session),
    stripeOnBehalfOfAccountId,
    successUrl: config.STRIPE_CHECKOUT_SUCCESS_URL,
    cancelUrl: config.STRIPE_CHECKOUT_CANCEL_URL,
  };
}

export async function retrieveStripeCheckoutSession(stripeCheckoutSessionId: string) {
  const stripe = getStripeServerClient();
  return stripe.checkout.sessions.retrieve(stripeCheckoutSessionId);
}

export function verifyStripeWebhookEvent(payload: string, signature: string) {
  const stripe = getStripeServerClient();
  const config = getStripeConfig();

  return stripe.webhooks.constructEvent(
    payload,
    signature,
    config.STRIPE_WEBHOOK_SECRET,
  );
}

export function normalizeStripeEventToTicketOrderEvent(
  event: Stripe.Event,
): NormalizedStripeTicketOrderEvent {
  const occurredAt = getStripeEventOccurredAt(event);
  const stripeConnectedAccountId = getStripeEventConnectedAccountId(event);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const transitionStatus =
        session.payment_status === "paid" || session.payment_status === "no_payment_required"
          ? "paid"
          : undefined;

      return {
        handled: true,
        eventType: event.type,
        occurredAt,
        orderReference: getStripeCheckoutSessionOrderReference(session, stripeConnectedAccountId),
        transitionStatus,
      };
    }
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        handled: true,
        eventType: event.type,
        occurredAt,
        orderReference: getStripeCheckoutSessionOrderReference(session, stripeConnectedAccountId),
        transitionStatus: "paid",
      };
    }
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        handled: true,
        eventType: event.type,
        occurredAt,
        orderReference: getStripeCheckoutSessionOrderReference(session, stripeConnectedAccountId),
        transitionStatus: "payment_failed",
      };
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        handled: true,
        eventType: event.type,
        occurredAt,
        orderReference: getStripeCheckoutSessionOrderReference(session, stripeConnectedAccountId),
        transitionStatus: "expired",
      };
    }
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      return {
        handled: true,
        eventType: event.type,
        occurredAt,
        orderReference: getStripePaymentIntentOrderReference(paymentIntent, stripeConnectedAccountId),
        transitionStatus: "paid",
      };
    }
    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      return {
        handled: true,
        eventType: event.type,
        occurredAt,
        orderReference: getStripePaymentIntentOrderReference(paymentIntent, stripeConnectedAccountId),
        transitionStatus: "payment_failed",
      };
    }
    case "payment_intent.canceled": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      return {
        handled: true,
        eventType: event.type,
        occurredAt,
        orderReference: getStripePaymentIntentOrderReference(paymentIntent, stripeConnectedAccountId),
        transitionStatus: "cancelled",
      };
    }
    default:
      return {
        handled: false,
        eventType: event.type,
      };
  }
}
