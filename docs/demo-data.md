# Public Demo Data and Asset Provenance

The public demo combines historical 2016 venue, artist, event and lineup information with synthetic operational data. Guestlists, consumer accounts, orders, ticket sales, budgets and access records are demonstration values, not historical venue records. Some capacities and timetables are reconstructed. See `/demo-info` for the public explanation.

Archived local event covers and recruiter profile images under `public/demo/original-art/` are mapped by `lib/original-art-manifest.json`. The per-file source inventory in `lib/demo-asset-sources.ts` records every distinct mapped file and the event or profile where it appears. Image-level source pages, creators/rightsholders, permission and required attribution were not retained; these facts remain unresolved. A link to an event listing is not evidence of artwork permission. Do not describe those files as original geometric artwork or as licensed assets.

The KUSPACE wordmark and favicon are project branding. The demo should use synthetic details in editable fields and should not be used for real bookings, tickets or payments.

The public demo database is a dedicated Neon project. Seeding is destructive and must not be run as part of routine preview, policy or deployment work. This task does not seed or reset it.
