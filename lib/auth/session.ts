import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { isClerkConfigured } from "@/lib/auth/config";
import { unauthorized } from "@/lib/http/errors";
import { errorMeta, logWarn } from "@/lib/observability/logger";
import { cookies } from "next/headers";
import { isPublicDemoMode } from "@/lib/demo-mode";
import { SANDBOX_COOKIE } from "@/lib/demo/sandbox";
import { forbidden } from "@/lib/http/errors";

export type AuthSession = {
  userId: string | null;
  sessionId: string | null;
  orgId: string | null;
  isAuthenticated: boolean;
};

export type AuthenticatedSession = {
  userId: string;
  sessionId: string | null;
  orgId: string | null;
  isAuthenticated: true;
};

const getAuthSessionCached = cache(async (): Promise<AuthSession> => {
  if (!isClerkConfigured()) {
    return {
      userId: null,
      sessionId: null,
      orgId: null,
      isAuthenticated: false,
    };
  }

  try {
    const session = await auth();

    return {
      userId: session.userId,
      sessionId: session.sessionId ?? null,
      orgId: session.orgId ?? null,
      isAuthenticated: Boolean(session.userId),
    };
  } catch (error) {
    const isBuildTimeDynamicUsageError =
      error instanceof Error && error.message.includes("Dynamic server usage:");

    if (!isBuildTimeDynamicUsageError) {
      logWarn({
        event: "auth.session_lookup_failed",
        message: "Clerk session lookup failed.",
        category: "auth",
        meta: errorMeta(error),
      });
    }

    return {
      userId: null,
      sessionId: null,
      orgId: null,
      isAuthenticated: false,
    };
  }
});

export async function getAuthSession(): Promise<AuthSession> {
  return getAuthSessionCached();
}

export async function requireAuthenticatedSession(): Promise<AuthenticatedSession> {
  if (isPublicDemoMode() && (await cookies()).get(SANDBOX_COOKIE)?.value === "1") {
    throw forbidden("The browser demo has no database identity. Edits stay in the visitor's tab.");
  }
  const session = await getAuthSession();

  if (!session.isAuthenticated || !session.userId) {
    logWarn({
      event: "auth.unauthenticated_request",
      message: "Authenticated session required but no active session was found.",
      category: "auth",
      meta: {
        sessionId: session.sessionId,
        orgId: session.orgId,
      },
    });
    throw unauthorized();
  }

  return {
    ...session,
    userId: session.userId,
    isAuthenticated: true,
  };
}
