import { z } from "zod";

const idSchema = z.string().trim().min(1);
const positiveIntSchema = z.number().int().positive();
const nonNegativeNumberSchema = z.number().finite().nonnegative();
const isoCurrencySchema = z.string().trim().toUpperCase().length(3);
const optionalStringSchema = z.string().trim().optional();

export const ticketOrderStatusSchema = z.enum([
  "pending",
  "checkout_started",
  "paid",
  "payment_failed",
  "cancelled",
  "expired",
]);

export const createTicketOrderItemSchema = z.object({
  ticketSectionId: idSchema,
  ticketPhaseId: idSchema,
  quantity: positiveIntSchema,
  unitPrice: nonNegativeNumberSchema,
});

export const createTicketOrderSchema = z.object({
  eventId: idSchema,
  organizationId: idSchema,
  consumerUserId: idSchema,
  currency: isoCurrencySchema.default("EUR"),
  stripeConnectedAccountId: optionalStringSchema,
  items: z.array(createTicketOrderItemSchema).min(1),
});

export const updateTicketOrderStatusSchema = z.object({
  orderId: idSchema,
  status: ticketOrderStatusSchema,
  stripeConnectedAccountId: optionalStringSchema,
  stripeCheckoutSessionId: optionalStringSchema,
  stripePaymentIntentId: optionalStringSchema,
});

export type CreateTicketOrderInput = z.infer<typeof createTicketOrderSchema>;
export type CreateTicketOrderItemInput = z.infer<typeof createTicketOrderItemSchema>;
export type UpdateTicketOrderStatusInput = z.infer<typeof updateTicketOrderStatusSchema>;
