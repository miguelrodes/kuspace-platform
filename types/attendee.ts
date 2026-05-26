import type { EventAccessPaymentState, EventStatus } from "@/types/event";
import type { TicketOrderStatus } from "@/types/order";

export interface EventAttendeeReportSummary {
  totalPaidAttendees: number;
  ticketsSold: number;
  checkoutRevenueTotal: number;
  doorTicketRevenue: number;
  revenueEstimate: number;
  remainingInventory: number;
}

export interface EventAttendeeRow {
  orderId: string;
  consumerUserId: string;
  attendeeName: string;
  attendeeUsername: string;
  ticketSectionId: string;
  ticketSectionName: string;
  ticketPhaseId: string;
  ticketPhaseName: string;
  quantity: number;
  totalPrice: number;
  paymentState: EventAccessPaymentState;
  accessGroupId: string;
  accessGroupName: string;
  checkedIn: boolean;
  orderStatus: TicketOrderStatus;
  paidAt: string;
}

export interface EventTicketSalesSummaryRow {
  ticketSectionId: string;
  ticketSectionName: string;
  ticketPhaseId: string;
  ticketPhaseName: string;
  ticketsSold: number;
  remainingInventory: number;
  grossRevenue: number;
}

export interface EventAttendeeReport {
  event: {
    id: string;
    slug: string;
    title: string;
    date: string;
    venue: string;
    status: EventStatus;
  };
  summary: EventAttendeeReportSummary;
  attendees: EventAttendeeRow[];
  salesSummary: EventTicketSalesSummaryRow[];
}
