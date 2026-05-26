import { badRequest, conflict, forbidden, notFound } from "@/lib/http/errors";
import type Stripe from "stripe";
import {
  getConsumerWalletStatusForPaymentState,
  getVisibleTicketSectionsForUser,
  syncTicketPurchaseToEvent,
  syncTicketPurchaseToUser,
} from "@/lib/event-access";
import { getConsumerRepositoryById, saveConsumerRepository } from "@/lib/db/repositories/consumer-repository";
import { getOrganizationRepositoryById } from "@/lib/db/repositories/organization-repository";
import { getEventTicketRepositoryByEventId, saveEventTicketRepository } from "@/lib/db/repositories/ticket-repository";
import {
  createPendingTicketOrderService,
  getTicketOrderByStripeCheckoutSessionService,
  getTicketOrderByStripePaymentIntentService,
  getTicketOrderService,
  updateTicketOrderStatusService,
} from "@/lib/services/order-service";
import { requireOwnedConsumerUserService } from "@/lib/services/access-service";
import { requireConsumerActor } from "@/lib/auth/actor";
import { getStripeConfig, isStripeConfigured } from "@/lib/stripe/config";
import { getStripeServerClient } from "@/lib/stripe/server";
import {
  checkoutIntentPaymentTransitionSchema,
  createCheckoutIntentServiceSchema,
  stripeWebhookMutationSchema,
} from "@/lib/validation/store";
import type { Event } from "@/types/event";
import type { TicketOrder } from "@/types/order";
import type { ConsumerUser } from "@/types/user";
import type { WorkspaceOrganization } from "@/types/workspace";
import type {
  TicketCheckoutIntentResult,
  TicketCheckoutStatusResult,
  TicketOrderPaymentTransitionResult,
} from "@/types/checkout";

type CheckoutProvider = "internal" | "stripe";
type OrderTransitionStatus = "paid" | "payment_failed" | "cancelled" | "expired";

type ResolvedCheckoutContext = {
  event: NonNullable<Awaited<ReturnType<typeof getEventTicketRepositoryByEventId>>>;
  user: NonNullable<Awaited<ReturnType<typeof getConsumerRepositoryById>>>;
  organizationId: string;
  stripeConnectedAccountId?: string;
  section: NonNullable<Event["tickets"]["sections"]>[number];
  phase: NonNullable<NonNullable<Event["tickets"]["sections"]>[number]["phases"]>[number];
  quantity: number;
  amountTotal: number;
  provider: CheckoutProvider;
};

function getRemainingPhaseInventory(phase: { quantityAvailable: number; quantitySold?: number }) {
  return phase.quantityAvailable - (phase.quantitySold ?? 0);
}

function getPurchasableSectionPhase(
  event: NonNullable<Awaited<ReturnType<typeof getEventTicketRepositoryByEventId>>>,
  sectionId: string,
  quantity: number,
) {
  const section = (event.tickets.sections ?? []).find((candidate) => candidate.id === sectionId);

  if (!section) {
    throw notFound("Ticket section not found");
  }

  const phase = section.phases
    .filter((candidate) => candidate.visibility === "public" && candidate.status !== "sold_out")
    .filter((candidate) => getRemainingPhaseInventory(candidate) > 0)
    .sort((left, right) => left.sortOrder - right.sortOrder)[0];

  if (!phase) {
    throw forbidden("This ticket section does not currently have any purchasable phases.");
  }

  if (getRemainingPhaseInventory(phase) < quantity) {
    throw conflict("Not enough tickets remain in the selected phase.");
  }

  return {
    section,
    phase,
  };
}

function assertOrganizationReadyForPaidStripeCheckout(organization: WorkspaceOrganization | null) {
  if (!organization) {
    throw conflict("Ticket checkout requires an event-owning organization.");
  }

  if (!organization.stripeAccountId) {
    throw conflict("This organization cannot sell paid tickets until Stripe Connect onboarding is completed.");
  }

  if (!organization.stripeDetailsSubmitted) {
    throw conflict("This organization cannot sell paid tickets until Stripe onboarding details are submitted.");
  }

  if (!organization.stripeChargesEnabled) {
    throw conflict("This organization cannot sell paid tickets until Stripe charges are enabled.");
  }

  if (!organization.stripePayoutsEnabled) {
    throw conflict("This organization cannot sell paid tickets until Stripe payouts are enabled.");
  }
}

