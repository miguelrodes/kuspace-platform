ALTER TABLE "recruiter_profiles"
ADD COLUMN "clerkUserId" TEXT;

ALTER TABLE "consumer_users"
ADD COLUMN "clerkUserId" TEXT;

CREATE UNIQUE INDEX "recruiter_profiles_clerkUserId_key"
ON "recruiter_profiles"("clerkUserId");

CREATE UNIQUE INDEX "consumer_users_clerkUserId_key"
ON "consumer_users"("clerkUserId");
