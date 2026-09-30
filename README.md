# KUSPACE

A full-stack event operations and ticketing MVP for nightlife organizers.

## Overview

KUSPACE brings event planning, organizer operations, ticket configuration, and attendee management into one organization-scoped workspace. Recruiters can structure multi-room events, coordinate lineups and timetables, manage guest access and budgets, configure ticket releases, and review attendee activity. Consumers have a separate event-discovery, application, ticket, and wallet experience.

This is an independent MVP designed and developed by Miguel Rodés. It has not been commercially launched.

## Demo

- Live Demo: Coming soon
- Portfolio Case Study: Coming soon
- Video Walkthrough: Coming soon

## Core Features

- Clerk authentication with recruiter and consumer roles
- Organization-scoped recruiter workspaces and authorization
- Event creation, editing, publication, status transitions, and draft deletion
- Office calendar and event-list views
- Multi-room lineups with room assignments
- Room-aware event timetables
- Guestlists, check-in state, and access assignments
- Event budgets and derived totals
- Ticket sections, release phases, visibility rules, and inventory
- Curated applications with recruiter approval or denial
- Stripe Connect and server-created Checkout implementation
- Signed Stripe webhook verification and transactional fulfillment
- Consumer wallet and admission-access records
- Attendee and ticket-sales reporting

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma
- Clerk
- Zod
- Stripe
- Vitest

## Architecture

Application requests follow one backend path:

```text
React UI
  -> Next.js route handlers
  -> Zod validation
  -> service layer
  -> repository layer
  -> Prisma
  -> PostgreSQL
```

Route handlers remain thin. Services own authorization and business rules, repositories own persistence mapping, and Prisma is never called from UI components.

Recruiter data is tenant-scoped. A Clerk session resolves to an application actor, organization membership determines the active workspace, and recruiter event reads and writes are restricted to that organization. Consumer state remains user-scoped.

See [Architecture](docs/architecture.md) for the domain and authorization boundaries.

## Ticketing Architecture

Ticket prices, quantities, event eligibility, and section visibility are resolved server-side. The backend creates Stripe Checkout Sessions and never treats the browser success page as proof of payment. The webhook route verifies Stripe signatures before a successful payment event can trigger transactional fulfillment.

Fulfillment updates the order, ticket inventory, consumer wallet ownership, guestlist state, and event access assignment as separate domain records. This keeps commerce history, ticket ownership, and admission access independent.

The implementation is not production-proven. A real Stripe test-mode end-to-end checkout and webhook validation remains pending until deployment credentials and a dedicated test database are configured.

See [Payment Architecture](docs/payment-architecture.md) for the payment-state contract.

## Key Engineering Decisions

### 1. Organization-scoped authorization

Organizations are the recruiter-side security boundary. Membership, active workspace, and event ownership are checked in backend helpers and services rather than inferred from client state.

### 2. Normalized event domain

Events are persisted as related records for rooms, lineup entries, timetable rows, access groups, assignments, applications, guestlist entries, budgets, labels, ticket sections, and ticket phases. The client does not own a canonical event JSON blob.

### 3. Separate commerce, ownership, and access

Orders record commerce history, wallet entries record ticket ownership, and access assignments determine admission state. Payment confirmation can update all three without conflating their lifecycle rules.

## Screenshots

Screenshots will be added after the public demo environment is configured.

1. Office calendar/dashboard
2. Event editor
3. Timetable and lineup
4. Ticket configuration
5. Public event page
6. Attendee report

## MVP Scope and Limitations

- Poster selection currently previews a local object URL; durable object-storage upload is incomplete.
- Ticket QR visuals are not encoded scannable credentials, and a scanner workflow is not implemented.
- Scheduled ticket release fields exist, but no background scheduler activates releases automatically.
- Multi-organizer public profile discovery is incomplete.
- Public demo data is entirely fictional and payment configuration must use Stripe test mode.

## Running Locally

Prerequisites: Node.js, npm, and PostgreSQL.

```bash
git clone <repository-url>
cd KUSPACE-PLATFORM
npm install
cp .env.example .env
```

Fill `.env` with credentials for a dedicated local or test environment. Keep `KUSPACE_DEMO_MODE=true` and use Stripe test-mode keys only.

Prepare the database and seed the fictional demo workspace:

```bash
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
npm run dev
```

The seed command clears the configured database before writing demo data. Never point it at a production database.

## Testing

The repository contains Vitest coverage for repositories, authorization, workspace onboarding, event CRUD, validation and route contracts, curated access, ticket visibility, Stripe configuration and signature handling, payment fulfillment, and acceptance flows.

Run the local verification suite with:

```bash
npm test
npx tsc --noEmit
npx prisma validate
npm run build
```

Sanitization checkpoint (September 30, 2026): 22 test files and 113 tests passed; TypeScript, Prisma validation, and the Next.js production build also passed locally without external service access.

## Project Status

KUSPACE is an independent working MVP and has not been commercially launched. This repository is published for portfolio and recruiting visibility. No permission to reuse the code or assets is granted by the absence of an open-source license.
