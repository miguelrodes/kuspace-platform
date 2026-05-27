import {
  applyCheckoutIntentPaymentTransitionService,
  createCheckoutIntentService,
} from "@/lib/services/checkout-service";
import { errorMeta, logError } from "@/lib/observability/logger";

export async function purchaseTicketSectionService(params: {
  eventId: string;
  userId: string;
  sectionId: string;
  phaseId: string;
  quantity?: number;
}) {
  try {
    const checkoutIntent = await createCheckoutIntentService({
      ...params,
      provider: "stripe",
    });

    if (checkoutIntent.intent.paymentState === "pending") {
      return checkoutIntent;
    }

    return applyCheckoutIntentPaymentTransitionService({
      orderId: checkoutIntent.order.id,
      status: "paid",
      occurredAt: new Date().toISOString(),
    });
  } catch (error) {
    logError({
      event: "mutation.ticket_purchase_failed",
      message: "Ticket purchase mutation failed.",
      category: "mutation",
      meta: {
        eventId: params.eventId,
        userId: params.userId,
        sectionId: params.sectionId,
        phaseId: params.phaseId,
        quantity: params.quantity ?? 1,
        ...errorMeta(error),
      },
    });
    throw error;
  }
}
