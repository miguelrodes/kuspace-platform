import { initialDemoState } from "../lib/demo-data";
import { createTicketOrderRepository } from "../lib/db/repositories/order-repository";
import { prisma } from "../lib/prisma";
import type { Event } from "../types/event";
import type { RecruiterProfile } from "../types/profile";
import type { ConsumerUser } from "../types/user";
import {
  clearDatabase,
  saveConsumerUser,
  saveEventAggregate,
  saveRecruiterProfile,
} from "../lib/db/store-repository";
import { assertPublicDemoDatabaseTargets } from "./seed-guards";
import platformDemoSeed from "./platform-demo-seed.json";

const FROZEN_PRIVATE_REFERENCE = "137691c9d09203c5429aa71150668169ebad5913";
const platformSeed = platformDemoSeed as unknown as {
  sourceCommit: string;
  profiles: RecruiterProfile[];
  events: Event[];
};

function buildSyntheticConsumers(): ConsumerUser[] {
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

function buildSyntheticEvents(consumers: ConsumerUser[]) {
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
    checkedIn: boolean;
  }> = [];

  const events = platformSeed.events.map((sourceEvent) => {
    const event = structuredClone(sourceEvent);
    const selectedSection = event.tickets.sections?.find((section) =>
      section.phases.some((phase) => phase.price > 0 && phase.quantityAvailable >= 3),
    );
    const selectedPhase = selectedSection?.phases.find(
      (phase) => phase.price > 0 && phase.quantityAvailable >= 3 && phase.status === "live",
    ) ?? selectedSection?.phases.find(
      (phase) => phase.price > 0 && phase.quantityAvailable >= 3,
    );
    const group = event.guestlist.accessGroups[0];
    const checkedIn = event.status === "past";

    event.accessAssignments = [];
    event.guestlist.entries = [];
    event.guestlist.summary = undefined;
    event.applications = event.admissionMode === "curated"
      ? [{
          eventId: event.id,
          userId: consumers[0].id,
          status: "pending",
          appliedAt: `${event.cover.date || "2016-01-01"}T12:00:00.000Z`,
          notes: "Synthetic demo application.",
        }]
      : [];
    event.budget.items = event.budget.items.map((item, index) => ({
      ...item,
      amount: 400 + ((index + 1) * 275),
      paid: index % 2 === 0,
      notes: "Synthetic demo budget; not historical financial data.",
    }));
    event.budget.totalBudget = event.budget.items.reduce((total, item) => total + item.amount, 0);
    event.budget.doorTicketRevenue = 0;
    event.timetable.rows = event.timetable.rows.map((row) => ({
      ...row,
      notes: "Synthetic reconstructed demo timetable; not a verified historical schedule.",
    }));

    for (const section of event.tickets.sections ?? []) {
      for (const phase of section.phases) {
        phase.quantitySold = phase.id === selectedPhase?.id ? 3 : 0;
      }
    }

    if (selectedSection && selectedPhase && group) {
      for (let attendeeIndex = 0; attendeeIndex < 3; attendeeIndex += 1) {
        const consumer = consumers[(orderIndex + attendeeIndex) % consumers.length];
        orderIndex += 1;
        const id = `demo-order-${event.id}-${attendeeIndex + 1}`;
        const assignment = {
          eventId: event.id,
          userId: consumer.id,
          accessGroupId: group.id,
          source: "purchase" as const,
          paymentState: "paid" as const,
          checkedIn,
          assignedAt: `${event.cover.date || "2016-01-01"}T12:00:00.000Z`,
          notes: "Synthetic demo ticket sale; no real payment was processed.",
        };
        event.accessAssignments.push(assignment);
        event.guestlist.entries.push({
          id: `${id}-guestlist`,
          source: "user",
          accessGroupId: group.id,
          userId: consumer.id,
          checkedIn,
          createdAt: assignment.assignedAt,
        });
        orders.push({
          id,
          itemId: `${id}-item-1`,
          event,
          consumerUserId: consumer.id,
          ticketSectionId: selectedSection.id,
          ticketPhaseId: selectedPhase.id,
          accessGroupId: group.id,
          unitPrice: selectedPhase.price,
          checkedIn,
        });
      }
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
      ticketsSold: event.accessAssignments.length,
      manualGuests: group ? 1 : 0,
      totalAttending: event.accessAssignments.length + (group ? 1 : 0),
    };

    return { event, orders };
  });

  return { events: events.map(({ event }) => event), orders };
}

