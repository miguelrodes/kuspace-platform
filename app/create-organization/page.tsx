import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { getCurrentAppActorService } from "@/lib/services/auth-actor-service";

export default async function CreateOrganizationPage() {
  const [session, actor] = await Promise.all([
    getAuthSession(),
    getCurrentAppActorService(),
  ]);

  if (!session.isAuthenticated) {
    redirect("/login");
  }

  if (actor.role === "consumer") {
    redirect("/conshome");
  }

  if (actor.role === "recruiter" && actor.currentOrganizationId) {
    redirect("/office");
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-10 text-fg md:px-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          <p
            className="text-body-sm uppercase tracking-[0.12em]"
            style={{ color: "var(--accent-hex)" }}
          >
            Recruiter Onboarding
          </p>
          <h1 className="text-title font-semibold tracking-tightish">Create your workspace</h1>
          <p className="max-w-2xl text-body text-muted">
            Set up the organization you want to use inside KUSPACE. This becomes the workspace
            that owns your office data and events.
          </p>
        </header>

        <form
          action="/api/workspace/organizations"
          method="post"
          className="space-y-6 border border-border bg-panel px-5 py-5 md:px-6"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-body-sm uppercase tracking-widerish text-muted">
                Organization Name
              </span>
              <input
                type="text"
                name="name"
                required
                className="h-12 w-full border border-border bg-bg px-3 text-body text-fg outline-none transition focus:border-fg"
                placeholder="Neon Harbor"
              />
            </label>

            <label className="space-y-2">
              <span className="text-body-sm uppercase tracking-widerish text-muted">
                Slug
              </span>
              <input
                type="text"
                name="slug"
                required
                className="h-12 w-full border border-border bg-bg px-3 text-body text-fg outline-none transition focus:border-fg"
                placeholder="neon-harbor"
              />
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-body-sm uppercase tracking-widerish text-muted">
                Organization Type
              </span>
              <select
                name="type"
                defaultValue="nightclub"
                className="h-12 w-full border border-border bg-bg px-3 text-body text-fg outline-none transition focus:border-fg"
              >
                <option value="nightclub">Nightclub</option>
                <option value="label">Label</option>
                <option value="independent_organizer">Independent Organizer</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-body-sm uppercase tracking-widerish text-muted">
                City / Location
              </span>
              <input
                type="text"
                name="locationDisplayText"
                className="h-12 w-full border border-border bg-bg px-3 text-body text-fg outline-none transition focus:border-fg"
                placeholder="Northport"
              />
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-[var(--radius-button-tag)] px-5 text-body uppercase tracking-[0.08em] transition hover:opacity-80"
              style={{ color: "var(--accent-hex)" }}
            >
              Create Workspace
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
