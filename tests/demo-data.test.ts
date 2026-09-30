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
});
