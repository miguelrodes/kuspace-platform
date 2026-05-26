export type TicketOrderStatus =
  | "pending"
  | "checkout_started"
  | "paid"
  | "payment_failed"
  | "cancelled"
  | "expired";

export interface TicketOrderItem {
  id: string;
  orderId: string;
  ticketSectionId: string;
  ticketPhaseId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: string;
}

export interface TicketOrder {
  id: string;
  eventId: string;
  organizationId: string;
  consumerUserId: string;
  status: TicketOrderStatus;
  currency: string;
  subtotalAmount: number;
  totalAmount: number;
  stripeConnectedAccountId?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  createdAt: string;
  updatedAt: string;
  items: TicketOrderItem[];
}
