import type { EventAccessAssignment, EventAccessPaymentState } from "@/types/event";
import type { ConsumerTicketStatus } from "@/types/user";

export const QR_ACTIVE_PAYMENT_STATES = new Set<EventAccessPaymentState>([
  "paid",
  "not_required",
  "waived",
]);

export function isQrActiveForPaymentState(paymentState?: EventAccessPaymentState) {
  return paymentState ? QR_ACTIVE_PAYMENT_STATES.has(paymentState) : false;
}

export function isQrActiveForAssignment(
  assignment?: Pick<EventAccessAssignment, "paymentState">,
) {
  return assignment ? isQrActiveForPaymentState(assignment.paymentState) : false;
}

export function deriveConsumerTicketStatusFromAssignment(
  assignment?: Pick<EventAccessAssignment, "checkedIn" | "paymentState">,
): ConsumerTicketStatus | undefined {
  if (!assignment) {
    return undefined;
  }

  if (assignment.checkedIn) {
    return "scanned";
  }

  return isQrActiveForAssignment(assignment) ? "active" : "inactive";
}
