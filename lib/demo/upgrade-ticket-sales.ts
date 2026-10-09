import platformDemoSeed from "@/prisma/platform-demo-seed.json";
import type { Event } from "@/types/event";
import type { DemoSandbox } from "./sandbox";
import { buildSyntheticEvents } from "./fixture-builders";
import { isLiveSpaceDemoEvent } from "./ticket-sales-history";

export function upgradeDemoTicketSales(session: DemoSandbox) {
  const originals = platformDemoSeed.events as unknown as Event[];
  const outdated = session.events.filter((event) =>
    isLiveSpaceDemoEvent(event) && !event.tickets.salesHistory &&
    originals.some((source) => source.id === event.id && source.slug === event.slug),
  );
  if (!outdated.length) return false;

  // Upgrade only the old synthetic sales sample, not the visitor's event edits.
  const sources = outdated.map((event) => {
    const source = structuredClone(event);
    const original = originals.find((candidate) => candidate.id === event.id)!;
    const originalPhases = original.tickets.sections?.flatMap((section) => section.phases) ?? [];
    for (const section of source.tickets.sections ?? []) {
      for (const phase of section.phases) {
        const target = originalPhases.find((candidate) => candidate.id === phase.id);
        phase.quantitySold = Math.min(phase.quantityAvailable, target?.quantitySold ?? phase.quantitySold ?? 0);
      }
    }
    return source;
  });
  const { events, orders } = buildSyntheticEvents(session.users, sources);
  for (const event of outdated) {
    const updated = events.find((candidate) => candidate.id === event.id)!;
    event.tickets = updated.tickets;
    event.accessAssignments = [
      ...event.accessAssignments.filter((assignment) => assignment.source !== "purchase"),
      ...updated.accessAssignments.map((assignment) => ({
        ...assignment,
        checkedIn: event.accessAssignments.find((previous) => previous.userId === assignment.userId)?.checkedIn ?? false,
      })),
    ];
    const generatedGuests = updated.guestlist.entries.filter((entry) => entry.id.startsWith(`demo-order-${event.id}-`));
    event.guestlist.entries = [
      ...event.guestlist.entries.filter((entry) => !entry.id.startsWith(`demo-order-${event.id}-`)),
      ...generatedGuests.map((entry) => ({
        ...entry,
        checkedIn: event.accessAssignments.find((assignment) => assignment.userId === entry.userId)?.checkedIn ?? false,
      })),
    ];
    event.guestlist.summary = {
      ...updated.guestlist.summary!,
      manualGuests: event.guestlist.entries.filter((entry) => entry.source === "manual").length,
      totalAttending: event.guestlist.entries.length,
    };
  }
  const slugs = new Set(outdated.map((event) => event.slug));
  for (const user of session.users) {
    const allocations = orders.filter((order) => order.consumerUserId === user.id);
    user.ticketWalletEntries = [
      ...(user.ticketWalletEntries ?? []).filter((entry) => !slugs.has(entry.eventSlug)),
      ...allocations.map((order) => ({
        eventSlug: order.event.slug,
        quantity: order.quantity,
        accessGroupId: order.accessGroupId,
        ticketLabel: order.event.tickets.sections?.find((section) => section.id === order.ticketSectionId)?.name,
        status: outdated.find((event) => event.id === order.event.id)?.accessAssignments
          .some((assignment) => assignment.userId === user.id && assignment.checkedIn) ? "scanned" as const : "active" as const,
      })),
    ];
    user.upcomingTicketEventSlugs = [
      ...(user.upcomingTicketEventSlugs ?? []).filter((slug) => !slugs.has(slug)),
      ...new Set(allocations.map((order) => order.event.slug)),
    ];
  }
  return true;
}
