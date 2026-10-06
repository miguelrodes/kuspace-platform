import { OfficeShell } from "@/components/layout/office-shell";
import { OfficeDashboard } from "@/components/office/office-dashboard";
import { requireOfficeRecruiterNavigation } from "@/lib/auth/office-navigation";
import { getCurrentAppActorService } from "@/lib/services/auth-actor-service";
import { getCurrentWorkspaceService } from "@/lib/services/workspace-service";
import { isPublicDemoMode } from "@/lib/demo-mode";

function getStripeConnectStatusCopy(params: {
  stripeAccountId?: string;
  stripeDetailsSubmitted?: boolean;
  stripeChargesEnabled?: boolean;
  stripePayoutsEnabled?: boolean;
}) {
  if (!params.stripeAccountId) {
    return {
      title: "Enable paid tickets with Stripe Connect",
      body: "Create this workspace's connected payout account so ticket revenue can flow to the organization.",
      actionLabel: "Start Stripe onboarding",
    };
  }

  if (!params.stripeDetailsSubmitted) {
    return {
      title: "Finish submitting Stripe onboarding details",
      body: "Stripe still needs more information from this organization before paid ticket sales can be activated.",
      actionLabel: "Continue Stripe onboarding",
    };
  }

  if (!params.stripeChargesEnabled || !params.stripePayoutsEnabled) {
    return {
      title: "Stripe is reviewing this workspace",
      body: "The organization has submitted onboarding details, but charges or payouts are not active yet. Refresh the Stripe status after Stripe finishes verification.",
      actionLabel: "Continue Stripe onboarding",
    };
  }

  return null;
}

export default async function OfficePage() {
  const actor = await getCurrentAppActorService();
  requireOfficeRecruiterNavigation(actor);

  const workspace =
    actor.role === "recruiter" && actor.currentOrganizationId
      ? await getCurrentWorkspaceService()
      : null;

  const workspaceName = workspace?.organization.name ?? "Back Office";
  const workspaceTypeLabel =
    workspace?.organization.type.replace(/_/g, " ") ?? "workspace";
  const stripeConnectStatus =
    !isPublicDemoMode() && workspace && actor.currentOrganizationRole === "owner"
      ? getStripeConnectStatusCopy(workspace.organization)
      : null;

  return (
    <OfficeShell
      eyebrow={workspace ? "Current Workspace" : ""}
      title={workspaceName}
      titleClassName="text-heading !font-normal"
      titleStyle={{
        color: "var(--accent-hex)",
        fontFamily: "var(--font-space-grotesk)",
        letterSpacing: "0.06em",
      }}
      descriptionStyle={{ color: "#FFFFFF" }}
      description={
        workspace
          ? `Manage live, upcoming, draft, and archived events for this ${workspaceTypeLabel} from one calendar view.`
          : "Manage live, upcoming, draft, and archived events from one calendar view."
      }
    >
      {stripeConnectStatus ? (
        <section className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl space-y-2">
              <p
                className="text-xs tracking-[0.22em] text-white/60 uppercase"
                style={{ fontFamily: "var(--font-space-grotesk)" }}
              >
                Stripe Connect
              </p>
              <h2 className="text-xl text-white">
                {stripeConnectStatus.title}
              </h2>
              <p className="text-sm leading-6 text-white/75">
                {stripeConnectStatus.body}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/api/workspace/organizations/current/connect-account/onboarding"
                className="inline-flex items-center justify-center rounded-full bg-[var(--accent-hex)] px-5 py-3 text-sm font-medium text-black transition hover:opacity-90"
              >
                {stripeConnectStatus.actionLabel}
              </a>
              {workspace?.organization.stripeAccountId ? (
                <a
                  href="/api/workspace/organizations/current/connect-account/status"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/5"
                >
                  Refresh Stripe status
                </a>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
      <OfficeDashboard />
    </OfficeShell>
  );
}
