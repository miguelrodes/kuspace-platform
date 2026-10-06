import { SignUp } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/auth/config";
import { isPublicDemoMode } from "@/lib/demo-mode";
import Link from "next/link";

type SignUpPageProps = {
  searchParams?: Promise<{
    role?: string;
  }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  if (isPublicDemoMode()) {
    return (
      <main className="min-h-screen bg-bg px-4 py-12 text-fg">
        <div className="mx-auto max-w-xl space-y-4">
          <h1 className="text-heading">Demo registration is closed</h1>
          <p className="text-muted">Use the supplied demonstration account to sign in. Please do not create a personal account for this portfolio demo.</p>
          <Link className="text-accent underline" href="/login">Go to demo sign-in</Link>
        </div>
      </main>
    );
  }
  if (!isClerkConfigured()) {
    return (
      <main className="min-h-screen bg-bg px-4 py-8 text-fg md:px-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <h1 className="text-heading font-semibold tracking-tightish">Sign Up</h1>
          <p className="text-body text-muted">
            Clerk is installed but not configured yet. Add your Clerk environment keys to
            enable sign-up.
          </p>
        </div>
      </main>
    );
  }

  const params = searchParams ? await searchParams : undefined;
  const role = params?.role === "recruiter" ? "recruiter" : "consumer";

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-8 text-fg md:px-6">
      <SignUp
        routing="hash"
        signInUrl="/login"
        forceRedirectUrl={`/auth/continue?role=${role}`}
        fallbackRedirectUrl={`/auth/continue?role=${role}`}
      />
    </main>
  );
}
