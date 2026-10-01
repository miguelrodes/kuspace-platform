# Demo Data and Asset Provenance

All public demo organizations, venues, events, artists, consumers, guestlists, descriptions, contact details, and ticket records in this repository are fictional.

The primary demo workspace, **Neon Harbor**, and its location, **Northport Waterfront**, do not represent a real venue or organization. Demo email addresses use the reserved `example.test` domain.

Artwork under `public/demo/` is original geometric SVG artwork created specifically for this repository. It does not contain downloaded posters, venue photography, artist photography, or third-party nightlife branding.

The KUSPACE wordmark and favicon are project branding. Third-party service names such as Clerk, Prisma, Stripe, and Vercel appear only where necessary to describe integrations or configuration.

## Seed contents

The seed creates one fictional organizer workspace, eight events across draft, upcoming, live, past, and cancelled states, multi-room lineups and timetables, curated applications, guestlists, budgets, ticket phases, access assignments, consumer wallet states, and ticket orders covering the supported payment lifecycle. Ticket-tier sales and normalized orders remain separate records; the seed does not duplicate tier revenue as untracked door revenue.

Run the seed explicitly with:

```bash
npm run prisma:seed
```

The command clears existing KUSPACE domain data before inserting the fictional records. Use it only with a dedicated development or test database, verify `DATABASE_URL` and `DIRECT_URL` first, and never point it at production. The seed is not invoked automatically during application startup.
