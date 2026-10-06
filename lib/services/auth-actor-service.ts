import { cache } from "react";
import { cookies } from "next/headers";
import { currentUser } from "@clerk/nextjs/server";
import { conflict, forbidden, unauthorized } from "@/lib/http/errors";
import { isPublicDemoMode } from "@/lib/demo-mode";
import { getAuthSession, requireAuthenticatedSession } from "@/lib/auth/session";
import {
  createOrLinkConsumerForClerkRepository,
  getActorBindingRepository,
} from "@/lib/repositories/auth-actor-repository";
import type { OrganizationMembershipRole } from "@/types/workspace";
import { CURRENT_ORGANIZATION_COOKIE } from "@/lib/workspace/constants";

export type AppActorRole = "consumer" | "recruiter";

export type CurrentAppActor = {
  role: AppActorRole | null;
  currentConsumerUserId: string | null;
  currentRecruiterProfileId: string | null;
  currentOrganizationId: string | null;
  currentOrganizationRole: OrganizationMembershipRole | null;
  needsActorSelection: boolean;
  needsOrganizationSetup: boolean;
};

function getActorDestination(actor: CurrentAppActor) {
  if (actor.role === "recruiter") {
    return actor.needsOrganizationSetup ? "/create-organization" : "/office";
  }

  if (actor.role === "consumer") {
    return "/conshome";
  }

  return "/select-role";
}

const getCurrentAppActorServiceCached = cache(async (): Promise<CurrentAppActor> => {
  const session = await getAuthSession();

  if (!session.userId) {
    return {
      role: null,
      currentConsumerUserId: null,
      currentRecruiterProfileId: null,
      currentOrganizationId: null,
      currentOrganizationRole: null,
      needsActorSelection: false,
      needsOrganizationSetup: false,
    };
  }

  const cookieStore = await cookies();
  const preferredOrganizationId = cookieStore.get(CURRENT_ORGANIZATION_COOKIE)?.value ?? null;
  const binding = await getActorBindingRepository(session.userId, preferredOrganizationId);

  if (binding.recruiterProfileId) {
    return {
      role: "recruiter",
      currentConsumerUserId: null,
      currentRecruiterProfileId: binding.recruiterProfileId,
      currentOrganizationId: binding.currentOrganizationId,
      currentOrganizationRole: binding.currentOrganizationRole,
      needsActorSelection: false,
      needsOrganizationSetup: !binding.currentOrganizationId,
    };
  }

  if (binding.consumerUserId) {
    return {
      role: "consumer",
      currentConsumerUserId: binding.consumerUserId,
      currentRecruiterProfileId: null,
      currentOrganizationId: null,
      currentOrganizationRole: null,
      needsActorSelection: false,
      needsOrganizationSetup: false,
    };
  }

  return {
    role: null,
    currentConsumerUserId: null,
    currentRecruiterProfileId: null,
    currentOrganizationId: null,
    currentOrganizationRole: null,
    needsActorSelection: true,
    needsOrganizationSetup: false,
  };
});

export async function getCurrentAppActorService(): Promise<CurrentAppActor> {
  return getCurrentAppActorServiceCached();
}

export async function selectCurrentAppActorService(role: AppActorRole) {
  const session = await requireAuthenticatedSession();
  const existingActor = await getCurrentAppActorService();

  if (existingActor.role) {
    return {
      ...existingActor,
      destination: getActorDestination(existingActor),
    };
  }

  if (isPublicDemoMode()) {
    throw forbidden("New account setup is closed for this portfolio demo. Use the supplied demo account.");
  }

  const user = await currentUser();
  if (!user) {
    throw unauthorized();
  }

  if (role === "recruiter") {
    return {
      role: "recruiter" as const,
      currentConsumerUserId: null,
      currentRecruiterProfileId: null,
      currentOrganizationId: null,
      currentOrganizationRole: null,
      needsActorSelection: false,
      needsOrganizationSetup: true,
      destination: "/create-organization",
    };
  }

  const primaryEmailAddress = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress;

  if (!primaryEmailAddress) {
    throw conflict("A primary email address is required before creating a consumer account.");
  }

  const consumerUser = await createOrLinkConsumerForClerkRepository({
    clerkUserId: session.userId,
    emailAddress: primaryEmailAddress,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarImageUrl: user.imageUrl,
  });
  if (!consumerUser) {
    throw conflict("A consumer account could not be created for this user.");
  }

  return {
    role: "consumer" as const,
    currentConsumerUserId: consumerUser.id,
    currentRecruiterProfileId: null,
    currentOrganizationId: null,
    currentOrganizationRole: null,
    needsActorSelection: false,
    needsOrganizationSetup: false,
    destination: "/conshome",
  };
}