async function resolveCheckoutContext(params: {
  eventId: string;
  userId: string;
  sectionId: string;
  quantity?: number;
  provider?: CheckoutProvider;
}) {
  const nextParams = createCheckoutIntentServiceSchema.parse(params);
  const [event, user] = await Promise.all([
    getEventTicketRepositoryByEventId(nextParams.eventId),
    getConsumerRepositoryById(nextParams.userId),
  ]);

  if (!event) {
    throw notFound("Event not found");
  }

  if (!user) {
    throw notFound("Consumer user not found");
  }

  if (event.admissionMode !== "public") {
    throw forbidden("Checkout intents are only available for public events.");
  }

  if (event.status !== "live") {
    throw forbidden("Checkout intents can only be created for live events.");
  }

  if (!event.organizationId) {
    throw conflict("Ticket checkout requires an event-owning organization.");
  }

  const quantity = nextParams.quantity ?? 1;
  const { section, phase } = getPurchasableSectionPhase(event, nextParams.sectionId, quantity);
  const visibleSections = getVisibleTicketSectionsForUser(event, nextParams.userId);

  if (!visibleSections.some((candidate) => candidate.id === section.id)) {
    throw forbidden("This ticket section is not available to the current user.");
  }

  const organization = await getOrganizationRepositoryById(event.organizationId);
  const amountTotal = phase.price * quantity;

  if (amountTotal > 0 && nextParams.provider === "internal") {
    throw conflict("Paid ticket checkout must use Stripe.");
  }

  if (amountTotal > 0) {
    assertOrganizationReadyForPaidStripeCheckout(organization);
  }

  return {
    event,
    user,
    organizationId: event.organizationId,
    stripeConnectedAccountId: organization?.stripeAccountId,
    section,
    phase,
    quantity,
    amountTotal,
    provider:
      amountTotal <= 0
        ? "internal"
        : nextParams.provider ?? "stripe",
  } satisfies ResolvedCheckoutContext;
}

function buildCheckoutIntentResult(
  context: ResolvedCheckoutContext,
  order: TicketOrder,
  options?: {
    stripeCheckoutUrl?: string;
    stripeOnBehalfOfAccountId?: string;
  },
): TicketCheckoutIntentResult {
  const requiresWebhookConfirmation = context.amountTotal > 0 && context.provider === "stripe";
  const stripeConfig =
    requiresWebhookConfirmation && isStripeConfigured() ? getStripeConfig() : null;

  return {
    order,
    fulfilled: false,
    intent: {
      orderId: order.id,
      eventId: context.event.id,
      userId: context.user.id,
      sectionId: context.section.id,
      ticketPhaseId: context.phase.id,
      quantity: context.quantity,
      accessGroupId: context.section.accessGroupId,
      ticketLabel: context.section.name,
      amountTotal: context.amountTotal,
      currency: "EUR",
      paymentState: context.amountTotal > 0 ? "pending" : "not_required",
      provider: context.provider,
      providerReference: order.stripeCheckoutSessionId ?? order.stripePaymentIntentId,
    },
    event: {
      id: context.event.id,
      slug: context.event.slug,
      status: context.event.status,
      admissionMode: context.event.admissionMode,
    },
    section: {
      id: context.section.id,
      name: context.section.name,
      accessGroupId: context.section.accessGroupId,
    },
    checkout: {
      provider: context.provider,
      state: requiresWebhookConfirmation ? "awaiting_payment" : "ready",
      requiresWebhookConfirmation,
      stripeConnectedAccountId: order.stripeConnectedAccountId,
      stripeCheckoutSessionId: order.stripeCheckoutSessionId,
      stripeCheckoutUrl: options?.stripeCheckoutUrl,
      stripeOnBehalfOfAccountId: options?.stripeOnBehalfOfAccountId,
      successUrl: stripeConfig?.STRIPE_CHECKOUT_SUCCESS_URL,
      cancelUrl: stripeConfig?.STRIPE_CHECKOUT_CANCEL_URL,
    },
  };
}

async function createTicketOrderFromContext(context: ResolvedCheckoutContext) {
  return createPendingTicketOrderService({
    eventId: context.event.id,
    organizationId: context.organizationId,
    consumerUserId: context.user.id,
    currency: "EUR",
    stripeConnectedAccountId: context.stripeConnectedAccountId,
    items: [
      {
        ticketSectionId: context.section.id,
        ticketPhaseId: context.phase.id,
        quantity: context.quantity,
        unitPrice: context.phase.price,
      },
    ],
  });
}

