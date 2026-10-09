import { buildSyntheticConsumers, buildSyntheticEvents } from "../lib/demo/fixture-builders";
import { createTicketOrderRepository } from "../lib/db/repositories/order-repository";
import { prisma } from "../lib/prisma";
import type { Event } from "../types/event";
import type { RecruiterProfile } from "../types/profile";
import {
  clearDatabase,
  saveConsumerUser,
  saveEventAggregate,
  saveRecruiterProfile,
} from "../lib/db/store-repository";
import { assertPublicDemoDatabaseTargets } from "./seed-guards";
import platformDemoSeed from "./platform-demo-seed.json";
import { resolveRecruiterDemoArt } from "../lib/demo-event-art";

const FROZEN_PRIVATE_REFERENCE = "137691c9d09203c5429aa71150668169ebad5913";
const platformSeed = platformDemoSeed as unknown as {
  sourceCommit: string;
  profiles: RecruiterProfile[];
  events: Event[];
};

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
      media: resolveRecruiterDemoArt(profile.slug, profile.media ?? {}),
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
    const totalAmount = order.unitPrice * order.quantity;
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
          quantity: order.quantity,
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
      quantity: order.quantity,
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
