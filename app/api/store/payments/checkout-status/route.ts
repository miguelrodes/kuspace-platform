import { withRouteHandler } from "@/lib/http/route";
import { getTicketCheckoutStatusService } from "@/lib/services/checkout-service";
import { checkoutStatusQuerySchema } from "@/lib/validation/store";

export async function GET(request: Request) {
  return withRouteHandler(async () => {
    const url = new URL(request.url);
    const query = checkoutStatusQuerySchema.parse({
      orderId: url.searchParams.get("orderId") ?? undefined,
      stripeCheckoutSessionId: url.searchParams.get("session_id") ?? undefined,
    });

    return getTicketCheckoutStatusService(query);
  });
}
