import { SignIn } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/auth/config";
import { isPublicDemoMode } from "@/lib/demo-mode";

export default function LoginPage() {
  if (!isClerkConfigured()) {
    return (
      <main className="min-h-screen bg-bg px-4 py-8 text-fg md:px-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <h1 className="text-heading font-semibold tracking-tightish">Login</h1>
          <p className="text-body text-muted">
            Clerk is installed but not configured yet. Add your Clerk environment keys to
            enable sign-in.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-8 text-fg md:px-6">
      <SignIn
        routing="hash"
        signUpUrl={isPublicDemoMode() ? undefined : "/sign-up"}
        forceRedirectUrl="/auth/continue"
        fallbackRedirectUrl="/auth/continue"
      />
    </main>
  );
}
