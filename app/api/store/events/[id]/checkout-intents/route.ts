import { parseJsonBody, parseRouteParams, withRouteHandler } from "@/lib/http/route";
import { conflict } from "@/lib/http/errors";
import { requireConsumerActor } from "@/lib/auth/actor";
import { createCheckoutIntentService } from "@/lib/services/checkout-service";
import { createCheckoutIntentSchema, idParamsSchema } from "@/lib/validation/store";
import type { StripeCheckoutRouteResult } from "@/types/checkout";

type RouteContext = {
  params: Promise<unknown>;
};

export async function POST(request: Request, context: RouteContext) {
  return withRouteHandler(async () => {
    const actor = await requireConsumerActor();
    const { id } = await parseRouteParams(context.params, idParamsSchema);
    const body = await parseJsonBody(request, createCheckoutIntentSchema);

    const checkoutIntent = await createCheckoutIntentService({
      eventId: id,
      userId: actor.currentConsumerUserId,
      sectionId: body.sectionId,
      phaseId: body.phaseId,
      quantity: body.quantity,
      provider: "stripe",
    });

    const checkoutUrl = checkoutIntent.checkout.stripeCheckoutUrl;
    const sessionId = checkoutIntent.checkout.stripeCheckoutSessionId;

    if (!checkoutUrl || !sessionId) {
      throw conflict("Stripe Checkout is only available for paid ticket phases.");
    }

    return {
      checkoutUrl,
      orderId: checkoutIntent.order.id,
      sessionId,
    } satisfies StripeCheckoutRouteResult;
  }, { successStatus: 201 });
}
