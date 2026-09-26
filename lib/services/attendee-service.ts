import { getEventAccessAssignment } from "@/lib/event-access";
import { getConsumersRepositoryByIds } from "@/lib/db/repositories/consumer-repository";
import { requireOwnedRecruiterEventService } from "@/lib/services/access-service";
import {
  listPaidTicketOrdersByEventService,
  listPaidTicketSalesSummaryByEventService,
} from "@/lib/services/order-service";
import type { Event, TicketSection, TicketTier } from "@/types/event";
import type { TicketOrder } from "@/types/order";
import type { ConsumerUser } from "@/types/user";
import type {
  EventAttendeeReport,
  EventAttendeeRow,
} from "@/types/attendee";

function formatAttendeeName(user: ConsumerUser) {
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  return fullName || user.username;
}

function getSectionsById(event: Event) {
  return new Map(
    (event.tickets.sections ?? []).map((section) => [section.id, section]),
  );
}

function getPhasesById(event: Event) {
  return new Map(
    (event.tickets.sections ?? []).flatMap((section) =>
      section.phases.map((phase) => [phase.id, phase] as const),
    ),
  );
}

function getAccessGroupNamesById(event: Event) {
  return new Map(
    event.guestlist.accessGroups.map((group) => [group.id, group.name]),
  );
}

function getAssignmentsByUserId(event: Event) {
  return new Map(
    event.accessAssignments.map((assignment) => [assignment.userId, assignment]),
  );
}

function getTotalRemainingInventory(event: Event) {
  return (event.tickets.sections ?? []).reduce((total, section) => {
    return (
      total +
      section.phases.reduce((sectionTotal, phase) => {
        return sectionTotal + Math.max(phase.quantityAvailable - (phase.quantitySold ?? 0), 0);
      }, 0)
    );
  }, 0);
}

function resolveOrderItemSection(
  sectionsById: Map<string, TicketSection>,
  item: TicketOrder["items"][number],
) {
  return sectionsById.get(item.ticketSectionId) ?? null;
}

function resolveOrderItemPhase(
  phasesById: Map<string, TicketTier>,
  item: TicketOrder["items"][number],
) {
  return phasesById.get(item.ticketPhaseId) ?? null;
}

export async function getOwnedEventAttendeeReportService(
  eventId: string,
): Promise<EventAttendeeReport> {
  const { event } = await requireOwnedRecruiterEventService(eventId, "view attendee reports for");
  const [paidOrders, salesSummary] = await Promise.all([
    listPaidTicketOrdersByEventService(event.id),
    listPaidTicketSalesSummaryByEventService(event.id),
  ]);
  const consumerIds = [...new Set(paidOrders.map((order) => order.consumerUserId))];
  const consumers = await getConsumersRepositoryByIds(consumerIds);
  const consumersById = new Map(consumers.map((user) => [user.id, user]));
  const sectionsById = getSectionsById(event);
  const phasesById = getPhasesById(event);
  const accessGroupNamesById = getAccessGroupNamesById(event);
  const assignmentsByUserId = getAssignmentsByUserId(event);

  const attendees = paidOrders.flatMap((order) => {
    const user = consumersById.get(order.consumerUserId);

    if (!user) {
      return [];
    }

    const assignment = assignmentsByUserId.get(order.consumerUserId) ?? getEventAccessAssignment(event, order.consumerUserId);

    return order.items.map((item) => {
      const section = resolveOrderItemSection(sectionsById, item);
      const phase = resolveOrderItemPhase(phasesById, item);
      const accessGroupId = section?.accessGroupId ?? assignment?.accessGroupId ?? "unknown-access-group";
      const attendeeRow: EventAttendeeRow = {
        orderId: order.id,
        consumerUserId: user.id,
        attendeeName: formatAttendeeName(user),
        attendeeUsername: user.username,
        ticketSectionId: item.ticketSectionId,
        ticketSectionName: section?.name ?? "Archived section",
        ticketPhaseId: item.ticketPhaseId,
        ticketPhaseName: phase?.name ?? "Archived phase",
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        paymentState: assignment?.paymentState ?? (order.totalAmount > 0 ? "paid" : "not_required"),
        accessGroupId,
        accessGroupName: accessGroupNamesById.get(accessGroupId) ?? "Unknown access group",
        checkedIn: assignment?.checkedIn ?? false,
        orderStatus: order.status,
        paidAt: order.updatedAt,
      };

      return attendeeRow;
    });
  });

  attendees.sort((left, right) => {
    const paidAtDiff = right.paidAt.localeCompare(left.paidAt);
    if (paidAtDiff !== 0) {
      return paidAtDiff;
    }

    return left.attendeeName.localeCompare(right.attendeeName);
  });

  const checkoutRevenueTotal = paidOrders.reduce((total, order) => total + order.totalAmount, 0);
  const doorTicketRevenue = event.budget.doorTicketRevenue ?? 0;

  return {
    event: {
      id: event.id,
      slug: event.slug,
      title: event.cover.title,
      date: event.cover.date,
      venue: event.cover.venue,
      status: event.status,
    },
    summary: {
      totalPaidAttendees: new Set(paidOrders.map((order) => order.consumerUserId)).size,
      ticketsSold: attendees.reduce((total, attendee) => total + attendee.quantity, 0),
      checkoutRevenueTotal,
      doorTicketRevenue,
      revenueEstimate: checkoutRevenueTotal + doorTicketRevenue,
      remainingInventory: getTotalRemainingInventory(event),
    },
    attendees,
    salesSummary,
  };
}
