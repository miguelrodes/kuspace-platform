import { demoTicketOrders, initialDemoState } from "../lib/demo-data";
import { createTicketOrderRepository } from "../lib/db/repositories/order-repository";
import {
  clearDatabase,
  saveConsumerUser,
  saveEventAggregate,
  saveRecruiterProfile,
} from "../lib/db/store-repository";

async function main() {
  await clearDatabase();
  await saveRecruiterProfile(initialDemoState.profile);

  for (const user of initialDemoState.users) {
    await saveConsumerUser({
      ...user,
      savedEventSlugs: [],
      upcomingTicketEventSlugs: [],
      pastTicketEventSlugs: [],
      ticketWalletEntries: [],
    });
  }

  for (const event of initialDemoState.events) {
    await saveEventAggregate(event);
  }

  for (const user of initialDemoState.users) {
    await saveConsumerUser(user);
  }

  for (const order of demoTicketOrders) {
    const event = initialDemoState.events.find(
      (candidate) => candidate.id === order.eventId,
    );
    const section = event?.tickets.sections?.find(
      (candidate) => candidate.id === order.ticketSectionId,
    );
    const phase = section?.phases.find(
      (candidate) => candidate.id === order.ticketPhaseId,
    );

    if (!event?.organizationId || !section || !phase) {
      throw new Error(
        `Invalid fictional order seed for event ${order.eventId}.`,
      );
    }

    const totalAmount = order.quantity * order.unitPrice;
    await createTicketOrderRepository({
      eventId: event.id,
      organizationId: event.organizationId,
      consumerUserId: order.consumerUserId,
      status: "paid",
      currency: "usd",
      subtotalAmount: totalAmount,
      totalAmount,
      items: [
        {
          ticketSectionId: section.id,
          ticketPhaseId: phase.id,
          quantity: order.quantity,
          unitPrice: order.unitPrice,
          totalPrice: totalAmount,
        },
      ],
    });
  }
}

main()
  .then(() => {
    console.log("Seeded the database with fictional KUSPACE demo data.");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
