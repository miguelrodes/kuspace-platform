import { initialDemoState } from "../lib/demo-data";
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
}

main()
  .then(() => {
    console.log("Seeded the database with fictional KUSPACE demo data.");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
