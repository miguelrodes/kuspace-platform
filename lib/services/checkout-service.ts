import { badRequest, conflict, forbidden, notFound } from "@/lib/http/errors";
import type Stripe from "stripe";
import {
  getVisibleTicketSectionsForUser,
} from "@/lib/event-access";
import { getConsumerRepositoryById } from "@/lib/db/repositories/consumer-repository";
import { getOrganizationRepositoryById } from "@/lib/db/repositories/organization-repository";
import { getEventTicketRepositoryByEventId } from "@/lib/db/repositories/ticket-repository";
import {
  createPendingTicketOrderService,
  fulfillPaidTicketOrderService,
  getTicketOrderByStripeCheckoutSessionService,
  getTicketOrderByStripePaymentIntentService,
  getTicketOrderService,
  updateTicketOrderStatusService,
} from "@/lib/services/order-service";
import { requireOwnedConsumerUserService } from "@/lib/services/access-service";
import { requireConsumerActor } from "@/lib/auth/actor";
import {
  checkoutIntentPaymentTransitionSchema,
  createCheckoutIntentServiceSchema,
  stripeWebhookMutationSchema,
} from "@/lib/validation/store";
import { isStripeConfigured } from "@/lib/stripe/config";
import {
  createStripeCheckoutSession,
  getStripeCheckoutSessionOrderReference,
  normalizeStripeEventToTicketOrderEvent,
  retrieveStripeCheckoutSession,
  verifyStripeWebhookEvent,
  type StripeTicketOrderReference,
} from "@/lib/stripe/stripe-service";
import type { Event } from "@/types/event";
import type { TicketOrder, TicketOrderStatus } from "@/types/order";
import type { WorkspaceOrganization } from "@/types/workspace";
import type {
  TicketCheckoutIntentResult,
  TicketCheckoutStatusResult,
  TicketOrderPaymentTransitionResult,
  CheckoutProvider,
} from "@/types/checkout";
type OrderTransitionStatus = Exclude<TicketOrderStatus, "pending" | "checkout_started">;

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

function isPurchasablePhase(phase: {
  visibility: "public" | "hidden";
  status: "live" | "upcoming" | "sold_out";
  quantityAvailable: number;
  quantitySold?: number;
}) {
  return (
    phase.visibility === "public" &&
    phase.status === "live" &&
    getRemainingPhaseInventory(phase) > 0
  );
}

