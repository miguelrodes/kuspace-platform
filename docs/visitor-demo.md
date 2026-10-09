# Visitor-isolated demo

Enable the existing server flag KUSPACE_DEMO_MODE=true and run npm run dev.
The landing design is unchanged. Its two entry buttons create an isolated
organiser (Space Ibiza) or consumer (Luca Dea display persona) session without
a Clerk account. The persona's activity and contact details are synthetic.

## Storage and security

- POST /api/demo/session checks the explicit mode, origin and role. It returns
  the repository's static historical/synthetic seed, never database contents.
- An HttpOnly browser-session marker, kuspace_demo_sandbox, enables demo-only
  routing. It grants no database identity, membership, or Clerk session.
- All /api/* requests except demo entry are rejected while the marker is set,
  including requests carrying an existing Clerk session. Server authentication
  also rejects sandbox requests as defense in depth.
- Office URLs rewrite to a guarded sandbox shell reusing the normal dashboard
  and editor. Normal Clerk authorization remains unchanged outside the sandbox.
- kuspace_demo_session_v1 in sessionStorage holds this tab's data and workspace.
  Store mutations use an allowlisted local adapter; unsupported actions never
  fall through to database fetches. Other tabs/visitors do not receive edits.
- Browser-created duplicate tabs may initially copy sessionStorage but then
  diverge. Browsers may restore tab sessions after restarting.
- Reset demo replaces all local edits. Change role returns to the start;
  selecting either option also starts fresh. Both actions intentionally discard
  local edits after confirmation. Use fictional details only.

## Supported

Global discovery, both recruiter profiles, workspace switching, scoped Office,
draft creation/deletion, event cover/lineup/timetable/guestlist/budget/tickets,
consumer profile editing, saved events, consumer sample wallet, and curated applications.
Existing editor status/ownership UI rules still apply. Visiting a profile does
not switch workspace. The local request adapter also checks ownership.

Recruiter profile settings are read-only in demo mode. Clicking the settings
icon shows a temporary notice instead of opening the editor. Both local sandbox
requests and database-backed demo profile updates reject these changes.

## Limits

No real orders, ticket purchases, Stripe, account creation, notifications or
database persistence. Attendees are a simplified local synthetic access view,
not the database-backed order/revenue report. Storage quota errors reject saves
rather than saving them elsewhere. A new tab without demo data must choose a
role on the start page. The marker can outlive a tab; it intentionally keeps
database requests blocked until the browser-session cookie is cleared.

No reseed or deployment is required for local preview. Shared seed preparation
was extracted into pure fixture builders so demo data and the seed use the same
synthetic operational generation; the seed command itself is not run.

## Live Space ticket charts

All live Space Ibiza events preserve their synthetic fixture sales totals in
the visitor sandbox. `lib/demo/ticket-sales-history.ts` distributes those totals
into deterministic two-hour sales buckets across the seven days ending on each
event's demo snapshot (18:00 UTC on its event date). These are fictional sales,
not evidence of actual historical transactions or verified sales timings.

The event's `tickets.salesHistory` flows through the editor's tickets state to
the Overview panel. Cumulative tickets and velocity both consume those same
buckets; Full Cycle aggregates twelve hours and Last 24h uses two-hour buckets.
Cumulative sales never decrease, but alternate between quiet periods and bursts.
The totals match the synthetic group allocations, wallet quantities and sold
counts. No orders are created in Stripe or the database.

Existing per-tab sessions upgrade their old three-ticket live Space samples on
reload, once per event. Only synthetic ticket sales/allocations are refreshed;
other edits, saved events, manual guests and active perspective are preserved.
Events outside that subset and normal database-backed flows are not upgraded.
