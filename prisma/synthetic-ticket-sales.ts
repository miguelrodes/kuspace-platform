import type { Event } from "../types/event";

export type SyntheticTicketSale = {
  sectionId: string;
  phaseId: string;
  accessGroupId: string;
  unitPrice: number;
  quantity: number;
};

export function buildSyntheticTicketSales(event: Event, consumerCount: number): SyntheticTicketSale[] {
  if (event.status === "draft" || event.status === "cancelled") {
    return [];
  }

  const sections = event.tickets.sections ?? [];
  if (event.status === "upcoming") {
    const targets = sections.flatMap((section) => section.phases
      .filter((phase) => phase.price > 0 && (phase.quantitySold ?? 0) > 0)
      .map((phase) => ({ section, phase })));

    if (targets.length === 0) {
      return [];
    }
    if (targets.length > consumerCount) {
      throw new Error(`Not enough synthetic consumers for advance sales on ${event.id}.`);
    }

    const salesPerPhase = Math.min(8, Math.floor(consumerCount / targets.length));
    return targets.flatMap(({ section, phase }) => {
      const sold = phase.quantitySold ?? 0;
      if (!Number.isInteger(sold) || sold > phase.quantityAvailable) {
        throw new Error(`Invalid synthetic advance inventory for ${event.id}/${phase.id}.`);
      }

      // A small set of group allocations preserves fixture totals without seeding thousands of buyers.
      const orderCount = Math.min(salesPerPhase, sold);
      return Array.from({ length: orderCount }, (_, index) => ({
        sectionId: section.id,
        phaseId: phase.id,
        accessGroupId: section.accessGroupId,
        unitPrice: phase.price,
        quantity: Math.floor(sold / orderCount) + (index < sold % orderCount ? 1 : 0),
      }));
    });
  }

  const section = sections.find((candidate) => candidate.phases.some(
    (phase) => phase.price > 0 && phase.quantityAvailable >= 3,
  ));
  const phase = section?.phases.find(
    (candidate) => candidate.price > 0 && candidate.quantityAvailable >= 3 && candidate.status === "live",
  ) ?? section?.phases.find(
    (candidate) => candidate.price > 0 && candidate.quantityAvailable >= 3,
  );
  if (!section || !phase) {
    return [];
  }
  if (consumerCount < 3) {
    throw new Error(`Not enough synthetic consumers for ${event.id}.`);
  }

  return Array.from({ length: 3 }, () => ({
    sectionId: section.id,
    phaseId: phase.id,
    accessGroupId: section.accessGroupId,
    unitPrice: phase.price,
    quantity: 1,
  }));
}
