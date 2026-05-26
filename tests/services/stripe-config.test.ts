import { describe, expect, it } from "vitest";
import { getStripeConfig, isStripeConfigured } from "@/lib/stripe/config";

describe("stripe config", () => {
  const completeEnv = {
    STRIPE_SECRET_KEY: "sk_test_123",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_123",
    STRIPE_WEBHOOK_SECRET: "whsec_123",
    STRIPE_CONNECT_RETURN_URL: "http://localhost:3000/office",
    STRIPE_CONNECT_REFRESH_URL: "http://localhost:3000/office",
    STRIPE_CHECKOUT_SUCCESS_URL: "http://localhost:3000/tickets",
    STRIPE_CHECKOUT_CANCEL_URL: "http://localhost:3000/tickets",
  } satisfies Record<string, string | undefined>;

  it("reports when Stripe is not fully configured", () => {
    const originalEnv = { ...process.env };

    process.env.STRIPE_SECRET_KEY = "";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "";

    expect(isStripeConfigured()).toBe(false);

    process.env = originalEnv;
  });

  it("parses a complete Stripe Connect configuration", () => {
    expect(getStripeConfig(completeEnv)).toEqual(completeEnv);
  });

  it("throws a helpful error when required Stripe env vars are missing", () => {
    expect(() =>
      getStripeConfig({
        ...completeEnv,
        STRIPE_WEBHOOK_SECRET: "",
      }),
    ).toThrow("Stripe configuration is incomplete. Missing: STRIPE_WEBHOOK_SECRET");
  });

  it("throws a validation error when Stripe URLs are malformed", () => {
    expect(() =>
      getStripeConfig({
        ...completeEnv,
        STRIPE_CONNECT_RETURN_URL: "/office",
      }),
    ).toThrow("Stripe configuration is invalid:");
  });
});
