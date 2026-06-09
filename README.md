# Mesh

Mesh is a one-shot MVP for a decentralized B2B manufacturing marketplace. The demo connects mechanical engineering students and startups with nearby 3D printer and CNC operators.

## Stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- Lucide React
- Next.js Route Handlers
- Local JSON storage with optional Postgres via `DATABASE_URL`

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

The app now includes a lightweight backend. CAD parsing still happens in the browser for instant feedback, then parsed file metadata, uploaded CAD binaries, quote requests, and sent jobs can be persisted through App Router API routes.

Without environment variables, the backend stores demo data in `.mesh-data/` during local development. In production, set `DATABASE_URL` to enable the Postgres adapter. The app will create the required `mesh_files` and `mesh_jobs` tables automatically.

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

## Backend API

- `GET /api/health` - API status and storage mode.
- `GET /api/makers` - mocked local maker network.
- `GET /api/files` - stored CAD metadata.
- `POST /api/files` - save parsed CAD metadata.
- `POST /api/uploads` - upload a CAD file with parsed metadata.
- `GET /api/uploads/:storageKey` - download locally stored CAD files.
- `POST /api/quotes` - calculate line-item quote and maker matches.
- `GET /api/jobs` - stored sent jobs.
- `POST /api/jobs` - save a sent RFQ/job.

## Environment

Copy `.env.example` to `.env.local` for local overrides.

```bash
DATABASE_URL=
MESH_DATA_DIR=
MESH_MAX_UPLOAD_MB=80
MESH_PG_POOL_MAX=5
PGSSLMODE=
```

`DATABASE_URL` is optional locally. For production marketplace persistence, point it at a managed Postgres database such as Supabase, Neon, Railway, or Vercel Postgres.

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
4. Add `DATABASE_URL` in Vercel Project Settings when you want durable production storage.
5. Deploy.

No environment variables are required for the local/demo backend. Production persistence requires `DATABASE_URL`.

You can also deploy directly with the Vercel CLI:

```bash
npx vercel link --yes --project mesh-marketplace-mvp
npx vercel --prod --yes
```