function toStripeAmountMinorUnits(amount: number) {
  return Math.round(amount * 100);
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

function buildStripeCheckoutLineItems(
  context: ResolvedCheckoutContext,
  order: TicketOrder,
) {
  return order.items.map((item) => {
    const { section, phase } = getOrderItemSection(context.event, item);

    return {
      quantity: item.quantity,
      price_data: {
        currency: order.currency.toLowerCase(),
        unit_amount: toStripeAmountMinorUnits(item.unitPrice),
        product_data: {
          name: section.name,
          description: `${context.event.cover.title} · ${phase.name}`,
        },
      },
    };
  });
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

async function createStripeCheckoutSessionForOrder(
  context: ResolvedCheckoutContext,
  order: TicketOrder,
) {
  const stripeConnectedAccountId = order.stripeConnectedAccountId ?? context.stripeConnectedAccountId;

  if (!stripeConnectedAccountId) {
    throw conflict("Ticket checkout requires an event-owning organization.");
  }

  const config = getStripeConfig();
  const metadata = buildStripeCheckoutMetadata(order);
  const stripeOnBehalfOfAccountId =
    await getStripeCheckoutOnBehalfOfAccountId(stripeConnectedAccountId);
  const stripe = getStripeServerClient();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: order.id,
    customer_email: context.user.email,
    success_url: buildCheckoutRedirectUrl(config.STRIPE_CHECKOUT_SUCCESS_URL, {
      orderId: order.id,
      session_id: "{CHECKOUT_SESSION_ID}",
    }),
    cancel_url: buildCheckoutRedirectUrl(config.STRIPE_CHECKOUT_CANCEL_URL, {
      orderId: order.id,
    }),
    line_items: buildStripeCheckoutLineItems(context, order),
    metadata,
    payment_intent_data: {
      metadata,
      transfer_data: {
        destination: stripeConnectedAccountId,
      },
      ...(stripeOnBehalfOfAccountId
        ? { on_behalf_of: stripeOnBehalfOfAccountId }
        : {}),
    },
  });

  if (!session.url) {
    throw conflict("Stripe Checkout did not return a redirect URL.");
  }

  const sessionUrl = session.url;

  return {
    session,
    sessionUrl,
    stripeOnBehalfOfAccountId,
  };
}

function getOrderPaymentState(order: TicketOrder) {
  return order.totalAmount > 0 ? "paid" : "not_required";
}

function getOrderItemSection(
  event: Event,
  item: TicketOrder["items"][number],
) {
  const section = (event.tickets.sections ?? []).find((candidate) => candidate.id === item.ticketSectionId);

  if (!section) {
    throw notFound("Ticket section not found for order item.");
  }

  const phase = section.phases.find((candidate) => candidate.id === item.ticketPhaseId);

  if (!phase) {
    throw notFound("Ticket phase not found for order item.");
  }

  return {
    section,
    phase,
  };
}

