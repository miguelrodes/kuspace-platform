import { requireAuthenticatedSession } from "@/lib/auth/session";
import { getOrganizationsForClerkUserRepository } from "@/lib/db/repositories/organization-repository";

export async function getCurrentUserOrganizationMembershipsService() {
  const session = await requireAuthenticatedSession();
  return getOrganizationsForClerkUserRepository(session.userId);
}
