import { prisma } from "@/lib/prisma";
import type { OrganizationMembershipRole } from "@/types/workspace";

export type ActorBinding = {
  consumerUserId: string | null;
  recruiterProfileId: string | null;
  currentOrganizationId: string | null;
  currentOrganizationRole: OrganizationMembershipRole | null;
};

function normalizeBaseSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

async function getNextAvailableConsumerUsername(baseValue: string) {
  const base = normalizeBaseSlug(baseValue) || "consumer";

  for (let index = 0; index < 100; index += 1) {
    const username = index === 0 ? base : `${base}${index + 1}`;
    const existing = await prisma.consumerUser.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!existing) {
      return username;
    }
  }

  return `consumer${Date.now()}`;
}

export async function getActorBindingRepository(
  clerkUserId: string,
  preferredOrganizationId?: string | null,
): Promise<ActorBinding> {
  const [consumerUser, recruiterProfile, organizationMemberships] = await Promise.all([
    prisma.consumerUser.findUnique({
      where: { clerkUserId },
      select: { id: true },
    }),
    prisma.recruiterProfile.findUnique({
      where: { clerkUserId },
      select: { id: true, organizationId: true },
    }),
    prisma.organizationMembership.findMany({
      where: { clerkUserId },
      orderBy: { createdAt: "asc" },
      select: {
        organizationId: true,
        role: true,
      },
    }),
  ]);

  const recruiterOrganizationMembership = recruiterProfile?.organizationId
    ? organizationMemberships.find((membership) => membership.organizationId === recruiterProfile.organizationId) ?? null
    : null;
  const preferredOrganizationMembership = preferredOrganizationId
    ? organizationMemberships.find((membership) => membership.organizationId === preferredOrganizationId) ?? null
    : null;
  const currentOrganizationMembership =
    preferredOrganizationMembership
    ?? recruiterOrganizationMembership
    ?? organizationMemberships[0]
    ?? null;
  const currentOrganizationRecruiterProfile =
    currentOrganizationMembership?.organizationId === recruiterProfile?.organizationId
      ? recruiterProfile
      : currentOrganizationMembership?.organizationId
        ? await prisma.recruiterProfile.findFirst({
            where: { organizationId: currentOrganizationMembership.organizationId },
            orderBy: { createdAt: "asc" },
            select: { id: true },
          })
        : null;

  return {
    consumerUserId: consumerUser?.id ?? null,
    recruiterProfileId: currentOrganizationRecruiterProfile?.id ?? recruiterProfile?.id ?? null,
    currentOrganizationId: currentOrganizationMembership?.organizationId ?? recruiterProfile?.organizationId ?? null,
    currentOrganizationRole: currentOrganizationMembership?.role ?? null,
  };
}

export async function ensureOrganizationMembershipRepository(
  clerkUserId: string,
  organizationId: string,
  role: OrganizationMembershipRole = "owner",
) {
  return prisma.organizationMembership.upsert({
    where: {
      organizationId_clerkUserId: {
        organizationId,
        clerkUserId,
      },
    },
    create: {
      organizationId,
      clerkUserId,
      role,
    },
    update: {
      role,
    },
    select: {
      organizationId: true,
      role: true,
    },
  });
}

export async function linkClerkUserToDefaultRecruiterRepository(clerkUserId: string) {
  const existing = await prisma.recruiterProfile.findUnique({
    where: { clerkUserId },
    select: { id: true, organizationId: true },
  });

  if (existing) {
    if (existing.organizationId) {
      await ensureOrganizationMembershipRepository(clerkUserId, existing.organizationId, "owner");
    }
    return existing;
  }

  const defaultRecruiter = await prisma.recruiterProfile.findFirst({
    where: { clerkUserId: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, organizationId: true },
  });

  if (!defaultRecruiter) {
    return null;
  }

  const recruiterProfile = await prisma.recruiterProfile.update({
    where: { id: defaultRecruiter.id },
    data: { clerkUserId },
    select: { id: true, organizationId: true },
  });

  if (recruiterProfile.organizationId) {
    await ensureOrganizationMembershipRepository(clerkUserId, recruiterProfile.organizationId, "owner");
  }

  return recruiterProfile;
}

export async function linkClerkUserToDefaultConsumerRepository(clerkUserId: string) {
  const existingByClerkUserId = await prisma.consumerUser.findUnique({
    where: { clerkUserId },
    select: { id: true },
  });

  const defaultConsumer = await prisma.consumerUser.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!defaultConsumer) {
    return null;
  }

  if (existingByClerkUserId?.id === defaultConsumer.id) {
    return existingByClerkUserId;
  }

  if (existingByClerkUserId) {
    await prisma.consumerUser.update({
      where: { id: existingByClerkUserId.id },
      data: { clerkUserId: null },
    });
  }

  const existingDefaultBinding = await prisma.consumerUser.findUnique({
    where: { id: defaultConsumer.id },
    select: { clerkUserId: true },
  });

  if (existingDefaultBinding?.clerkUserId && existingDefaultBinding.clerkUserId !== clerkUserId) {
    return defaultConsumer;
  }

  return prisma.consumerUser.update({
    where: { id: defaultConsumer.id },
    data: { clerkUserId },
    select: { id: true },
  });
}

export async function createOrLinkConsumerForClerkRepository(params: {
  clerkUserId: string;
  emailAddress: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarImageUrl?: string | null;
}) {
  const existing = await prisma.consumerUser.findUnique({
    where: { clerkUserId: params.clerkUserId },
    select: { id: true },
  });

  if (existing) {
    return existing;
  }

  const emailBase = params.emailAddress.split("@")[0] ?? "consumer";
  const nameBase = `${params.firstName ?? ""} ${params.lastName ?? ""}`.trim();
  const username = await getNextAvailableConsumerUsername(nameBase || emailBase);

  return prisma.consumerUser.create({
    data: {
      clerkUserId: params.clerkUserId,
      username,
      firstName: params.firstName?.trim() || "New",
      lastName: params.lastName?.trim() || "User",
      email: params.emailAddress,
      avatarImageUrl: params.avatarImageUrl?.trim() || null,
      createdAt: new Date(),
    },
    select: { id: true },
  });
}