async function fulfillTicketOrder(
  order: TicketOrder,
  occurredAt: string,
): Promise<{ event: Event; user: ConsumerUser }> {
  const [event, user] = await Promise.all([
    getEventTicketRepositoryByEventId(order.eventId),
    getConsumerRepositoryById(order.consumerUserId),
  ]);

  if (!event) {
    throw notFound("Event not found");
  }

  if (!user) {
    throw notFound("Consumer user not found");
  }

  const paymentState = getOrderPaymentState(order);
  let nextEvent = event;
  let nextUser = user;

  for (const item of order.items) {
    const { section, phase } = getOrderItemSection(nextEvent, item);

    nextEvent = syncTicketPurchaseToEvent(nextEvent, {
      userId: order.consumerUserId,
      accessGroupId: section.accessGroupId,
      ticketPhaseId: phase.id,
      quantity: item.quantity,
      purchasedAt: occurredAt,
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

  const [savedEvent, savedUser] = await Promise.all([
    saveEventTicketRepository(nextEvent),
    saveConsumerRepository(nextUser),
  ]);

  if (!savedEvent) {
    throw notFound("Event not found");
  }

  if (!savedUser) {
    throw notFound("Consumer user not found");
  }

  return {
    event: savedEvent,
    user: savedUser,
  };
}

async function getTicketOrderByWebhookReference(payload: {
  orderId?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
}) {
  if (payload.orderId) {
    return getTicketOrderService(payload.orderId);
  }

  if (payload.stripePaymentIntentId) {
    return getTicketOrderByStripePaymentIntentService(payload.stripePaymentIntentId);
  }

  if (payload.stripeCheckoutSessionId) {
    return getTicketOrderByStripeCheckoutSessionService(payload.stripeCheckoutSessionId);
  }

  throw badRequest("A ticket order reference is required.");
}

function getCheckoutReturnState(params: {
  order: TicketOrder;
  stripeSession?: Stripe.Checkout.Session | null;
}) {
  if (params.order.status === "paid") {
    return "paid" as const;
  }

  if (
    params.order.status === "payment_failed" ||
    params.order.status === "cancelled" ||
    params.order.status === "expired"
  ) {
    return "failed" as const;
  }

  if (params.stripeSession?.status === "expired") {
    return "failed" as const;
  }

  if (
    params.stripeSession?.payment_status === "paid" ||
    params.stripeSession?.payment_status === "no_payment_required" ||
    params.stripeSession?.status === "complete"
  ) {
    return "processing" as const;
  }

  if (
    params.stripeSession?.status === "open" &&
    params.stripeSession?.payment_status === "unpaid"
  ) {
    return "failed" as const;
  }

  return "processing" as const;
}

function getStripeCheckoutSessionPaymentIntentId(session: Stripe.Checkout.Session) {
  return typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id;
}

function getStripePaymentIntentOrderId(paymentIntent: Stripe.PaymentIntent) {
  const orderId = paymentIntent.metadata?.orderId;
  return typeof orderId === "string" && orderId.length > 0 ? orderId : undefined;
}

async function getOwnedConsumerTicketOrder(params: {
  orderId?: string;
  stripeCheckoutSessionId?: string;
}) {
  const actor = await requireConsumerActor();
  const order = params.orderId
    ? await getTicketOrderService(params.orderId)
    : params.stripeCheckoutSessionId
      ? await getTicketOrderByStripeCheckoutSessionService(params.stripeCheckoutSessionId)
      : null;

  if (!order) {
    throw notFound("Ticket order not found");
  }

  if (order.consumerUserId !== actor.currentConsumerUserId) {
    throw forbidden("You can only view your own ticket orders.");
  }

  return order;
}

async function maybeSyncOrderStripeReferencesFromCheckoutSession(params: {
  order: TicketOrder;
  stripeSession: Stripe.Checkout.Session;
}) {
  const stripePaymentIntentId =
    typeof params.stripeSession.payment_intent === "string"
      ? params.stripeSession.payment_intent
      : params.stripeSession.payment_intent?.id;
  const stripeCheckoutSessionId = params.stripeSession.id;
  const needsUpdate =
    params.order.stripeCheckoutSessionId !== stripeCheckoutSessionId ||
    params.order.stripePaymentIntentId !== stripePaymentIntentId;

  if (!needsUpdate) {
    return params.order;
  }

  return updateTicketOrderStatusService({
    orderId: params.order.id,
    status: params.order.status,
    stripeConnectedAccountId: params.order.stripeConnectedAccountId,
    stripeCheckoutSessionId,
    stripePaymentIntentId,
  });
}

export async function createCheckoutIntentService(params: {
  eventId: string;
  userId: string;
  sectionId: string;
  quantity?: number;
  provider?: CheckoutProvider;
}) {
  const nextParams = createCheckoutIntentServiceSchema.parse(params);
  await requireOwnedConsumerUserService(nextParams.userId, "create checkout intents for");

  const context = await resolveCheckoutContext(nextParams);
  const order = await createTicketOrderFromContext(context);

  if (context.provider === "stripe" && context.amountTotal > 0) {
    const { session, sessionUrl, stripeOnBehalfOfAccountId } = await createStripeCheckoutSessionForOrder(
      context,
      order,
    );
    const checkoutStartedOrder = await updateTicketOrderStatusService({
      orderId: order.id,
      status: "checkout_started",
      stripeConnectedAccountId: context.stripeConnectedAccountId,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id,
    });

    return buildCheckoutIntentResult(context, checkoutStartedOrder, {
      stripeCheckoutUrl: sessionUrl,
      stripeOnBehalfOfAccountId,
    });
  }

  return buildCheckoutIntentResult(context, order);
}

export async function getTicketCheckoutStatusService(params: {
  orderId?: string;
  stripeCheckoutSessionId?: string;
}): Promise<TicketCheckoutStatusResult> {
  let order = await getOwnedConsumerTicketOrder(params);
  const stripeCheckoutSessionId =
    params.stripeCheckoutSessionId ?? order.stripeCheckoutSessionId;
  let stripeSession: Stripe.Checkout.Session | null = null;

  if (stripeCheckoutSessionId && isStripeConfigured()) {
    const stripe = getStripeServerClient();
    stripeSession = await stripe.checkout.sessions.retrieve(stripeCheckoutSessionId);
    order = await maybeSyncOrderStripeReferencesFromCheckoutSession({
      order,
      stripeSession,
    });
  }

  return {
    order,
    checkout: {
      state: getCheckoutReturnState({
        order,
        stripeSession,
      }),
      stripeConnectedAccountId: order.stripeConnectedAccountId,
      stripeCheckoutSessionId:
        stripeSession?.id ?? stripeCheckoutSessionId ?? order.stripeCheckoutSessionId,
      stripePaymentIntentId:
        (typeof stripeSession?.payment_intent === "string"
          ? stripeSession.payment_intent
          : stripeSession?.payment_intent?.id) ?? order.stripePaymentIntentId,
      stripeSessionStatus: stripeSession?.status ?? null,
      stripePaymentStatus: stripeSession?.payment_status ?? null,
    },
  };
}

async function handleCheckoutSessionWebhookEvent(
  session: Stripe.Checkout.Session,
  status?: OrderTransitionStatus,
  occurredAt?: string,
) {
  const order = await getTicketOrderByWebhookReference({
    orderId: typeof session.metadata?.orderId === "string" ? session.metadata.orderId : undefined,
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: getStripeCheckoutSessionPaymentIntentId(session),
  });

  if (!order) {
    throw notFound("Ticket order not found");
  }

  const syncedOrder = await maybeSyncOrderStripeReferencesFromCheckoutSession({
    order,
    stripeSession: session,
  });

  if (!status) {
    return {
      order: syncedOrder,
      fulfilled: false,
      handled: false,
    };
  }

  const result = await handleStripeWebhookService({
    orderId: syncedOrder.id,
    status,
    stripeConnectedAccountId: syncedOrder.stripeConnectedAccountId,
    stripeCheckoutSessionId: syncedOrder.stripeCheckoutSessionId ?? session.id,
    stripePaymentIntentId:
      syncedOrder.stripePaymentIntentId ?? getStripeCheckoutSessionPaymentIntentId(session),
    occurredAt,
  });

  return {
    ...result,
    handled: true,
  };
}

async function handlePaymentIntentWebhookEvent(
  paymentIntent: Stripe.PaymentIntent,
  status: OrderTransitionStatus,
  occurredAt?: string,
) {
  const order = await getTicketOrderByWebhookReference({
    orderId: getStripePaymentIntentOrderId(paymentIntent),
    stripePaymentIntentId: paymentIntent.id,
  });

  if (!order) {
    throw notFound("Ticket order not found");
  }

  const result = await handleStripeWebhookService({
    orderId: order.id,
    status,
    stripeConnectedAccountId: order.stripeConnectedAccountId,
    stripeCheckoutSessionId: order.stripeCheckoutSessionId,
    stripePaymentIntentId: paymentIntent.id,
    occurredAt,
  });

  return {
    ...result,
    handled: true,
  };
}

export async function handleStripeEventService(event: Stripe.Event) {
  const occurredAt = new Date(event.created * 1000).toISOString();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const nextStatus =
        session.payment_status === "paid" || session.payment_status === "no_payment_required"
          ? "paid"
          : undefined;

      return {
        eventType: event.type,
        ...(await handleCheckoutSessionWebhookEvent(session, nextStatus, occurredAt)),
      };
    }
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        eventType: event.type,
        ...(await handleCheckoutSessionWebhookEvent(session, "paid", occurredAt)),
      };
    }
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        eventType: event.type,
        ...(await handleCheckoutSessionWebhookEvent(session, "payment_failed", occurredAt)),
      };
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        eventType: event.type,
        ...(await handleCheckoutSessionWebhookEvent(session, "expired", occurredAt)),
      };
    }
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      return {
        eventType: event.type,
        ...(await handlePaymentIntentWebhookEvent(paymentIntent, "paid", occurredAt)),
      };
    }
    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      return {
        eventType: event.type,
        ...(await handlePaymentIntentWebhookEvent(paymentIntent, "payment_failed", occurredAt)),
      };
    }
    case "payment_intent.canceled": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      return {
        eventType: event.type,
        ...(await handlePaymentIntentWebhookEvent(paymentIntent, "cancelled", occurredAt)),
      };
    }
    default:
      return {
        eventType: event.type,
        handled: false,
      };
  }
}

