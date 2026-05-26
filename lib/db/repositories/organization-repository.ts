import { prisma } from "@/lib/prisma";
import type { WorkspaceOrganization } from "@/types/workspace";
import type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from "@/lib/validation/workspace";

function mapOrganizationModel(organization: {
  id: string;
  slug: string;
  name: string;
  type: WorkspaceOrganization["type"];
  stripeAccountId: string | null;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  stripeDetailsSubmitted: boolean;
  stripeOnboardingStartedAt: Date | null;
  stripeOnboardingCompletedAt: Date | null;
}): WorkspaceOrganization {
  return {
    id: organization.id,
    slug: organization.slug,
    name: organization.name,
    type: organization.type,
    stripeAccountId: organization.stripeAccountId ?? undefined,
    stripeChargesEnabled: organization.stripeChargesEnabled,
    stripePayoutsEnabled: organization.stripePayoutsEnabled,
    stripeDetailsSubmitted: organization.stripeDetailsSubmitted,
    stripeOnboardingStartedAt: organization.stripeOnboardingStartedAt?.toISOString(),
    stripeOnboardingCompletedAt: organization.stripeOnboardingCompletedAt?.toISOString(),
  };
}

export async function getOrganizationRepositoryBySlug(slug: string) {
  const organization = await prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      type: true,
      stripeAccountId: true,
      stripeChargesEnabled: true,
      stripePayoutsEnabled: true,
      stripeDetailsSubmitted: true,
      stripeOnboardingStartedAt: true,
      stripeOnboardingCompletedAt: true,
    },
  });

  return organization ? mapOrganizationModel(organization) : null;
}

export async function getOrganizationRepositoryById(id: string) {
  const organization = await prisma.organization.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      name: true,
      type: true,
      stripeAccountId: true,
      stripeChargesEnabled: true,
      stripePayoutsEnabled: true,
      stripeDetailsSubmitted: true,
      stripeOnboardingStartedAt: true,
      stripeOnboardingCompletedAt: true,
    },
  });

  return organization ? mapOrganizationModel(organization) : null;
}

export async function getOrganizationsForClerkUserRepository(clerkUserId: string) {
  const memberships = await prisma.organizationMembership.findMany({
    where: { clerkUserId },
    orderBy: { createdAt: "asc" },
    select: {
      role: true,
      organization: {
        select: {
          id: true,
          slug: true,
          name: true,
          type: true,
          stripeAccountId: true,
          stripeChargesEnabled: true,
          stripePayoutsEnabled: true,
          stripeDetailsSubmitted: true,
          stripeOnboardingStartedAt: true,
          stripeOnboardingCompletedAt: true,
        },
      },
    },
  });

  return memberships.map((membership) => ({
    organization: mapOrganizationModel(membership.organization),
    role: membership.role,
  }));
}

export async function createOrganizationRepository(input: CreateOrganizationInput) {
  const organization = await prisma.organization.create({
    data: {
      name: input.name,
      slug: input.slug,
      type: input.type,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      type: true,
      stripeAccountId: true,
      stripeChargesEnabled: true,
      stripePayoutsEnabled: true,
      stripeDetailsSubmitted: true,
      stripeOnboardingStartedAt: true,
      stripeOnboardingCompletedAt: true,
    },
  });

  return mapOrganizationModel(organization);
}

export async function createOrganizationMembershipRepository(params: {
  organizationId: string;
  clerkUserId: string;
  role: "owner" | "member";
}) {
  return prisma.organizationMembership.create({
    data: params,
    select: {
      id: true,
      organizationId: true,
      clerkUserId: true,
      role: true,
    },
  });
}

export async function getOrganizationMembershipRepository(params: {
  organizationId: string;
  clerkUserId: string;
}) {
  return prisma.organizationMembership.findUnique({
    where: {
      organizationId_clerkUserId: {
        organizationId: params.organizationId,
        clerkUserId: params.clerkUserId,
      },
    },
    select: {
      role: true,
      organization: {
        select: {
          id: true,
          slug: true,
          name: true,
          type: true,
          stripeAccountId: true,
          stripeChargesEnabled: true,
          stripePayoutsEnabled: true,
          stripeDetailsSubmitted: true,
          stripeOnboardingStartedAt: true,
          stripeOnboardingCompletedAt: true,
        },
      },
    },
  });
}

export async function updateOrganizationRepository(id: string, input: UpdateOrganizationInput) {
  const organization = await prisma.organization.update({
    where: { id },
    data: {
      name: input.name,
      slug: input.slug,
      type: input.type,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      type: true,
      stripeAccountId: true,
      stripeChargesEnabled: true,
      stripePayoutsEnabled: true,
      stripeDetailsSubmitted: true,
      stripeOnboardingStartedAt: true,
      stripeOnboardingCompletedAt: true,
    },
  });

  return mapOrganizationModel(organization);
}

type UpdateOrganizationStripeConnectInput = {
  stripeAccountId?: string | null;
  stripeChargesEnabled?: boolean;
  stripePayoutsEnabled?: boolean;
  stripeDetailsSubmitted?: boolean;
  stripeOnboardingStartedAt?: Date | null;
  stripeOnboardingCompletedAt?: Date | null;
};

export async function updateOrganizationStripeConnectRepository(
  id: string,
  input: UpdateOrganizationStripeConnectInput,
) {
  const organization = await prisma.organization.update({
    where: { id },
    data: {
      stripeAccountId: input.stripeAccountId,
      stripeChargesEnabled: input.stripeChargesEnabled,
      stripePayoutsEnabled: input.stripePayoutsEnabled,
      stripeDetailsSubmitted: input.stripeDetailsSubmitted,
      stripeOnboardingStartedAt: input.stripeOnboardingStartedAt,
      stripeOnboardingCompletedAt: input.stripeOnboardingCompletedAt,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      type: true,
      stripeAccountId: true,
      stripeChargesEnabled: true,
      stripePayoutsEnabled: true,
      stripeDetailsSubmitted: true,
      stripeOnboardingStartedAt: true,
      stripeOnboardingCompletedAt: true,
    },
  });

  return mapOrganizationModel(organization);
}
