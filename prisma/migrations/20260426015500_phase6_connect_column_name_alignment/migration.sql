DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ticket_orders'
      AND column_name = 'stripe_connected_account_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ticket_orders'
      AND column_name = 'stripeConnectedAccountId'
  ) THEN
    ALTER TABLE "ticket_orders"
    RENAME COLUMN "stripe_connected_account_id" TO "stripeConnectedAccountId";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organizations'
      AND column_name = 'stripe_account_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organizations'
      AND column_name = 'stripeAccountId'
  ) THEN
    ALTER TABLE "organizations"
    RENAME COLUMN "stripe_account_id" TO "stripeAccountId";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organizations'
      AND column_name = 'stripe_charges_enabled'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organizations'
      AND column_name = 'stripeChargesEnabled'
  ) THEN
    ALTER TABLE "organizations"
    RENAME COLUMN "stripe_charges_enabled" TO "stripeChargesEnabled";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organizations'
      AND column_name = 'stripe_payouts_enabled'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organizations'
      AND column_name = 'stripePayoutsEnabled'
  ) THEN
    ALTER TABLE "organizations"
    RENAME COLUMN "stripe_payouts_enabled" TO "stripePayoutsEnabled";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organizations'
      AND column_name = 'stripe_details_submitted'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organizations'
      AND column_name = 'stripeDetailsSubmitted'
  ) THEN
    ALTER TABLE "organizations"
    RENAME COLUMN "stripe_details_submitted" TO "stripeDetailsSubmitted";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organizations'
      AND column_name = 'stripe_onboarding_started_at'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organizations'
      AND column_name = 'stripeOnboardingStartedAt'
  ) THEN
    ALTER TABLE "organizations"
    RENAME COLUMN "stripe_onboarding_started_at" TO "stripeOnboardingStartedAt";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organizations'
      AND column_name = 'stripe_onboarding_completed_at'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organizations'
      AND column_name = 'stripeOnboardingCompletedAt'
  ) THEN
    ALTER TABLE "organizations"
    RENAME COLUMN "stripe_onboarding_completed_at" TO "stripeOnboardingCompletedAt";
  END IF;
END $$;
