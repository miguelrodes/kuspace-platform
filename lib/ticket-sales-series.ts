import type { TicketSalesHistory } from "@/types/event";

const HOUR_MS = 3_600_000;

export function buildTicketSalesSeries(
  history: TicketSalesHistory,
  window: "full" | "24h",
  sectionId?: string,
) {
  const phases = history.phases.filter((phase) => !sectionId || phase.sectionId === sectionId);
  const count = Math.max(0, ...history.phases.map((phase) => phase.quantities.length));
  const quantities = Array.from({ length: count }, (_, index) =>
    phases.reduce((sum, phase) => sum + (phase.quantities[index] ?? 0), 0),
  );
  const startIndex = window === "24h" ? Math.max(0, count - 24 / history.bucketHours) : 0;
  const step = window === "24h" ? 1 : Math.max(1, Math.ceil(count / 14));
  const timestampAt = (index: number) => Date.parse(history.startsAt) + index * history.bucketHours * HOUR_MS;
  let sold = quantities.slice(0, startIndex).reduce((sum, quantity) => sum + quantity, 0);
  const points = [{ timestamp: timestampAt(startIndex), sold, velocity: 0 }];

  for (let index = startIndex; index < count; index += step) {
    const end = Math.min(index + step, count);
    const quantity = quantities.slice(index, end).reduce((sum, value) => sum + value, 0);
    sold += quantity;
    points.push({
      timestamp: timestampAt(end),
      sold,
      velocity: quantity / ((end - index) * history.bucketHours),
    });
  }
  return points;
}
