-- CreateEnum
CREATE TYPE "TicketOrderStatus" AS ENUM ('pending', 'checkout_started', 'paid', 'payment_failed', 'cancelled', 'expired');

-- CreateTable
CREATE TABLE "ticket_orders" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "consumerUserId" TEXT NOT NULL,
    "status" "TicketOrderStatus" NOT NULL DEFAULT 'pending',
    "currency" TEXT NOT NULL,
    "subtotalAmount" DECIMAL(12,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "ticketSectionId" TEXT NOT NULL,
    "ticketPhaseId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ticket_orders_stripeCheckoutSessionId_key" ON "ticket_orders"("stripeCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_orders_stripePaymentIntentId_key" ON "ticket_orders"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "ticket_orders_eventId_idx" ON "ticket_orders"("eventId");

-- CreateIndex
CREATE INDEX "ticket_orders_organizationId_idx" ON "ticket_orders"("organizationId");

-- CreateIndex
CREATE INDEX "ticket_orders_consumerUserId_idx" ON "ticket_orders"("consumerUserId");

-- CreateIndex
CREATE INDEX "ticket_orders_status_idx" ON "ticket_orders"("status");

-- CreateIndex
CREATE INDEX "ticket_order_items_orderId_idx" ON "ticket_order_items"("orderId");

-- CreateIndex
CREATE INDEX "ticket_order_items_ticketSectionId_idx" ON "ticket_order_items"("ticketSectionId");

-- CreateIndex
CREATE INDEX "ticket_order_items_ticketPhaseId_idx" ON "ticket_order_items"("ticketPhaseId");

-- AddForeignKey
ALTER TABLE "ticket_orders" ADD CONSTRAINT "ticket_orders_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_orders" ADD CONSTRAINT "ticket_orders_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_orders" ADD CONSTRAINT "ticket_orders_consumerUserId_fkey" FOREIGN KEY ("consumerUserId") REFERENCES "consumer_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_order_items" ADD CONSTRAINT "ticket_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ticket_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_order_items" ADD CONSTRAINT "ticket_order_items_ticketSectionId_fkey" FOREIGN KEY ("ticketSectionId") REFERENCES "event_ticket_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_order_items" ADD CONSTRAINT "ticket_order_items_ticketPhaseId_fkey" FOREIGN KEY ("ticketPhaseId") REFERENCES "event_ticket_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
