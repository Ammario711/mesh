# Mesh

Mesh is a web app for a decentralized B2B manufacturing marketplace. It connects mechanical engineering students and startups with nearby 3D printer and CNC operators.

## Stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- Lucide React
- Next.js Route Handlers
- Local JSON storage for development
- Postgres-backed production storage via `DATABASE_URL`
- Passwordless email auth and role-gated admin operations
- Stripe Checkout and Stripe Connect onboarding hooks
- Sentry-ready error tracking

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production Checks

```bash
npm run check
```

Or run the checks individually:

```bash
npm run lint
npm run typecheck
npm run build
npm audit --audit-level=moderate
```

The app now includes a lightweight backend. CAD parsing still happens in the browser for instant feedback, then parsed file metadata, uploaded CAD binaries, quote requests, sent jobs, accounts, maker applications, payments, lifecycle events, and audit logs can be persisted through App Router API routes.

Without environment variables, the backend stores development data in `.mesh-data/`. In production, set `DATABASE_URL` to enable durable Postgres storage. The app creates its `mesh_*` tables automatically.

Production write routes reject ephemeral serverless storage unless `MESH_ALLOW_EPHEMERAL_WRITES=true` is set. This prevents real CAD files and RFQs from being silently saved to temporary infrastructure.

## Functional MVP Scope

- Upload or drag `.stl`, `.step`, and `.stp` files.
- Compute STL mesh volume, dimensions, and triangle count in the browser.
- Generate STEP quote estimates from file size and topology hints.
- Recalculate quotes by material and infill density.
- Configure RFQ details including quantity, finish, tolerance, timeline, and notes.
- See line-item pricing with setup, rush, platform fee, unit price, and batch discounts.
- Score local makers by material support, distance, tolerance capability, timeline, and capacity.
- Persist parsed files and sent job records in local browser storage.
- Persist parsed CAD files and sent jobs through backend API routes.
- Send a quote to a compatible local maker and review richer job activity.
- Accept local maker/operator applications through a persisted onboarding form.
- Log in with passwordless email codes.
- Review maker applications and update job lifecycle state from `/admin`.
- Create Stripe Checkout sessions for buyer deposits.
- Create Stripe Connect onboarding links for maker payouts.
- Send transactional email and support notifications when `RESEND_API_KEY` is configured.
- Capture production errors with Sentry when `SENTRY_DSN` or `NEXT_PUBLIC_SENTRY_DSN` is configured.

## Backend API

- `GET /api/health` - API status and storage mode.
- `GET /api/readiness` - production readiness checks.
- `GET /api/makers` - mocked local maker network.
- `GET /api/files` - stored CAD metadata.
- `POST /api/files` - save parsed CAD metadata.
- `POST /api/uploads` - upload a CAD file with parsed metadata.
- `GET /api/uploads/:storageKey` - download locally stored CAD files.
- `POST /api/quotes` - calculate line-item quote and maker matches.
- `GET /api/jobs` - stored sent jobs.
- `POST /api/jobs` - save a sent RFQ/job.
- `GET /api/maker-applications` - stored maker applications.
- `POST /api/maker-applications` - save a maker onboarding application.
- `POST /api/support` - send a rate-limited support request to the monitored inbox.
- `POST /api/auth/start` - request a passwordless login code.
- `POST /api/auth/verify` - verify a login code and set the Mesh session cookie.
- `GET /api/auth/me` - inspect the current session.
- `POST /api/auth/logout` - clear the Mesh session cookie.
- `PATCH /api/admin/maker-applications/:id` - review, approve, or decline a maker application.
- `PATCH /api/admin/jobs/:id/status` - update job lifecycle state.
- `GET /api/admin/audit` - admin-only audit log.
- `GET /api/admin/payments` - admin-only payment records.
- `POST /api/payments/checkout` - create a Stripe Checkout session for a job.
- `POST /api/payments/connect` - create a Stripe Connect onboarding link.
- `POST /api/payments/webhook` - receive signed Stripe payment webhooks.

## Environment

Copy `.env.example` to `.env.local` for local overrides.

```bash
DATABASE_URL=
NEXT_PUBLIC_APP_URL=https://mesh-marketplace-mvp.vercel.app
NEXT_PUBLIC_MESH_SUPPORT_EMAIL=
NEXT_PUBLIC_MESH_LEGAL_EFFECTIVE_DATE=June 10, 2026
AUTH_SECRET=
MESH_ADMIN_EMAILS=
MESH_DATA_DIR=
MESH_EMAIL_FROM=
MESH_LEGAL_REVIEWED_AT=
MESH_LEGAL_REVIEWER=
MESH_SUPPORT_EMAIL=
MESH_MAX_UPLOAD_MB=80
MESH_PG_POOL_MAX=5
MESH_ALLOW_EPHEMERAL_WRITES=false
PGSSLMODE=
RESEND_API_KEY=
SENTRY_AUTH_TOKEN=
SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
NEXT_PUBLIC_SENTRY_DSN=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

`DATABASE_URL` is optional locally. For production marketplace persistence, point it at a managed Postgres database such as Supabase, Neon, Railway, or Vercel Postgres.

For a production launch, `/api/readiness` expects these critical inputs:

- `DATABASE_URL` for durable RFQs, CAD metadata, accounts, jobs, payments, and audit logs.
- `AUTH_SECRET` as a long random value for signed session cookies.
- `MESH_ADMIN_EMAILS` as a comma-separated admin allowlist.
- `NEXT_PUBLIC_MESH_SUPPORT_EMAIL` or `MESH_SUPPORT_EMAIL` for the monitored support inbox.
- `RESEND_API_KEY` and `MESH_EMAIL_FROM` for login codes and workflow notifications.
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` for checkout, Connect onboarding, and paid-payment reconciliation.
- `SENTRY_DSN` or `NEXT_PUBLIC_SENTRY_DSN` for error tracking.
- `MESH_LEGAL_REVIEWER` and `MESH_LEGAL_REVIEWED_AT` after legal review is complete.

## Public Pages

- `/trust` - CAD/IP handling, prohibited jobs, maker expectations, and reporting.
- `/makers` - maker/operator onboarding application.
- `/login` - passwordless account sign-in.
- `/account` - account, role, logout, and maker payout setup.
- `/admin` - maker verification, job lifecycle, payments, and audit dashboard.
- `/status` - production readiness and launch status.
- `/privacy` - data handling for CAD files, RFQs, localStorage, and job records.
- `/terms` - marketplace terms, quote estimates, CAD rights, prohibited work, and payments status.

## Deploy

Production is currently deployed at:

[https://mesh-marketplace-mvp.vercel.app](https://mesh-marketplace-mvp.vercel.app)

The fastest path is Vercel:

1. Push this repository to GitHub.
2. Import the repository into Vercel.
3. Use the defaults:
   - Framework: Next.js
   - Build command: `npm run build`
   - Install command: `npm install`
   - Output directory: `.next`
4. Add the production environment variables from `.env.example` in Vercel Project Settings.
5. Deploy.

No environment variables are required for local development. Production readiness requires the critical variables listed above.

You can also deploy directly with the Vercel CLI:

```bash
npx vercel link --yes --project mesh-marketplace-mvp
npx vercel --prod --yes
```
