import { initialDemoState } from "@/lib/demo-data";
import type { Event } from "@/types/event";
import type { ConsumerUser } from "@/types/user";
import type { RecruiterProfile } from "@/types/profile";
import platformDemoSeed from "@/prisma/platform-demo-seed.json";
import { buildSyntheticTicketSales } from "@/prisma/synthetic-ticket-sales";
import { buildDemoTicketSalesHistory, isLiveSpaceDemoEvent } from "./ticket-sales-history";
import {
  resolveHistoricalDemoArt,
  resolveRecruiterLabelAvatar,
} from "@/lib/demo-event-art";

const platformSeed = platformDemoSeed as unknown as {
  profiles: RecruiterProfile[];
  events: Event[];
};

export function buildSyntheticConsumers(): ConsumerUser[] {
  return initialDemoState.users.map((user, index) => ({
    id: `public-demo-consumer-${String(index + 1).padStart(3, "0")}`,
    username: `demo-attendee-${String(index + 1).padStart(3, "0")}`,
    firstName: user.firstName,
    lastName: user.lastName,
    email: `demo-attendee-${String(index + 1).padStart(3, "0")}@example.test`,
    city: "Ibiza",
    profileVisibility: "private",
    notificationsEnabled: false,
    favoriteGenres: user.favoriteGenres ?? [],
    savedEventSlugs: [],
    upcomingTicketEventSlugs: [],
    pastTicketEventSlugs: [],
    ticketWalletEntries: [],
    createdAt: "2016-01-01T00:00:00.000Z",
  }));
}

export function buildSyntheticEvents(consumers: ConsumerUser[], sourceEvents = platformSeed.events) {
  let orderIndex = 0;
  const orders: Array<{
    id: string;
    itemId: string;
    event: Event;
    consumerUserId: string;
    ticketSectionId: string;
    ticketPhaseId: string;
    accessGroupId: string;
    unitPrice: number;
    quantity: number;
    checkedIn: boolean;
  }> = [];

  const events = sourceEvents.map((sourceEvent) => {
    const event = structuredClone(sourceEvent);
    event.cover = {
      ...event.cover,
      ...resolveHistoricalDemoArt(
        event.slug,
        event.cover.imageUrl,
        event.cover.imageAlt,
      ),
    };
    event.labels = event.labels?.map((label) => ({
      ...label,
      avatarImageUrl: resolveRecruiterLabelAvatar(
        label.profileSlug,
        label.avatarImageUrl,
      ),
    }));
    const sales = buildSyntheticTicketSales(event, consumers.length, {
      preserveFixtureTotals: isLiveSpaceDemoEvent(event),
    });
    const group = event.guestlist.accessGroups[0];
    const checkedIn = event.status === "past";

    event.accessAssignments = [];
    event.guestlist.entries = [];
    event.guestlist.summary = undefined;
    event.applications =
      event.admissionMode === "curated"
        ? [
            {
              eventId: event.id,
              userId: consumers[0].id,
              status: "pending",
              appliedAt: `${event.cover.date || "2016-01-01"}T12:00:00.000Z`,
              notes: "Synthetic demo application.",
            },
          ]
        : [];
    event.budget.items = event.budget.items.map((item, index) => ({
      ...item,
      amount: 400 + (index + 1) * 275,
      paid: index % 2 === 0,
      notes: "Synthetic demo budget; not historical financial data.",
    }));
    event.budget.totalBudget = event.budget.items.reduce(
      (total, item) => total + item.amount,
      0,
    );
    event.budget.doorTicketRevenue = 0;
    event.timetable.rows = event.timetable.rows.map((row) => ({
      ...row,
      notes:
        "Synthetic reconstructed demo timetable; not a verified historical schedule.",
    }));

    const soldByPhase = new Map<string, number>();
    for (const sale of sales) {
      soldByPhase.set(
        sale.phaseId,
        (soldByPhase.get(sale.phaseId) ?? 0) + sale.quantity,
      );
    }
    for (const section of event.tickets.sections ?? []) {
      for (const phase of section.phases) {
        phase.quantitySold = soldByPhase.get(phase.id) ?? 0;
        if (event.status === "draft" || event.status === "cancelled") {
          phase.status = "upcoming";
        }
      }
    }
    if (isLiveSpaceDemoEvent(event)) {
      for (const tier of event.tickets.tiers) {
        tier.quantitySold = soldByPhase.get(tier.id) ?? 0;
      }
      event.tickets.salesHistory = buildDemoTicketSalesHistory(event);
    }

    for (const [saleIndex, sale] of sales.entries()) {
      const accessGroup = event.guestlist.accessGroups.find(
        (candidate) => candidate.id === sale.accessGroupId,
      );
      if (!accessGroup) {
        throw new Error(
          `Missing synthetic access group for ${event.id}/${sale.sectionId}.`,
        );
      }
      const consumer = consumers[orderIndex % consumers.length];
      orderIndex += 1;
      const id = `demo-order-${event.id}-${saleIndex + 1}`;
      const assignment = {
        eventId: event.id,
        userId: consumer.id,
        accessGroupId: accessGroup.id,
        source: "purchase" as const,
        paymentState: "paid" as const,
        checkedIn,
        assignedAt: `${event.cover.date || "2016-01-01"}T12:00:00.000Z`,
        notes:
          "Synthetic demo ticket allocation; no real payment was processed.",
      };
      event.accessAssignments.push(assignment);
      event.guestlist.entries.push({
        id: `${id}-guestlist`,
        source: "user",
        accessGroupId: accessGroup.id,
        userId: consumer.id,
        checkedIn,
        createdAt: assignment.assignedAt,
      });
      orders.push({
        id,
        itemId: `${id}-item-1`,
        event,
        consumerUserId: consumer.id,
        ticketSectionId: sale.sectionId,
        ticketPhaseId: sale.phaseId,
        accessGroupId: accessGroup.id,
        unitPrice: sale.unitPrice,
        quantity: sale.quantity,
        checkedIn,
      });
    }

    const manualName = consumers[(orderIndex + 4) % consumers.length];
    if (group) {
      event.guestlist.entries.push({
        id: `demo-manual-guest-${event.id}`,
        source: "manual",
        accessGroupId: group.id,
        firstName: manualName.firstName,
        lastName: manualName.lastName,
        checkedIn,
        createdAt: `${event.cover.date || "2016-01-01"}T13:00:00.000Z`,
        notes: "Synthetic demo guestlist entry.",
      });
    }
    event.guestlist.summary = {
      ticketsSold: sales.reduce((total, sale) => total + sale.quantity, 0),
      manualGuests: group ? 1 : 0,
      totalAttending: event.accessAssignments.length + (group ? 1 : 0),
    };

    return { event, orders };
  });

  return { events: events.map(({ event }) => event), orders };
}
