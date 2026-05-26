import { currentUser } from "@clerk/nextjs/server";
import { badRequest, conflict, forbidden } from "@/lib/http/errors";
import { requireAuthenticatedSession } from "@/lib/auth/session";
import { getCurrentAppActorService } from "@/lib/services/auth-actor-service";
import {
  createOrganizationMembershipRepository,
  createOrganizationRepository,
  getOrganizationRepositoryBySlug,
  updateOrganizationRepository,
  updateOrganizationStripeConnectRepository,
} from "@/lib/db/repositories/organization-repository";
import { saveRecruiterRepository } from "@/lib/db/repositories/recruiter-repository";
import { getCurrentUserOrganizationMembershipsService } from "@/lib/services/organization-membership-service";
import {
  createOrganizationSchema,
  createOrganizationStripeAccountSchema,
  updateOrganizationSchema,
  type CreateOrganizationInput,
  type CreateOrganizationStripeAccountInput,
  type UpdateOrganizationInput,
} from "@/lib/validation/workspace";
import type { RecruiterProfile } from "@/types/profile";
import { requireCurrentRecruiterProfileService } from "@/lib/services/access-service";
import { getCurrentWorkspaceService } from "@/lib/services/workspace-service";
import {
  createStripeConnectedAccount,
  createStripeConnectedAccountOnboardingLink,
  getStripeConnectedAccountStatus,
} from "@/lib/stripe/stripe-service";

function mapOrganizationTypeToRecruiterType(
  type: CreateOrganizationInput["type"] | UpdateOrganizationInput["type"],
): RecruiterProfile["recruiterType"] {
  return type === "label" ? "label" : "nightclub";
}

export function normalizeOrganizationSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function buildRecruiterProfileSeed(params: {
  clerkUserId: string;
  organizationId: string;
  name: string;
  slug: string;
  type: CreateOrganizationInput["type"];
  locationDisplayText?: string;
  emailAddress?: string;
  avatarImageUrl?: string;
}): RecruiterProfile {
  return {
    id: `recruiter-${params.organizationId}`,
    clerkUserId: params.clerkUserId,
    organizationId: params.organizationId,
    slug: params.slug,
    recruiterType: mapOrganizationTypeToRecruiterType(params.type),
    displayName: params.name,
    realName: params.name,
    location: params.locationDisplayText
      ? { displayText: params.locationDisplayText }
      : undefined,
    media: params.avatarImageUrl
      ? { avatarImageUrl: params.avatarImageUrl }
      : undefined,
    links: params.emailAddress
      ? { email: params.emailAddress }
      : undefined,
  };
}

export async function createOrganizationService(input: CreateOrganizationInput) {
  const session = await requireAuthenticatedSession();
  const actor = await getCurrentAppActorService();

  if (actor.role === "consumer") {
    throw forbidden("Consumer accounts cannot create recruiter workspaces.");
  }

  if (actor.role === "recruiter" && actor.currentOrganizationId) {
    throw conflict("You already have an active recruiter workspace.");
  }

  const payload = createOrganizationSchema.parse({
    ...input,
    slug: normalizeOrganizationSlug(input.slug || input.name),
  });

  if (!payload.slug) {
    throw conflict("Organization slug could not be generated.");
  }

  const existingOrganization = await getOrganizationRepositoryBySlug(payload.slug);
  if (existingOrganization) {
    throw conflict("An organization with this slug already exists.");
  }

  const existingMemberships = await getCurrentUserOrganizationMembershipsService();
  if (existingMemberships.some(({ organization }) => organization.slug === payload.slug)) {
    throw conflict("You are already a member of an organization with this slug.");
  }

  const user = await currentUser();
  const organization = await createOrganizationRepository(payload);
  await createOrganizationMembershipRepository({
      organizationId: organization.id,
      clerkUserId: session.userId,
      role: "owner",
  });

  const recruiterProfile = await saveRecruiterRepository(
    buildRecruiterProfileSeed({
      clerkUserId: session.userId,
      organizationId: organization.id,
      name: organization.name,
      slug: organization.slug,
      type: organization.type,
      locationDisplayText: payload.locationDisplayText,
      emailAddress: user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress,
      avatarImageUrl: user?.imageUrl,
    }),
  );

  return {
    organization,
    recruiterProfile,
    destination: "/office",
  };
}

export async function getCurrentOrganizationService() {
  return getCurrentWorkspaceService();
}

