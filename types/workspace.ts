export type OrganizationType = "nightclub" | "label" | "independent_organizer";
export type OrganizationMembershipRole = "owner" | "member";

export interface WorkspaceOrganization {
  id: string;
  slug: string;
  name: string;
  type: OrganizationType;
  stripeAccountId?: string;
  stripeChargesEnabled?: boolean;
  stripePayoutsEnabled?: boolean;
  stripeDetailsSubmitted?: boolean;
  stripeOnboardingStartedAt?: string;
  stripeOnboardingCompletedAt?: string;
}

export interface WorkspaceMembership {
  organization: WorkspaceOrganization;
  role: OrganizationMembershipRole;
}
