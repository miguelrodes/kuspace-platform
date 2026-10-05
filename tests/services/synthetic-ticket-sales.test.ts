import { describe, expect, it } from "vitest";
import platformDemoSeed from "@/prisma/platform-demo-seed.json";
import { buildSyntheticTicketSales } from "@/prisma/synthetic-ticket-sales";
import type { Event } from "@/types/event";

const events = (platformDemoSeed as unknown as { events: Event[] }).events;

function getEvent(slug: string) {
  const event = events.find((candidate) => candidate.slug === slug);
  if (!event) {
    throw new Error(`Missing fixture event ${slug}.`);
  }
  return structuredClone(event);
}

describe("synthetic ticket sales", () => {
  it.each([
    "dc10-paradise-2016-09-21",
    "dc10-circoloco-2016-09-26",
    "paradise-closing-dc10-2016-09-28",
    "elrow-2016-09-24",
  ])("preserves advance-sale totals for %s without exceeding inventory", (slug) => {
    const event = getEvent(slug);
    const sales = buildSyntheticTicketSales(event, 24);
    const targets = event.tickets.sections?.flatMap((section) => section.phases.map((phase) => ({
      phase,
      sold: sales.filter((sale) => sale.phaseId === phase.id)
        .reduce((total, sale) => total + sale.quantity, 0),
    }))) ?? [];

    expect(sales.length).toBeGreaterThan(0);
    expect(sales.length).toBeLessThanOrEqual(24);
    expect(sales.every((sale) => sale.quantity > 0)).toBe(true);
    for (const { phase, sold } of targets) {
      expect(sold).toBe(phase.quantitySold ?? 0);
      expect(sold).toBeLessThanOrEqual(phase.quantityAvailable);
    }
  });

  it("keeps draft and cancelled events free of paid orders", () => {
    const event = getEvent("sundays-at-space-2016-09-25");
    expect(buildSyntheticTicketSales(event, 24)).toEqual([]);
    event.status = "cancelled";
    expect(buildSyntheticTicketSales(event, 24)).toEqual([]);
  });

  it("retains the existing small paid-order sample for live and past events", () => {
    for (const slug of ["circoloco-dc10-2016-09-19", "circoloco-dc10-2016-09-05"]) {
      const sales = buildSyntheticTicketSales(getEvent(slug), 24);
      expect(sales).toHaveLength(3);
      expect(sales.every((sale) => sale.quantity === 1)).toBe(true);
    }
  });

  it("rejects an advance-sales fixture that oversells a phase", () => {
    const event = getEvent("dc10-paradise-2016-09-21");
    event.tickets.sections![0].phases[0].quantitySold =
      event.tickets.sections![0].phases[0].quantityAvailable + 1;
    expect(() => buildSyntheticTicketSales(event, 24)).toThrow("Invalid synthetic advance inventory");
  });
});
