import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createDemoSandbox } from "@/lib/demo/sandbox-seed";
import {
  sandboxBootstrap,
  sandboxRequest,
  SANDBOX_COOKIE,
} from "@/lib/demo/sandbox";
import { sandboxBoundary } from "@/lib/demo/request-boundary";
import { POST } from "@/app/api/demo/session/route";

afterEach(() => vi.unstubAllEnvs());

describe("isolated visitor demo", () => {
  it("keeps recruiter profiles read-only even for direct local settings requests", () => {
    const state = createDemoSandbox("recruiter");
    const before = JSON.stringify(state.recruiters);
    expect(() => sandboxRequest(state, "/api/store/profile", "PUT", {
      displayName: "Changed profile",
      bio: "Changed bio",
    })).toThrow("not available in demo mode");
    expect(JSON.stringify(state.recruiters)).toBe(before);
  });

  it("starts with both historical recruiters, exactly nine DC10 events, and a synthetic Luca persona", () => {
    const state = createDemoSandbox("consumer");
    expect(state.events).toHaveLength(34);
    expect(
      state.events.filter(
        (event) => event.recruiterProfileId === "recruiter-dc10-ibiza",
      ),
    ).toHaveLength(9);
    expect(sandboxBootstrap(state).users[0]).toMatchObject({
      firstName: "Luca",
      lastName: "Dea",
      email: "luca-demo@example.test",
    });
    expect(
      sandboxBootstrap(state).users[0].ticketWalletEntries?.length,
    ).toBeGreaterThan(0);
    expect(state.recruiters.every((profile) => !profile.clerkUserId)).toBe(
      true,
    );
    expect(
      state.events
        .filter((event) => event.status === "upcoming")
        .every((event) =>
          event.accessAssignments.every((assignment) => !assignment.checkedIn),
        ),
    ).toBe(true);
  });

  it("isolates edits, supports a fresh reset, and scopes Office without losing global discovery", () => {
    const first = createDemoSandbox("recruiter");
    const second = createDemoSandbox("recruiter");
    const event = sandboxBootstrap(first).events.find(
      (item) => item.status === "upcoming",
    )!;
    sandboxRequest(first, "/api/store/events/" + event.id + "/cover", "PUT", {
      cover: { ...event.cover, title: "Visitor edit" },
    });
    expect(
      sandboxBootstrap(first).discoveryEvents.find(
        (item) => item.id === event.id,
      )?.cover.title,
    ).toBe("Visitor edit");
    expect(
      second.events.find((item) => item.id === event.id)?.cover.title,
    ).not.toBe("Visitor edit");
    expect(
      createDemoSandbox("recruiter").events.find((item) => item.id === event.id)
        ?.cover.title,
    ).not.toBe("Visitor edit");
    const dc10 = first.recruiters.find((item) => item.slug === "dc10-ibiza")!;
    const dcEvent = first.events.find(
      (item) => item.organizationId === dc10.organizationId,
    )!;
    expect(() =>
      sandboxRequest(first, "/api/store/events/" + dcEvent.id, "DELETE"),
    ).toThrow("owner");
    sandboxRequest(
      first,
      "/api/workspace/organizations/current/switch",
      "POST",
      { organizationId: dc10.organizationId },
    );
    expect(sandboxBootstrap(first).events).toHaveLength(9);
    expect(
      new Set(
        sandboxBootstrap(first).discoveryEvents.map(
          (item) => item.organizationId,
        ),
      ).size,
    ).toBe(2);
    expect(() =>
      sandboxRequest(first, "/api/store/events/" + event.id + "/cover", "PUT", {
        cover: event.cover,
      }),
    ).toThrow("owner");
    expect(() =>
      sandboxRequest(
        first,
        "/api/workspace/organizations/current/switch",
        "POST",
        { organizationId: "not-a-demo-org" },
      ),
    ).toThrow();
  });

  it("supports local management sections and draft lifecycle while preserving ownership", () => {
    const state = createDemoSandbox("recruiter");
    const original = sandboxBootstrap(state).events.find(
      (item) => item.status === "upcoming",
    )!;
    for (const section of [
      "lineup",
      "timetable",
      "guestlist",
      "budget",
      "tickets",
    ] as const) {
      const saved = sandboxRequest(
        state,
        "/api/store/events/" + original.id + "/" + section,
        "PUT",
        { [section]: original[section] },
      );
      expect(saved).toMatchObject({
        id: original.id,
        [section]: original[section],
      });
    }
    const created = sandboxRequest(state, "/api/store/events", "POST", {
      organizationId: "forged",
      recruiterProfileId: "forged",
    }) as typeof original;
    expect(created.organizationId).toBe(state.organizationId);
    sandboxRequest(state, "/api/store/events/" + created.id, "DELETE");
    expect(state.events.some((item) => item.id === created.id)).toBe(false);
  });

  it("limits consumer edits to their own persona and never simulates payments", () => {
    const state = createDemoSandbox("consumer");
    sandboxRequest(state, "/api/store/users/" + state.consumerId, "PUT", {
      city: "Demo city",
    });
    expect(sandboxBootstrap(state).users[0].city).toBe("Demo city");
    expect(() =>
      sandboxRequest(state, "/api/store/users/not-me", "PUT", {}),
    ).toThrow();
    expect(() => sandboxRequest(state, "/api/store/events", "POST")).toThrow();
    expect(() =>
      sandboxRequest(
        state,
        "/api/store/events/" + state.events[0].id + "/purchase",
        "POST",
      ),
    ).toThrow("No real tickets");
    expect(() =>
      sandboxRequest(
        state,
        "/api/workspace/organizations/current/connect-account/onboarding",
        "POST",
      ),
    ).toThrow();
    expect(() => sandboxRequest(state, "/api/unknown", "PUT")).toThrow();
  });

  it("does not bypass Clerk outside demo mode and blocks every backend API for sandbox visitors", () => {
    const request = (path: string, method = "GET") =>
      new NextRequest("https://demo.test" + path, {
        method,
        headers: { cookie: SANDBOX_COOKIE + "=1" },
      });
    expect(sandboxBoundary(request("/office"), false)).toBeNull();
    expect(
      sandboxBoundary(new NextRequest("https://demo.test/office"), true),
    ).toBeNull();
    expect(
      sandboxBoundary(request("/office"), true)?.headers.get(
        "x-middleware-rewrite",
      ),
    ).toBe("https://demo.test/demo/office");
    for (const path of [
      "/api/store/bootstrap",
      "/api/store/events/event",
      "/api/workspace/organizations/current/switch",
      "/api/store/payments/webhooks/stripe",
    ]) {
      expect(sandboxBoundary(request(path, "POST"), true)?.status).toBe(403);
    }
    expect(sandboxBoundary(request("/office", "POST"), true)?.status).toBe(403);
  });

  it("requires explicit demo mode, same origin and a valid role for entry", async () => {
    const request = (role: string, origin = "https://demo.test") =>
      new NextRequest("https://demo.test/api/demo/session", {
        method: "POST",
        headers: { origin, "content-type": "application/json" },
        body: JSON.stringify({ role }),
      });
    vi.stubEnv("KUSPACE_DEMO_MODE", "false");
    expect((await POST(request("recruiter"))).status).toBe(404);
    vi.stubEnv("KUSPACE_DEMO_MODE", "true");
    expect(
      (await POST(request("recruiter", "https://other.test"))).status,
    ).toBe(403);
    expect((await POST(request("admin"))).status).toBe(400);
    const response = await POST(request("recruiter"));
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("Secure");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect((await response.json()).role).toBe("recruiter");
  });
});
