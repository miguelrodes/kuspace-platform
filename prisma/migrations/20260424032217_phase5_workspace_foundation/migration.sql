-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('nightclub', 'label', 'independent_organizer');

-- CreateEnum
CREATE TYPE "OrganizationMembershipRole" AS ENUM ('owner', 'member');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "recruiter_profiles" ADD COLUMN     "organizationId" TEXT;

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_memberships" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "role" "OrganizationMembershipRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id")
);

-- Backfill organizations from existing recruiter profiles.
INSERT INTO "organizations" ("id", "slug", "name", "type", "createdAt", "updatedAt")
SELECT
  'organization-' || "id",
  "slug",
  "displayName",
  CASE
    WHEN "recruiterType" = 'label' THEN 'label'::"OrganizationType"
    ELSE 'nightclub'::"OrganizationType"
  END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "recruiter_profiles";

UPDATE "recruiter_profiles"
SET "organizationId" = 'organization-' || "id"
WHERE "organizationId" IS NULL;

INSERT INTO "organization_memberships" ("id", "organizationId", "clerkUserId", "role", "createdAt", "updatedAt")
SELECT
  'organization-membership-' || "id",
  "organizationId",
  "clerkUserId",
  'owner'::"OrganizationMembershipRole",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "recruiter_profiles"
WHERE "clerkUserId" IS NOT NULL
  AND "organizationId" IS NOT NULL;

UPDATE "events"
SET "organizationId" = "recruiter_profiles"."organizationId"
FROM "recruiter_profiles"
WHERE "events"."recruiterProfileId" = "recruiter_profiles"."id"
  AND "events"."organizationId" IS NULL;

ALTER TABLE "events" ALTER COLUMN "organizationId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organization_memberships_clerkUserId_idx" ON "organization_memberships"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_memberships_organizationId_clerkUserId_key" ON "organization_memberships"("organizationId", "clerkUserId");

-- CreateIndex
CREATE INDEX "events_organizationId_idx" ON "events"("organizationId");

-- CreateIndex
CREATE INDEX "events_organizationId_status_idx" ON "events"("organizationId", "status");

-- CreateIndex
CREATE INDEX "recruiter_profiles_organizationId_idx" ON "recruiter_profiles"("organizationId");

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiter_profiles" ADD CONSTRAINT "recruiter_profiles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
