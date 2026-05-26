import { withRouteHandler } from "@/lib/http/route";
import { badRequest } from "@/lib/http/errors";
import { verifyAndHandleStripeWebhookEventService } from "@/lib/services/checkout-service";

export async function POST(request: Request) {
  return withRouteHandler(async () => {
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      throw badRequest("Missing Stripe-Signature header.");
    }

    const payload = await request.text();
    return verifyAndHandleStripeWebhookEventService(payload, signature);
  });
}
