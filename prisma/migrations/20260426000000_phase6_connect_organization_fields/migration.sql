ALTER TABLE "organizations"
ADD COLUMN "stripe_account_id" TEXT,
ADD COLUMN "stripe_charges_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "stripe_payouts_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "stripe_details_submitted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "stripe_onboarding_started_at" TIMESTAMP(3),
ADD COLUMN "stripe_onboarding_completed_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "organizations_stripe_account_id_key"
ON "organizations"("stripe_account_id");
