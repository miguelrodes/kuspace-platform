import type { Event, TicketSalesHistory } from "@/types/event";

// Half-day demand patterns, not historical sales. Quiet intervals and release
// bursts are shared by both charts through integer, two-hour sales buckets.
const DEMAND_PATTERNS = [
  [2, 15, 1, 0, 26, 4, 1, 18, 3, 32, 5, 0, 38, 12],
  [10, 2, 0, 22, 3, 1, 30, 6, 1, 16, 2, 0, 42, 18],
  [1, 8, 24, 2, 0, 16, 4, 32, 1, 5, 26, 2, 45, 10],
  [6, 0, 18, 2, 30, 1, 4, 22, 0, 36, 3, 8, 16, 40],
  [2, 22, 3, 0, 12, 32, 1, 6, 26, 2, 0, 38, 8, 20],
];
const HOURLY_BURSTS = [0, 1, 8, 2, 0, 5];
const HOUR_MS = 3_600_000;

export function isLiveSpaceDemoEvent(event: Event) {
  return event.status === "live" &&
    event.recruiterProfileId === "recruiter-space-ibiza" &&
    event.organizationId === "organization-recruiter-space-ibiza";
}

function distributeTickets(total: number, weights: number[]) {
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  const exact = weights.map((weight) => total * weight / weightTotal);
  const quantities = exact.map(Math.floor);
  const remainder = total - quantities.reduce((sum, quantity) => sum + quantity, 0);
  const ranked = exact.map((quantity, index) => ({ index, fraction: quantity % 1 }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const { index } of ranked.slice(0, remainder)) quantities[index] += 1;
  return quantities;
}

export function buildDemoTicketSalesHistory(event: Event): TicketSalesHistory {
  const day = Number(event.cover.date.slice(-2));
  const pattern = DEMAND_PATTERNS[day % DEMAND_PATTERNS.length];
  const endsAt = Date.parse(`${event.cover.date}T18:00:00.000Z`);
  return {
    source: "synthetic-demo",
    version: 1,
    startsAt: new Date(endsAt - 7 * 24 * HOUR_MS).toISOString(),
    bucketHours: 2,
    phases: (event.tickets.sections ?? []).flatMap((section) =>
      section.phases.map((phase, phaseIndex) => ({
        sectionId: section.id,
        phaseId: phase.id,
        quantities: distributeTickets(phase.quantitySold ?? 0, pattern.flatMap((weight) =>
          HOURLY_BURSTS.map((_, index) => weight * HOURLY_BURSTS[(index + day + phaseIndex) % 6]),
        )),
      })),
    ),
  };
}
