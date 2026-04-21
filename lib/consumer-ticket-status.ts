import type { EventAccessAssignment } from "@/types/event";
import type { ConsumerTicketStatus, ConsumerTicketWalletEntry } from "@/types/user";
import {
  deriveConsumerTicketStatusFromAssignment,
  isQrActiveForPaymentState as isWalletTicketQrActive,
} from "@/lib/event-access-assignment";

export function resolveConsumerTicketStatus(
  entry: Pick<ConsumerTicketWalletEntry, "status">,
  assignment?: Pick<EventAccessAssignment, "checkedIn" | "paymentState">,
): ConsumerTicketStatus | undefined {
  return entry.status ?? deriveConsumerTicketStatusFromAssignment(assignment);
}
