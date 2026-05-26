import { NextResponse } from "next/server";
import { withRouteHandler } from "@/lib/http/route";
import { getStripeConfig } from "@/lib/stripe/config";
import { syncCurrentOrganizationStripeAccountStatusService } from "@/lib/services/organization-service";

export async function GET() {
  return withRouteHandler(async () => {
    const config = getStripeConfig();
    const result = await syncCurrentOrganizationStripeAccountStatusService();
    const destination = new URL(config.STRIPE_CONNECT_RETURN_URL);

    destination.searchParams.set("stripeConnectRefresh", "1");
    destination.searchParams.set(
      "stripeConnectStatus",
      result.onboardingComplete ? "ready" : "pending",
    );

    return NextResponse.redirect(destination, { status: 303 });
  });
}
