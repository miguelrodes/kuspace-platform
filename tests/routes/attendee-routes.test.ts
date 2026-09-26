import { beforeEach, describe, expect, it, vi } from "vitest";
import { conflict, forbidden, notFound, unauthorized } from "@/lib/http/errors";

const attendeeServiceMocks = vi.hoisted(() => ({
  getOwnedEventAttendeeReportService: vi.fn(),
}));

vi.mock("@/lib/services/attendee-service", () => ({
  getOwnedEventAttendeeReportService: attendeeServiceMocks.getOwnedEventAttendeeReportService,
}));

import { GET as attendeesRoute } from "@/app/api/store/events/[id]/attendees/route";

describe("attendee route contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 with a stable error shape when attendee auth fails", async () => {
    attendeeServiceMocks.getOwnedEventAttendeeReportService.mockRejectedValue(unauthorized());

    const response = await attendeesRoute(
      new Request("http://localhost/api/store/events/event-1/attendees"),
      { params: Promise.resolve({ id: "event-1" }) },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        message: "Unauthorized",
        code: "UNAUTHORIZED",
        status: 401,
        details: undefined,
      },
    });
  });

  it("returns 400 on invalid attendee route params before the service runs", async () => {
    const response = await attendeesRoute(
      new Request("http://localhost/api/store/events/event-1/attendees"),
      { params: Promise.resolve({ id: "" }) },
    );

    expect(response.status).toBe(400);
    expect(attendeeServiceMocks.getOwnedEventAttendeeReportService).not.toHaveBeenCalled();
  });

  it("returns the attendee report for a valid recruiter-owned event", async () => {
    attendeeServiceMocks.getOwnedEventAttendeeReportService.mockResolvedValue({
      event: {
        id: "event-1",
        slug: "space-opening-2026-08-01",
        title: "Space Opening",
        date: "2026-08-01",
        venue: "Neon Harbor",
        status: "live",
      },
      summary: {
        totalPaidAttendees: 1,
        ticketsSold: 2,
        checkoutRevenueTotal: 80,
        doorTicketRevenue: 0,
        revenueEstimate: 80,
        remainingInventory: 98,
      },
      attendees: [],
      salesSummary: [],
    });

    const response = await attendeesRoute(
      new Request("http://localhost/api/store/events/event-1/attendees"),
      { params: Promise.resolve({ id: "event-1" }) },
    );

    expect(response.status).toBe(200);
    expect(attendeeServiceMocks.getOwnedEventAttendeeReportService).toHaveBeenCalledWith("event-1");
    await expect(response.json()).resolves.toMatchObject({
      event: {
        id: "event-1",
        title: "Space Opening",
      },
    });
  });

  it("passes through 403 recruiter authorization errors with a stable error shape", async () => {
    attendeeServiceMocks.getOwnedEventAttendeeReportService.mockRejectedValue(
      forbidden("You do not have access to this event."),
    );

    const response = await attendeesRoute(
      new Request("http://localhost/api/store/events/event-1/attendees"),
      { params: Promise.resolve({ id: "event-1" }) },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        message: "You do not have access to this event.",
        code: "FORBIDDEN",
        status: 403,
        details: undefined,
      },
    });
  });

  it("passes through 404 missing-event errors with a stable error shape", async () => {
    attendeeServiceMocks.getOwnedEventAttendeeReportService.mockRejectedValue(
      notFound("Event not found"),
    );

    const response = await attendeesRoute(
      new Request("http://localhost/api/store/events/event-1/attendees"),
      { params: Promise.resolve({ id: "event-1" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        message: "Event not found",
        code: "NOT_FOUND",
        status: 404,
        details: undefined,
      },
    });
  });

  it("passes through 409 domain conflicts with a stable error shape", async () => {
    attendeeServiceMocks.getOwnedEventAttendeeReportService.mockRejectedValue(
      conflict("Attendee reporting is temporarily unavailable for this event."),
    );

    const response = await attendeesRoute(
      new Request("http://localhost/api/store/events/event-1/attendees"),
      { params: Promise.resolve({ id: "event-1" }) },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        message: "Attendee reporting is temporarily unavailable for this event.",
        code: "CONFLICT",
        status: 409,
        details: undefined,
      },
    });
  });

  it("standardizes unexpected attendee route failures as 500 responses", async () => {
    attendeeServiceMocks.getOwnedEventAttendeeReportService.mockRejectedValue(
      new Error("Unexpected crash"),
    );

    const response = await attendeesRoute(
      new Request("http://localhost/api/store/events/event-1/attendees"),
      { params: Promise.resolve({ id: "event-1" }) },
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        message: "Internal server error",
        code: "INTERNAL_SERVER_ERROR",
        status: 500,
        details: undefined,
      },
    });
  });
});
