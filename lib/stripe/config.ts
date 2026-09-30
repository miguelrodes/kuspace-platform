import { z } from "zod";

const stripeEnvSchema = z.object({
  KUSPACE_DEMO_MODE: z.enum(["true", "false"]).optional(),
  STRIPE_SECRET_KEY: z.string().trim().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().trim().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().trim().min(1),
  STRIPE_CONNECT_RETURN_URL: z.string().trim().url(),
  STRIPE_CONNECT_REFRESH_URL: z.string().trim().url(),
  STRIPE_CHECKOUT_SUCCESS_URL: z.string().trim().url(),
  STRIPE_CHECKOUT_CANCEL_URL: z.string().trim().url(),
});

export type StripeConfig = z.infer<typeof stripeEnvSchema>;
type EnvLike = Record<string, string | undefined>;

const requiredStripeEnvVars = [
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_CONNECT_RETURN_URL",
  "STRIPE_CONNECT_REFRESH_URL",
  "STRIPE_CHECKOUT_SUCCESS_URL",
  "STRIPE_CHECKOUT_CANCEL_URL",
] as const;

function isStripeLiveModeKey(value: string | undefined, prefix: "sk" | "pk") {
  return value?.trim().startsWith(`${prefix}_live_`) ?? false;
}

export function assertStripeTestModeKeys(env: EnvLike = process.env) {
  if (env.KUSPACE_DEMO_MODE !== "true") {
    return;
  }

  if (
    isStripeLiveModeKey(env.STRIPE_SECRET_KEY, "sk") ||
    isStripeLiveModeKey(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, "pk")
  ) {
    throw new Error(
      "Stripe live-mode keys are not allowed when KUSPACE_DEMO_MODE=true.",
    );
  }
}

export function isStripeConfigured(env: EnvLike = process.env) {
  assertStripeTestModeKeys(env);

  return requiredStripeEnvVars.every((key) => {
    const value = env[key];
    return typeof value === "string" && value.trim().length > 0;
  });
}

export function getStripeConfig(env: EnvLike = process.env): StripeConfig {
  assertStripeTestModeKeys(env);
  const result = stripeEnvSchema.safeParse(env);

  if (result.success) {
    return result.data;
  }

  const missingKeys = requiredStripeEnvVars.filter((key) => {
    const value = env[key];
    return typeof value !== "string" || value.trim().length === 0;
  });

  if (missingKeys.length > 0) {
    throw new Error(
      `Stripe configuration is incomplete. Missing: ${missingKeys.join(", ")}`,
    );
  }

  throw new Error(
    `Stripe configuration is invalid: ${result.error.issues[0]?.message ?? "unknown error"}`,
  );
}
