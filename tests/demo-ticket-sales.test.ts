import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createDemoSandbox } from "@/lib/demo/sandbox-seed";
import { sandboxBootstrap } from "@/lib/demo/sandbox";
import { buildSyntheticConsumers, buildSyntheticEvents } from "@/lib/demo/fixture-builders";
import { isLiveSpaceDemoEvent } from "@/lib/demo/ticket-sales-history";
import { buildTicketSalesSeries } from "@/lib/ticket-sales-series";
import { upgradeDemoTicketSales } from "@/lib/demo/upgrade-ticket-sales";
import { buildInitialTicketsState, buildEventTicketsPatch } from "@/components/editor/tickets-tab";
import { TicketSummaryPanel } from "@/components/editor/ticket-summary-panel";

describe("live Space demo ticket graph pipeline", () => {
  it("preserves sold quantities across histories, group allocations and wallet entries for all ten live events", () => {
    const { events, orders } = buildSyntheticEvents(buildSyntheticConsumers());
    const session = createDemoSandbox("recruiter");
    const live = events.filter(isLiveSpaceDemoEvent);
    expect(live).toHaveLength(10);
    for (const event of live) {
      const history = event.tickets.salesHistory!;
      let total = 0;
      for (const section of event.tickets.sections!) {
        for (const phase of section.phases) {
          const series = history.phases.find((row) => row.phaseId === phase.id)!;
          const sold = series.quantities.reduce((sum, quantity) => sum + quantity, 0);
          expect(sold).toBe(phase.quantitySold);
          expect(sold).toBeLessThanOrEqual(phase.quantityAvailable);
          expect(series.quantities.every((quantity) => Number.isInteger(quantity) && quantity >= 0)).toBe(true);
          expect(orders.filter((order) => order.event.id === event.id && order.ticketPhaseId === phase.id)
            .reduce((sum, order) => sum + order.quantity, 0)).toBe(sold);
          total += sold;
        }
      }
      expect(total).toBeGreaterThan(500);
      expect(event.guestlist.summary?.ticketsSold).toBe(total);
      expect(session.users.flatMap((user) => user.ticketWalletEntries ?? [])
        .filter((entry) => entry.eventSlug === event.slug)
        .reduce((sum, entry) => sum + entry.quantity, 0)).toBe(total);

      for (const window of ["full", "24h"] as const) {
        const points = buildTicketSalesSeries(history, window);
        expect(points.at(-1)!.sold).toBe(total);
        expect(points.at(-1)!.timestamp).toBe(Date.parse(`${event.cover.date}T18:00:00.000Z`));
        expect(points.length).toBeGreaterThan(10);
        const velocities = points.slice(1).map((point) => point.velocity);
        expect(new Set(velocities).size).toBeGreaterThan(6);
        expect(Math.max(...velocities)).toBeGreaterThan(Math.min(...velocities) * 4);
        for (let index = 1; index < points.length; index++) {
          const previous = points[index - 1];
          const current = points[index];
          expect(current.sold).toBeGreaterThanOrEqual(previous.sold);
          expect(current.velocity).toBeCloseTo((current.sold - previous.sold) / ((current.timestamp - previous.timestamp) / 3_600_000));
        }
      }
    }
    expect(events.filter((event) => !isLiveSpaceDemoEvent(event))
      .every((event) => !event.tickets.salesHistory)).toBe(true);
  });

  it.each([
    ["event-010", 1605], ["event-024", 1768], ["event-008", 3062],
    ["event-019", 1816], ["event-020", 904],
  ])("renders both SVG charts from the bootstrap history for %s, not the phase-date fallback", (id, total) => {
    const event = sandboxBootstrap(createDemoSandbox("recruiter")).events.find((event) => event.id === id)!;
    const form = buildInitialTicketsState(event);
    expect(form.salesHistory).toBe(event.tickets.salesHistory);
    expect(buildEventTicketsPatch(form, event.status).salesHistory).toBe(form.salesHistory);
    const markup = renderToStaticMarkup(createElement(TicketSummaryPanel, form));
    expect(markup).toContain('aria-label="Tickets Sold Cumulative, full cycle"');
    expect(markup).toContain('aria-label="Ticket Velocity, full cycle"');
    expect(markup.match(/<circle /g)).toHaveLength(30);
    expect(markup).toContain(`${total} tickets sold</title>`);
    expect(markup).not.toContain("May");
    expect(markup).not.toContain("2030-");
    for (const point of buildTicketSalesSeries(form.salesHistory!, "full")) {
      expect(markup).toContain(`${Number(point.velocity.toFixed(2))} tickets per hour</title>`);
    }
  });

  it("upgrades old sessions once, preserving non-sales edits and respecting edited inventory", () => {
    const session = createDemoSandbox("recruiter");
    const event = session.events.find((event) => event.id === "event-019")!;
    delete event.tickets.salesHistory;
    for (const section of event.tickets.sections!) {
      for (const phase of section.phases) phase.quantitySold = 0;
    }
    event.tickets.sections![0].phases[0].quantityAvailable = 400;
    event.cover.title = "My title";
    event.budget.items[0].amount = 777;
    event.guestlist.entries.push({ id: "visitor-guest", source: "manual", firstName: "Sample", lastName: "Guest", accessGroupId: event.guestlist.accessGroups[0].id, checkedIn: false });
    session.users[0].city = "My city";
    const saved = [...session.users[0].savedEventSlugs!];
    const otherEvents = JSON.stringify(session.events.filter((other) => other.id !== event.id));
    expect(upgradeDemoTicketSales(session)).toBe(true);
    expect(event.cover.title).toBe("My title");
    expect(event.budget.items[0].amount).toBe(777);
    expect(event.guestlist.entries.some((entry) => entry.id === "visitor-guest")).toBe(true);
    expect(event.tickets.sections![0].phases[0].quantitySold).toBe(400);
    expect(session.users[0].city).toBe("My city");
    expect(session.users[0].savedEventSlugs).toEqual(saved);
    expect(JSON.stringify(session.events.filter((other) => other.id !== event.id))).toBe(otherEvents);
    const after = JSON.stringify(session);
    expect(upgradeDemoTicketSales(session)).toBe(false);
    expect(JSON.stringify(session)).toBe(after);
  });
});
