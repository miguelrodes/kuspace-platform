# Payment Architecture

Stripe is the external payment processor. KUSPACE remains the source of truth for ticket inventory, commerce orders, wallet ownership, access assignments, guestlist state, and payment-state transitions.

## Checkout

1. An authenticated consumer requests checkout for an event ticket phase.
2. The backend validates event status, admission rules, section visibility, phase availability, quantity, and organization payment configuration.
3. Price and currency are resolved from the server-side event record, never trusted from the browser.
4. KUSPACE creates a pending order and item records.
5. The backend creates the Stripe Checkout Session and records its identifiers against the order.

## Confirmation

The checkout success page is not proof of payment. The Stripe webhook route reads the raw request body and verifies the `Stripe-Signature` header with Stripe's signing secret.

Supported successful payment events are normalized into a backend payment transition. Transactional fulfillment then updates:

- order status and Stripe references;
- ticket phase inventory;
- consumer wallet ownership;
- event guestlist state;
- event access assignment and payment state.

Failure, cancellation, and expiration events update order state without granting ownership or admission.

## Demo safety

`KUSPACE_DEMO_MODE=true` rejects Stripe live-mode secret and publishable keys at the central configuration/client boundary. A public demo must use a dedicated Stripe test account, Clerk development instance, and isolated database.

This implementation has automated service and route coverage, but it is not production-proven. A deployed Stripe test-mode Checkout plus signed webhook round trip remains a manual acceptance requirement.
