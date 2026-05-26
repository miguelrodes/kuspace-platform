import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import {
  createStripeServerClient,
  getStripeServerClient,
  STRIPE_API_VERSION,
} from "@/lib/stripe/server";

describe("stripe server client", () => {
  it("creates a Stripe client with the pinned API version", () => {
    const client = createStripeServerClient({
      STRIPE_SECRET_KEY: "sk_test_123",
    });

    expect(client.getApiField("version")).toBe(STRIPE_API_VERSION);
    expect((client as unknown as { _authenticator: { _apiKey: string } })._authenticator._apiKey).toBe(
      "sk_test_123",
    );
  });

  it("throws a helpful error when the Stripe secret key is missing", () => {
    expect(() =>
      createStripeServerClient({
        STRIPE_SECRET_KEY: "",
      }),
    ).toThrow("Stripe server configuration is incomplete. Missing: STRIPE_SECRET_KEY");
  });

  it("caches the default process-backed Stripe client", () => {
    const originalSecretKey = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = "sk_test_cached";

    const firstClient = getStripeServerClient();
    const secondClient = getStripeServerClient();

    expect(firstClient).toBe(secondClient);
    expect(firstClient.getApiField("version")).toBe(STRIPE_API_VERSION);

    process.env.STRIPE_SECRET_KEY = originalSecretKey;
  });
});
