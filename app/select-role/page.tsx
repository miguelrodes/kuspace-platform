import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { getCurrentAppActorService } from "@/lib/services/auth-actor-service";

type SelectRolePageProps = {
  searchParams?: Promise<{
    flow?: string;
  }>;
};

export default async function SelectRolePage({ searchParams }: SelectRolePageProps) {
  const session = await getAuthSession();
  const params = searchParams ? await searchParams : undefined;
  const flow = params?.flow;

  if (!session.isAuthenticated) {
    if (flow === "signup") {
      return (
        <main className="min-h-screen bg-bg px-4 py-10 text-fg md:px-6">
          <div className="mx-auto max-w-6xl space-y-8">
            <header className="space-y-3">
              <p
                className="text-body-sm uppercase tracking-[0.12em]"
                style={{ color: "var(--accent-hex)" }}
              >
                Create an Account
              </p>
              <h1 className="text-title font-semibold tracking-tightish">Choose how this account should enter KUSPACE</h1>
              <p className="max-w-4xl text-body text-muted">
                Pick the role first, then create your account. After sign-up, you will land directly in the matching home experience.
              </p>
            </header>

            <div className="grid gap-5 md:grid-cols-2 md:gap-0">
              <a
                href="/sign-up?role=consumer"
                className="px-5 pb-5 pt-0 md:pr-8"
              >
                <div className="flex h-full flex-col justify-between gap-5">
                  <div className="space-y-1.5">
                    <h2 className="text-subheading uppercase tracking-widerish text-fg">Consumer</h2>
                    <p className="max-w-none text-body text-muted">
                      Create an account to browse events, save them, apply to curated entries, and manage tickets across the consumer experience.
                    </p>
                  </div>
                  <span
                    className="inline-flex h-11 items-center justify-start rounded-[var(--radius-button-tag)] px-4 text-body uppercase tracking-[0.08em] transition hover:opacity-80"
                    style={{ color: "var(--accent-hex)" }}
                  >
                    Continue as Consumer
                  </span>
                </div>
              </a>

              <a
                href="/sign-up?role=recruiter"
                className="px-5 pb-5 pt-0 md:border-l md:border-border md:pl-8"
              >
                <div className="flex h-full flex-col justify-between gap-5">
                  <div className="space-y-1.5">
                    <h2 className="text-subheading uppercase tracking-widerish text-fg">Recruiter</h2>
                    <p className="max-w-none text-body text-muted">
                      Create an account to enter the recruiter side, access the office, and manage events through the recruiter workflow.
                    </p>
                  </div>
                  <span
                    className="inline-flex h-11 items-center justify-start rounded-[var(--radius-button-tag)] px-4 text-body uppercase tracking-[0.08em] transition hover:opacity-80"
                    style={{ color: "var(--accent-hex)" }}
                  >
                    Continue as Recruiter
                  </span>
                </div>
              </a>
            </div>
          </div>
        </main>
      );
    }

    redirect("/login");
  }

  const actor = await getCurrentAppActorService();

  if (actor.role === "recruiter") {
    redirect(actor.needsOrganizationSetup ? "/create-organization" : "/office");
  }

  if (actor.role === "consumer") {
    redirect("/conshome");
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-10 text-fg md:px-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-3">
          <p
            className="text-body-sm uppercase tracking-[0.12em]"
            style={{ color: "var(--accent-hex)" }}
          >
            Account Setup
          </p>
          <h1 className="text-title font-semibold tracking-tightish">Choose how this account should enter KUSPACE</h1>
          <p className="max-w-5xl text-body text-muted">
            You can enter as a consumer to save events and hold tickets, or as a recruiter to access the office and manage events.
          </p>
        </header>

        <div className="grid gap-5 md:grid-cols-2 md:gap-0">
          <form
            action="/api/auth/actor/select"
            method="post"
            className="px-5 pb-5 pt-0 md:pr-8"
          >
            <input type="hidden" name="role" value="consumer" />
            <div className="flex h-full flex-col justify-between gap-5">
              <div className="space-y-1.5">
                <h2 className="text-subheading uppercase tracking-widerish text-fg">Consumer</h2>
                <p className="max-w-none text-body text-muted">
                  Use this if you want to browse events, save them, apply to curated entries, and manage tickets across the consumer experience.
                </p>
              </div>
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-start rounded-[var(--radius-button-tag)] px-4 text-body uppercase tracking-[0.08em] transition hover:opacity-80"
                style={{ color: "var(--accent-hex)" }}
              >
                Continue as Consumer
              </button>
            </div>
          </form>

          <form
            action="/api/auth/actor/select"
            method="post"
            className="px-5 pb-5 pt-0 md:border-l md:border-border md:pl-8"
          >
            <input type="hidden" name="role" value="recruiter" />
            <div className="flex h-full flex-col justify-between gap-5">
              <div className="space-y-1.5">
                <h2 className="text-subheading uppercase tracking-widerish text-fg">Recruiter</h2>
                <p className="max-w-none text-body text-muted">
                  Use this if you want to create a workspace, enter the office, and manage events through the recruiter workflow.
                </p>
              </div>
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-start rounded-[var(--radius-button-tag)] px-4 text-body uppercase tracking-[0.08em] transition hover:opacity-80"
                style={{ color: "var(--accent-hex)" }}
              >
                Continue as Recruiter
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
