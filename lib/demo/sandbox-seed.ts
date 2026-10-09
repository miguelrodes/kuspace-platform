import platformDemoSeed from "@/prisma/platform-demo-seed.json";
import type { RecruiterProfile } from "@/types/profile";
import {
  buildSyntheticConsumers,
  buildSyntheticEvents,
} from "./fixture-builders";
import { resolveRecruiterDemoArt } from "@/lib/demo-event-art";
import type { DemoRole, DemoSandbox } from "./sandbox";

export function createDemoSandbox(role: DemoRole): DemoSandbox {
  const users = buildSyntheticConsumers();
  const { events, orders } = buildSyntheticEvents(users);
  // A display persona only: no real Luca account, email, or private profile data.
  Object.assign(users[0], {
    firstName: "Luca",
    lastName: "Dea",
    username: "lucadea",
    email: "luca-demo@example.test",
    avatarImageUrl: "/demo/consumer-profiles/luca-dea.jpg",
    profileVisibility: "public",
    savedEventSlugs: [
      ...events
        .filter((event) => event.status === "live")
        .slice(0, 4)
        .map((event) => event.slug),
      "circoloco-dc10-2016-09-19",
      "dc10-paradise-2016-09-21",
      "dc10-circoloco-2016-09-26",
    ],
  });
  for (const user of users) {
    const allocations = orders.filter(
      (order) => order.consumerUserId === user.id,
    );
    user.ticketWalletEntries = allocations.map((order) => ({
      eventSlug: order.event.slug,
      quantity: order.quantity,
      accessGroupId: order.accessGroupId,
      ticketLabel: order.event.tickets.sections?.find(
        (section) => section.id === order.ticketSectionId,
      )?.name,
      status: order.checkedIn ? "scanned" : "active",
    }));
    user.upcomingTicketEventSlugs = allocations
      .filter((order) => ["live", "upcoming"].includes(order.event.status))
      .map((order) => order.event.slug);
    user.pastTicketEventSlugs = allocations
      .filter((order) => order.event.status === "past")
      .map((order) => order.event.slug);
  }
  const recruiters = structuredClone(
    platformDemoSeed.profiles,
  ) as RecruiterProfile[];
  for (const profile of recruiters) {
    profile.media = resolveRecruiterDemoArt(profile.slug, profile.media ?? {});
    delete profile.clerkUserId;
  }
  return {
    version: 1,
    role,
    organizationId: recruiters.find((item) => item.slug === "space-ibiza")!
      .organizationId!,
    consumerId: users[0].id,
    recruiters,
    events,
    users,
  };
}
