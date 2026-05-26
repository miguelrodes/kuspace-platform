import { NextResponse } from "next/server";
import { withRouteHandler } from "@/lib/http/route";
import { createCurrentOrganizationStripeOnboardingLinkService } from "@/lib/services/organization-service";

export async function GET(request: Request) {
  return withRouteHandler(async () => {
    const country = new URL(request.url).searchParams.get("country") ?? undefined;
    const result = await createCurrentOrganizationStripeOnboardingLinkService({
      requestUrl: request.url,
      country: country || undefined,
    });

    return NextResponse.redirect(result.onboardingUrl, { status: 303 });
  });
}
