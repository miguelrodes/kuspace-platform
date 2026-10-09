import type { Event } from "@/types/event";
import type { RecruiterProfile } from "@/types/profile";
import type { ConsumerUser } from "@/types/user";
import type { WorkspaceMembership } from "@/types/workspace";
import { createDraftEventSeed } from "@/lib/event-draft";
import {
  applyToCuratedEvent,
  approveCuratedApplication,
  denyCuratedApplication,
} from "@/lib/event-access";

export const SANDBOX_COOKIE = "kuspace_demo_sandbox";
export const SANDBOX_STORAGE = "kuspace_demo_session_v1";
export type DemoRole = "recruiter" | "consumer";
export type DemoSandbox = {
  version: 1;
  role: DemoRole;
  organizationId: string;
  consumerId: string;
  recruiters: RecruiterProfile[];
  events: Event[];
  users: ConsumerUser[];
};

export function sandboxBootstrap(sandbox: DemoSandbox) {
  const recruiters = sandbox.recruiters.map((profile) => ({
    ...profile,
    events: {
      upcoming: sandbox.events.filter(
        (event) =>
          event.organizationId === profile.organizationId &&
          ["live", "upcoming"].includes(event.status),
      ),
      past: sandbox.events.filter(
        (event) =>
          event.organizationId === profile.organizationId &&
          event.status === "past",
      ),
    },
  }));
  const profile = recruiters.find(
    (item) => item.organizationId === sandbox.organizationId,
  )!;
  const organizations: WorkspaceMembership[] = recruiters.map((item) => ({
    organization: {
      id: item.organizationId!,
      name: item.displayName,
      slug: item.slug,
      type: item.recruiterType,
    },
    role: "owner",
  }));
  const recruiter = sandbox.role === "recruiter";
  const publicEvents = sandbox.events.filter(
    (event) => event.status !== "draft",
  );
  return {
    profile,
    recruiters,
    events: recruiter
      ? sandbox.events.filter(
          (event) => event.organizationId === sandbox.organizationId,
        )
      : publicEvents,
    discoveryEvents: publicEvents,
    users: recruiter
      ? sandbox.users
      : sandbox.users.filter((user) => user.id === sandbox.consumerId),
    artists: Array.from(
      new Map(
        sandbox.events
          .flatMap((event) => event.lineup.entries)
          .map((entry) => [
            entry.artistId,
            { id: entry.artistId, name: entry.name },
          ]),
      ).values(),
    ),
    currentRole: sandbox.role,
    currentConsumerUserId: recruiter ? null : sandbox.consumerId,
    currentRecruiterProfileId: recruiter ? profile.id : null,
    currentOrganizationId: recruiter ? sandbox.organizationId : null,
    currentOrganizationRole: recruiter ? ("owner" as const) : null,
    currentOrganization: recruiter
      ? organizations.find(
          (item) => item.organization.id === sandbox.organizationId,
        )!.organization
      : null,
    organizations: recruiter ? organizations : [],
    needsActorSelection: false,
    needsOrganizationSetup: false,
  };
}

export class SandboxError extends Error {
  constructor(
    message: string,
    public status = 403,
  ) {
    super(message);
  }
}

function requireRecruiter(sandbox: DemoSandbox) {
  if (sandbox.role !== "recruiter")
    throw new SandboxError("Switch to the organiser demo to manage events.");
}

