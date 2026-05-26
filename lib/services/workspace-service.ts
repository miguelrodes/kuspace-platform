import { cache } from "react";
import { cookies } from "next/headers";
import { forbidden, notFound } from "@/lib/http/errors";
import { getCurrentOrganization, requireRecruiterActor } from "@/lib/auth/actor";
import { requireAuthenticatedSession } from "@/lib/auth/session";
import {
  getOrganizationRepositoryById,
  getOrganizationMembershipRepository,
  getOrganizationsForClerkUserRepository,
} from "@/lib/db/repositories/organization-repository";
import { CURRENT_ORGANIZATION_COOKIE } from "@/lib/workspace/constants";

const getSelectedOrganizationIdFromCookieCached = cache(async () => {
  const cookieStore = await cookies();
  return cookieStore.get(CURRENT_ORGANIZATION_COOKIE)?.value ?? null;
});

export async function getSelectedOrganizationIdFromCookie() {
  return getSelectedOrganizationIdFromCookieCached();
}

const getCurrentWorkspaceServiceCached = cache(async () => {
  const current = await getCurrentOrganization();
  const organizations = await getOrganizationsForClerkUserRepository(current.actor.clerkUserId);

  return {
    ...current,
    organizations,
  };
});

export async function getCurrentWorkspaceService() {
  return getCurrentWorkspaceServiceCached();
}

export async function listMyOrganizationsService() {
  const session = await requireAuthenticatedSession();
  return getOrganizationsForClerkUserRepository(session.userId);
}

export async function switchCurrentOrganizationService(organizationId: string) {
  const actor = await requireRecruiterActor();
  const organization = await getOrganizationRepositoryById(organizationId);

  if (!organization) {
    throw notFound("Workspace not found.");
  }

  const membership = await getOrganizationMembershipRepository({
    organizationId,
    clerkUserId: actor.clerkUserId,
  });

  if (!membership) {
    throw forbidden("You are not a member of this workspace.");
  }

  return {
    organization: membership.organization ?? organization,
    role: membership.role,
  };
}
