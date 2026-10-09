import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { DemoDisclosure } from "@/components/demo/demo-disclosure";
import { SiteFooter } from "@/components/demo/site-footer";
import { demoAssetSources } from "@/lib/demo-asset-sources";
import { createCheckoutIntentService, simulateInternalTicketPurchaseService } from "@/lib/services/checkout-service";
import { createOrganizationService, createCurrentOrganizationStripeAccountService, createCurrentOrganizationStripeOnboardingLinkService, syncCurrentOrganizationStripeAccountStatusService } from "@/lib/services/organization-service";
import DemoInfoPage from "@/app/demo-info/page";
import PrivacyPage from "@/app/privacy/page";
import CookiesPage from "@/app/cookies/page";
import HomePage from "@/app/page";
import SignUpPage from "@/app/sign-up/page";
import { updateRecruiterProfileService } from "@/lib/services/recruiter-service";

afterEach(() => vi.unstubAllEnvs());

describe("public demo safeguards", () => {
  it("rejects recruiter profile changes before accessing persistence in demo mode", async () => {
    vi.stubEnv("KUSPACE_DEMO_MODE", "true");
    await expect(updateRecruiterProfileService({} as Parameters<typeof updateRecruiterProfileService>[0]))
      .rejects.toMatchObject({ status: 403, message: "Recruiter profile settings are not available in demo mode." });
  });

  it("renders the exact shared notice, public legal pages, and footer links without auth", () => {
    const notice = renderToStaticMarkup(createElement(DemoDisclosure));
    const footer = renderToStaticMarkup(createElement(SiteFooter));

    expect(notice).toContain("Portfolio demo — historical event listings; fictional operational data. No real tickets, payments or bookings.");
    expect(notice).toContain('href="/demo-info"');
    for (const path of ["/demo-info", "/privacy", "/cookies", "mailto:miguelrodes24@gmail.com"]) {
      expect(footer).toContain(`href="${path}"`);
    }
    expect(renderToStaticMarkup(createElement(DemoInfoPage))).toContain("Last updated: 6 October 2026");
    expect(renderToStaticMarkup(createElement(PrivacyPage))).toContain("Privacy notice");
    expect(renderToStaticMarkup(createElement(CookiesPage))).toContain("kuspace_current_organization_id");
  });

  it("accounts for every mapped local archived asset without claiming permission", () => {
    expect(demoAssetSources).toHaveLength(29);
    expect(demoAssetSources.every((asset) => !asset.licenceOrPermission)).toBe(true);
    expect(demoAssetSources.find((asset) => asset.id === "draft-placeholder.jpg")?.relevantTo).toHaveLength(3);
  });

  it("replaces app-owned registration calls to action in demo mode", async () => {
    vi.stubEnv("KUSPACE_DEMO_MODE", "true");
    const home = renderToStaticMarkup(createElement(HomePage));
    const signup = renderToStaticMarkup(await SignUpPage({}));

    expect(home).toContain("Explore as a nightclub / event label");
    expect(home).toContain("Explore as a clubgoer");
    expect(home).not.toContain("Create an Account");
    expect(signup).toContain("Demo registration is closed");
    expect(signup).toContain('href="/login"');
  });

  it("blocks paid and internal purchases before any checkout/order flow in demo mode", async () => {
    vi.stubEnv("KUSPACE_DEMO_MODE", "true");
    await expect(createCheckoutIntentService({ eventId: "event", userId: "user", sectionId: "section" })).rejects.toMatchObject({ status: 409 });
    await expect(simulateInternalTicketPurchaseService({ eventId: "event", userId: "user", sectionId: "section" })).rejects.toMatchObject({ status: 409 });
  });

  it("blocks new workspaces and both Stripe onboarding entry points in demo mode", async () => {
    vi.stubEnv("KUSPACE_DEMO_MODE", "true");
    await expect(createOrganizationService({} as Parameters<typeof createOrganizationService>[0])).rejects.toMatchObject({ status: 403 });
    await expect(createCurrentOrganizationStripeAccountService()).rejects.toMatchObject({ status: 403 });
    await expect(createCurrentOrganizationStripeOnboardingLinkService({ requestUrl: "https://example.test" })).rejects.toMatchObject({ status: 403 });
    await expect(syncCurrentOrganizationStripeAccountStatusService()).rejects.toMatchObject({ status: 403 });
  });
});