// Only this in-memory copy is mutable. Unknown operations fail closed, never falling through to fetch.
export function sandboxRequest(
  sandbox: DemoSandbox,
  path: string,
  method: string,
  body: Record<string, unknown> = {},
): unknown {
  if (path === "/api/store/bootstrap" && method === "GET")
    return sandboxBootstrap(sandbox);
  if (
    path === "/api/workspace/organizations/current/switch" &&
    method === "POST"
  ) {
    requireRecruiter(sandbox);
    const profile = sandbox.recruiters.find(
      (item) => item.organizationId === body.organizationId,
    );
    if (!profile)
      throw new SandboxError("This workspace is not part of the demo.");
    sandbox.organizationId = profile.organizationId!;
    return {
      organization: sandboxBootstrap(sandbox).currentOrganization,
      role: "owner",
    };
  }
  if (path === "/api/store/profile" && method === "PUT") {
    throw new SandboxError("Recruiter profile settings are not available in demo mode.");
  }
  const userMatch = path.match(/^\/api\/store\/users\/([^/]+)$/);
  if (userMatch && method === "PUT") {
    if (sandbox.role !== "consumer" || userMatch[1] !== sandbox.consumerId)
      throw new SandboxError("Only your demo profile can be edited.");
    const user = sandbox.users.find((item) => item.id === sandbox.consumerId)!;
    const updated = { ...user, ...body, id: user.id } as ConsumerUser;
    sandbox.users = sandbox.users.map((item) =>
      item.id === user.id ? updated : item,
    );
    return updated;
  }
  if (path === "/api/store/events" && method === "POST") {
    requireRecruiter(sandbox);
    const profile = sandbox.recruiters.find(
      (item) => item.organizationId === sandbox.organizationId,
    )!;
    const event = createDraftEventSeed({
      ...(body as Partial<Event>),
      id: `demo-event-${crypto.randomUUID()}`,
      organizationId: sandbox.organizationId,
      recruiterProfileId: profile.id,
      status: "draft",
    });
    sandbox.events.unshift(event);
    return event;
  }
  const match = path.match(/^\/api\/store\/events\/([^/]+)(?:\/(.*))?$/);
  if (!match)
    throw new SandboxError("This action is unavailable in the isolated demo.");
  const [, id, operation] = match;
  const event = sandbox.events.find((item) => item.id === id);
  if (!event) throw new SandboxError("Demo event not found.", 404);
  if (["purchase", "checkout-intents"].includes(operation))
    throw new SandboxError(
      "No real tickets, payments or bookings are available in this demo.",
      409,
    );
  if (operation === "applications/apply" && method === "POST") {
    if (
      sandbox.role !== "consumer" ||
      body.userId !== sandbox.consumerId ||
      event.admissionMode !== "curated" ||
      !["live", "upcoming"].includes(event.status)
    )
      throw new SandboxError("This demo application is unavailable.");
    const updated = applyToCuratedEvent(event, sandbox.consumerId);
    sandbox.events = sandbox.events.map((item) =>
      item.id === id ? updated : item,
    );
    return updated;
  }
  requireRecruiter(sandbox);
  if (event.organizationId !== sandbox.organizationId)
    throw new SandboxError(
      "Switch to the event owner's workspace to edit this event.",
    );
  if (!operation && method === "DELETE") {
    sandbox.events = sandbox.events.filter((item) => item.id !== id);
    return null;
  }
  const sections = [
    "cover",
    "lineup",
    "timetable",
    "guestlist",
    "budget",
    "tickets",
    "status",
  ];
  let updated: Event;
  if (method === "PUT" && (!operation || sections.includes(operation))) {
    if (
      operation === "status" &&
      !["draft", "upcoming", "live", "past", "cancelled"].includes(
        String(body.status),
      )
    )
      throw new SandboxError("Invalid event status.", 400);
    const patch = !operation
      ? body
      : operation === "cover"
        ? {
            cover: body.cover,
            slug: body.slug ?? event.slug,
            admissionMode: body.admissionMode ?? event.admissionMode,
          }
        : { [operation]: body[operation] };
    updated = {
      ...event,
      ...patch,
      id: event.id,
      organizationId: event.organizationId,
      recruiterProfileId: event.recruiterProfileId,
      updatedAt: new Date().toISOString(),
    } as Event;
  } else {
    const application = operation?.match(
      /^applications\/([^/]+)\/(approve|deny)$/,
    );
    if (!application || method !== "POST")
      throw new SandboxError(
        "This action is unavailable in the isolated demo.",
      );
    updated =
      application[2] === "approve"
        ? approveCuratedApplication(event, {
            userId: application[1],
            accessGroupId: String(body.accessGroupId),
          })
        : denyCuratedApplication(event, { userId: application[1] });
  }
  sandbox.events = sandbox.events.map((item) =>
    item.id === id ? updated : item,
  );
  return updated;
}
