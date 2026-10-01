import { describe, expect, it } from "vitest";
import { demoTicketOrders, initialDemoState } from "@/lib/demo-data";

describe("fictional public demo data", () => {
  it("keeps every ticket order linked to a seeded event, consumer, section, and phase", () => {
    for (const order of demoTicketOrders) {
      const event = initialDemoState.events.find(
        (candidate) => candidate.id === order.eventId,
      );
      const consumer = initialDemoState.users.find(
        (candidate) => candidate.id === order.consumerUserId,
      );
      const section = event?.tickets.sections?.find(
        (candidate) => candidate.id === order.ticketSectionId,
      );
      const phase = section?.phases.find(
        (candidate) => candidate.id === order.ticketPhaseId,
      );

      expect(event, order.eventId).toBeDefined();
      expect(event?.organizationId, order.eventId).toBeDefined();
      expect(consumer, order.consumerUserId).toBeDefined();
      expect(section, order.ticketSectionId).toBeDefined();
      expect(phase, order.ticketPhaseId).toBeDefined();
      expect(order.quantity).toBeGreaterThan(0);
      expect(order.unitPrice).toBe(phase?.price);
      expect(order.quantity * order.unitPrice).toBeGreaterThan(0);
    }
  });

  it("uses reserved fictional email domains for every seeded consumer", () => {
    for (const consumer of initialDemoState.users) {
      expect(consumer.email).toMatch(/@example\.test$/);
    }
  });

  it("covers every supported commerce order state", () => {
    expect(new Set(demoTicketOrders.map((order) => order.status))).toEqual(
      new Set([
        "pending",
        "checkout_started",
        "paid",
        "payment_failed",
        "cancelled",
        "expired",
      ]),
    );
  });

  it("demonstrates pending, accepted, and denied curated applications", () => {
    const curatedEvent = initialDemoState.events.find(
      (event) => event.id === "event-low-tide-circuit",
    );

    expect(
      curatedEvent?.applications.map((application) => application.status),
    ).toEqual(expect.arrayContaining(["pending", "accepted", "denied"]));
    expect(
      curatedEvent?.accessAssignments.find(
        (assignment) => assignment.userId === "consumer-22",
      ),
    ).toMatchObject({
      source: "approval",
      paymentState: "pending",
      accessGroupId: "group-regular-entry",
    });
  });

  it("demonstrates active, inactive, and scanned consumer wallet states", () => {
    const walletStatuses = new Set(
      initialDemoState.users.flatMap((user) =>
        (user.ticketWalletEntries ?? []).map((entry) => entry.status),
      ),
    );

    expect(walletStatuses).toEqual(new Set(["active", "inactive", "scanned"]));
  });

  it("does not expose unsupported follower or rating metrics", () => {
    const profile = initialDemoState.profile;
    const pastEventCount = initialDemoState.events.filter(
      (event) => event.status === "past",
    ).length;

    expect(profile.stats?.eventsHeld).toBe(pastEventCount);
    expect(profile.stats?.display.followers).toBe(false);
    expect(profile.stats?.display.publicRating).toBe(false);
  });

  it("does not duplicate seeded tier revenue as separate door revenue", () => {
    for (const event of initialDemoState.events) {
      expect(event.budget.doorTicketRevenue).toBe(0);
    }
  });
});