export async function verifyAndHandleStripeWebhookEventService(
  payload: string,
  signature: string,
) {
  const stripe = getStripeServerClient();
  const config = getStripeConfig();
  const event = stripe.webhooks.constructEvent(
    payload,
    signature,
    config.STRIPE_WEBHOOK_SECRET,
  );

  const result = await handleStripeEventService(event);

  return {
    received: true,
    ...result,
  };
}

export async function applyCheckoutIntentPaymentTransitionService(params: {
  orderId: string;
  status: OrderTransitionStatus;
  stripeConnectedAccountId?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  occurredAt?: string;
}): Promise<TicketOrderPaymentTransitionResult> {
  const nextParams = checkoutIntentPaymentTransitionSchema.parse(params);
  const existingOrder = await getTicketOrderService(nextParams.orderId);

  if (!existingOrder) {
    throw notFound("Ticket order not found");
  }

  if (existingOrder.status === "paid") {
    if (nextParams.status !== "paid") {
      throw conflict("A paid ticket order cannot transition back to an unpaid state.");
    }

    return {
      order: existingOrder,
      fulfilled: false,
    };
  }

  const updatedOrder = await updateTicketOrderStatusService({
    orderId: existingOrder.id,
    status: nextParams.status,
    stripeConnectedAccountId:
      nextParams.stripeConnectedAccountId ?? existingOrder.stripeConnectedAccountId,
    stripeCheckoutSessionId:
      nextParams.stripeCheckoutSessionId ?? existingOrder.stripeCheckoutSessionId,
    stripePaymentIntentId:
      nextParams.stripePaymentIntentId ?? existingOrder.stripePaymentIntentId,
  });

  if (nextParams.status !== "paid") {
    return {
      order: updatedOrder,
      fulfilled: false,
    };
  }

  const occurredAt = nextParams.occurredAt || new Date().toISOString();
  const fulfilledPurchase = await fulfillTicketOrder(updatedOrder, occurredAt);

  return {
    order: updatedOrder,
    fulfilled: true,
    event: fulfilledPurchase.event,
    user: fulfilledPurchase.user,
  };
}

