# Public Demo Operations

This repository is prepared for a recruiter-facing demo but is not deployed by this workflow.

## Smallest safe rate-limit approach

Use provider-level request limiting for authenticated mutation and checkout endpoints before introducing an application dependency. On Vercel, configure firewall/rate-limit rules for `/api/store/*`, `/api/workspace/*`, and especially checkout endpoints. If application-level distributed limits become necessary, add a managed shared store only after traffic requirements are known.

No rate-limit dependency is included in this repository.

## Smallest safe reset approach

Use a dedicated disposable demo database and an authenticated scheduled job that restores a known fixture snapshot. Do not expose the destructive seed function as a public route. Until such a job exists, reset the isolated database manually from a trusted environment with `npm run prisma:seed`.

No automated reset endpoint or scheduler is included in this repository.

## Deployment checklist

- Set `KUSPACE_DEMO_MODE=true`.
- Use only Stripe test-mode keys and a test webhook secret.
- Use a Clerk development/test application.
- Use an isolated Postgres database containing no personal or production data.
- Apply migrations before seeding.
- Configure provider-level rate limits.
- Complete a Stripe test Checkout and verified webhook round trip.
- Confirm protected routes fail closed when Clerk configuration is absent or invalid.
