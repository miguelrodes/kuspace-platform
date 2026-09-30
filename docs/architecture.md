# Architecture

KUSPACE is a full-stack Next.js App Router application. The repository keeps transport, validation, domain rules, and persistence mapping separate:

```text
React UI -> route handler -> Zod schema -> service -> repository -> Prisma -> PostgreSQL
```

## Request boundaries

- Route handlers parse HTTP input, invoke validation, call one service operation, and translate stable errors into HTTP responses.
- Zod schemas normalize strings, numbers, dates, identifiers, and section-specific update payloads before they reach services.
- Services own event lifecycle, ticket visibility, application, purchase, workspace, and authorization rules.
- Repositories own Prisma queries and database-to-domain mapping.
- The client adapter in `lib/app-store.ts` loads canonical backend state and may apply optimistic UI updates, but the backend remains authoritative.

## Organization authorization

Clerk authenticates a session. Application actor mapping resolves that session to a recruiter or consumer. Recruiter actors then resolve an active organization membership.

Organizations are the recruiter security boundary:

- office bootstrap returns only the active organization's profile and events;
- event creation assigns the active organization server-side;
- recruiter mutations verify organization ownership;
- membership is required before an organization can be selected;
- consumers cannot enter recruiter mutation paths.

Consumer profiles, saved events, applications, wallet entries, and tickets remain scoped to the authenticated consumer identity.

## Event domain

The event aggregate is normalized into parent and child records rather than stored as a client-owned JSON document. Important related models include rooms, genres, lineup entries, lineup-room links, timetable rows, access groups, assignments, applications, guestlist entries, budget items, ticket sections, allowed groups, ticket phases, labels, and label links.

Section-specific services support focused editor mutations while aggregate reads reconstruct the UI-facing event shape.

## Demo data

The seed dataset in `lib/demo-data.ts` is fictional. See [Demo Data and Asset Provenance](demo-data.md).
