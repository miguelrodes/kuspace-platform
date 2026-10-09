import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), cookies: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@/lib/auth/config", () => ({ isClerkConfigured: () => true }));
import { requireAuthenticatedSession } from "@/lib/auth/session";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

it("rejects a sandbox before looking up even an existing Clerk identity", async () => {
  vi.stubEnv("KUSPACE_DEMO_MODE", "true");
  mocks.cookies.mockResolvedValue({ get: () => ({ value: "1" }) });
  mocks.auth.mockResolvedValue({
    userId: "real-clerk-user",
    sessionId: "real-session",
  });
  await expect(requireAuthenticatedSession()).rejects.toMatchObject({
    status: 403,
  });
  expect(mocks.auth).not.toHaveBeenCalled();
});

it("preserves ordinary Clerk authorization when demo mode is disabled", async () => {
  vi.stubEnv("KUSPACE_DEMO_MODE", "false");
  mocks.auth.mockResolvedValue({
    userId: "real-clerk-user",
    sessionId: "real-session",
  });
  await expect(requireAuthenticatedSession()).resolves.toMatchObject({
    userId: "real-clerk-user",
    isAuthenticated: true,
  });
  expect(mocks.cookies).not.toHaveBeenCalled();
});
