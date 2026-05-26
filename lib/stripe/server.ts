import "server-only";

import Stripe from "stripe";

export const STRIPE_API_VERSION = "2026-04-22.dahlia";

type StripeServerEnv = Record<string, string | undefined>;

type GlobalStripeCache = typeof globalThis & {
  __kuspaceStripeClient__?: Stripe;
};

function getStripeSecretKey(env: StripeServerEnv = process.env) {
  const secretKey = env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new Error("Stripe server configuration is incomplete. Missing: STRIPE_SECRET_KEY");
  }

  return secretKey;
}

export function createStripeServerClient(env: StripeServerEnv = process.env) {
  return new Stripe(getStripeSecretKey(env), {
    apiVersion: STRIPE_API_VERSION,
  });
}

export function getStripeServerClient(env: StripeServerEnv = process.env) {
  if (env !== process.env) {
    return createStripeServerClient(env);
  }

  const globalStripeCache = globalThis as GlobalStripeCache;

  if (!globalStripeCache.__kuspaceStripeClient__) {
    globalStripeCache.__kuspaceStripeClient__ = createStripeServerClient(env);
  }

  return globalStripeCache.__kuspaceStripeClient__;
}