export async function simulateInternalTicketPurchaseService(params: {
  eventId: string;
  userId: string;
  sectionId: string;
  quantity?: number;
}) {
  const nextParams = createCheckoutIntentServiceSchema.parse({
    ...params,
    provider: "internal" as const,
  });
  await requireOwnedConsumerUserService(nextParams.userId, "complete internal ticket purchases for");

  const context = await resolveCheckoutContext(nextParams);

  if (context.amountTotal > 0) {
    throw conflict("Direct purchase completion is only available for tickets that do not require payment.");
  }

  const order = await createTicketOrderFromContext(context);

  return applyCheckoutIntentPaymentTransitionService({
    orderId: order.id,
    status: "paid",
    stripeConnectedAccountId: context.stripeConnectedAccountId,
    occurredAt: new Date().toISOString(),
  });
}

export async function handleStripeWebhookService(payload: unknown) {
  const nextPayload = stripeWebhookMutationSchema.parse(payload);
  const order = await getTicketOrderByWebhookReference(nextPayload);

  if (!order) {
    throw notFound("Ticket order not found");
  }

  if (order.status === "paid") {
    return {
      order,
      fulfilled: false,
    };
  }

  return applyCheckoutIntentPaymentTransitionService({
    orderId: order.id,
    status: nextPayload.status,
    stripeConnectedAccountId:
      nextPayload.stripeConnectedAccountId ?? order.stripeConnectedAccountId,
    stripeCheckoutSessionId:
      nextPayload.stripeCheckoutSessionId ?? order.stripeCheckoutSessionId,
    stripePaymentIntentId:
      nextPayload.stripePaymentIntentId ?? order.stripePaymentIntentId,
    occurredAt: nextPayload.occurredAt,
  });
}