export async function updateCurrentOrganizationService(input: UpdateOrganizationInput) {
  const { actor, organization } = await getCurrentWorkspaceService();
  if (actor.currentOrganizationRole !== "owner") {
    throw forbidden("Only workspace owners can update organization details.");
  }

  const payload = updateOrganizationSchema.parse({
    ...input,
    slug: normalizeOrganizationSlug(input.slug || input.name),
  });

  const existingOrganization = await getOrganizationRepositoryBySlug(payload.slug);
  if (existingOrganization && existingOrganization.id !== organization.id) {
    throw conflict("An organization with this slug already exists.");
  }

  const nextOrganization = await updateOrganizationRepository(organization.id, payload);
  const currentRecruiter = await requireCurrentRecruiterProfileService();

  if (currentRecruiter.profile.organizationId === organization.id) {
    await saveRecruiterRepository({
      ...currentRecruiter.profile,
      slug: nextOrganization.slug,
      displayName: nextOrganization.name,
      realName: nextOrganization.name,
      recruiterType: mapOrganizationTypeToRecruiterType(nextOrganization.type),
      location: payload.locationDisplayText
        ? { displayText: payload.locationDisplayText }
        : undefined,
    });
  }

  return nextOrganization;
}

function getStripeConnectedAccountContactEmail(user: Awaited<ReturnType<typeof currentUser>>) {
  return user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress ?? null;
}

function buildOrganizationStripeStatusPatch(params: {
  organization: Awaited<ReturnType<typeof getCurrentWorkspaceService>>["organization"];
  status: Awaited<ReturnType<typeof getStripeConnectedAccountStatus>>["status"];
}) {
  return {
    stripeAccountId: params.status.stripeAccountId,
    stripeChargesEnabled: params.status.stripeChargesEnabled,
    stripePayoutsEnabled: params.status.stripePayoutsEnabled,
    stripeDetailsSubmitted: params.status.stripeDetailsSubmitted,
    stripeOnboardingStartedAt:
      params.organization.stripeOnboardingStartedAt ? undefined : new Date(),
    stripeOnboardingCompletedAt:
      params.status.onboardingComplete && !params.organization.stripeOnboardingCompletedAt
        ? new Date()
        : undefined,
  };
}

export async function createCurrentOrganizationStripeAccountService(
  input: CreateOrganizationStripeAccountInput = {},
) {
  const { actor, organization } = await getCurrentWorkspaceService();
  if (actor.currentOrganizationRole !== "owner") {
    throw forbidden("Only workspace owners can create Stripe connected accounts.");
  }

  const payload = createOrganizationStripeAccountSchema.parse(input);

  if (organization.stripeAccountId) {
    return {
      organization,
      stripeAccountCreated: false,
    };
  }

  const user = await currentUser();
  const contactEmail = getStripeConnectedAccountContactEmail(user);

  if (!contactEmail) {
    throw badRequest(
      "A verified workspace-owner email is required before creating a Stripe connected account.",
    );
  }

  const connectedAccount = await createStripeConnectedAccount({
    organizationId: organization.id,
    organizationName: organization.name,
    organizationSlug: organization.slug,
    organizationType: organization.type,
    contactEmail,
    country: payload.country,
  });

  const nextOrganization = await updateOrganizationStripeConnectRepository(organization.id, {
    stripeAccountId: connectedAccount.id,
  });

  return {
    organization: nextOrganization,
    stripeAccountCreated: true,
  };
}

export async function createCurrentOrganizationStripeOnboardingLinkService(params: {
  requestUrl: string;
  country?: string;
}) {
  const { actor, organization } = await getCurrentWorkspaceService();

  if (actor.currentOrganizationRole !== "owner") {
    throw forbidden("Only workspace owners can start Stripe onboarding.");
  }

  let nextOrganization = organization;
  let stripeAccountCreated = false;

  if (!nextOrganization.stripeAccountId) {
    const created = await createCurrentOrganizationStripeAccountService({
      country: params.country,
    });
    nextOrganization = created.organization;
    stripeAccountCreated = created.stripeAccountCreated;
  }

  const accountLink = await createStripeConnectedAccountOnboardingLink({
    stripeAccountId: nextOrganization.stripeAccountId!,
    requestUrl: params.requestUrl,
  });

  nextOrganization = await updateOrganizationStripeConnectRepository(nextOrganization.id, {
    stripeAccountId: nextOrganization.stripeAccountId,
    stripeOnboardingStartedAt:
      nextOrganization.stripeOnboardingStartedAt ? undefined : new Date(),
  });

  return {
    organization: nextOrganization,
    stripeAccountCreated,
    onboardingUrl: accountLink.onboardingUrl,
    expiresAt: accountLink.expiresAt,
    returnDestination: accountLink.returnDestination,
    refreshDestination: accountLink.refreshDestination,
  };
}

export async function syncCurrentOrganizationStripeAccountStatusService() {
  const { organization } = await getCurrentWorkspaceService();

  if (!organization.stripeAccountId) {
    return {
      organization,
      statusSynced: false,
      onboardingComplete: false,
    };
  }

  const { status } = await getStripeConnectedAccountStatus(organization.stripeAccountId);

  const patch = buildOrganizationStripeStatusPatch({
    organization,
    status,
  });
  const nextOrganization = await updateOrganizationStripeConnectRepository(organization.id, patch);

  return {
    organization: nextOrganization,
    statusSynced: true,
    onboardingComplete: status.onboardingComplete,
  };
}
