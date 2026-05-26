ALTER TABLE "ticket_orders"
ADD COLUMN "stripe_connected_account_id" TEXT;

CREATE INDEX "ticket_orders_stripe_connected_account_id_idx"
ON "ticket_orders"("stripe_connected_account_id");
