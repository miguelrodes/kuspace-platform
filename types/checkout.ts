import type { Event } from "@/types/event";
import type { TicketOrder } from "@/types/order";
import type { ConsumerUser } from "@/types/user";

export type CheckoutProvider = "internal" | "stripe";
export type CheckoutState = "ready" | "awaiting_payment";
export type CheckoutReturnState = "processing" | "paid" | "failed";

export interface TicketCheckoutIntent {
  orderId: string;
  eventId: string;
  userId: string;
  sectionId: string;
  ticketPhaseId: string;
  quantity: number;
  accessGroupId: string;
  ticketLabel: string;
  amountTotal: number;
  currency: "EUR";
  paymentState: "pending" | "not_required";
  provider: CheckoutProvider;
  providerReference?: string;
}

export interface TicketCheckoutIntentResult {
  order: TicketOrder;
  fulfilled: false;
  intent: TicketCheckoutIntent;
  event: {
    id: string;
    slug: string;
    status: Event["status"];
    admissionMode: Event["admissionMode"];
  };
  section: {
    id: string;
    name: string;
    accessGroupId: string;
  };
  checkout: {
    provider: CheckoutProvider;
    state: CheckoutState;
    requiresWebhookConfirmation: boolean;
    stripeConnectedAccountId?: string;
    stripeCheckoutSessionId?: string;
    stripeCheckoutUrl?: string;
    stripeOnBehalfOfAccountId?: string;
    successUrl?: string;
    cancelUrl?: string;
  };
}

export interface StripeCheckoutRouteResult {
  checkoutUrl: string;
  orderId: string;
  sessionId: string;
}

export interface TicketOrderPaymentTransitionResult {
  order: TicketOrder;
  fulfilled: boolean;
  event?: Event;
  user?: ConsumerUser;
}

export interface TicketCheckoutStatusResult {
  order: TicketOrder;
  checkout: {
    state: CheckoutReturnState;
    stripeConnectedAccountId?: string;
    stripeCheckoutSessionId?: string;
    stripePaymentIntentId?: string;
    stripeSessionStatus?: "open" | "complete" | "expired" | null;
    stripePaymentStatus?: "paid" | "unpaid" | "no_payment_required" | null;
  };
}
