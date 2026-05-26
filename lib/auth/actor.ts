import { forbidden, notFound } from "@/lib/http/errors";
import { logWarn } from "@/lib/observability/logger";
import { requireAuthenticatedSession } from "@/lib/auth/session";
import { getCurrentAppActorService, type AppActorRole, type CurrentAppActor } from "@/lib/services/auth-actor-service";
import { getOrganizationRepositoryById } from "@/lib/db/repositories/organization-repository";
import type { OrganizationMembershipRole, WorkspaceOrganization } from "@/types/workspace";

export type AuthenticatedActor = CurrentAppActor & {
  clerkUserId: string;
  role: AppActorRole;
};

export type RecruiterActor = AuthenticatedActor & {
  role: "recruiter";
  currentRecruiterProfileId: string;
  currentConsumerUserId: null;
};

export type ConsumerActor = AuthenticatedActor & {
  role: "consumer";
  currentConsumerUserId: string;
  currentRecruiterProfileId: null;
};

export type OrganizationActor = RecruiterActor & {
  currentOrganizationId: string;
  currentOrganizationRole: OrganizationMembershipRole;
};

export async function getAuthenticatedActor(): Promise<AuthenticatedActor> {
  const session = await requireAuthenticatedSession();
  const actor = await getCurrentAppActorService();

  if (!actor.role) {
    logWarn({
      event: "authorization.actor_missing",
      message: "Authenticated account attempted an app action without a resolved actor role.",
      category: "authorization",
      meta: {
        clerkUserId: session.userId,
        needsActorSelection: actor.needsActorSelection,
      },
    });
    throw forbidden(
      actor.needsActorSelection
        ? "Select whether you are continuing as a recruiter or consumer before continuing."
        : "No app actor is linked to this account yet.",
    );
  }

  return {
    ...actor,
    role: actor.role,
    clerkUserId: session.userId,
  };
}

export async function requireRecruiterActor(): Promise<RecruiterActor> {
  const actor = await getAuthenticatedActor();

  if (actor.role !== "recruiter" || !actor.currentRecruiterProfileId) {
    logWarn({
      event: "authorization.recruiter_required",
      message: "Non-recruiter actor attempted a recruiter-only action.",
      category: "authorization",
      meta: {
        clerkUserId: actor.clerkUserId,
        currentRole: actor.role,
      },
    });
    throw forbidden("Recruiter access is required for this action.");
  }

  return actor as RecruiterActor;
}

export async function requireConsumerActor(): Promise<ConsumerActor> {
  const actor = await getAuthenticatedActor();

  if (actor.role !== "consumer" || !actor.currentConsumerUserId) {
    logWarn({
      event: "authorization.consumer_required",
      message: "Non-consumer actor attempted a consumer-only action.",
      category: "authorization",
      meta: {
        clerkUserId: actor.clerkUserId,
        currentRole: actor.role,
      },
    });
    throw forbidden("Consumer access is required for this action.");
  }

  return actor as ConsumerActor;
}

export async function getCurrentOrganization(): Promise<{
  actor: OrganizationActor;
  organization: WorkspaceOrganization;
}> {
  const actor = await requireRecruiterActor();

  if (!actor.currentOrganizationId || !actor.currentOrganizationRole) {
    logWarn({
      event: "authorization.organization_missing",
      message: "Recruiter attempted a workspace-scoped action without a resolved organization membership.",
      category: "authorization",
      meta: {
        clerkUserId: actor.clerkUserId,
        recruiterProfileId: actor.currentRecruiterProfileId,
      },
    });
    throw forbidden("Recruiter access requires an active organization workspace.");
  }

  const organization = await getOrganizationRepositoryById(actor.currentOrganizationId);

  if (!organization) {
    throw notFound("The current organization workspace could not be resolved.");
  }

  return {
    actor: actor as OrganizationActor,
    organization,
  };
}

export async function requireOrganizationMember() {
  return getCurrentOrganization();
}

export async function requireOrganizationOwner() {
  const { actor, organization } = await getCurrentOrganization();

  if (actor.currentOrganizationRole !== "owner") {
    logWarn({
      event: "authorization.organization_owner_required",
      message: "Recruiter attempted an owner-only workspace action without owner membership.",
      category: "authorization",
      meta: {
        clerkUserId: actor.clerkUserId,
        organizationId: actor.currentOrganizationId,
        currentOrganizationRole: actor.currentOrganizationRole,
      },
    });
    throw forbidden("Organization owner access is required for this action.");
  }

  return {
    actor,
    organization,
  };
}
