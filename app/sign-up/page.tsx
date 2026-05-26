import { SignUp } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/auth/config";

type SignUpPageProps = {
  searchParams?: Promise<{
    role?: string;
  }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
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
