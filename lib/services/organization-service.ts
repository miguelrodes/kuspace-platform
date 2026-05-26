import { currentUser } from "@clerk/nextjs/server";
import type Stripe from "stripe";
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
import { getStripeServerClient } from "@/lib/stripe/server";
import { getStripeConfig } from "@/lib/stripe/config";

type StripeAccountLinkCreateParams = Parameters<
  ReturnType<typeof getStripeServerClient>["v2"]["core"]["accountLinks"]["create"]
>[0];

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

function buildConnectedAccountCreateParams(params: {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  organizationType: CreateOrganizationInput["type"];
  contactEmail: string;
  country?: string;
}) {
  return {
    contact_email: params.contactEmail,
    dashboard: "express" as const,
    defaults: {
      profile: {
        doing_business_as: params.organizationName,
        product_description: "Event ticket sales and access managed through KUSPACE.",
      },
      responsibilities: {
        fees_collector: "application" as const,
        losses_collector: "application" as const,
      },
    },
    display_name: params.organizationName,
    configuration: {
      merchant: {
        capabilities: {
          card_payments: { requested: true },
        },
      },
      recipient: {
        capabilities: {
          stripe_balance: {
            payouts: { requested: true },
            stripe_transfers: { requested: true },
          },
        },
      },
    },
    ...(params.country ? { identity: { country: params.country } } : {}),
    metadata: {
      organizationId: params.organizationId,
      organizationSlug: params.organizationSlug,
      organizationType: params.organizationType,
    },
  };
}

function buildStripeHostedOnboardingUseCase(params: {
  refreshUrl: string;
  returnUrl: string;
}): StripeAccountLinkCreateParams["use_case"] {
  const configurations: Exclude<
    StripeAccountLinkCreateParams["use_case"]["account_onboarding"],
    undefined
  >["configurations"] = ["merchant", "recipient"];

  return {
    type: "account_onboarding" as const,
    account_onboarding: {
      collection_options: {
        fields: "eventually_due" as const,
        future_requirements: "include" as const,
      },
      configurations,
      refresh_url: params.refreshUrl,
      return_url: params.returnUrl,
    },
  };
}

function isCapabilityActive(status?: "active" | "pending" | "restricted" | "unsupported") {
  return status === "active";
}

function isStripeDetailsSubmitted(account: Stripe.V2.Core.Account) {
  return !(
    account.requirements?.entries?.some((entry) => entry.awaiting_action_from === "user") ?? false
  );
}

function buildOrganizationStripeStatusPatch(params: {
  organization: Awaited<ReturnType<typeof getCurrentWorkspaceService>>["organization"];
  account: Stripe.V2.Core.Account;
}) {
  const stripeChargesEnabled = isCapabilityActive(
    params.account.configuration?.merchant?.capabilities?.card_payments?.status,
  );
  const stripePayoutsEnabled = isCapabilityActive(
    params.account.configuration?.recipient?.capabilities?.stripe_balance?.payouts?.status,
  );
  const stripeDetailsSubmitted = isStripeDetailsSubmitted(params.account);
  const onboardingCompleted =
    stripeChargesEnabled && stripePayoutsEnabled && stripeDetailsSubmitted;

  return {
    stripeAccountId: params.account.id,
    stripeChargesEnabled,
    stripePayoutsEnabled,
    stripeDetailsSubmitted,
    stripeOnboardingStartedAt:
      params.organization.stripeOnboardingStartedAt ? undefined : new Date(),
    stripeOnboardingCompletedAt:
      onboardingCompleted && !params.organization.stripeOnboardingCompletedAt
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

  const stripe = getStripeServerClient();
  const connectedAccount = await stripe.v2.core.accounts.create(
    buildConnectedAccountCreateParams({
      organizationId: organization.id,
      organizationName: organization.name,
      organizationSlug: organization.slug,
      organizationType: organization.type,
      contactEmail,
      country: payload.country,
    }),
  );

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
  const config = getStripeConfig();
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

  const requestOrigin = new URL(params.requestUrl).origin;
  const refreshUrl = new URL(
    "/api/workspace/organizations/current/connect-account/onboarding/refresh",
    requestOrigin,
  ).toString();
  const returnUrl = new URL(
    "/api/workspace/organizations/current/connect-account/onboarding/return",
    requestOrigin,
  ).toString();

  const stripe = getStripeServerClient();
  const accountLink = await stripe.v2.core.accountLinks.create({
    account: nextOrganization.stripeAccountId!,
    use_case: buildStripeHostedOnboardingUseCase({
      refreshUrl,
      returnUrl,
    }),
  });

  nextOrganization = await updateOrganizationStripeConnectRepository(nextOrganization.id, {
    stripeAccountId: nextOrganization.stripeAccountId,
    stripeOnboardingStartedAt:
      nextOrganization.stripeOnboardingStartedAt ? undefined : new Date(),
  });

  return {
    organization: nextOrganization,
    stripeAccountCreated,
    onboardingUrl: accountLink.url,
    expiresAt: accountLink.expires_at,
    returnDestination: config.STRIPE_CONNECT_RETURN_URL,
    refreshDestination: config.STRIPE_CONNECT_REFRESH_URL,
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

  const stripe = getStripeServerClient();
  const account = await stripe.v2.core.accounts.retrieve(organization.stripeAccountId, {
    include: ["configuration.merchant", "configuration.recipient", "requirements"],
  });

  const patch = buildOrganizationStripeStatusPatch({
    organization,
    account,
  });
  const nextOrganization = await updateOrganizationStripeConnectRepository(organization.id, patch);
  const onboardingComplete =
    patch.stripeChargesEnabled && patch.stripePayoutsEnabled && patch.stripeDetailsSubmitted;

  return {
    organization: nextOrganization,
    statusSynced: true,
    onboardingComplete,
  };
}