async function main() {
  assertPublicDemoDatabaseTargets(process.env.DATABASE_URL, process.env.DIRECT_URL);
  if (platformSeed.sourceCommit !== FROZEN_PRIVATE_REFERENCE) {
    throw new Error("Refusing to seed: public demo fixture does not match the frozen private reference.");
  }

  const linkedProfiles = await prisma.recruiterProfile.findMany({
    where: { clerkUserId: { not: null } },
    select: { clerkUserId: true },
  });
  const ownerIds = [...new Set(linkedProfiles.map((profile) => profile.clerkUserId).filter(Boolean))];
  if (ownerIds.length !== 1) {
    throw new Error("Refusing to reset: expected exactly one existing Clerk-linked demo workspace owner.");
  }
  const ownerClerkUserId = ownerIds[0]!;

  const consumers = buildSyntheticConsumers();
  const { events, orders } = buildSyntheticEvents(consumers);
  await clearDatabase();
  for (const profile of platformSeed.profiles) {
    await saveRecruiterProfile({
      ...profile,
      clerkUserId: profile.id === "recruiter-space-ibiza" ? ownerClerkUserId : undefined,
    });
    await prisma.organizationMembership.upsert({
      where: {
        organizationId_clerkUserId: {
          organizationId: profile.organizationId!,
          clerkUserId: ownerClerkUserId,
        },
      },
      create: {
        id: `demo-owner-${profile.organizationId}`,
        organizationId: profile.organizationId!,
        clerkUserId: ownerClerkUserId,
        role: "owner",
      },
      update: { role: "owner" },
    });
  }

  for (const consumer of consumers) {
    await saveConsumerUser(consumer);
  }

  for (const event of events) {
    await saveEventAggregate(event);
  }

  for (const order of orders) {
    const totalAmount = order.unitPrice;
    await createTicketOrderRepository({
      id: order.id,
      eventId: order.event.id,
      organizationId: order.event.organizationId!,
      consumerUserId: order.consumerUserId,
      status: "paid",
      currency: "EUR",
      subtotalAmount: totalAmount,
      totalAmount,
      items: [
        {
          id: order.itemId,
          ticketSectionId: order.ticketSectionId,
          ticketPhaseId: order.ticketPhaseId,
          quantity: 1,
          unitPrice: order.unitPrice,
          totalPrice: totalAmount,
        },
      ],
    });
  }

  for (const consumer of consumers) {
    const consumerOrders = orders.filter((order) => order.consumerUserId === consumer.id);
    const walletEntries = consumerOrders.map((order) => ({
      eventSlug: order.event.slug,
      quantity: 1,
      accessGroupId: order.accessGroupId,
      ticketLabel: order.event.tickets.sections?.flatMap((section) => section.phases)
        .find((phase) => phase.id === order.ticketPhaseId)?.name,
      status: order.checkedIn ? "scanned" as const : "active" as const,
    }));
    await saveConsumerUser({
      ...consumer,
      ticketWalletEntries: walletEntries,
      upcomingTicketEventSlugs: consumerOrders.filter((order) => !order.checkedIn).map((order) => order.event.slug),
      pastTicketEventSlugs: consumerOrders.filter((order) => order.checkedIn).map((order) => order.event.slug),
    });
  }

  console.log(JSON.stringify({
    message: "Seeded the confirmed KUSPACE public-demo Neon database with synthetic operations.",
    recruiters: platformSeed.profiles.length,
    events: events.length,
    dc10Events: events.filter((event) => event.recruiterProfileId === "recruiter-dc10-ibiza").length,
    consumers: consumers.length,
    syntheticPaidOrders: orders.length,
    sourceCommit: FROZEN_PRIVATE_REFERENCE,
  }));
}

main()
  .then(() => {
    console.log("Seeded the database with fictional KUSPACE demo data.");
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Public demo seed failed.");
    process.exit(1);
  });