function getPurchasableSectionPhase(
  event: NonNullable<Awaited<ReturnType<typeof getEventTicketRepositoryByEventId>>>,
  sectionId: string,
  phaseId: string | undefined,
  quantity: number,
) {
  const section = (event.tickets.sections ?? []).find((candidate) => candidate.id === sectionId);

  if (!section) {
    throw notFound("Ticket section not found");
  }

  const phase = phaseId
    ? section.phases.find((candidate) => candidate.id === phaseId)
    : section.phases
        .filter((candidate) => isPurchasablePhase(candidate))
        .sort((left, right) => left.sortOrder - right.sortOrder)[0];

  if (!phase) {
    if (phaseId) {
      throw notFound("Ticket phase not found");
    }

    throw forbidden("This ticket section does not currently have any purchasable phases.");
  }

  if (phase.visibility !== "public") {
    throw forbidden("This ticket phase is not currently visible.");
  }

  if (phase.status !== "live") {
    throw forbidden("This ticket phase is not currently live.");
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
  phaseId?: string;
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
  const { section, phase } = getPurchasableSectionPhase(
    event,
    nextParams.sectionId,
    nextParams.phaseId,
    quantity,
  );
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
    successUrl?: string;
    cancelUrl?: string;
  },
): TicketCheckoutIntentResult {
  const requiresWebhookConfirmation = context.amountTotal > 0 && context.provider === "stripe";

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
      successUrl: requiresWebhookConfirmation ? options?.successUrl : undefined,
      cancelUrl: requiresWebhookConfirmation ? options?.cancelUrl : undefined,
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

function buildStripeCheckoutSessionLineItems(
  context: ResolvedCheckoutContext,
  order: TicketOrder,
) {
  return order.items.map((item) => {
    const { section, phase } = getOrderItemSection(context.event, item);

    return {
      quantity: item.quantity,
      unitAmount: item.unitPrice,
      currency: order.currency,
      productName: section.name,
      productDescription: phase.name,
    };
  });
}

async function createStripeCheckoutSessionForOrder(
  context: ResolvedCheckoutContext,
  order: TicketOrder,
) {
  const stripeConnectedAccountId = order.stripeConnectedAccountId ?? context.stripeConnectedAccountId;

  if (!stripeConnectedAccountId) {
    throw conflict("Ticket checkout requires an event-owning organization.");
  }

  return createStripeCheckoutSession({
    order,
    customerEmail: context.user.email,
    eventTitle: context.event.cover.title,
    stripeConnectedAccountId,
    lineItems: buildStripeCheckoutSessionLineItems(context, order),
  });
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

async function maybeSyncOrderStripeReferences(params: {
  order: TicketOrder;
  orderReference: StripeTicketOrderReference;
}) {
  const stripeConnectedAccountId =
    params.orderReference.stripeConnectedAccountId ?? params.order.stripeConnectedAccountId;
  const stripeCheckoutSessionId =
    params.orderReference.stripeCheckoutSessionId ?? params.order.stripeCheckoutSessionId;
  const stripePaymentIntentId =
    params.orderReference.stripePaymentIntentId ?? params.order.stripePaymentIntentId;
  const needsUpdate =
    params.order.stripeConnectedAccountId !== stripeConnectedAccountId ||
    params.order.stripeCheckoutSessionId !== stripeCheckoutSessionId ||
    params.order.stripePaymentIntentId !== stripePaymentIntentId;

  if (!needsUpdate) {
    return params.order;
  }

  return updateTicketOrderStatusService({
    orderId: params.order.id,
    status: params.order.status,
    stripeConnectedAccountId,
    stripeCheckoutSessionId,
    stripePaymentIntentId,
  });
}

export async function createCheckoutIntentService(params: {
  eventId: string;
  userId: string;
  sectionId: string;
  phaseId?: string;
  quantity?: number;
  provider?: CheckoutProvider;
}) {
  if (process.env.KUSPACE_DEMO_MODE === "true") {
    throw conflict("Ticket purchases are unavailable in this portfolio demo.");
  }
  const nextParams = createCheckoutIntentServiceSchema.parse(params);
  await requireOwnedConsumerUserService(nextParams.userId, "create checkout intents for");

  const context = await resolveCheckoutContext(nextParams);
  const order = await createTicketOrderFromContext(context);

  if (context.provider === "stripe" && context.amountTotal > 0) {
    const {
      sessionId,
      sessionUrl,
      paymentIntentId,
      stripeOnBehalfOfAccountId,
      successUrl,
      cancelUrl,
    } = await createStripeCheckoutSessionForOrder(
      context,
      order,
    );
    const checkoutStartedOrder = await updateTicketOrderStatusService({
      orderId: order.id,
      status: "checkout_started",
      stripeConnectedAccountId: context.stripeConnectedAccountId,
      stripeCheckoutSessionId: sessionId,
      stripePaymentIntentId: paymentIntentId,
    });

    return buildCheckoutIntentResult(context, checkoutStartedOrder, {
      stripeCheckoutUrl: sessionUrl,
      stripeOnBehalfOfAccountId,
      successUrl,
      cancelUrl,
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
    stripeSession = await retrieveStripeCheckoutSession(stripeCheckoutSessionId);
    order = await maybeSyncOrderStripeReferences({
      order,
      orderReference: getStripeCheckoutSessionOrderReference(
        stripeSession,
        order.stripeConnectedAccountId,
      ),
    });
  }

  const stripeSessionPaymentIntentId = stripeSession
    ? getStripeCheckoutSessionOrderReference(stripeSession).stripePaymentIntentId
    : undefined;

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
      stripePaymentIntentId: stripeSessionPaymentIntentId ?? order.stripePaymentIntentId,
      stripeSessionStatus: stripeSession?.status ?? null,
      stripePaymentStatus: stripeSession?.payment_status ?? null,
    },
  };
}

export async function handleStripeEventService(event: Stripe.Event) {
  const normalized = normalizeStripeEventToTicketOrderEvent(event);

  if (!normalized.handled) {
    return normalized;
  }

  const order = await getTicketOrderByWebhookReference(normalized.orderReference);

  if (!order) {
    throw notFound("Ticket order not found");
  }

  const syncedOrder = await maybeSyncOrderStripeReferences({
    order,
    orderReference: normalized.orderReference,
  });

  if (!normalized.transitionStatus) {
    return {
      eventType: normalized.eventType,
      order: syncedOrder,
      fulfilled: false,
      handled: false,
    };
  }

  const result = await handleStripeWebhookService({
    orderId: syncedOrder.id,
    status: normalized.transitionStatus,
    stripeConnectedAccountId:
      normalized.orderReference.stripeConnectedAccountId ?? syncedOrder.stripeConnectedAccountId,
    stripeCheckoutSessionId:
      normalized.orderReference.stripeCheckoutSessionId ?? syncedOrder.stripeCheckoutSessionId,
    stripePaymentIntentId:
      normalized.orderReference.stripePaymentIntentId ?? syncedOrder.stripePaymentIntentId,
    occurredAt: normalized.occurredAt,
  });

  return {
    eventType: normalized.eventType,
    ...result,
    handled: true,
  };
}

export async function verifyAndHandleStripeWebhookEventService(
  payload: string,
  signature: string,
) {
  const event = verifyStripeWebhookEvent(payload, signature);

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

  if (nextParams.status !== "paid") {
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

    return {
      order: updatedOrder,
      fulfilled: false,
    };
  }

  const occurredAt = nextParams.occurredAt || new Date().toISOString();
  const fulfilledPurchase = await fulfillPaidTicketOrderService({
    orderId: existingOrder.id,
    occurredAt,
    stripeConnectedAccountId:
      nextParams.stripeConnectedAccountId ?? existingOrder.stripeConnectedAccountId,
    stripeCheckoutSessionId:
      nextParams.stripeCheckoutSessionId ?? existingOrder.stripeCheckoutSessionId,
    stripePaymentIntentId:
      nextParams.stripePaymentIntentId ?? existingOrder.stripePaymentIntentId,
  });

  if (!fulfilledPurchase.fulfilled) {
    return {
      order: fulfilledPurchase.order,
      fulfilled: false,
    };
  }

  return {
    order: fulfilledPurchase.order,
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
  if (process.env.KUSPACE_DEMO_MODE === "true") {
    throw conflict("Ticket purchases are unavailable in this portfolio demo.");
  }
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
