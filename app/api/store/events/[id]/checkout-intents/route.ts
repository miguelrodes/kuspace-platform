import { parseJsonBody, parseRouteParams, withRouteHandler } from "@/lib/http/route";
import { createCheckoutIntentService } from "@/lib/services/checkout-service";
import { createCheckoutIntentSchema, idParamsSchema } from "@/lib/validation/store";

type RouteContext = {
  params: Promise<unknown>;
};

export async function POST(request: Request, context: RouteContext) {
  return withRouteHandler(async () => {
    const { id } = await parseRouteParams(context.params, idParamsSchema);
    const body = await parseJsonBody(request, createCheckoutIntentSchema);

    return createCheckoutIntentService({
      eventId: id,
      userId: body.userId,
      sectionId: body.sectionId,
      quantity: body.quantity,
      provider: body.provider,
    });
  }, { successStatus: 201 });
}
