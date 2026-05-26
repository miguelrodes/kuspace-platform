import { NextResponse } from "next/server";
import { withRouteHandler } from "@/lib/http/route";
import { createCurrentOrganizationStripeOnboardingLinkService } from "@/lib/services/organization-service";

export async function GET(request: Request) {
  return withRouteHandler(async () => {
    const result = await createCurrentOrganizationStripeOnboardingLinkService({
      requestUrl: request.url,
    });

    return NextResponse.redirect(result.onboardingUrl, { status: 303 });
  });
}
