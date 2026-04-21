import { initialMockState } from "../lib/mock-data";
import {
  clearDatabase,
  saveConsumerUser,
  saveEventAggregate,
  saveRecruiterProfile,
} from "../lib/db/store-repository";

async function main() {
  await clearDatabase();
  await saveRecruiterProfile(initialMockState.profile);

  for (const user of initialMockState.users) {
    await saveConsumerUser({
      ...user,
      savedEventSlugs: [],
      upcomingTicketEventSlugs: [],
      pastTicketEventSlugs: [],
      ticketWalletEntries: [],
    });
  }

  for (const event of initialMockState.events) {
    await saveEventAggregate(event);
  }

  for (const user of initialMockState.users) {
    await saveConsumerUser(user);
  }
}

main()
  .then(() => {
    console.log("Seeded Supabase from current mock data.");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
